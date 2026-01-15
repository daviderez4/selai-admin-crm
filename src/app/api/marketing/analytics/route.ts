import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/marketing/analytics - Get analytics overview
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const start_date = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end_date = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
    const campaign_id = searchParams.get('campaign_id')
    const landing_page_id = searchParams.get('landing_page_id')

    // Get aggregated analytics
    let query = supabase
      .from('campaign_analytics')
      .select('*')
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: true })

    if (campaign_id) query = query.eq('campaign_id', campaign_id)
    if (landing_page_id) query = query.eq('landing_page_id', landing_page_id)

    const { data: analyticsData, error: analyticsError } = await query

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError)
      return NextResponse.json({ error: analyticsError.message }, { status: 500 })
    }

    // Calculate totals
    const totals = (analyticsData || []).reduce(
      (acc, row) => ({
        impressions: acc.impressions + (row.impressions || 0),
        clicks: acc.clicks + (row.clicks || 0),
        leads: acc.leads + (row.leads || 0),
        conversions: acc.conversions + (row.conversions || 0),
        spend: acc.spend + (row.spend || 0),
      }),
      { impressions: 0, clicks: 0, leads: 0, conversions: 0, spend: 0 }
    )

    // Get daily breakdown
    const dailyData = (analyticsData || []).reduce((acc: Record<string, any>, row) => {
      const date = row.date
      if (!acc[date]) {
        acc[date] = { date, impressions: 0, clicks: 0, leads: 0, conversions: 0 }
      }
      acc[date].impressions += row.impressions || 0
      acc[date].clicks += row.clicks || 0
      acc[date].leads += row.leads || 0
      acc[date].conversions += row.conversions || 0
      return acc
    }, {})

    // Get platform breakdown
    const platformData = (analyticsData || []).reduce((acc: Record<string, any>, row) => {
      const platform = row.platform || 'direct'
      if (!acc[platform]) {
        acc[platform] = { platform, impressions: 0, clicks: 0, leads: 0, conversions: 0 }
      }
      acc[platform].impressions += row.impressions || 0
      acc[platform].clicks += row.clicks || 0
      acc[platform].leads += row.leads || 0
      acc[platform].conversions += row.conversions || 0
      return acc
    }, {})

    // Get leads count
    const { count: totalLeads } = await supabase
      .from('landing_page_leads')
      .select('*', { count: 'exact', head: true })

    // Get campaigns count
    const { count: totalCampaigns } = await supabase
      .from('marketing_campaigns')
      .select('*', { count: 'exact', head: true })

    const { count: activeCampaigns } = await supabase
      .from('marketing_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get landing pages stats
    const { data: pagesData } = await supabase
      .from('landing_pages')
      .select('views, conversions')

    const totalViews = (pagesData || []).reduce((sum, p) => sum + (p.views || 0), 0)
    const totalConversions = (pagesData || []).reduce((sum, p) => sum + (p.conversions || 0), 0)
    const conversionRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(2) : '0'

    return NextResponse.json({
      overview: {
        total_campaigns: totalCampaigns || 0,
        active_campaigns: activeCampaigns || 0,
        total_leads: totalLeads || 0,
        total_views: totalViews,
        conversion_rate: parseFloat(conversionRate),
      },
      totals,
      daily: Object.values(dailyData),
      by_platform: Object.values(platformData),
      period: { start_date, end_date },
    })
  } catch (error) {
    console.error('Error in GET /api/marketing/analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/marketing/analytics - Record analytics event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      campaign_id,
      landing_page_id,
      event_type, // 'impression', 'click', 'lead', 'conversion'
      platform,
      source,
      device,
    } = body

    const today = new Date().toISOString().split('T')[0]

    // Try to update existing record for today
    const { data: existing } = await supabase
      .from('campaign_analytics')
      .select('id, impressions, clicks, leads, conversions')
      .eq('date', today)
      .eq('campaign_id', campaign_id || null)
      .eq('landing_page_id', landing_page_id || null)
      .eq('platform', platform || null)
      .single()

    if (existing) {
      // Update existing record
      const updates: Record<string, number> = {}
      if (event_type === 'impression') updates.impressions = (existing.impressions || 0) + 1
      if (event_type === 'click') updates.clicks = (existing.clicks || 0) + 1
      if (event_type === 'lead') updates.leads = (existing.leads || 0) + 1
      if (event_type === 'conversion') updates.conversions = (existing.conversions || 0) + 1

      await supabase
        .from('campaign_analytics')
        .update(updates)
        .eq('id', existing.id)
    } else {
      // Create new record
      const newRecord: Record<string, any> = {
        date: today,
        campaign_id,
        landing_page_id,
        platform,
        source,
        device,
        impressions: event_type === 'impression' ? 1 : 0,
        clicks: event_type === 'click' ? 1 : 0,
        leads: event_type === 'lead' ? 1 : 0,
        conversions: event_type === 'conversion' ? 1 : 0,
      }

      await supabase.from('campaign_analytics').insert(newRecord)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/marketing/analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
