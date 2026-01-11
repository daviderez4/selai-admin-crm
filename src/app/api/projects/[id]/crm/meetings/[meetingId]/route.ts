import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { MeetingUpdate } from '@/types/crm';

// GET /api/projects/[id]/crm/meetings/[meetingId] - Get single meeting
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { id: projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access to project
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch meeting with relations
    let query = supabase
      .from('crm_meetings')
      .select(`
        *,
        contact:crm_contacts(*)
      `)
      .eq('id', meetingId);

    // Apply RLS based on role
    if (access.role === 'agent') {
      query = query.eq('agent_id', user.id);
    } else if (access.role === 'supervisor') {
      const { data: teamMembers } = await supabase
        .from('agent_supervisor_relations')
        .select('agent_id')
        .eq('supervisor_id', user.id)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.agent_id) || [];
      teamIds.push(user.id);
      query = query.in('agent_id', teamIds);
    }

    const { data: meeting, error: queryError } = await query.single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      console.error('Meeting query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Meeting get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/crm/meetings/[meetingId] - Update meeting
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { id: projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access to project
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse request body
    const body: MeetingUpdate = await request.json();

    // Recalculate duration if times changed
    let updateData: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    if (body.start_time && body.end_time) {
      const startTime = new Date(body.start_time);
      const endTime = new Date(body.end_time);
      updateData.duration_minutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }

    // Build update query with RLS
    let query = supabase
      .from('crm_meetings')
      .update(updateData)
      .eq('id', meetingId);

    // Apply RLS based on role
    if (access.role === 'agent') {
      query = query.eq('agent_id', user.id);
    } else if (access.role === 'supervisor') {
      const { data: teamMembers } = await supabase
        .from('agent_supervisor_relations')
        .select('agent_id')
        .eq('supervisor_id', user.id)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.agent_id) || [];
      teamIds.push(user.id);
      query = query.in('agent_id', teamIds);
    }

    const { data: meeting, error: updateError } = await query.select().single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 });
      }
      console.error('Meeting update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Meeting update error:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/crm/meetings/[meetingId] - Delete meeting
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { id: projectId, meetingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access to project
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build delete query with RLS
    let query = supabase
      .from('crm_meetings')
      .delete()
      .eq('id', meetingId);

    // Apply RLS based on role
    if (access.role === 'agent') {
      query = query.eq('agent_id', user.id);
    } else if (access.role === 'supervisor') {
      const { data: teamMembers } = await supabase
        .from('agent_supervisor_relations')
        .select('agent_id')
        .eq('supervisor_id', user.id)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.agent_id) || [];
      teamIds.push(user.id);
      query = query.in('agent_id', teamIds);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error('Meeting delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meeting delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}
