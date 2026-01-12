/**
 * Create Installment Plan Edge Function
 *
 * Creates an installment plan for a member to pay their dues over multiple payments.
 * The first payment is charged immediately (unless skip_first_payment is true),
 * subsequent payments are scheduled.
 *
 * Request body:
 * {
 *   member_dues_id: UUID,
 *   num_installments: number (2, 3, or 4),
 *   stripe_payment_method_id: string (saved payment method for auto-charging),
 *   skip_first_payment?: boolean (if true, first payment was already processed via Stripe Checkout)
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   plan_id: string,
 *   total_amount: number,
 *   num_installments: number,
 *   installment_amount: number,
 *   first_payment_amount: number,
 *   first_payment_client_secret: string (only if skip_first_payment is false),
 *   schedule: Array<{ installment_number, amount, scheduled_date }>
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

// Fee calculation constants
const STRIPE_CARD_PERCENTAGE = 0.029
const STRIPE_CARD_FIXED = 0.30
const STRIPE_ACH_PERCENTAGE = 0.008
const STRIPE_ACH_CAP = 5.00
const PLATFORM_FEE_PERCENTAGE = 0.01

function calculateStripeFee(amount: number, paymentMethodType: string): number {
  if (paymentMethodType === 'us_bank_account') {
    const achFee = amount * STRIPE_ACH_PERCENTAGE
    return Math.min(achFee, STRIPE_ACH_CAP)
  } else {
    // Card: reverse calculate fee so member pays base + fee
    return Math.round(((amount + STRIPE_CARD_FIXED) / (1 - STRIPE_CARD_PERCENTAGE) - amount) * 100) / 100
  }
}

function calculateTotalCharge(amount: number, paymentMethodType: string): number {
  if (paymentMethodType === 'us_bank_account') {
    return amount // ACH: member pays just the dues amount
  } else {
    return Math.round((amount + calculateStripeFee(amount, 'card')) * 100) / 100
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // SECURITY: Rate limiting to prevent payment abuse
    const rateLimitIdentifier = getIdentifier(req, user.id, RATE_LIMITS.payment)
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      'create-installment-plan',
      rateLimitIdentifier,
      RATE_LIMITS.payment
    )
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders)
    }

    // Parse request
    const { member_dues_id, num_installments, stripe_payment_method_id, skip_first_payment } = await req.json()

    if (!member_dues_id) {
      throw new Error('member_dues_id is required')
    }
    if (!num_installments || num_installments < 2 || num_installments > 12) {
      throw new Error('num_installments must be between 2 and 12')
    }
    if (!stripe_payment_method_id) {
      throw new Error('stripe_payment_method_id is required for auto-charging')
    }

    const skipFirstPayment = skip_first_payment === true

    // Get member dues with related data
    const { data: memberDues, error: duesError } = await supabaseAdmin
      .from('member_dues')
      .select(`
        *,
        user_profiles:user_profiles!member_dues_member_id_fkey (
          id,
          full_name,
          email,
          chapter_id,
          stripe_customer_id
        ),
        dues_configuration (
          late_fee_enabled,
          late_fee_amount,
          late_fee_type,
          due_date
        )
      `)
      .eq('id', member_dues_id)
      .single()

    if (duesError || !memberDues) {
      throw new Error('Member dues record not found')
    }

    if (!memberDues.member_id) {
      throw new Error('Dues not linked to a member account')
    }

    // Verify user owns these dues
    if (memberDues.member_id !== user.id) {
      throw new Error('Unauthorized: You can only create plans for your own dues')
    }

    if (memberDues.balance <= 0) {
      throw new Error('No outstanding balance')
    }

    // Check eligibility
    const { data: eligibility, error: eligibilityError } = await supabaseAdmin
      .from('installment_eligibility')
      .select('*')
      .eq('member_dues_id', member_dues_id)
      .eq('is_eligible', true)
      .single()

    if (eligibilityError || !eligibility) {
      throw new Error('Not eligible for installment payments. Contact your treasurer.')
    }

    // Validate plan option is allowed
    if (!eligibility.allowed_plans.includes(num_installments)) {
      throw new Error(`${num_installments}-payment plan not allowed. Available: ${eligibility.allowed_plans.join(', ')}`)
    }

    // Validate deadline exists for deadline-based scheduling
    // Check flexible_plan_deadline first (for custom payment plans), then fall back to due_date
    const deadline = memberDues.flexible_plan_deadline || memberDues.due_date || memberDues.dues_configuration?.due_date
    if (!deadline) {
      throw new Error('Cannot create installment plan: no deadline configured for this dues period')
    }

    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadlineDate.setHours(0, 0, 0, 0)

    if (deadlineDate <= today) {
      throw new Error('Cannot create installment plan: deadline has already passed')
    }

    // Check for existing active plan
    const { data: existingPlan } = await supabaseAdmin
      .from('installment_plans')
      .select('id')
      .eq('member_dues_id', member_dues_id)
      .eq('status', 'active')
      .single()

    if (existingPlan) {
      throw new Error('An active installment plan already exists for these dues')
    }

    // Verify payment method belongs to user
    let savedMethod = null
    const { data: existingSavedMethod } = await supabaseAdmin
      .from('saved_payment_methods')
      .select('*')
      .eq('stripe_payment_method_id', stripe_payment_method_id)
      .eq('user_id', user.id)
      .single()

    if (existingSavedMethod) {
      savedMethod = existingSavedMethod
    } else if (skipFirstPayment) {
      // When skipFirstPayment is true, the payment was just made via Stripe Checkout
      // The webhook to save the payment method may not have run yet
      // Verify via Stripe API and save to database
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(stripe_payment_method_id)

        // Verify the payment method belongs to this customer
        if (paymentMethod.customer !== memberDues.user_profiles.stripe_customer_id) {
          throw new Error('Payment method does not belong to this customer')
        }

        let type = 'card'
        let last4 = ''
        let brand = ''

        if (paymentMethod.type === 'us_bank_account') {
          type = 'us_bank_account'
          last4 = paymentMethod.us_bank_account?.last4 || ''
          brand = paymentMethod.us_bank_account?.bank_name || 'Bank'
        } else if (paymentMethod.type === 'card') {
          type = 'card'
          last4 = paymentMethod.card?.last4 || ''
          brand = paymentMethod.card?.brand || 'card'
        }

        // Save to database
        const { data: newSavedMethod, error: saveError } = await supabaseAdmin
          .from('saved_payment_methods')
          .insert({
            user_id: user.id,
            stripe_payment_method_id: stripe_payment_method_id,
            type,
            last4,
            brand,
            is_default: false
          })
          .select()
          .single()

        if (saveError) {
          console.error('Error saving payment method:', saveError)
          // Continue anyway - use the Stripe data
          savedMethod = { type, last4, brand, stripe_payment_method_id }
        } else {
          savedMethod = newSavedMethod
          console.log('Payment method saved during installment plan creation:', stripe_payment_method_id)
        }
      } catch (stripeError) {
        console.error('Error verifying payment method via Stripe:', stripeError)
        throw new Error('Could not verify payment method')
      }
    } else {
      throw new Error('Payment method not found or does not belong to you')
    }

    // Get chapter's Stripe account
    const { data: stripeAccount } = await supabaseAdmin
      .from('stripe_connected_accounts')
      .select('*')
      .eq('chapter_id', memberDues.chapter_id)
      .single()

    if (!stripeAccount || !stripeAccount.charges_enabled) {
      throw new Error('Chapter payment processing not set up')
    }

    // Calculate installment amounts
    const totalAmount = memberDues.balance
    const baseAmount = Math.floor((totalAmount / num_installments) * 100) / 100
    const remainder = Math.round((totalAmount - (baseAmount * num_installments)) * 100) / 100
    const firstPaymentAmount = baseAmount + remainder

    // Create the installment plan using the database function
    const { data: planResult, error: planError } = await supabaseAdmin
      .rpc('create_installment_plan', {
        p_member_dues_id: member_dues_id,
        p_num_installments: num_installments,
        p_stripe_payment_method_id: stripe_payment_method_id,
        p_payment_method_type: savedMethod.type,
        p_payment_method_last4: savedMethod.last4,
        p_payment_method_brand: savedMethod.brand,
        p_deadline_date: deadline
      })

    if (planError || !planResult.success) {
      throw new Error(planResult?.error || 'Failed to create plan')
    }

    const planId = planResult.plan_id

    // Get the payment schedule
    const { data: payments } = await supabaseAdmin
      .from('installment_payments')
      .select('*')
      .eq('installment_plan_id', planId)
      .order('installment_number', { ascending: true })

    // Get the first installment
    const firstPayment = payments?.[0]
    if (!firstPayment) {
      throw new Error('Failed to create payment schedule')
    }

    let paymentIntentClientSecret: string | null = null
    let totalCharge: number = 0
    let stripeFee: number = 0

    if (skipFirstPayment) {
      // First payment was already processed via Stripe Checkout
      // Mark the first installment as paid and update the plan
      await supabaseAdmin
        .from('installment_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', firstPayment.id)

      // Update the plan to reflect first payment is done
      await supabaseAdmin
        .from('installment_plans')
        .update({
          installments_paid: 1,
          next_payment_date: payments?.[1]?.scheduled_date || null
        })
        .eq('id', planId)

      // Update member_dues amount_paid (add first installment amount)
      await supabaseAdmin
        .from('member_dues')
        .update({
          amount_paid: memberDues.amount_paid + firstPayment.amount,
          balance: memberDues.balance - firstPayment.amount
        })
        .eq('id', member_dues_id)

    } else {
      // Standard flow - create Stripe payment intent for the first installment
      stripeFee = calculateStripeFee(firstPayment.amount, savedMethod.type)
      totalCharge = calculateTotalCharge(firstPayment.amount, savedMethod.type)
      const platformFee = Math.round(firstPayment.amount * PLATFORM_FEE_PERCENTAGE * 100) / 100
      const chapterReceives = savedMethod.type === 'us_bank_account'
        ? firstPayment.amount - stripeFee - platformFee
        : firstPayment.amount - platformFee

      // Create Stripe PaymentIntent
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(totalCharge * 100), // Convert to cents
        currency: 'usd',
        customer: memberDues.user_profiles.stripe_customer_id,
        payment_method: stripe_payment_method_id,
        payment_method_types: [savedMethod.type],
        confirm: false, // Let frontend confirm
        setup_future_usage: 'off_session', // Important for future auto-charges
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
          amount: Math.round(chapterReceives * 100)
        },
        metadata: {
          member_dues_id: member_dues_id,
          member_id: user.id,
          chapter_id: memberDues.chapter_id,
          installment_plan_id: planId,
          installment_payment_id: firstPayment.id,
          installment_number: '1',
          payment_method_type: savedMethod.type,
          type: 'installment'
        }
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)
      paymentIntentClientSecret = paymentIntent.client_secret

      // Store payment intent in database
      await supabaseAdmin
        .from('payment_intents')
        .insert({
          chapter_id: memberDues.chapter_id,
          member_dues_id: member_dues_id,
          member_id: user.id,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_client_secret: paymentIntent.client_secret,
          amount: firstPayment.amount,
          stripe_fee: stripeFee,
          platform_fee: platformFee,
          total_charge: totalCharge,
          net_amount: chapterReceives,
          payment_method_type: savedMethod.type,
          status: 'pending'
        })

      // Update the first installment payment with the Stripe PI ID
      await supabaseAdmin
        .from('installment_payments')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          status: 'processing'
        })
        .eq('id', firstPayment.id)
    }

    // Format schedule for response
    const schedule = payments?.map(p => ({
      installment_number: p.installment_number,
      amount: p.amount,
      scheduled_date: p.scheduled_date,
      status: skipFirstPayment && p.installment_number === 1 ? 'paid' : (p.installment_number === 1 ? 'processing' : 'scheduled')
    }))

    const responseData: Record<string, unknown> = {
      success: true,
      plan_id: planId,
      total_amount: totalAmount,
      num_installments: num_installments,
      installment_amount: baseAmount,
      first_payment_amount: firstPaymentAmount,
      payment_method_type: savedMethod.type,
      schedule: schedule,
      skip_first_payment: skipFirstPayment,
      deadline_date: deadline
    }

    // Only include payment intent data if we created one
    if (!skipFirstPayment && paymentIntentClientSecret) {
      responseData.first_payment_client_secret = paymentIntentClientSecret
      responseData.first_payment_total_charge = totalCharge
      responseData.stripe_fee = stripeFee
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error creating installment plan:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
