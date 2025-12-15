/**
 * Send Payment Reminders - Scheduled Edge Function
 *
 * Runs daily to automatically send payment reminder emails:
 * - 7 days before due date - friendly reminder
 *
 * Overdue notifications are handled separately by process-overdue-dues function.
 *
 * This function is triggered by a cron schedule: "0 14 * * *" (daily at 2 PM UTC / 9 AM EST)
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

    console.log('Starting payment reminder processing...')

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

    const today = new Date()

    // Calculate date for 7-day reminder
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0]

    let emailsQueued = 0
    const errors: string[] = []

    // ========================================
    // Send reminders 7 days before due date
    // ========================================

    const { data: upcomingDues, error: upcomingError } = await supabaseAdmin
      .from('member_dues')
      .select('id, member_id, email, balance, due_date')
      .eq('due_date', sevenDaysFromNowStr)
      .in('status', ['pending', 'partial'])
      .gt('balance', 0)
      .eq('reminder_email_sent', false)

    if (upcomingError) {
      console.error('Error fetching upcoming dues:', upcomingError)
    } else if (upcomingDues && upcomingDues.length > 0) {
      console.log(`Found ${upcomingDues.length} dues with reminders needed (7 days before)`)

      for (const dues of upcomingDues) {
        try {
          const { error: emailError } = await supabaseAdmin
            .from('email_queue')
            .insert({
              to_email: dues.email,
              to_user_id: dues.member_id,
              template_type: 'payment_reminder',
              template_data: {
                dues_id: dues.id,
                balance: parseFloat(dues.balance.toString()),
                due_date: dues.due_date,
                days_until_due: 7,
                reminder_type: 'upcoming'
              },
              status: 'pending'
            })

          if (emailError) {
            console.error(`Error queueing reminder for dues ${dues.id}:`, emailError)
            errors.push(`Failed to queue reminder for dues ${dues.id}: ${emailError.message}`)
          } else {
            // Mark reminder as sent
            await supabaseAdmin
              .from('member_dues')
              .update({
                reminder_email_sent: true,
                reminder_email_sent_at: new Date().toISOString()
              })
              .eq('id', dues.id)

            emailsQueued++
          }
        } catch (error) {
          console.error(`Error processing reminder for dues ${dues.id}:`, error)
          errors.push(`Failed to process reminder for dues ${dues.id}: ${error.message}`)
        }
      }
    }

    // ========================================
    // Return summary
    // ========================================

    const result = {
      success: true,
      emails_queued: emailsQueued,
      errors: errors.length > 0 ? errors : undefined,
      message: `Queued ${emailsQueued} payment reminder emails`
    }

    console.log('Payment reminder processing complete:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-payment-reminders function:', error)

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
