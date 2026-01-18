import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Task, TaskInsert, CRMFilters, CRMListResponse } from '@/types/crm';

// GET /api/projects/[id]/crm/tasks - List tasks with pagination and filters
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
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

    // Parse query params
    const url = new URL(request.url);
    const view = url.searchParams.get('view'); // 'today', 'overdue', 'upcoming', or default all

    const filters: CRMFilters = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      priority: url.searchParams.get('priority') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '50'),
      sortBy: url.searchParams.get('sortBy') || 'due_date',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    };

    // Build query
    let query = supabase
      .from('crm_tasks')
      .select(`
        *,
        contact:crm_contacts(id, full_name, phone),
        lead:crm_leads(id, name),
        deal:crm_deals(id, title, amount)
      `, { count: 'exact' });

    // Get current user info from users table
    const { data: currentUser } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('auth_id', user.id)
      .single();

    // RLS filter based on role
    if (currentUser?.user_type === 'agent') {
      query = query.eq('agent_id', currentUser.id);
    } else if (currentUser?.user_type === 'supervisor') {
      const { data: teamMembers } = await supabase
        .from('users')
        .select('id')
        .eq('supervisor_id', currentUser.id)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.id) || [];
      teamIds.push(currentUser.id);
      query = query.in('agent_id', teamIds);
    } else if (currentUser?.user_type === 'manager') {
      const { data: assignedSupervisors } = await supabase
        .from('manager_supervisor_assignments')
        .select('supervisor_id')
        .eq('manager_id', currentUser.id);

      const supervisorIds = assignedSupervisors?.map(s => s.supervisor_id) || [];

      const { data: teamMembers } = await supabase
        .from('users')
        .select('id')
        .in('supervisor_id', supervisorIds)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.id) || [];
      teamIds.push(...supervisorIds, currentUser.id);
      query = query.in('agent_id', teamIds);
    }
    // Admin sees all tasks (no filter needed)

    // Apply view-specific filters
    const today = new Date().toISOString().split('T')[0];

    if (view === 'today') {
      query = query.eq('due_date', today);
    } else if (view === 'overdue') {
      query = query.lt('due_date', today).neq('status', 'completed');
    } else if (view === 'upcoming') {
      query = query.gt('due_date', today).neq('status', 'completed');
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,` +
        `description.ilike.%${filters.search}%`
      );
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply priority filter
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    // Apply date filters
    if (filters.dateFrom) {
      query = query.gte('due_date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('due_date', filters.dateTo);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'due_date';
    const sortOrder = filters.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: tasks, error: queryError, count } = await query;

    if (queryError) {
      console.error('Tasks query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const total = count || 0;
    const response: CRMListResponse<Task> = {
      data: tasks as Task[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Tasks list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/crm/tasks - Create a new task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
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
    const body: TaskInsert = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    // Set defaults
    const taskData = {
      ...body,
      agent_id: body.agent_id || user.id,
      status: body.status || 'pending',
      priority: body.priority || 'medium',
      task_type: body.task_type || 'other',
      source: body.source || 'manual',
    };

    // Insert task
    const { data: task, error: insertError } = await supabase
      .from('crm_tasks')
      .insert(taskData)
      .select()
      .single();

    if (insertError) {
      console.error('Task insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Task create error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
