/**
 * Create Payment Intent Edge Function
 *
 * Creates a Stripe Payment Intent for a member to pay their dues.
 * Supports both ACH (bank account) and card payments.
 *
 * Request body:
 * {
 *   member_dues_id: UUID,
 *   payment_method_type: 'us_bank_account' | 'card',
 *   payment_amount?: number (optional, defaults to full balance)
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   client_secret: string,
 *   payment_intent_id: string,
 *   amount: number
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { member_dues_id, payment_method_type, payment_amount } = await req.json()

    if (!member_dues_id) {
      throw new Error('member_dues_id is required')
    }

    if (!payment_method_type || !['us_bank_account', 'card'].includes(payment_method_type)) {
      throw new Error('payment_method_type must be "us_bank_account" or "card"')
    }

    // Get member dues information with related data
    const { data: memberDues, error: duesError } = await supabaseAdmin
      .from('member_dues')
      .select(`
        *,
        members (
          id,
          name,
          email,
          chapter_id
        ),
        dues_configurations (
          period_name,
          fiscal_year
        )
      `)
      .eq('id', member_dues_id)
      .single()

    if (duesError || !memberDues) {
      throw new Error('Member dues record not found')
    }

    // Verify user is authorized (either the member themselves or chapter admin)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, chapter_id')
      .eq('id', user.id)
      .single()

    const isAuthorized =
      (memberDues.members.email === user.email) || // Member paying their own dues
      (profile?.chapter_id === memberDues.members.chapter_id && ['admin', 'exec'].includes(profile.role)) // Chapter admin

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
      .eq('chapter_id', memberDues.members.chapter_id)
      .single()

    if (accountError || !stripeAccount) {
      throw new Error('Chapter has not set up payment processing. Please contact your treasurer.')
    }

    if (!stripeAccount.onboarding_completed || !stripeAccount.charges_enabled) {
      throw new Error('Chapter payment processing is not fully set up. Please contact your treasurer.')
    }

    // Calculate amounts in cents
    const amountCents = Math.round(amountToPay * 100)

    // Calculate platform fee (if any)
    const platformFeePercentage = parseFloat(Deno.env.get('STRIPE_PLATFORM_FEE_PERCENTAGE') || '0')
    const accountPlatformFee = stripeAccount.platform_fee_percentage || 0
    const totalPlatformFeePercentage = Math.max(platformFeePercentage, accountPlatformFee)

    const platformFeeCents = Math.round(amountCents * (totalPlatformFeePercentage / 100))
    const netAmountCents = amountCents - platformFeeCents

    console.log('Creating payment intent:', {
      amount: amountCents,
      platform_fee: platformFeeCents,
      net_amount: netAmountCents,
      connected_account: stripeAccount.stripe_account_id
    })

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method_types: [payment_method_type],

      // Stripe Connect: Charge to connected account
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },

      // Automatic payment methods for better conversion
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },

      // Metadata for tracking
      metadata: {
        member_dues_id,
        member_id: memberDues.member_id,
        member_name: memberDues.members.name,
        member_email: memberDues.members.email,
        chapter_id: memberDues.members.chapter_id,
        period: `${memberDues.dues_configurations.period_name} ${memberDues.dues_configurations.fiscal_year}`,
        payment_method_type,
      },

      // Receipt email
      receipt_email: memberDues.members.email,

      // Description
      description: `Dues payment for ${memberDues.members.name} - ${memberDues.dues_configurations.period_name} ${memberDues.dues_configurations.fiscal_year}`,
    })

    // Store payment intent in database
    const { error: insertError } = await supabaseAdmin
      .from('payment_intents')
      .insert({
        chapter_id: memberDues.members.chapter_id,
        member_dues_id,
        member_id: memberDues.member_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent.client_secret,
        amount: amountToPay,
        platform_fee: platformFeeCents / 100,
        net_amount: netAmountCents / 100,
        currency: 'usd',
        payment_method_type,
        status: 'pending',
      })

    if (insertError) {
      console.error('Error storing payment intent:', insertError)
      // Continue anyway - Stripe payment intent created
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: amountToPay,
        platform_fee: platformFeeCents / 100,
        net_amount: netAmountCents / 100,
      }),
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
