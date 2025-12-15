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

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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

    // Calculate platform fee (if any) - this will be added ON TOP of dues
    const platformFeePercentage = parseFloat(Deno.env.get('STRIPE_PLATFORM_FEE_PERCENTAGE') || '0')
    const accountPlatformFee = stripeAccount.platform_fee_percentage || 0
    const totalPlatformFeePercentage = Math.max(platformFeePercentage, accountPlatformFee)

    // Fee is calculated on the dues amount and added to the total charge
    const platformFeeCents = Math.round(duesAmountCents * (totalPlatformFeePercentage / 100))

    // Total charge = dues + fee (member pays the fee, chapter receives full dues amount)
    const totalChargeCents = duesAmountCents + platformFeeCents

    console.log('Creating payment intent:', {
      dues_amount: duesAmountCents,
      platform_fee: platformFeeCents,
      total_charge: totalChargeCents,
      chapter_receives: duesAmountCents,
      connected_account: stripeAccount.stripe_account_id,
      customer_id: stripeCustomerId || 'none (will be created on first payment)',
      using_saved_method: !!payment_method_id,
      save_for_future: !!save_payment_method
    })

    // Determine the effective payment method type
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

    // Create Stripe Payment Intent with customer if available
    // Member pays: dues + fee. Chapter receives: full dues amount.
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalChargeCents, // Total charge including fee
      currency: 'usd',
      payment_method_types: ['card', 'us_bank_account'],

      // Stripe Connect: Fee goes to platform, rest goes to chapter
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
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
        platform_fee: platformFeeCents / 100,
        net_amount: duesAmountCents / 100, // Chapter receives full dues amount
        currency: 'usd',
        payment_method_type,
        status: 'pending',
      })

    if (insertError) {
      console.error('Error storing payment intent:', insertError)
      // Continue anyway - Stripe payment intent created
    }

    // Build response based on payment intent status
    const response: any = {
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      dues_amount: amountToPay, // Original dues amount
      processing_fee: platformFeeCents / 100, // Fee charged to member
      total_charge: totalChargeCents / 100, // Total member pays
      chapter_receives: duesAmountCents / 100, // What chapter gets (full dues)
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
