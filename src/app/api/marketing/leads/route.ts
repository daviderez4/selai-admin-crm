import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewLeadNotification, type SystemEmailSettings, DEFAULT_EMAIL_SETTINGS } from '@/lib/email/email-service'

// GET /api/marketing/leads - List all leads
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const landing_page_id = searchParams.get('landing_page_id')
    const campaign_id = searchParams.get('campaign_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('landing_page_leads')
      .select('*, landing_pages(name, slug), marketing_campaigns(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (source) query = query.eq('source', source)
    if (landing_page_id) query = query.eq('landing_page_id', landing_page_id)
    if (campaign_id) query = query.eq('campaign_id', campaign_id)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      leads: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/marketing/leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/marketing/leads - Create a new lead (public endpoint for form submissions)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      landing_page_id,
      campaign_id,
      name,
      phone,
      email,
      message,
      insurance_type,
      source = 'direct',
      utm_params = {},
    } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    // Get client info from headers
    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown'
    const user_agent = request.headers.get('user-agent') || 'unknown'

    // Save to landing_page_leads table
    const { data, error } = await supabase
      .from('landing_page_leads')
      .insert({
        landing_page_id,
        campaign_id,
        name,
        phone,
        email,
        message,
        insurance_type,
        source,
        utm_params,
        ip_address,
        user_agent,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also add to CRM leads table for unified lead management
    // Get the landing page owner or campaign owner as the agent
    // Note: landing_pages.created_by stores auth.uid() but CRM tables need users.id
    let authId: string | null = null

    if (landing_page_id) {
      const { data: landingPage } = await supabase
        .from('landing_pages')
        .select('created_by')
        .eq('id', landing_page_id)
        .single()

      if (landingPage?.created_by) {
        authId = landingPage.created_by
      }
    }

    if (!authId && campaign_id) {
      const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('created_by')
        .eq('id', campaign_id)
        .single()

      if (campaign?.created_by) {
        authId = campaign.created_by
      }
    }

    // Convert auth_id to users.id for CRM tables
    let agentId: string | null = null
    if (authId) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId)
        .single()

      agentId = userRecord?.id || null
    }

    // If we have an agent, create CRM lead
    if (agentId) {
      try {
        // First check/create contact
        const { data: existingContact } = await supabase
          .from('crm_contacts')
          .select('id')
          .eq('agent_id', agentId)
          .eq('phone', phone)
          .single()

        let contactId = existingContact?.id

        if (!contactId) {
          // Create new contact
          const nameParts = name.trim().split(' ')
          const firstName = nameParts[0] || name
          const lastName = nameParts.slice(1).join(' ') || null

          const { data: newContact } = await supabase
            .from('crm_contacts')
            .insert({
              agent_id: agentId,
              first_name: firstName,
              last_name: lastName,
              phone,
              email,
              source: 'landing_page',
              notes: message || null,
            })
            .select('id')
            .single()

          contactId = newContact?.id
        }

        // Create CRM lead
        await supabase
          .from('crm_leads')
          .insert({
            agent_id: agentId,
            contact_id: contactId,
            name,
            phone,
            email,
            source: 'landing_page',
            source_landing_page_id: landing_page_id,
            source_campaign_id: campaign_id,
            status: 'new',
            interested_in: insurance_type ? [insurance_type] : [],
            notes: message || null,
          })

        console.log('Lead also added to CRM for agent:', agentId)
      } catch (crmError) {
        // Log but don't fail the request - marketing lead was saved
        console.error('Error adding to CRM (non-critical):', crmError)
      }
    }

    // Update landing page conversions count
    if (landing_page_id) {
      await supabase.rpc('increment_page_conversions', { page_id: landing_page_id })
    }

    // Send email notification for new lead
    try {
      // Get email settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'email_notifications')
        .single()

      const emailSettings: SystemEmailSettings = settingsData?.value || DEFAULT_EMAIL_SETTINGS
      const newLeadConfig = emailSettings.notifications?.new_lead

      if (newLeadConfig?.enabled && newLeadConfig?.recipients?.length > 0) {
        // Get landing page and campaign names for the email
        let landingPageName: string | undefined
        let campaignName: string | undefined

        if (landing_page_id) {
          const { data: lp } = await supabase
            .from('landing_pages')
            .select('name')
            .eq('id', landing_page_id)
            .single()
          landingPageName = lp?.name
        }

        if (campaign_id) {
          const { data: camp } = await supabase
            .from('marketing_campaigns')
            .select('name')
            .eq('id', campaign_id)
            .single()
          campaignName = camp?.name
        }

        // Send notification email
        await sendNewLeadNotification({
          leadName: name,
          leadPhone: phone,
          leadEmail: email,
          insuranceType: insurance_type,
          source: source || 'direct',
          landingPageName,
          campaignName,
          message,
          recipients: newLeadConfig.recipients,
        })
        console.log('Lead notification email sent to:', newLeadConfig.recipients)
      }
    } catch (emailError) {
      // Log but don't fail the request
      console.error('Error sending lead notification email (non-critical):', emailError)
    }

    return NextResponse.json({ lead: data, success: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/marketing/leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
