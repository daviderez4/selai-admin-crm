import { Resend } from 'resend'

// Singleton Resend client
let resend: Resend | null = null

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// Email types for the system
export type EmailType =
  | 'new_lead'           // New lead from landing page
  | 'lead_assigned'      // Lead assigned to agent
  | 'daily_report'       // Daily summary report
  | 'weekly_report'      // Weekly summary report
  | 'campaign_alert'     // Campaign performance alert
  | 'system_alert'       // System notifications
  | 'welcome'            // Welcome email for new users
  | 'password_reset'     // Password reset (future)

export interface EmailConfig {
  enabled: boolean
  recipients: string[]  // Email addresses to receive
  subject_prefix?: string
}

export interface SystemEmailSettings {
  from_email: string
  from_name: string
  reply_to?: string
  notifications: {
    new_lead: EmailConfig
    lead_assigned: EmailConfig
    daily_report: EmailConfig
    weekly_report: EmailConfig
    campaign_alert: EmailConfig
    system_alert: EmailConfig
  }
}

// Default settings
export const DEFAULT_EMAIL_SETTINGS: SystemEmailSettings = {
  from_email: process.env.RESEND_FROM_EMAIL || 'selai@selam.co.il',
  from_name: 'SELAI System',
  reply_to: 'support@selam.co.il',
  notifications: {
    new_lead: {
      enabled: true,
      recipients: [],
      subject_prefix: '[ליד חדש]'
    },
    lead_assigned: {
      enabled: true,
      recipients: [],
      subject_prefix: '[ליד הוקצה]'
    },
    daily_report: {
      enabled: false,
      recipients: [],
      subject_prefix: '[דוח יומי]'
    },
    weekly_report: {
      enabled: false,
      recipients: [],
      subject_prefix: '[דוח שבועי]'
    },
    campaign_alert: {
      enabled: true,
      recipients: [],
      subject_prefix: '[התראת קמפיין]'
    },
    system_alert: {
      enabled: true,
      recipients: [],
      subject_prefix: '[התראת מערכת]'
    }
  }
}

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const client = getResendClient()

  if (!client) {
    console.warn('Resend client not configured - RESEND_API_KEY missing')
    return { success: false, error: 'Email service not configured' }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SELAI <selai@selam.co.il>'

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send new lead notification email
 */
export async function sendNewLeadNotification(params: {
  leadName: string
  leadPhone: string
  leadEmail?: string
  insuranceType?: string
  source: string
  landingPageName?: string
  campaignName?: string
  message?: string
  recipients: string[]
}): Promise<SendEmailResult> {
  if (!params.recipients.length) {
    return { success: false, error: 'No recipients configured' }
  }

  const insuranceTypeHe: Record<string, string> = {
    car: 'ביטוח רכב',
    home: 'ביטוח דירה',
    life: 'ביטוח חיים',
    health: 'ביטוח בריאות',
    business: 'ביטוח עסקי',
    pension: 'פנסיה וחיסכון',
  }

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">ליד חדש התקבל!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <!-- Lead Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #166534; margin: 0 0 15px 0; font-size: 20px;">${params.leadName}</h2>
                    <p style="margin: 8px 0; color: #374151;">
                      <strong>טלפון:</strong>
                      <a href="tel:${params.leadPhone}" style="color: #059669; text-decoration: none;">${params.leadPhone}</a>
                    </p>
                    ${params.leadEmail ? `
                    <p style="margin: 8px 0; color: #374151;">
                      <strong>אימייל:</strong>
                      <a href="mailto:${params.leadEmail}" style="color: #059669; text-decoration: none;">${params.leadEmail}</a>
                    </p>
                    ` : ''}
                    ${params.insuranceType ? `
                    <p style="margin: 8px 0; color: #374151;">
                      <strong>סוג ביטוח:</strong> ${insuranceTypeHe[params.insuranceType] || params.insuranceType}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Source Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                      <strong>מקור:</strong> ${params.source}
                    </p>
                    ${params.landingPageName ? `
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                      <strong>דף נחיתה:</strong> ${params.landingPageName}
                    </p>
                    ` : ''}
                    ${params.campaignName ? `
                    <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                      <strong>קמפיין:</strong> ${params.campaignName}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              ${params.message ? `
              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 5px 0; color: #92400e; font-weight: bold; font-size: 14px;">הודעה:</p>
                    <p style="margin: 0; color: #78350f;">${params.message}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://app.selam.co.il/marketing/leads"
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      צפה בכל הלידים
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                נשלח אוטומטית ממערכת SELAI
              </p>
              <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">
                ${new Date().toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
ליד חדש התקבל!

שם: ${params.leadName}
טלפון: ${params.leadPhone}
${params.leadEmail ? `אימייל: ${params.leadEmail}` : ''}
${params.insuranceType ? `סוג ביטוח: ${insuranceTypeHe[params.insuranceType] || params.insuranceType}` : ''}

מקור: ${params.source}
${params.landingPageName ? `דף נחיתה: ${params.landingPageName}` : ''}
${params.campaignName ? `קמפיין: ${params.campaignName}` : ''}

${params.message ? `הודעה: ${params.message}` : ''}

---
נשלח אוטומטית ממערכת SELAI
  `

  return sendEmail({
    to: params.recipients,
    subject: `[ליד חדש] ${params.leadName} - ${insuranceTypeHe[params.insuranceType || ''] || 'כללי'}`,
    html,
    text,
  })
}

/**
 * Send daily/weekly report email
 */
export async function sendReportEmail(params: {
  type: 'daily' | 'weekly'
  recipients: string[]
  stats: {
    newLeads: number
    convertedLeads: number
    totalViews: number
    topCampaign?: string
    topLandingPage?: string
  }
  period: string
}): Promise<SendEmailResult> {
  if (!params.recipients.length) {
    return { success: false, error: 'No recipients configured' }
  }

  const reportTitle = params.type === 'daily' ? 'דוח יומי' : 'דוח שבועי'

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${reportTitle}</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">${params.period}</p>
            </td>
          </tr>

          <!-- Stats Grid -->
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 36px; font-weight: bold; color: #166534;">${params.stats.newLeads}</p>
                      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">לידים חדשים</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 10px;">
                    <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 36px; font-weight: bold; color: #92400e;">${params.stats.convertedLeads}</p>
                      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">לידים שהומרו</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 10px;">
                    <div style="background-color: #ede9fe; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0; font-size: 36px; font-weight: bold; color: #5b21b6;">${params.stats.totalViews.toLocaleString()}</p>
                      <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">צפיות בדפי נחיתה</p>
                    </div>
                  </td>
                </tr>
              </table>

              ${params.stats.topCampaign || params.stats.topLandingPage ? `
              <!-- Top Performers -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; background-color: #f9fafb; border-radius: 8px; padding: 15px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px 0; color: #374151;">מובילים:</h3>
                    ${params.stats.topCampaign ? `<p style="margin: 5px 0; color: #6b7280;">קמפיין מוביל: <strong>${params.stats.topCampaign}</strong></p>` : ''}
                    ${params.stats.topLandingPage ? `<p style="margin: 5px 0; color: #6b7280;">דף נחיתה מוביל: <strong>${params.stats.topLandingPage}</strong></p>` : ''}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 30px 0 10px 0;">
                    <a href="https://app.selam.co.il/marketing/analytics"
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      צפה בדוח המלא
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                נשלח אוטומטית ממערכת SELAI
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return sendEmail({
    to: params.recipients,
    subject: `[${reportTitle}] סיכום ${params.period}`,
    html,
  })
}

/**
 * Send system alert email
 */
export async function sendSystemAlert(params: {
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
  recipients: string[]
}): Promise<SendEmailResult> {
  if (!params.recipients.length) {
    return { success: false, error: 'No recipients configured' }
  }

  const severityColors = {
    info: { bg: '#dbeafe', text: '#1e40af', header: '#3b82f6' },
    warning: { bg: '#fef3c7', text: '#92400e', header: '#f59e0b' },
    error: { bg: '#fee2e2', text: '#991b1b', header: '#ef4444' },
  }

  const colors = severityColors[params.severity]

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: ${colors.header}; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">התראת מערכת</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <div style="background-color: ${colors.bg}; border-radius: 8px; padding: 20px;">
                <h2 style="color: ${colors.text}; margin: 0 0 10px 0;">${params.title}</h2>
                <p style="color: ${colors.text}; margin: 0;">${params.message}</p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; text-align: center;">
                ${new Date().toLocaleString('he-IL')}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return sendEmail({
    to: params.recipients,
    subject: `[התראה] ${params.title}`,
    html,
  })
}

/**
 * Test email configuration
 */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: 'בדיקת הגדרות מייל - SELAI',
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; text-align: center;">
    <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
    <h1 style="color: #10b981; margin: 0 0 10px 0;">הגדרות המייל תקינות!</h1>
    <p style="color: #6b7280;">מערכת המיילים של SELAI מוגדרת כראוי.</p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
      ${new Date().toLocaleString('he-IL')}
    </p>
  </div>
</body>
</html>
    `,
    text: 'הגדרות המייל תקינות! מערכת המיילים של SELAI מוגדרת כראוי.',
  })
}
