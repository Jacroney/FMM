/**
 * Stripe Webhook Handler Edge Function
 *
 * Handles Stripe webhook events for payment processing.
 * Must be configured in Stripe Dashboard with webhook URL.
 *
 * Handled events:
 * - payment_intent.succeeded: Payment completed successfully
 * - payment_intent.payment_failed: Payment failed
 * - payment_intent.canceled: Payment canceled
 * - account.updated: Connected account status changed
 *
 * IMPORTANT: Set STRIPE_WEBHOOK_SECRET in Supabase secrets
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  try {
    // Get the Stripe signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    // Get the raw body
    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      // SECURITY: Don't log specific error details to prevent information leakage
      console.error('Webhook signature verification failed')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400 }
      )
    }

    console.log('Received webhook event:', event.type)

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ================================================
    // EVENT: payment_intent.succeeded
    // ================================================
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      console.log('Payment succeeded:', paymentIntent.id)

      // Get payment method details
      let paymentMethodLast4 = ''
      let paymentMethodBrand = ''
      if (paymentIntent.payment_method) {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method as string
        )
        if (paymentMethod.type === 'us_bank_account') {
          paymentMethodLast4 = paymentMethod.us_bank_account?.last4 || ''
          paymentMethodBrand = 'bank'
        } else if (paymentMethod.type === 'card') {
          paymentMethodLast4 = paymentMethod.card?.last4 || ''
          paymentMethodBrand = paymentMethod.card?.brand || 'card'
        }
      }

      // Update payment intent status in database
      const { error: updateError } = await supabase
        .from('payment_intents')
        .update({
          status: 'succeeded',
          succeeded_at: new Date().toISOString(),
          payment_method_last4: paymentMethodLast4,
          payment_method_brand: paymentMethodBrand,
          stripe_charge_id: paymentIntent.latest_charge as string || null,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id)

      if (updateError) {
        console.error('Error updating payment intent:', updateError)
      }

      // Get payment intent data from our database
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .single()

      if (intentError || !intent) {
        console.error('Payment intent not found in database:', paymentIntent.id)
        // Still return success to Stripe
        return new Response(
          JSON.stringify({ received: true, error: 'Payment intent not found' }),
          { status: 200 }
        )
      }

      // SECURITY: Check if payment already processed (idempotency)
      // Stripe webhooks can be retried, so we need to prevent duplicate recording
      if (intent.status === 'succeeded') {
        console.log('Payment already processed (idempotent):', paymentIntent.id)
        return new Response(
          JSON.stringify({ received: true, already_processed: true }),
          { status: 200 }
        )
      }

      // Record the payment using the database function
      const { data: paymentResult, error: paymentError } = await supabase
        .rpc('record_dues_payment', {
          p_member_dues_id: intent.member_dues_id,
          p_payment_amount: intent.amount,
          p_payment_method: `stripe_${intent.payment_method_type}`,
          p_reference_number: paymentIntent.id,
          p_notes: `Payment via ${paymentMethodBrand} ending in ${paymentMethodLast4}`,
          p_stripe_charge_id: paymentIntent.latest_charge as string || null,
          p_payment_intent_id: intent.id
        })

      if (paymentError) {
        console.error('Error recording payment:', paymentError)
        // Log error but still return success to Stripe
        return new Response(
          JSON.stringify({
            received: true,
            error: 'Payment recorded in Stripe but failed to update database'
          }),
          { status: 200 }
        )
      }

      console.log('Payment recorded successfully:', paymentResult)

      // Queue payment confirmation email
      try {
        const { data: memberDues } = await supabase
          .from('member_dues')
          .select('email, member_id, balance, amount_paid')
          .eq('id', intent.member_dues_id)
          .single()

        if (memberDues && memberDues.email) {
          await supabase
            .from('email_queue')
            .insert({
              to_email: memberDues.email,
              to_user_id: memberDues.member_id,
              template_type: 'payment_confirmation',
              template_data: {
                payment_id: paymentResult.payment_id,
                amount_paid: intent.amount,
                payment_method: `${paymentMethodBrand} ending in ${paymentMethodLast4}`,
                remaining_balance: memberDues.balance,
                total_paid: memberDues.amount_paid,
                reference_number: paymentIntent.id
              },
              status: 'pending'
            })

          console.log('Payment confirmation email queued for:', memberDues.email)

          // Mark confirmation as sent in member_dues
          await supabase
            .from('member_dues')
            .update({
              payment_confirmation_sent: true,
              payment_confirmation_sent_at: new Date().toISOString()
            })
            .eq('id', intent.member_dues_id)
        }
      } catch (emailError) {
        console.error('Error queueing payment confirmation email:', emailError)
        // Don't fail the webhook if email queueing fails
      }

      return new Response(
        JSON.stringify({ received: true, payment_recorded: true }),
        { status: 200 }
      )
    }

    // ================================================
    // EVENT: payment_intent.payment_failed
    // ================================================
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      console.log('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message)

      // Update payment intent status
      await supabase
        .from('payment_intents')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_code: paymentIntent.last_payment_error?.code || null,
          failure_message: paymentIntent.last_payment_error?.message || 'Payment failed',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id)

      // Queue payment failed notification email
      try {
        const { data: intent } = await supabase
          .from('payment_intents')
          .select('member_dues_id, amount')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (intent) {
          const { data: memberDues } = await supabase
            .from('member_dues')
            .select('email, member_id, balance')
            .eq('id', intent.member_dues_id)
            .single()

          if (memberDues && memberDues.email) {
            await supabase
              .from('email_queue')
              .insert({
                to_email: memberDues.email,
                to_user_id: memberDues.member_id,
                template_type: 'payment_failed',
                template_data: {
                  attempted_amount: intent.amount,
                  remaining_balance: memberDues.balance,
                  failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
                  reference_number: paymentIntent.id
                },
                status: 'pending'
              })

            console.log('Payment failed email queued for:', memberDues.email)
          }
        }
      } catch (emailError) {
        console.error('Error queueing payment failed email:', emailError)
        // Don't fail the webhook if email queueing fails
      }

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200 }
      )
    }

    // ================================================
    // EVENT: payment_intent.canceled
    // ================================================
    if (event.type === 'payment_intent.canceled') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      console.log('Payment canceled:', paymentIntent.id)

      await supabase
        .from('payment_intents')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id)

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200 }
      )
    }

    // ================================================
    // EVENT: payment_intent.processing
    // ================================================
    if (event.type === 'payment_intent.processing') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      console.log('Payment processing:', paymentIntent.id)

      await supabase
        .from('payment_intents')
        .update({
          status: 'processing',
          processing_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentIntent.id)

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200 }
      )
    }

    // ================================================
    // EVENT: account.updated
    // ================================================
    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account

      console.log('Account updated:', account.id)

      // Update connected account status
      const isComplete = account.charges_enabled && account.payouts_enabled && account.details_submitted

      await supabase
        .from('stripe_connected_accounts')
        .update({
          onboarding_completed: isComplete,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          details_submitted: account.details_submitted || false,
          has_bank_account: (account.external_accounts?.data?.length ?? 0) > 0,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', account.id)

      return new Response(
        JSON.stringify({ received: true }),
        { status: 200 }
      )
    }

    // ================================================
    // OTHER EVENTS
    // ================================================
    console.log('Unhandled event type:', event.type)

    return new Response(
      JSON.stringify({ received: true, unhandled: true }),
      { status: 200 }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})
