/**
 * Process Email Queue - Scheduled Edge Function
 *
 * Runs every minute to process pending email sending requests.
 * This function is triggered by a cron schedule: "* * * * *" (every minute)
 *
 * Workflow:
 * 1. Fetch pending items from email_queue
 * 2. For each item, send email using appropriate template
 * 3. Mark queue item as sent or failed
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

    console.log('Starting email queue processing...')

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

    // Get pending queue items
    const { data: queueItems, error: queueError } = await supabaseAdmin
      .rpc('get_pending_email_queue')

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Found ${queueItems?.length || 0} pending emails in queue`)

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No pending emails in queue'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let succeeded = 0
    let failed = 0

    // Process each queue item
    for (const item of queueItems) {
      try {
        console.log(`Processing email queue item ${item.queue_id} (type: ${item.template_type})`)

        // Mark as processing
        await supabaseAdmin.rpc('update_email_queue_status', {
          p_queue_id: item.queue_id,
          p_status: 'processing'
        })

        // Route to appropriate email sending function based on template type
        let emailSent = false

        switch (item.template_type) {
          case 'dues_invitation':
            emailSent = await sendDuesInvitation(item, supabaseAdmin)
            break

          case 'payment_confirmation':
            emailSent = await sendPaymentConfirmation(item, supabaseAdmin)
            break

          case 'payment_reminder':
            emailSent = await sendPaymentReminder(item, supabaseAdmin)
            break

          case 'payment_overdue':
            emailSent = await sendPaymentOverdue(item, supabaseAdmin)
            break

          case 'payment_failed':
            emailSent = await sendPaymentFailed(item, supabaseAdmin)
            break

          case 'welcome':
            emailSent = await sendWelcomeEmail(item, supabaseAdmin)
            break

          default:
            console.warn(`Unknown template type: ${item.template_type}`)
            throw new Error(`Unknown template type: ${item.template_type}`)
        }

        if (emailSent) {
          // Mark as sent
          await supabaseAdmin.rpc('update_email_queue_status', {
            p_queue_id: item.queue_id,
            p_status: 'sent'
          })

          processed++
          succeeded++
          console.log(`✓ Successfully sent email ${item.queue_id}`)
        } else {
          throw new Error('Email sending failed without specific error')
        }

      } catch (error) {
        console.error(`Error processing email ${item.queue_id}:`, error)

        // Mark as failed
        await supabaseAdmin.rpc('update_email_queue_status', {
          p_queue_id: item.queue_id,
          p_status: 'failed',
          p_error_message: error.message || 'Unknown error'
        })

        processed++
        failed++
      }
    }

    const result = {
      success: true,
      processed,
      succeeded,
      failed,
      message: `Processed ${processed} emails: ${succeeded} succeeded, ${failed} failed`
    }

    console.log('Email queue processing complete:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-email-queue function:', error)

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

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send dues invitation email
 */
async function sendDuesInvitation(item: any, supabaseAdmin: any): Promise<boolean> {
  const { dues_id, invitation_token } = item.template_data

  console.log(`Calling send-dues-invitation Edge Function for dues ${dues_id}`)

  const { data, error } = await supabaseAdmin.functions.invoke('send-dues-invitation', {
    body: {
      dues_id,
      email: item.to_email,
      invitation_token
    }
  })

  if (error) {
    console.error('Error calling send-dues-invitation:', error)
    throw error
  }

  if (!data?.success) {
    console.error('send-dues-invitation returned error:', data?.error)
    throw new Error(data?.error || 'Failed to send invitation')
  }

  return true
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmation(item: any, supabaseAdmin: any): Promise<boolean> {
  // TODO: Implement payment confirmation email
  console.log('Payment confirmation email not yet implemented')
  return true // Temporary
}

/**
 * Send payment reminder email
 */
async function sendPaymentReminder(item: any, supabaseAdmin: any): Promise<boolean> {
  // TODO: Implement payment reminder email
  console.log('Payment reminder email not yet implemented')
  return true // Temporary
}

/**
 * Send payment overdue email
 */
async function sendPaymentOverdue(item: any, supabaseAdmin: any): Promise<boolean> {
  // TODO: Implement payment overdue email
  console.log('Payment overdue email not yet implemented')
  return true // Temporary
}

/**
 * Send payment failed email
 */
async function sendPaymentFailed(item: any, supabaseAdmin: any): Promise<boolean> {
  // TODO: Implement payment failed email
  console.log('Payment failed email not yet implemented')
  return true // Temporary
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(item: any, supabaseAdmin: any): Promise<boolean> {
  // TODO: Implement welcome email
  console.log('Welcome email not yet implemented')
  return true // Temporary
}
