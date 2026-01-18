import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Meeting, MeetingInsert, CRMFilters, CRMListResponse } from '@/types/crm';

// GET /api/projects/[id]/crm/meetings - List meetings with pagination and filters
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
    const view = url.searchParams.get('view'); // 'upcoming', 'today', 'week', or default all

    const filters: CRMFilters = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '50'),
      sortBy: url.searchParams.get('sortBy') || 'start_time',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    };

    // Build query
    let query = supabase
      .from('crm_meetings')
      .select(`
        *,
        contact:crm_contacts(id, full_name, phone, email)
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
    // Admin sees all meetings (no filter needed)

    // Apply view-specific filters
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (view === 'upcoming') {
      query = query
        .gte('start_time', now.toISOString())
        .in('status', ['scheduled', 'confirmed']);
    } else if (view === 'today') {
      query = query
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`);
    } else if (view === 'week') {
      query = query
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${weekEnd}T23:59:59`);
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,` +
        `description.ilike.%${filters.search}%,` +
        `location.ilike.%${filters.search}%`
      );
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply date filters
    if (filters.dateFrom) {
      query = query.gte('start_time', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('start_time', filters.dateTo);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'start_time';
    const sortOrder = filters.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: meetings, error: queryError, count } = await query;

    if (queryError) {
      console.error('Meetings query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const total = count || 0;
    const response: CRMListResponse<Meeting> = {
      data: meetings as Meeting[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Meetings list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/crm/meetings - Create a new meeting
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
    const body: MeetingInsert = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }
    if (!body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: 'start_time and end_time are required' },
        { status: 400 }
      );
    }

    // Calculate duration
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Set defaults
    const meetingData = {
      ...body,
      agent_id: body.agent_id || user.id,
      status: body.status || 'scheduled',
      meeting_type: body.meeting_type || 'in_person',
      duration_minutes: durationMinutes,
    };

    // Insert meeting
    const { data: meeting, error: insertError } = await supabase
      .from('crm_meetings')
      .insert(meetingData)
      .select()
      .single();

    if (insertError) {
      console.error('Meeting insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Meeting create error:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
