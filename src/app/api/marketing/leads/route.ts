import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Update landing page conversions count
    if (landing_page_id) {
      await supabase.rpc('increment_page_conversions', { page_slug: landing_page_id })
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
