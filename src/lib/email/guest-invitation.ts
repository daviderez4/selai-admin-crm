/**
 * Guest Invitation Email Service
 * Sends invitation emails to project guests via Resend
 */

import { Resend } from 'resend'

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

interface GuestInvitationParams {
  email: string
  guestName?: string
  projectName: string
  accessUrl: string
  inviterName: string
  expiresAt: Date
}

export async function sendGuestInvitation({
  email,
  guestName,
  projectName,
  accessUrl,
  inviterName,
  expiresAt,
}: GuestInvitationParams): Promise<{ success: boolean; error?: string }> {
  const greeting = guestName ? `Hello ${guestName}` : 'Hello'
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const htmlContent = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Project Invitation</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">${greeting},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to view the project
      <strong>"${projectName}"</strong> on SELAI Admin Hub.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${accessUrl}"
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                display: inline-block;">
        View Project
      </a>
    </div>

    <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        <strong>Access Details:</strong><br>
        This link will expire on <strong>${expiresFormatted}</strong>.<br>
        You can view and export data, but cannot make changes.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      This email was sent by SELAI Admin Hub<br>
      <a href="${accessUrl}" style="color: #667eea; word-break: break-all;">${accessUrl}</a>
    </p>
  </div>
</body>
</html>
`

  const textContent = `
${greeting},

${inviterName} has invited you to view the project "${projectName}" on SELAI Admin Hub.

Click here to access the project: ${accessUrl}

Access Details:
- This link will expire on ${expiresFormatted}
- You can view and export data, but cannot make changes

If you weren't expecting this invitation, you can safely ignore this email.

---
SELAI Admin Hub
`

  try {
    const client = getResendClient()

    if (!client) {
      console.warn('Resend API key not configured, skipping email send')
      return { success: false, error: 'Email service not configured' }
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'SELAI <selai@selam.co.il>'

    const { error } = await client.emails.send({
      from: fromAddress,
      to: email,
      subject: `You've been invited to view "${projectName}"`,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error('Failed to send guest invitation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending guest invitation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
