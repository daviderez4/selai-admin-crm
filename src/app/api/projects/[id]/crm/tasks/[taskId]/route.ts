import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getTeamUserIds } from '@/lib/utils/teamHierarchy';
import type { TaskUpdate } from '@/types/crm';

// GET /api/projects/[id]/crm/tasks/[taskId] - Get single task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params;
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

    const currentUser = await getCurrentUser(supabase, user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Fetch task with relations
    let query = supabase
      .from('crm_tasks')
      .select(`
        *,
        contact:crm_contacts(*),
        lead:crm_leads(*),
        deal:crm_deals(*)
      `)
      .eq('id', taskId);

    // Apply RLS based on role
    const teamIds = await getTeamUserIds(supabase, currentUser);
    if (teamIds !== null) {
      if (teamIds.length === 1) {
        query = query.eq('agent_id', teamIds[0]);
      } else {
        query = query.in('agent_id', teamIds);
      }
    }

    const { data: task, error: queryError } = await query.single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Task query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Task get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/crm/tasks/[taskId] - Update task
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params;
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

    const currentUser = await getCurrentUser(supabase, user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Parse request body
    const body: TaskUpdate = await request.json();

    // If status is being set to completed, set completed_at
    if (body.status === 'completed' && !body.completed_at) {
      body.completed_at = new Date().toISOString();
    }

    // Build update query with RLS
    let query = supabase
      .from('crm_tasks')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    // Apply RLS based on role
    const teamIds = await getTeamUserIds(supabase, currentUser);
    if (teamIds !== null) {
      if (teamIds.length === 1) {
        query = query.eq('agent_id', teamIds[0]);
      } else {
        query = query.in('agent_id', teamIds);
      }
    }

    const { data: task, error: updateError } = await query.select().single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
      }
      console.error('Task update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/crm/tasks/[taskId] - Delete task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: projectId, taskId } = await params;
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

    const currentUser = await getCurrentUser(supabase, user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Build delete query with RLS
    let query = supabase
      .from('crm_tasks')
      .delete()
      .eq('id', taskId);

    // Apply RLS based on role
    const teamIds = await getTeamUserIds(supabase, currentUser);
    if (teamIds !== null) {
      if (teamIds.length === 1) {
        query = query.eq('agent_id', teamIds[0]);
      } else {
        query = query.in('agent_id', teamIds);
      }
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error('Task delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
