/**
 * @feature GUEST-API-001
 * @module Guest Access
 * @description Verify guest token and get project info (public endpoint)
 * @related GUEST-VIEW-001, GUEST-MANAGE-001
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS for public access
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey)
}

// GET /api/guest/[token] - Verify guest token and get project info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.length !== 64) {
      return NextResponse.json({ valid: false, error: 'Invalid token format' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Find guest by token
    const { data: guest, error } = await supabase
      .from('project_guests')
      .select(`
        id,
        project_id,
        email,
        name,
        role,
        expires_at,
        is_active,
        access_count
      `)
      .eq('access_token', token)
      .single()

    if (error || !guest) {
      return NextResponse.json({ valid: false, error: 'Token not found' }, { status: 404 })
    }

    // Check if active
    if (!guest.is_active) {
      return NextResponse.json({ valid: false, error: 'Access has been revoked' }, { status: 403 })
    }

    // Check expiration
    if (new Date(guest.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Access has expired' }, { status: 410 })
    }

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, description, icon, color, data_type')
      .eq('id', guest.project_id)
      .single()

    if (!project) {
      return NextResponse.json({ valid: false, error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      guest: {
        name: guest.name,
        email: guest.email,
        role: guest.role,
        expiresAt: guest.expires_at,
      },
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        icon: project.icon,
        color: project.color,
        dataType: project.data_type,
      },
    })
  } catch (error) {
    console.error('Guest token verification error:', error)
    return NextResponse.json({ valid: false, error: 'Verification failed' }, { status: 500 })
  }
}
