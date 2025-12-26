/**
 * Send Member Invitation Edge Function
 *
 * Sends an email invitation to a member imported via CSV bulk import.
 * Includes a secure signup link with invitation token.
 *
 * Request body:
 * {
 *   invitation_id: UUID,
 *   email: string,
 *   invitation_token: UUID,
 *   first_name: string,
 *   chapter_name: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

/**
 * SECURITY: HTML escape function to prevent XSS attacks
 */
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return ''
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { invitation_id, email, invitation_token, first_name, chapter_name } = await req.json()

    if (!invitation_id || !email || !invitation_token) {
      throw new Error('invitation_id, email, and invitation_token are required')
    }

    // Get invitation details for verification
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('member_invitations')
      .select('*')
      .eq('id', invitation_id)
      .single()

    if (inviteError) {
      console.error('Error fetching invitation:', inviteError)
      throw new Error(`Failed to fetch invitation: ${inviteError.message}`)
    }

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    // Get chapter name if not provided
    let chapterDisplayName = chapter_name
    if (!chapterDisplayName) {
      const { data: chapter } = await supabaseAdmin
        .from('chapters')
        .select('name')
        .eq('id', invitation.chapter_id)
        .single()

      chapterDisplayName = chapter?.name || 'Your Chapter'
    }

    // Build invitation URL - points to sign-in page with token
    const frontendUrl = Deno.env.get('FRONTEND_URL')
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL environment variable is required')
    }
    const invitationUrl = `${frontendUrl}/signin?token=${invitation_token}`

    const displayFirstName = escapeHtml(first_name || invitation.first_name)
    const displayChapterName = escapeHtml(chapterDisplayName)

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${displayChapterName} - GreekPay</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">GreekPay</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${displayChapterName}</p>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px;">Welcome, ${displayFirstName}!</h2>

            <p style="font-size: 16px; color: #555;">
              You've been invited to join ${displayChapterName} on GreekPay, our chapter management platform.
            </p>

            <p style="font-size: 16px; color: #555;">
              Create your account to access the member dashboard where you can:
            </p>

            <ul style="font-size: 15px; color: #555; line-height: 1.8;">
              <li>View and pay your dues online</li>
              <li>Access chapter announcements and events</li>
              <li>Stay connected with your brothers/sisters</li>
              <li>Manage your member profile</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 16px 32px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                Create Your Account
              </a>
            </div>

            <p style="font-size: 14px; color: #999; border-top: 1px solid #e1e4e8; padding-top: 20px; margin-top: 40px;">
              Or copy and paste this link into your browser:<br>
              <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
            </p>

            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              This invitation link is unique to you and will expire in 7 days.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} GreekPay. All rights reserved.</p>
            <p style="margin-top: 10px;">
              ${displayChapterName}
            </p>
          </div>
        </body>
      </html>
    `

    const emailText = `
Welcome to ${chapterDisplayName} - GreekPay

Hello ${first_name || invitation.first_name}!

You've been invited to join ${chapterDisplayName} on GreekPay, our chapter management platform.

Create your account to access the member dashboard where you can:
- View and pay your dues online
- Access chapter announcements and events
- Stay connected with your brothers/sisters
- Manage your member profile

Create your account here:
${invitationUrl}

This invitation link is unique to you and will expire in 7 days.

---
(c) ${new Date().getFullYear()} GreekPay
${chapterDisplayName}
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
        to: [email],
        subject: `Welcome to ${chapterDisplayName} - Create Your Account`,
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

    // Update member_invitations to mark email as sent
    await supabaseAdmin
      .from('member_invitations')
      .update({
        invitation_sent_at: new Date().toISOString(),
        invitation_email_status: 'sent',
      })
      .eq('id', invitation_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        email_id: resendData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-member-invitation function:', error)

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
