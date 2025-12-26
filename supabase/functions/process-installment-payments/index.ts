/**
 * Process Installment Payments - Scheduled Edge Function
 *
 * Runs daily to automatically:
 * 1. Find scheduled installment payments due today or overdue
 * 2. Charge the saved payment method via Stripe
 * 3. Update payment status and member dues balance
 * 4. Apply late fees if payment fails
 * 5. Queue notification emails
 *
 * This function should be triggered by a cron schedule: "0 8 * * *" (daily at 8 AM UTC)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

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
    return Math.round(((amount + STRIPE_CARD_FIXED) / (1 - STRIPE_CARD_PERCENTAGE) - amount) * 100) / 100
  }
}

function calculateTotalCharge(amount: number, paymentMethodType: string): number {
  if (paymentMethodType === 'us_bank_account') {
    return amount
  } else {
    return Math.round((amount + calculateStripeFee(amount, 'card')) * 100) / 100
  }
}

serve(async (req) => {
  try {
    // SECURITY: Verify request is from Supabase Cron or has valid service role key
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
      console.error('Unauthorized cron job access attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting installment payments processing...')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const today = new Date().toISOString().split('T')[0]

    // ========================================
    // 1. Find scheduled payments due today or overdue
    // ========================================

    const { data: duePayments, error: fetchError } = await supabaseAdmin
      .from('installment_payments')
      .select(`
        *,
        installment_plans!inner (
          id,
          member_id,
          chapter_id,
          member_dues_id,
          stripe_payment_method_id,
          payment_method_type,
          status,
          late_fee_enabled,
          late_fee_amount,
          late_fee_type
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_date', today)
      .eq('installment_plans.status', 'active')

    if (fetchError) {
      console.error('Error fetching due payments:', fetchError)
      throw fetchError
    }

    console.log(`Found ${duePayments?.length || 0} installment payments due`)

    if (!duePayments || duePayments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          succeeded: 0,
          failed: 0,
          message: 'No installment payments due'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let succeeded = 0
    let failed = 0
    const errors: string[] = []

    // ========================================
    // 2. Process each due payment
    // ========================================

    for (const payment of duePayments) {
      try {
        processed++
        const plan = payment.installment_plans

        console.log(`Processing installment ${payment.installment_number} for plan ${plan.id}`)

        // Get member's Stripe customer ID
        const { data: memberProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('stripe_customer_id, email, full_name')
          .eq('id', plan.member_id)
          .single()

        if (!memberProfile?.stripe_customer_id) {
          throw new Error('Member has no Stripe customer ID')
        }

        // Get chapter's Stripe account
        const { data: stripeAccount } = await supabaseAdmin
          .from('stripe_connected_accounts')
          .select('stripe_account_id, charges_enabled')
          .eq('chapter_id', plan.chapter_id)
          .single()

        if (!stripeAccount?.charges_enabled) {
          throw new Error('Chapter Stripe account not enabled')
        }

        // Calculate fees
        const amountToCharge = payment.total_amount // Includes any late fees from previous failures
        const stripeFee = calculateStripeFee(amountToCharge, plan.payment_method_type)
        const totalCharge = calculateTotalCharge(amountToCharge, plan.payment_method_type)
        const platformFee = Math.round(amountToCharge * PLATFORM_FEE_PERCENTAGE * 100) / 100
        const chapterReceives = plan.payment_method_type === 'us_bank_account'
          ? amountToCharge - stripeFee - platformFee
          : amountToCharge - platformFee

        // Create and confirm Stripe PaymentIntent (off_session)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalCharge * 100),
          currency: 'usd',
          customer: memberProfile.stripe_customer_id,
          payment_method: plan.stripe_payment_method_id,
          payment_method_types: [plan.payment_method_type],
          off_session: true, // Important: auto-charge without customer present
          confirm: true, // Confirm immediately
          transfer_data: {
            destination: stripeAccount.stripe_account_id,
            amount: Math.round(chapterReceives * 100)
          },
          metadata: {
            member_dues_id: plan.member_dues_id,
            member_id: plan.member_id,
            chapter_id: plan.chapter_id,
            installment_plan_id: plan.id,
            installment_payment_id: payment.id,
            installment_number: String(payment.installment_number),
            payment_method_type: plan.payment_method_type,
            type: 'installment_auto'
          }
        })

        if (paymentIntent.status === 'succeeded') {
          // Payment succeeded
          console.log(`Payment succeeded for installment ${payment.installment_number}`)

          // Store payment intent record
          const { data: piRecord } = await supabaseAdmin
            .from('payment_intents')
            .insert({
              chapter_id: plan.chapter_id,
              member_dues_id: plan.member_dues_id,
              member_id: plan.member_id,
              stripe_payment_intent_id: paymentIntent.id,
              amount: amountToCharge,
              stripe_fee: stripeFee,
              platform_fee: platformFee,
              total_charge: totalCharge,
              net_amount: chapterReceives,
              payment_method_type: plan.payment_method_type,
              status: 'succeeded',
              succeeded_at: new Date().toISOString()
            })
            .select('id')
            .single()

          // Record the installment payment success
          await supabaseAdmin.rpc('record_installment_payment', {
            p_installment_payment_id: payment.id,
            p_stripe_payment_intent_id: paymentIntent.id,
            p_payment_intent_id: piRecord?.id || null
          })

          // Record dues payment
          await supabaseAdmin
            .from('dues_payments')
            .insert({
              member_dues_id: plan.member_dues_id,
              member_id: plan.member_id,
              chapter_id: plan.chapter_id,
              amount: amountToCharge,
              payment_method: plan.payment_method_type === 'us_bank_account' ? 'ACH' : 'Credit Card',
              payment_date: today,
              reference_number: paymentIntent.id,
              notes: `Installment ${payment.installment_number} of ${plan.num_installments || '?'} (auto-charged)`
            })

          // Update member dues balance
          const { data: currentDues } = await supabaseAdmin
            .from('member_dues')
            .select('balance, amount_paid, total_amount')
            .eq('id', plan.member_dues_id)
            .single()

          if (currentDues) {
            const newAmountPaid = currentDues.amount_paid + amountToCharge
            const newBalance = Math.max(0, currentDues.total_amount - newAmountPaid)
            const newStatus = newBalance <= 0 ? 'paid' : 'partial'

            await supabaseAdmin
              .from('member_dues')
              .update({
                amount_paid: newAmountPaid,
                balance: newBalance,
                status: newStatus,
                paid_date: newBalance <= 0 ? today : null
              })
              .eq('id', plan.member_dues_id)
          }

          // Queue success notification email
          await supabaseAdmin
            .from('email_queue')
            .insert({
              to_email: memberProfile.email,
              to_name: memberProfile.full_name,
              template_type: 'installment_payment_success',
              template_data: {
                member_name: memberProfile.full_name,
                installment_number: payment.installment_number,
                amount: amountToCharge,
                remaining_installments: (plan.num_installments || 0) - payment.installment_number
              },
              chapter_id: plan.chapter_id
            })

          succeeded++
        } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
          // Payment needs additional action - treat as failed for auto-charge
          console.log(`Payment requires action for installment ${payment.installment_number}`)

          await handlePaymentFailure(
            supabaseAdmin,
            payment,
            plan,
            memberProfile,
            'Payment requires additional verification',
            'requires_action'
          )
          failed++
        } else {
          // Other status - mark as failed
          console.log(`Payment status ${paymentIntent.status} for installment ${payment.installment_number}`)

          await handlePaymentFailure(
            supabaseAdmin,
            payment,
            plan,
            memberProfile,
            `Payment status: ${paymentIntent.status}`,
            paymentIntent.status
          )
          failed++
        }
      } catch (error) {
        console.error(`Error processing payment ${payment.id}:`, error)

        // Handle Stripe-specific errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorCode = (error as any)?.code || 'unknown'

        try {
          const plan = payment.installment_plans
          const { data: memberProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('email, full_name')
            .eq('id', plan.member_id)
            .single()

          await handlePaymentFailure(
            supabaseAdmin,
            payment,
            plan,
            memberProfile,
            errorMessage,
            errorCode
          )
        } catch (innerError) {
          console.error('Error handling payment failure:', innerError)
        }

        errors.push(`Payment ${payment.id}: ${errorMessage}`)
        failed++
      }
    }

    // ========================================
    // 3. Process retries for previously failed payments
    // ========================================

    const { data: retryPayments } = await supabaseAdmin
      .from('installment_payments')
      .select(`
        *,
        installment_plans!inner (
          id,
          member_id,
          chapter_id,
          member_dues_id,
          stripe_payment_method_id,
          payment_method_type,
          status
        )
      `)
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .lte('next_retry_at', new Date().toISOString())
      .eq('installment_plans.status', 'active')

    if (retryPayments && retryPayments.length > 0) {
      console.log(`Found ${retryPayments.length} payments to retry`)
      // Note: Retries would follow similar logic as above
      // For now, just log them - full retry implementation can be added
    }

    console.log(`Completed: ${processed} processed, ${succeeded} succeeded, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        succeeded,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Fatal error in process-installment-payments:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function handlePaymentFailure(
  supabase: any,
  payment: any,
  plan: any,
  memberProfile: any,
  failureReason: string,
  failureCode: string
) {
  // Use database function to handle failure and apply late fee
  await supabase.rpc('fail_installment_payment', {
    p_installment_payment_id: payment.id,
    p_failure_reason: failureReason,
    p_failure_code: failureCode,
    p_apply_late_fee: plan.late_fee_enabled && payment.late_fee === 0
  })

  // Queue failure notification email
  if (memberProfile) {
    await supabase
      .from('email_queue')
      .insert({
        to_email: memberProfile.email,
        to_name: memberProfile.full_name,
        template_type: 'installment_payment_failed',
        template_data: {
          member_name: memberProfile.full_name,
          installment_number: payment.installment_number,
          amount: payment.total_amount,
          failure_reason: failureReason,
          retry_count: payment.retry_count + 1
        },
        chapter_id: plan.chapter_id
      })
  }
}
