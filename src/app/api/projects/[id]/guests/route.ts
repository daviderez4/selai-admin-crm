/**
 * Project Guests API
 * Manage guest access to projects
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { sendGuestInvitation } from '@/lib/email/guest-invitation'

// GET /api/projects/[id]/guests - List all guests for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is project admin
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single()

    if (!access || access.role !== 'admin') {
      return NextResponse.json({ error: 'Only project admins can manage guests' }, { status: 403 })
    }

    // Get all guests for this project
    const { data: guests, error: guestsError } = await supabase
      .from('project_guests')
      .select(`
        id,
        email,
        name,
        access_token,
        role,
        expires_at,
        is_active,
        last_accessed_at,
        access_count,
        created_at,
        invited_by
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (guestsError) {
      console.error('Error fetching guests:', guestsError)
      return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 })
    }

    return NextResponse.json({ guests: guests || [] })
  } catch (error) {
    console.error('Get guests error:', error)
    return NextResponse.json({ error: 'Failed to get guests' }, { status: 500 })
  }
}

// POST /api/projects/[id]/guests - Invite a new guest
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is project admin
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single()

    if (!access || access.role !== 'admin') {
      return NextResponse.json({ error: 'Only project admins can invite guests' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, expiresInDays = 30 } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Check if guest already exists for this project
    const { data: existingGuest } = await supabase
      .from('project_guests')
      .select('id, is_active, name')
      .eq('project_id', projectId)
      .eq('email', email.toLowerCase())
      .single()

    if (existingGuest) {
      if (existingGuest.is_active) {
        return NextResponse.json({ error: 'Guest already has access to this project' }, { status: 409 })
      }
      // Reactivate existing guest
      const newToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      const { error: updateError } = await supabase
        .from('project_guests')
        .update({
          is_active: true,
          access_token: newToken,
          expires_at: expiresAt.toISOString(),
          name: name || existingGuest.name,
        })
        .eq('id', existingGuest.id)

      if (updateError) {
        console.error('Error reactivating guest:', updateError)
        return NextResponse.json({ error: 'Failed to reactivate guest' }, { status: 500 })
      }

      // Send invitation email
      const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/guest/${newToken}`
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      const { data: inviter } = await supabase
        .from('users')
        .select('full_name')
        .eq('auth_id', user.id)
        .single()

      await sendGuestInvitation({
        email: email.toLowerCase(),
        guestName: name,
        projectName: project?.name || 'Project',
        accessUrl,
        inviterName: inviter?.full_name || user.email || 'Team member',
        expiresAt,
      })

      return NextResponse.json({
        success: true,
        message: 'Guest access reactivated',
        accessUrl,
      })
    }

    // Create new guest
    const accessToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { data: newGuest, error: createError } = await supabase
      .from('project_guests')
      .insert({
        project_id: projectId,
        email: email.toLowerCase(),
        name: name || null,
        access_token: accessToken,
        role: 'viewer',
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        access_count: 0,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating guest:', createError)
      return NextResponse.json({ error: 'Failed to create guest invitation' }, { status: 500 })
    }

    // Get project name and inviter name for email
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single()

    const { data: inviter } = await supabase
      .from('users')
      .select('full_name')
      .eq('auth_id', user.id)
      .single()

    // Send invitation email
    const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/guest/${accessToken}`

    const emailResult = await sendGuestInvitation({
      email: email.toLowerCase(),
      guestName: name,
      projectName: project?.name || 'Project',
      accessUrl,
      inviterName: inviter?.full_name || user.email || 'Team member',
      expiresAt,
    })

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'GUEST_INVITED',
      details: {
        guest_email: email.toLowerCase(),
        guest_name: name,
        expires_at: expiresAt.toISOString(),
        email_sent: emailResult.success,
      },
    })

    return NextResponse.json({
      success: true,
      guest: newGuest,
      accessUrl,
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error('Create guest error:', error)
    return NextResponse.json({ error: 'Failed to create guest invitation' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/guests - Revoke guest access
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is project admin
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single()

    if (!access || access.role !== 'admin') {
      return NextResponse.json({ error: 'Only project admins can revoke guest access' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')

    if (!guestId) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 })
    }

    // Get guest info for audit log
    const { data: guest } = await supabase
      .from('project_guests')
      .select('email, name')
      .eq('id', guestId)
      .eq('project_id', projectId)
      .single()

    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    // Deactivate guest (soft delete)
    const { error: updateError } = await supabase
      .from('project_guests')
      .update({ is_active: false })
      .eq('id', guestId)
      .eq('project_id', projectId)

    if (updateError) {
      console.error('Error revoking guest:', updateError)
      return NextResponse.json({ error: 'Failed to revoke guest access' }, { status: 500 })
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'GUEST_REVOKED',
      details: {
        guest_email: guest.email,
        guest_name: guest.name,
      },
    })

    return NextResponse.json({ success: true, message: 'Guest access revoked' })
  } catch (error) {
    console.error('Delete guest error:', error)
    return NextResponse.json({ error: 'Failed to revoke guest access' }, { status: 500 })
  }
}
