import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/marketing/landing-pages/[id] - Get a single landing page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Landing page not found' }, { status: 404 })
      }
      console.error('Error fetching landing page:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ page: data })
  } catch (error) {
    console.error('Error in GET /api/marketing/landing-pages/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/marketing/landing-pages/[id] - Update a landing page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const {
      name,
      slug,
      template,
      content,
      meta,
      status,
      increment_views,
      increment_conversions,
    } = body

    // Handle view/conversion increment separately (no auth required for public pages)
    if (increment_views || increment_conversions) {
      // Get current counts
      const { data: current } = await supabase
        .from('landing_pages')
        .select('views, conversions')
        .eq('id', id)
        .single()

      const incrementUpdates: Record<string, any> = {}
      if (increment_views) {
        incrementUpdates.views = (current?.views || 0) + 1
      }
      if (increment_conversions) {
        incrementUpdates.conversions = (current?.conversions || 0) + 1
      }

      const { data, error } = await supabase
        .from('landing_pages')
        .update(incrementUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error incrementing counters:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ page: data })
    }

    // If slug is being changed, check if it's unique
    if (slug) {
      const { data: existing } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        )
      }
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = slug
    if (template !== undefined) updates.template = template
    if (content !== undefined) updates.content = content
    if (meta !== undefined) updates.meta = meta
    if (status !== undefined) updates.status = status

    const { data, error } = await supabase
      .from('landing_pages')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Landing page not found' }, { status: 404 })
      }
      console.error('Error updating landing page:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ page: data })
  } catch (error) {
    console.error('Error in PUT /api/marketing/landing-pages/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/marketing/landing-pages/[id] - Delete a landing page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting landing page:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/marketing/landing-pages/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
