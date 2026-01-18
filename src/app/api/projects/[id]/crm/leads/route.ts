import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Lead, LeadInsert, LeadStatus, CRMFilters, CRMListResponse, LeadKanbanBoard } from '@/types/crm';

// GET /api/projects/[id]/crm/leads - List leads with pagination/filters or kanban view
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
    const view = url.searchParams.get('view'); // 'kanban' or default list

    const filters: CRMFilters = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      priority: url.searchParams.get('priority') || undefined,
      source: url.searchParams.get('source') || undefined,
      tags: url.searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '50'),
      sortBy: url.searchParams.get('sortBy') || 'created_at',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Build query
    let query = supabase
      .from('crm_leads')
      .select('*, contact:crm_contacts(id, full_name, phone, email)', { count: 'exact' });

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
      // Supervisors see their team's leads - agents where supervisor_id = this supervisor
      const { data: teamMembers } = await supabase
        .from('users')
        .select('id')
        .eq('supervisor_id', currentUser.id)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.id) || [];
      teamIds.push(currentUser.id);
      query = query.in('agent_id', teamIds);
    } else if (currentUser?.user_type === 'manager') {
      // Managers see their assigned supervisors' teams
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
    // Admin sees all leads (no filter needed)

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,` +
        `email.ilike.%${filters.search}%,` +
        `phone.ilike.%${filters.search}%,` +
        `company.ilike.%${filters.search}%`
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

    // Apply source filter
    if (filters.source) {
      query = query.eq('source', filters.source);
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    // Apply date filters
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // For kanban view, fetch all leads without pagination
    if (view === 'kanban') {
      const { data: leads, error: queryError } = await query;

      if (queryError) {
        console.error('Leads query error:', queryError);
        return NextResponse.json({ error: queryError.message }, { status: 500 });
      }

      // Group by status
      const statuses: LeadStatus[] = [
        'new', 'assigned', 'contacted', 'qualified',
        'proposal', 'negotiation', 'converted', 'lost', 'archived'
      ];

      const kanban: LeadKanbanBoard = {
        new: [],
        assigned: [],
        contacted: [],
        qualified: [],
        proposal: [],
        negotiation: [],
        converted: [],
        lost: [],
        archived: [],
      };

      (leads as Lead[]).forEach(lead => {
        if (kanban[lead.status]) {
          kanban[lead.status].push(lead);
        }
      });

      return NextResponse.json({ kanban, statuses });
    }

    // Apply pagination for list view
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: leads, error: queryError, count } = await query;

    if (queryError) {
      console.error('Leads query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const total = count || 0;
    const response: CRMListResponse<Lead> = {
      data: leads as Lead[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Leads list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/crm/leads - Create a new lead
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
    const body: LeadInsert = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Set defaults
    const leadData = {
      ...body,
      agent_id: body.agent_id || user.id,
      status: body.status || 'new',
      priority: body.priority || 'medium',
      score: body.score || 0,
      interested_in: body.interested_in || [],
      tags: body.tags || [],
    };

    // Insert lead
    const { data: lead, error: insertError } = await supabase
      .from('crm_leads')
      .insert(leadData)
      .select()
      .single();

    if (insertError) {
      console.error('Lead insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from('crm_lead_activities').insert({
      lead_id: lead.id,
      user_id: user.id,
      activity_type: 'created',
      description: 'ליד חדש נוצר',
      metadata: { source: body.source || 'manual' },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('Lead create error:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
