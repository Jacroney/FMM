/**
 * Send Payment Reminders - Scheduled Edge Function
 *
 * Runs daily to automatically send payment reminder emails:
 * 1. 3 days before due date - friendly reminder
 * 2. On due date - payment due today reminder
 * 3. 3 days after due date (if not yet marked overdue) - past due notice
 *
 * This function is triggered by a cron schedule: "0 8 * * *" (daily at 8 AM UTC)
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
    const todayStr = today.toISOString().split('T')[0]

    // Calculate dates for reminders
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDaysFromNowStr = threeDaysFromNow.toISOString().split('T')[0]

    let emailsQueued = 0
    const errors: string[] = []

    // ========================================
    // 1. Send reminders 3 days before due date
    // ========================================

    const { data: upcomingDues, error: upcomingError } = await supabaseAdmin
      .from('member_dues')
      .select('id, member_id, email, balance, due_date')
      .eq('due_date', threeDaysFromNowStr)
      .in('status', ['pending', 'partial'])
      .gt('balance', 0)
      .eq('reminder_email_sent', false)

    if (upcomingError) {
      console.error('Error fetching upcoming dues:', upcomingError)
    } else if (upcomingDues && upcomingDues.length > 0) {
      console.log(`Found ${upcomingDues.length} dues with reminders needed (3 days before)`)

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
                days_until_due: 3,
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
    // 2. Send reminders on due date
    // ========================================

    const { data: dueTodayDues, error: dueTodayError } = await supabaseAdmin
      .from('member_dues')
      .select('id, member_id, email, balance, due_date')
      .eq('due_date', todayStr)
      .in('status', ['pending', 'partial'])
      .gt('balance', 0)

    if (dueTodayError) {
      console.error('Error fetching dues due today:', dueTodayError)
    } else if (dueTodayDues && dueTodayDues.length > 0) {
      console.log(`Found ${dueTodayDues.length} dues due today`)

      for (const dues of dueTodayDues) {
        try {
          // Check if we already sent a reminder for this dues (avoid duplicate)
          const { data: existingEmail } = await supabaseAdmin
            .from('email_queue')
            .select('id')
            .eq('to_email', dues.email)
            .eq('template_type', 'payment_reminder')
            .contains('template_data', { dues_id: dues.id, reminder_type: 'due_today' })
            .limit(1)

          if (existingEmail && existingEmail.length > 0) {
            console.log(`Reminder already sent for dues ${dues.id}`)
            continue
          }

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
                days_until_due: 0,
                reminder_type: 'due_today'
              },
              status: 'pending'
            })

          if (emailError) {
            console.error(`Error queueing due today reminder for dues ${dues.id}:`, emailError)
            errors.push(`Failed to queue due today reminder for dues ${dues.id}: ${emailError.message}`)
          } else {
            emailsQueued++
          }
        } catch (error) {
          console.error(`Error processing due today reminder for dues ${dues.id}:`, error)
          errors.push(`Failed to process due today reminder for dues ${dues.id}: ${error.message}`)
        }
      }
    }

    // ========================================
    // 3. Send reminders 3 days after due date (before overdue processing)
    // ========================================

    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0]

    const { data: pastDueDues, error: pastDueError } = await supabaseAdmin
      .from('member_dues')
      .select('id, member_id, email, balance, due_date')
      .eq('due_date', threeDaysAgoStr)
      .in('status', ['pending', 'partial']) // Not yet marked overdue
      .gt('balance', 0)

    if (pastDueError) {
      console.error('Error fetching past due dues:', pastDueError)
    } else if (pastDueDues && pastDueDues.length > 0) {
      console.log(`Found ${pastDueDues.length} dues 3 days past due`)

      for (const dues of pastDueDues) {
        try {
          // Check if we already sent a past due reminder
          const { data: existingEmail } = await supabaseAdmin
            .from('email_queue')
            .select('id')
            .eq('to_email', dues.email)
            .eq('template_type', 'payment_reminder')
            .contains('template_data', { dues_id: dues.id, reminder_type: 'past_due' })
            .limit(1)

          if (existingEmail && existingEmail.length > 0) {
            console.log(`Past due reminder already sent for dues ${dues.id}`)
            continue
          }

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
                days_overdue: 3,
                reminder_type: 'past_due'
              },
              status: 'pending'
            })

          if (emailError) {
            console.error(`Error queueing past due reminder for dues ${dues.id}:`, emailError)
            errors.push(`Failed to queue past due reminder for dues ${dues.id}: ${emailError.message}`)
          } else {
            emailsQueued++
          }
        } catch (error) {
          console.error(`Error processing past due reminder for dues ${dues.id}:`, error)
          errors.push(`Failed to process past due reminder for dues ${dues.id}: ${error.message}`)
        }
      }
    }

    // ========================================
    // 4. Return summary
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
