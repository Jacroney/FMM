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

          case 'member_invitation':
            emailSent = await sendMemberInvitation(item, supabaseAdmin)
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
  const {
    payment_id,
    amount_paid,
    payment_method,
    remaining_balance,
    total_paid,
    reference_number
  } = item.template_data

  console.log(`Sending payment confirmation email for payment ${payment_id}`)

  // Get member info
  const { data: userProfile, error: userError } = await supabaseAdmin
    .from('user_profiles')
    .select('full_name, chapter_id')
    .eq('id', item.to_user_id)
    .single()

  if (userError || !userProfile) {
    console.error('Error fetching user profile:', userError)
    throw new Error('Failed to fetch user profile')
  }

  // Get chapter info
  const { data: chapter, error: chapterError } = await supabaseAdmin
    .from('chapters')
    .select('name')
    .eq('id', userProfile.chapter_id)
    .single()

  if (chapterError || !chapter) {
    console.error('Error fetching chapter:', chapterError)
    throw new Error('Failed to fetch chapter')
  }

  const memberName = userProfile.full_name || 'Member'
  const chapterName = chapter.name || 'Your Chapter'
  const formattedAmount = `$${(amount_paid / 100).toFixed(2)}`
  const formattedRemaining = `$${(remaining_balance / 100).toFixed(2)}`
  const formattedTotalPaid = `$${(total_paid / 100).toFixed(2)}`
  const isPaidInFull = remaining_balance <= 0

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation - ${chapterName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Confirmed</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${chapterName}</p>
        </div>

        <div style="background: white; padding: 40px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #555;">Hi ${memberName},</p>

          <p style="font-size: 16px; color: #555;">
            Thank you for your payment! Your transaction has been successfully processed.
          </p>

          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">Amount Paid</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; color: #065f46; font-weight: bold;">${formattedAmount}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280;">Payment Method</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 500;">${payment_method}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280;">Reference Number</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 500; font-family: monospace; font-size: 12px;">${reference_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280;">Total Paid to Date</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 500;">${formattedTotalPaid}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280;">Remaining Balance</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 600; color: ${isPaidInFull ? '#10b981' : '#f59e0b'};">${isPaidInFull ? 'PAID IN FULL' : formattedRemaining}</td>
            </tr>
          </table>

          ${isPaidInFull ? `
          <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 18px; color: #065f46; font-weight: 700;">
              ✓ Your dues are paid in full!
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #047857;">
              Thank you for being current with your chapter.
            </p>
          </div>
          ` : `
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              You still have a remaining balance of <strong>${formattedRemaining}</strong>.
              Log in to your dashboard to make another payment.
            </p>
          </div>
          `}

          <p style="font-size: 14px; color: #999; border-top: 1px solid #e1e4e8; padding-top: 20px; margin-top: 40px;">
            This is an automated confirmation of your payment. Please keep this email for your records.
            If you have any questions, contact your chapter treasurer.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} GreekPay. All rights reserved.</p>
          <p style="margin-top: 10px;">${chapterName}</p>
        </div>
      </body>
    </html>
  `

  const emailText = `
Payment Confirmed - ${chapterName}

Hi ${memberName},

Thank you for your payment! Your transaction has been successfully processed.

PAYMENT DETAILS
---------------
Amount Paid: ${formattedAmount}
Payment Method: ${payment_method}
Reference Number: ${reference_number}
Total Paid to Date: ${formattedTotalPaid}
Remaining Balance: ${isPaidInFull ? 'PAID IN FULL' : formattedRemaining}

${isPaidInFull ? 'Your dues are paid in full! Thank you for being current with your chapter.' : `You still have a remaining balance of ${formattedRemaining}. Log in to your dashboard to make another payment.`}

This is an automated confirmation of your payment. Please keep this email for your records.
If you have any questions, contact your chapter treasurer.

---
© ${new Date().getFullYear()} GreekPay
${chapterName}
  `.trim()

  // Send email using Resend
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'GreekPay <noreply@greekpay.org>',
      to: [item.to_email],
      subject: `Payment Confirmed - ${formattedAmount} - ${chapterName}`,
      html: emailHtml,
      text: emailText,
    }),
  })

  if (!resendResponse.ok) {
    const errorData = await resendResponse.json()
    console.error('Resend error:', errorData)
    throw new Error(`Failed to send email: ${errorData.message || 'Unknown error'}`)
  }

  const resendData = await resendResponse.json()
  console.log(`Payment confirmation email sent successfully. Email ID: ${resendData.id}`)

  return true
}

/**
 * Send payment reminder email
 */
async function sendPaymentReminder(item: any, supabaseAdmin: any): Promise<boolean> {
  console.log(`Calling send-payment-reminder Edge Function for dues ${item.template_data?.dues_id}`)

  const { data, error } = await supabaseAdmin.functions.invoke('send-payment-reminder', {
    body: {
      to_email: item.to_email,
      template_data: item.template_data
    }
  })

  if (error) {
    console.error('Error calling send-payment-reminder:', error)
    throw error
  }

  if (!data?.success) {
    console.error('send-payment-reminder returned error:', data?.error)
    throw new Error(data?.error || 'Failed to send payment reminder')
  }

  return true
}

/**
 * Send payment overdue email
 */
async function sendPaymentOverdue(item: any, supabaseAdmin: any): Promise<boolean> {
  console.log(`Calling send-overdue-notification Edge Function for dues ${item.template_data?.dues_id}`)

  const { data, error } = await supabaseAdmin.functions.invoke('send-overdue-notification', {
    body: {
      to_email: item.to_email,
      template_data: item.template_data
    }
  })

  if (error) {
    console.error('Error calling send-overdue-notification:', error)
    throw error
  }

  if (!data?.success) {
    console.error('send-overdue-notification returned error:', data?.error)
    throw new Error(data?.error || 'Failed to send overdue notification')
  }

  return true
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

/**
 * Send member invitation email (for CSV bulk imports)
 */
async function sendMemberInvitation(item: any, supabaseAdmin: any): Promise<boolean> {
  const { invitation_id, invitation_token, first_name, chapter_name } = item.template_data

  console.log(`Calling send-member-invitation Edge Function for invitation ${invitation_id}`)

  const { data, error } = await supabaseAdmin.functions.invoke('send-member-invitation', {
    body: {
      invitation_id,
      email: item.to_email,
      invitation_token,
      first_name,
      chapter_name
    }
  })

  if (error) {
    console.error('Error calling send-member-invitation:', error)
    throw error
  }

  if (!data?.success) {
    console.error('send-member-invitation returned error:', data?.error)
    throw new Error(data?.error || 'Failed to send member invitation')
  }

  return true
}
