/**
 * Send Dues Invitation Edge Function
 *
 * Sends an email invitation to a member assigned dues via email
 * Includes a secure signup link with invitation token
 *
 * Request body:
 * {
 *   dues_id: UUID,
 *   email: string,
 *   invitation_token: UUID
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

/**
 * SECURITY: HTML escape function to prevent XSS attacks
 * Escapes HTML special characters in user-supplied content
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
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '')

    // Check if this is a service role call (from process-email-queue or other internal functions)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const isServiceRoleCall = token === serviceRoleKey

    let user = null
    let skipPermissionCheck = false

    if (isServiceRoleCall) {
      // Service role calls are trusted (from internal edge functions)
      skipPermissionCheck = true
      console.log('Service role call detected - skipping user permission check')
    } else {
      // Verify the JWT token using admin client
      const { data: authData, error: userError } = await supabaseAdmin.auth.getUser(token)
      if (userError || !authData?.user) {
        console.error('Auth error:', userError)
        throw new Error('Unauthorized: Invalid or expired token')
      }
      user = authData.user
    }

    // Parse request body
    const { dues_id, email, invitation_token } = await req.json()

    if (!dues_id || !email || !invitation_token) {
      throw new Error('dues_id, email, and invitation_token are required')
    }

    // Get dues information
    const { data: memberDues, error: duesError } = await supabaseAdmin
      .from('member_dues')
      .select(`
        *,
        dues_configuration (
          period_name,
          fiscal_year,
          due_date
        )
      `)
      .eq('id', dues_id)
      .single()

    if (duesError) {
      console.error('Error fetching dues:', duesError)
      throw new Error(`Failed to fetch dues: ${duesError.message}`)
    }

    if (!memberDues) {
      throw new Error('Dues assignment not found')
    }

    // Verify user has permission (admin/treasurer of the chapter)
    // Skip permission check for service role calls (trusted internal calls)
    if (!skipPermissionCheck) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('role, chapter_id')
        .eq('id', user.id)
        .single()

      if (!profile || profile.chapter_id !== memberDues.chapter_id || !['admin', 'treasurer'].includes(profile.role)) {
        throw new Error('Unauthorized: Admin or treasurer access required')
      }
    }

    // Get chapter information
    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from('chapters')
      .select('name')
      .eq('id', memberDues.chapter_id)
      .single()

    if (chapterError) {
      console.error('Error fetching chapter:', chapterError)
      throw new Error(`Failed to fetch chapter: ${chapterError.message}`)
    }

    if (!chapter) {
      console.error('Chapter not found for ID:', memberDues.chapter_id)
      throw new Error('Chapter not found')
    }

    // Build invitation URL
    const frontendUrl = Deno.env.get('FRONTEND_URL')
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL environment variable is required')
    }
    const invitationUrl = `${frontendUrl}/invite?token=${invitation_token}`

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dues Invitation - ${chapter.name}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">GreekPay</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${chapter.name || 'Your Chapter'}</p>
          </div>

          <div style="background: white; padding: 40px; border: 1px solid #e1e4e8; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0; font-size: 24px;">You've Been Assigned Dues</h2>

            <p style="font-size: 16px; color: #555;">Hello!</p>

            <p style="font-size: 16px; color: #555;">
              The treasurer of ${chapter.name} has assigned you dues${memberDues.dues_configuration ? ` for <strong>${memberDues.dues_configuration.period_name} ${memberDues.dues_configuration.fiscal_year}</strong>` : ''}.
            </p>

            <div style="background: #f6f8fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Dues Amount</p>
              <p style="margin: 10px 0 0 0; font-size: 32px; color: #333; font-weight: bold;">$${(memberDues.total_amount || memberDues.amount_due || 0).toFixed(2)}</p>
              ${memberDues.due_date ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Due Date: ${new Date(memberDues.due_date).toLocaleDateString()}</p>` : ''}
            </div>

            ${memberDues.notes ? `
            <div style="background: #fffbeb; border: 2px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                📋 Important Instructions
              </p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #78350f; white-space: pre-wrap;">${escapeHtml(memberDues.notes)}</p>
            </div>
            ` : ''}

            <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #1e40af; font-weight: 600;">
                ✅ Next Steps:
              </p>
              <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e40af; line-height: 1.8;">
                <li>Click the button below to create your account</li>
                <li>Complete your profile information</li>
                <li>View your dues balance in your dashboard</li>
                <li>Contact your treasurer for payment options</li>
              </ol>
            </div>

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
                Create Account & View Dues
              </a>
            </div>

            <p style="font-size: 14px; color: #999; border-top: 1px solid #e1e4e8; padding-top: 20px; margin-top: 40px;">
              Or copy and paste this link into your browser:<br>
              <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
            </p>

            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              This invitation link is unique to you and will expire once you create your account.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} GreekPay. All rights reserved.</p>
            <p style="margin-top: 10px;">
              ${chapter.name}
            </p>
          </div>
        </body>
      </html>
    `

    const emailText = `
You've Been Assigned Dues - ${chapter.name}

Hello!

The treasurer of ${chapter.name} has assigned you dues${memberDues.dues_configuration ? ` for ${memberDues.dues_configuration.period_name} ${memberDues.dues_configuration.fiscal_year}` : ''}.

Dues Amount: $${(memberDues.total_amount || memberDues.amount_due || 0).toFixed(2)}
${memberDues.due_date ? `Due Date: ${new Date(memberDues.due_date).toLocaleDateString()}` : ''}

${memberDues.notes ? `
📋 IMPORTANT INSTRUCTIONS
${escapeHtml(memberDues.notes)}

` : ''}
✅ NEXT STEPS:
1. Click the link below to create your account
2. Complete your profile information
3. View your dues balance in your dashboard
4. Contact your treasurer for payment options

Create your account here:
${invitationUrl}

This invitation link is unique to you and will expire once you create your account.

---
© ${new Date().getFullYear()} GreekPay
${chapter.name}
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
        subject: `Dues Assigned - ${chapter.name}`,
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

    // Update member_dues to mark invitation as sent
    await supabaseAdmin
      .from('member_dues')
      .update({
        invitation_sent_at: new Date().toISOString(),
        invitation_email_status: 'sent',
      })
      .eq('id', dues_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        email_id: resendData.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-dues-invitation function:', error)

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
