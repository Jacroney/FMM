/**
 * Create Payment Intent Edge Function
 *
 * Creates a Stripe Payment Intent for a member to pay their dues.
 * Supports both ACH (bank account) and card payments.
 * Supports using saved payment methods and saving new ones.
 *
 * Request body:
 * {
 *   member_dues_id: UUID,
 *   payment_method_type: 'us_bank_account' | 'card',
 *   payment_amount?: number (optional, defaults to full balance),
 *   save_payment_method?: boolean (optional, saves payment method for future use),
 *   payment_method_id?: string (optional, use a saved payment method)
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   client_secret: string,
 *   payment_intent_id: string,
 *   amount: number,
 *   requires_action?: boolean (true if using saved method that needs confirmation)
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { checkRateLimit, getIdentifier, rateLimitResponse, RATE_LIMITS } from '../_shared/rate-limit.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract token and verify user authentication using service role client
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // SECURITY: Rate limiting to prevent payment abuse
    const rateLimitIdentifier = getIdentifier(req, user.id, RATE_LIMITS.payment)
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      'create-payment-intent',
      rateLimitIdentifier,
      RATE_LIMITS.payment
    )
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders)
    }

    // Parse request body
    const {
      member_dues_id,
      payment_method_type,
      payment_amount,
      save_payment_method,
      payment_method_id
    } = await req.json()

    if (!member_dues_id) {
      throw new Error('member_dues_id is required')
    }

    // payment_method_type not required if using saved payment_method_id
    if (!payment_method_id && (!payment_method_type || !['us_bank_account', 'card'].includes(payment_method_type))) {
      throw new Error('payment_method_type must be "us_bank_account" or "card"')
    }

    // Get member dues information with related data
    // Use explicit FK name since there are multiple user_profiles relationships
    const { data: memberDues, error: duesError } = await supabaseAdmin
      .from('member_dues')
      .select(`
        *,
        user_profiles:user_profiles!member_dues_member_id_fkey (
          id,
          full_name,
          email,
          chapter_id
        ),
        dues_configuration (
          period_name,
          fiscal_year
        )
      `)
      .eq('id', member_dues_id)
      .single()

    if (duesError || !memberDues) {
      throw new Error('Member dues record not found')
    }

    // SECURITY: Validate that dues are linked to a member account
    // Dues with pending invitations (member_id = null) cannot be paid until linked
    if (!memberDues.member_id) {
      throw new Error('These dues have not been linked to a member account yet. Please accept the invitation and sign up first.')
    }

    // SECURITY: Validate that user_profiles exists (should always exist if member_id exists)
    if (!memberDues.user_profiles) {
      throw new Error('Member profile not found. Please contact support.')
    }

    // Verify user is authorized (either the member themselves or chapter admin)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, chapter_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    const isAuthorized =
      (memberDues.user_profiles.email === user.email) || // Member paying their own dues
      (profile?.chapter_id === memberDues.user_profiles.chapter_id && ['admin', 'exec'].includes(profile.role)) // Chapter admin

    if (!isAuthorized) {
      throw new Error('Unauthorized: You can only create payment intents for your own dues')
    }

    // Check if member has a balance to pay
    if (memberDues.balance <= 0) {
      throw new Error('No outstanding balance to pay')
    }

    // Check for existing pending/processing payment intent
    // This handles reuse (same payment type) or cancel+recreate (different payment type)
    const { data: existingIntent } = await supabaseAdmin
      .from('payment_intents')
      .select('id, status, created_at, payment_method_type, stripe_payment_intent_id, stripe_client_secret')
      .eq('member_dues_id', member_dues_id)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingIntent) {
      // If same payment method type and still pending, reuse the existing intent
      if (existingIntent.payment_method_type === payment_method_type &&
          existingIntent.status === 'pending' &&
          existingIntent.stripe_client_secret) {
        console.log('Reusing existing payment intent:', existingIntent.stripe_payment_intent_id)
        return new Response(
          JSON.stringify({
            success: true,
            client_secret: existingIntent.stripe_client_secret,
            payment_intent_id: existingIntent.stripe_payment_intent_id,
            amount: memberDues.balance,
            reused: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If processing (ACH in progress), don't allow changes
      if (existingIntent.status === 'processing') {
        const paymentType = existingIntent.payment_method_type === 'us_bank_account' ? 'bank transfer' : 'card payment'
        throw new Error(`A ${paymentType} is already processing for these dues. Please wait for it to complete.`)
      }

      // Different payment method type - cancel the old intent and create new
      console.log('Canceling existing intent for new payment method type:', existingIntent.stripe_payment_intent_id)
      try {
        await stripe.paymentIntents.cancel(existingIntent.stripe_payment_intent_id)
      } catch (cancelErr) {
        console.log('Could not cancel Stripe intent (may already be cancelled):', cancelErr)
      }
      await supabaseAdmin
        .from('payment_intents')
        .update({ status: 'canceled' })
        .eq('id', existingIntent.id)
    }

    // Determine payment amount (defaults to full balance)
    const amountToPay = payment_amount && payment_amount > 0 && payment_amount <= memberDues.balance
      ? payment_amount
      : memberDues.balance

    // Get chapter's Stripe Connected Account
    const { data: stripeAccount, error: accountError } = await supabaseAdmin
      .from('stripe_connected_accounts')
      .select('*')
      .eq('chapter_id', memberDues.user_profiles.chapter_id)
      .single()

    if (accountError || !stripeAccount) {
      throw new Error('Chapter has not set up payment processing. Please contact your treasurer.')
    }

    if (!stripeAccount.onboarding_completed || !stripeAccount.charges_enabled) {
      throw new Error('Chapter payment processing is not fully set up. Please contact your treasurer.')
    }

    // Get Stripe customer ID for the member who owes the dues
    let stripeCustomerId = null
    if (memberDues.member_id) {
      const { data: memberProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('stripe_customer_id')
        .eq('id', memberDues.member_id)
        .single()

      stripeCustomerId = memberProfile?.stripe_customer_id || null
    }

    // Validate amount has at most 2 decimal places (valid for currency)
    const expectedCents = amountToPay * 100
    if (Math.round(expectedCents) !== expectedCents) {
      console.warn(`[PAYMENT] Amount ${amountToPay} has more than 2 decimal places, rounding to nearest cent`)
    }

    // Calculate amounts in cents
    const duesAmountCents = Math.round(amountToPay * 100)

    // Fee constants
    const STRIPE_CARD_PERCENTAGE = 0.029      // 2.9%
    const STRIPE_CARD_FIXED_CENTS = 30        // $0.30
    const STRIPE_ACH_PERCENTAGE = 0.008       // 0.8%
    const STRIPE_ACH_CAP_CENTS = 500          // $5.00 cap
    const PLATFORM_FEE_PERCENTAGE = 0.01      // 1%

    // Determine the effective payment method type (may be overridden by saved method)
    let effectivePaymentMethodType = payment_method_type

    // If using a saved payment method, verify ownership and get its type
    if (payment_method_id) {
      // SECURITY: Verify the saved payment method belongs to this user
      const { data: savedMethod, error: savedMethodError } = await supabaseAdmin
        .from('saved_payment_methods')
        .select('*')
        .eq('stripe_payment_method_id', payment_method_id)
        .eq('user_id', memberDues.member_id)
        .single()

      if (savedMethodError || !savedMethod) {
        throw new Error('Invalid payment method. Please select a different payment method.')
      }

      effectivePaymentMethodType = savedMethod.type
    }

    // Calculate platform fee (1% of dues - platform revenue)
    const platformFeeCents = Math.round(duesAmountCents * PLATFORM_FEE_PERCENTAGE)

    // NEW FEE STRUCTURE:
    // - ACH: Member pays $0 fees, chapter absorbs Stripe + platform fees
    // - Card: Member pays Stripe fees, chapter absorbs platform fee only
    let chargeAmountCents: number
    let stripeFeeCents: number
    let transferAmountCents: number

    if (effectivePaymentMethodType === 'card') {
      // CARD: Member pays dues + Stripe processing fees
      // Reverse calculate so after Stripe takes their cut, we have exactly dues
      chargeAmountCents = Math.ceil((duesAmountCents + STRIPE_CARD_FIXED_CENTS) / (1 - STRIPE_CARD_PERCENTAGE))
      stripeFeeCents = chargeAmountCents - duesAmountCents
      // Chapter receives: dues - platform fee (1%)
      transferAmountCents = duesAmountCents - platformFeeCents
    } else {
      // ACH: Member pays just dues (no extra fees!)
      chargeAmountCents = duesAmountCents
      // Calculate ACH fee (0.8% capped at $5)
      stripeFeeCents = Math.min(Math.ceil(duesAmountCents * STRIPE_ACH_PERCENTAGE), STRIPE_ACH_CAP_CENTS)
      // Chapter receives: dues - ACH fee - platform fee
      transferAmountCents = duesAmountCents - stripeFeeCents - platformFeeCents
    }

    // Total charge is what member pays
    const totalChargeCents = chargeAmountCents

    console.log('Creating payment intent:', {
      dues_amount: duesAmountCents,
      stripe_fee: stripeFeeCents,
      platform_fee: platformFeeCents,
      member_pays: totalChargeCents,
      chapter_receives: transferAmountCents,
      payment_method_type: effectivePaymentMethodType,
      connected_account: stripeAccount.stripe_account_id,
      customer_id: stripeCustomerId || 'none (will be created on first payment)',
      using_saved_method: !!payment_method_id,
      save_for_future: !!save_payment_method
    })

    // Create Stripe Payment Intent with customer if available
    // ACH: Member pays dues only, chapter absorbs all fees
    // Card: Member pays dues + Stripe fees, chapter absorbs platform fee
    // Note: application_fee_amount and transfer_data.amount are mutually exclusive
    // We use transfer_data.amount to explicitly control chapter payout
    // Platform keeps: totalChargeCents - transferAmountCents - Stripe fees
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalChargeCents, // What member pays
      currency: 'usd',
      payment_method_types: [effectivePaymentMethodType],

      // Stripe Connect: Explicit transfer amount to chapter
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
        amount: transferAmountCents, // What chapter receives after all fees
      },

      // Metadata for tracking
      // SECURITY: Minimize PII - only store IDs for GDPR compliance
      metadata: {
        member_dues_id,
        member_id: memberDues.member_id || '',
        chapter_id: memberDues.user_profiles.chapter_id,
        payment_method_type: effectivePaymentMethodType,
        save_payment_method: save_payment_method ? 'true' : 'false',
        // Removed: member_name, member_email, period (PII minimization)
      },

      // Receipt email
      receipt_email: memberDues.user_profiles.email,

      // Description
      description: `Dues payment for ${memberDues.user_profiles.full_name} - ${memberDues.dues_configuration?.period_name || 'Dues'} ${memberDues.dues_configuration?.fiscal_year || ''}`,
    }

    // Only save payment method for future use if explicitly requested
    if (save_payment_method) {
      paymentIntentParams.setup_future_usage = 'off_session'
    }

    // Add customer if available (enables saved payment methods)
    if (stripeCustomerId) {
      // SECURITY: Verify customer ID belongs to the member owing dues
      // This prevents using another member's saved payment methods
      const { data: customerProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .eq('id', memberDues.member_id)
        .single()

      if (!customerProfile) {
        throw new Error('Invalid customer ID for this member. Cannot use another member\'s payment methods.')
      }

      paymentIntentParams.customer = stripeCustomerId
    }

    // If using a saved payment method, attach it and confirm immediately
    if (payment_method_id) {
      paymentIntentParams.payment_method = payment_method_id
      paymentIntentParams.confirm = true
      paymentIntentParams.off_session = true
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    // Store payment intent in database
    const { error: insertError } = await supabaseAdmin
      .from('payment_intents')
      .insert({
        chapter_id: memberDues.user_profiles.chapter_id,
        member_dues_id,
        member_id: memberDues.member_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent.client_secret,
        amount: amountToPay,
        platform_fee: (stripeFeeCents + platformFeeCents) / 100, // Combined fees
        net_amount: transferAmountCents / 100, // What chapter receives after all fees
        currency: 'usd',
        payment_method_type: effectivePaymentMethodType,
        status: 'pending',
      })

    if (insertError) {
      console.error('Error storing payment intent:', insertError)
      // Cancel the Stripe payment intent since we can't track it
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id)
      } catch (cancelError) {
        console.error('Failed to cancel payment intent:', cancelError)
      }
      throw new Error('Failed to initialize payment tracking. Please try again.')
    }

    // Build response based on payment intent status
    const response: any = {
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      dues_amount: amountToPay, // Original dues amount
      stripe_fee: stripeFeeCents / 100, // Stripe processing fee
      platform_fee: platformFeeCents / 100, // GreekPay platform fee (0.5%)
      total_charge: totalChargeCents / 100, // Total member pays
      chapter_receives: duesAmountCents / 100, // What chapter gets (full dues)
      payment_method_type: effectivePaymentMethodType,
      status: paymentIntent.status,
    }

    // If using saved payment method, indicate if action is required
    if (payment_method_id) {
      response.using_saved_method = true
      if (paymentIntent.status === 'requires_action') {
        response.requires_action = true
      } else if (paymentIntent.status === 'succeeded') {
        response.payment_complete = true
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-payment-intent function:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
