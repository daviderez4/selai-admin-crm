import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Lead, LeadUpdate } from '@/types/crm';

// GET /api/projects/[id]/crm/leads/[leadId] - Get single lead with relations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const { id: projectId, leadId } = await params;
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

    // Fetch lead with relations
    let query = supabase
      .from('crm_leads')
      .select(`
        *,
        contact:crm_contacts(*),
        activities:crm_lead_activities(*, user:users(full_name)),
        deals:crm_deals(*),
        tasks:crm_tasks(*)
      `)
      .eq('id', leadId);

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

    const { data: lead, error: queryError } = await query.single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      console.error('Lead query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Lead get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/crm/leads/[leadId] - Update lead
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const { id: projectId, leadId } = await params;
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

    // Get current lead for activity tracking
    const { data: currentLead } = await supabase
      .from('crm_leads')
      .select('status, priority')
      .eq('id', leadId)
      .single();

    // Parse request body
    const body: LeadUpdate = await request.json();

    // Build update query with RLS
    let query = supabase
      .from('crm_leads')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

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

    const { data: lead, error: updateError } = await query.select().single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
      }
      console.error('Lead update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create activity log for status changes
    if (currentLead && body.status && body.status !== currentLead.status) {
      await supabase.from('crm_lead_activities').insert({
        lead_id: leadId,
        user_id: user.id,
        activity_type: 'status_changed',
        description: `סטטוס שונה מ-${currentLead.status} ל-${body.status}`,
        metadata: {
          from_status: currentLead.status,
          to_status: body.status,
        },
      });
    }

    // Create activity log for priority changes
    if (currentLead && body.priority && body.priority !== currentLead.priority) {
      await supabase.from('crm_lead_activities').insert({
        lead_id: leadId,
        user_id: user.id,
        activity_type: 'priority_changed',
        description: `עדיפות שונתה מ-${currentLead.priority} ל-${body.priority}`,
        metadata: {
          from_priority: currentLead.priority,
          to_priority: body.priority,
        },
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/crm/leads/[leadId] - Delete lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const { id: projectId, leadId } = await params;
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
      .from('crm_leads')
      .delete()
      .eq('id', leadId);

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
      console.error('Lead delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lead delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
