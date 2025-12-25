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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno&no-check'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

// Manual signature verification to avoid Deno compatibility issues
async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  // Parse the signature header
  const elements = signature.split(',')
  let timestamp = ''
  let v1Signature = ''

  for (const element of elements) {
    const [key, value] = element.split('=')
    if (key === 't') timestamp = value
    if (key === 'v1') v1Signature = value
  }

  if (!timestamp || !v1Signature) {
    console.error('Missing timestamp or v1 signature')
    return false
  }

  // Check timestamp (allow 5 minutes tolerance)
  const now = Math.floor(Date.now() / 1000)
  const webhookTimestamp = parseInt(timestamp, 10)
  if (Math.abs(now - webhookTimestamp) > 300) {
    console.error('Webhook timestamp too old')
    return false
  }

  // Create signed payload
  const signedPayload = `${timestamp}.${payload}`

  // Compute expected signature using Web Crypto API
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const data = encoder.encode(signedPayload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data)
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison
  if (expectedSignature.length !== v1Signature.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ v1Signature.charCodeAt(i)
  }

  return result === 0
}

Deno.serve(async (req) => {
  try {
    // Get the Stripe signature from headers
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    // Get the raw body
    const body = await req.text()

    // Verify webhook signature using manual verification
    const isValid = await verifyStripeSignature(body, signature, webhookSecret)
    if (!isValid) {
      console.error('Webhook signature verification failed')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400 }
      )
    }

    // Parse the event
    const event = JSON.parse(body) as Stripe.Event

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
      const { data: intentData, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntent.id)
        .single()

      // If payment intent not found in our DB, try to recover from Stripe metadata
      let intent = intentData
      if (intentError || !intentData) {
        console.log('Payment intent not found in database, attempting recovery from Stripe metadata:', paymentIntent.id)

        const metadata = paymentIntent.metadata
        if (metadata?.member_dues_id && metadata?.member_id && metadata?.chapter_id) {
          // Create the payment intent record from Stripe metadata
          const { data: recoveredIntent, error: createError } = await supabase
            .from('payment_intents')
            .insert({
              chapter_id: metadata.chapter_id,
              member_dues_id: metadata.member_dues_id,
              member_id: metadata.member_id,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_client_secret: null,
              amount: paymentIntent.amount / 100,
              platform_fee: 0,
              net_amount: paymentIntent.amount / 100,
              currency: 'usd',
              payment_method_type: metadata.payment_method_type || 'card',
              status: 'succeeded',
              succeeded_at: new Date().toISOString(),
              payment_method_last4: paymentMethodLast4,
              payment_method_brand: paymentMethodBrand,
              stripe_charge_id: paymentIntent.latest_charge as string || null,
            })
            .select()
            .single()

          if (createError || !recoveredIntent) {
            console.error('Failed to create payment intent from metadata:', createError)
            return new Response(
              JSON.stringify({ received: true, error: 'Could not recover payment intent' }),
              { status: 200 }
            )
          }

          console.log('Successfully recovered payment intent from Stripe metadata:', paymentIntent.id)
          intent = recoveredIntent
        } else {
          console.error('Payment intent not found and missing required metadata:', paymentIntent.id, metadata)
          return new Response(
            JSON.stringify({ received: true, error: 'Payment intent not found and missing metadata' }),
            { status: 200 }
          )
        }
      }

      // SECURITY: Check if payment already processed (idempotency)
      // Check dues_payments table for existing payment, not just payment_intent status
      const { data: existingPayment } = await supabase
        .from('dues_payments')
        .select('id')
        .eq('reference_number', paymentIntent.id)
        .single()

      if (existingPayment) {
        console.log('Payment already processed (idempotent):', paymentIntent.id)
        return new Response(
          JSON.stringify({ received: true, already_processed: true }),
          { status: 200 }
        )
      }

      // Map Stripe payment method to valid dues_payments constraint values
      const paymentMethodMap: Record<string, string> = {
        'card': 'Credit Card',
        'us_bank_account': 'ACH',
        'bank': 'ACH'
      }
      const mappedPaymentMethod = paymentMethodMap[intent.payment_method_type] || 'Credit Card'

      // Record the payment using the database function
      const { data: paymentResult, error: paymentError } = await supabase
        .rpc('record_dues_payment', {
          p_member_dues_id: intent.member_dues_id,
          p_amount: intent.amount,
          p_payment_method: mappedPaymentMethod,
          p_reference_number: paymentIntent.id,
          p_notes: `Payment via ${paymentMethodBrand} ending in ${paymentMethodLast4}`,
          p_payment_date: new Date().toISOString().split('T')[0],
          p_recorded_by: intent.member_id
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
        // Get user email from user_profiles (member_dues doesn't have email column)
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', intent.member_id)
          .single()

        if (userProfile && userProfile.email) {
          await supabase
            .from('email_queue')
            .insert({
              to_email: userProfile.email,
              to_user_id: intent.member_id,
              template_type: 'payment_confirmation',
              template_data: {
                payment_id: paymentResult.payment_id,
                amount_paid: intent.amount,
                payment_method: `${paymentMethodBrand} ending in ${paymentMethodLast4}`,
                remaining_balance: paymentResult.new_balance,
                total_paid: paymentResult.new_amount_paid,
                reference_number: paymentIntent.id
              },
              status: 'pending'
            })

          console.log('Payment confirmation email queued for:', userProfile.email)

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

      // ================================================
      // Save payment method if requested
      // ================================================
      try {
        const savePaymentMethod = paymentIntent.metadata?.save_payment_method === 'true'
        const paymentMethodId = paymentIntent.payment_method as string

        if (savePaymentMethod && paymentMethodId && intent.member_id) {
          // Check if this payment method is already saved
          const { data: existingSavedMethod } = await supabase
            .from('saved_payment_methods')
            .select('id')
            .eq('stripe_payment_method_id', paymentMethodId)
            .single()

          if (!existingSavedMethod) {
            // Retrieve payment method details from Stripe
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

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
            const { error: saveError } = await supabase
              .from('saved_payment_methods')
              .insert({
                user_id: intent.member_id,
                stripe_payment_method_id: paymentMethodId,
                type,
                last4,
                brand,
                is_default: false
              })

            if (saveError) {
              console.error('Error saving payment method:', saveError)
            } else {
              console.log('Payment method saved for future use:', paymentMethodId)
            }
          } else {
            console.log('Payment method already saved:', paymentMethodId)
          }
        }
      } catch (saveMethodError) {
        console.error('Error in save payment method flow:', saveMethodError)
        // Don't fail the webhook if saving payment method fails
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
          .select('member_dues_id, member_id, amount')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (intent) {
          // Get user email from user_profiles (member_dues doesn't have email column)
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('id', intent.member_id)
            .single()

          // Get balance from member_dues
          const { data: memberDues } = await supabase
            .from('member_dues')
            .select('balance')
            .eq('id', intent.member_dues_id)
            .single()

          if (userProfile && userProfile.email) {
            await supabase
              .from('email_queue')
              .insert({
                to_email: userProfile.email,
                to_user_id: intent.member_id,
                template_type: 'payment_failed',
                template_data: {
                  attempted_amount: intent.amount,
                  remaining_balance: memberDues?.balance || 0,
                  failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
                  reference_number: paymentIntent.id
                },
                status: 'pending'
              })

            console.log('Payment failed email queued for:', userProfile.email)
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
