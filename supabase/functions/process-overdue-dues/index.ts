/**
 * Process Overdue Dues - Scheduled Edge Function
 *
 * Runs daily to automatically:
 * 1. Mark dues as overdue when past due date
 * 2. Apply late fees according to configuration
 * 3. Queue overdue notification emails
 *
 * This function is triggered by a cron schedule: "0 0 * * *" (daily at midnight UTC)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  try {
    // SECURITY: Verify request is from Supabase Cron or has valid service role key
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
      console.error('Unauthorized cron job access attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Starting overdue dues processing...')

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const today = new Date().toISOString().split('T')[0]

    // ========================================
    // 1. Find dues that are past due
    // ========================================

    const { data: overdueDues, error: overdueError } = await supabaseAdmin
      .from('member_dues')
      .select(`
        id,
        member_id,
        chapter_id,
        email,
        balance,
        due_date,
        late_fee,
        status,
        config_id,
        dues_configuration (
          late_fee_type,
          late_fee_amount,
          late_fee_percentage
        )
      `)
      .lt('due_date', today)
      .in('status', ['pending', 'partial'])
      .gt('balance', 0)

    if (overdueError) {
      console.error('Error fetching overdue dues:', overdueError)
      throw overdueError
    }

    console.log(`Found ${overdueDues?.length || 0} overdue dues records`)

    if (!overdueDues || overdueDues.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          marked_overdue: 0,
          late_fees_applied: 0,
          emails_queued: 0,
          message: 'No overdue dues found'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let markedOverdue = 0
    let lateFeesApplied = 0
    let emailsQueued = 0
    const errors: string[] = []

    // ========================================
    // 2. Process each overdue dues record
    // ========================================

    for (const dues of overdueDues) {
      try {
        const updates: any = {
          status: 'overdue',
          updated_at: new Date().toISOString()
        }

        // ========================================
        // 3. Calculate and apply late fee if configured
        // ========================================

        // Only apply late fee if not already applied
        if (
          !dues.late_fee &&
          dues.dues_configuration &&
          dues.dues_configuration.late_fee_type &&
          (dues.dues_configuration.late_fee_amount > 0 || dues.dues_configuration.late_fee_percentage > 0)
        ) {
          let lateFee = 0

          if (dues.dues_configuration.late_fee_type === 'flat') {
            lateFee = dues.dues_configuration.late_fee_amount || 0
          } else if (dues.dues_configuration.late_fee_type === 'percentage') {
            const percentage = dues.dues_configuration.late_fee_percentage || 0

            // SECURITY: Cap percentage at 25% to prevent unreasonable fees
            if (percentage > 25) {
              console.warn(`Late fee percentage capped at 25% (was ${percentage}%) for dues ${dues.id}`)
              lateFee = parseFloat(dues.balance.toString()) * 0.25
            } else {
              lateFee = parseFloat(dues.balance.toString()) * (percentage / 100)
            }
          }

          if (lateFee > 0) {
            // SECURITY: Cap total late fee at $100 to prevent unreasonable charges
            if (lateFee > 100) {
              console.warn(`Late fee capped at $100 (was $${lateFee.toFixed(2)}) for dues ${dues.id}`)
              lateFee = 100
            }

            // Round to 2 decimal places
            lateFee = Math.round(lateFee * 100) / 100

            // Calculate new balances directly (no RPC calls - more secure and performant)
            const currentBalance = parseFloat(dues.balance.toString())
            const newBalance = Math.round((currentBalance + lateFee) * 100) / 100

            updates.late_fee = lateFee
            updates.total_amount = newBalance
            updates.balance = newBalance

            console.log(`Applying late fee of $${lateFee} to dues ${dues.id} (new balance: $${newBalance})`)

            lateFeesApplied++
          }
        }

        // Update the member_dues record
        const { error: updateError } = await supabaseAdmin
          .from('member_dues')
          .update(updates)
          .eq('id', dues.id)

        if (updateError) {
          console.error(`Error updating dues ${dues.id}:`, updateError)
          errors.push(`Failed to update dues ${dues.id}: ${updateError.message}`)
          continue
        }

        markedOverdue++

        // ========================================
        // 4. Queue overdue notification email
        // ========================================

        // Only queue email if not already sent
        if (!dues.overdue_email_sent) {
          const { error: emailError } = await supabaseAdmin
            .from('email_queue')
            .insert({
              to_email: dues.email,
              to_user_id: dues.member_id,
              template_type: 'payment_overdue',
              template_data: {
                dues_id: dues.id,
                balance: parseFloat(dues.balance.toString()),
                late_fee: updates.late_fee || 0,
                due_date: dues.due_date,
                days_overdue: Math.floor(
                  (new Date().getTime() - new Date(dues.due_date).getTime()) / (1000 * 60 * 60 * 24)
                )
              },
              status: 'pending'
            })

          if (emailError) {
            // Don't fail the whole process if email queueing fails
            console.error(`Error queueing email for dues ${dues.id}:`, emailError)
            errors.push(`Failed to queue email for dues ${dues.id}: ${emailError.message}`)
          } else {
            emailsQueued++

            // Mark that overdue email was queued
            await supabaseAdmin
              .from('member_dues')
              .update({
                overdue_email_sent: true,
                overdue_email_sent_at: new Date().toISOString()
              })
              .eq('id', dues.id)
          }
        }

      } catch (error) {
        console.error(`Error processing dues ${dues.id}:`, error)
        errors.push(`Failed to process dues ${dues.id}: ${error.message}`)
      }
    }

    // ========================================
    // 5. Return summary
    // ========================================

    const result = {
      success: true,
      processed: overdueDues.length,
      marked_overdue: markedOverdue,
      late_fees_applied: lateFeesApplied,
      emails_queued: emailsQueued,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${overdueDues.length} overdue dues: ${markedOverdue} marked overdue, ${lateFeesApplied} late fees applied, ${emailsQueued} emails queued`
    }

    console.log('Overdue dues processing complete:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-overdue-dues function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
