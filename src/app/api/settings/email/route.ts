import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTestEmail, DEFAULT_EMAIL_SETTINGS, type SystemEmailSettings } from '@/lib/email/email-service'

// Settings key in the database
const SETTINGS_KEY = 'email_notifications'

// GET /api/settings/email - Get email notification settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('user_type')
      .eq('auth_id', user.id)
      .single()

    if (userData?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Try to get settings from system_settings table
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching email settings:', error)
    }

    // Return settings or defaults
    const emailSettings: SystemEmailSettings = settings?.value || DEFAULT_EMAIL_SETTINGS

    return NextResponse.json({
      settings: emailSettings,
      configured: !!process.env.RESEND_API_KEY,
      from_email: process.env.RESEND_FROM_EMAIL || 'Not configured',
    })
  } catch (error) {
    console.error('Error in GET /api/settings/email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/email - Update email notification settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('user_type')
      .eq('auth_id', user.id)
      .single()

    if (userData?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body as { settings: SystemEmailSettings }

    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 })
    }

    // Upsert settings
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: SETTINGS_KEY,
        value: settings,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error('Error saving email settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error in PUT /api/settings/email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/settings/email - Send test email
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('user_type, email')
      .eq('auth_id', user.id)
      .single()

    if (userData?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body as { email?: string }

    const testEmail = email || userData?.email || user.email

    if (!testEmail) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    // Send test email
    const result = await sendTestEmail(testEmail)

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error('Error in POST /api/settings/email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
