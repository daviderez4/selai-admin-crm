import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Deal, DealInsert, DealStatus, CRMFilters, CRMListResponse, DealKanbanBoard } from '@/types/crm';

// GET /api/projects/[id]/crm/deals - List deals with pagination/filters or pipeline view
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
    const view = url.searchParams.get('view'); // 'pipeline' or default list

    const filters: CRMFilters = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '50'),
      sortBy: url.searchParams.get('sortBy') || 'created_at',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    // Build query
    let query = supabase
      .from('crm_deals')
      .select(`
        *,
        contact:crm_contacts(id, full_name, phone, email),
        lead:crm_leads(id, name, status),
        insurance_company:crm_insurance_companies(id, name, logo_url)
      `, { count: 'exact' });

    // RLS filter based on role
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

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,` +
        `description.ilike.%${filters.search}%,` +
        `insurance_company_name.ilike.%${filters.search}%`
      );
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
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

    // For pipeline view, fetch all deals without pagination
    if (view === 'pipeline') {
      const { data: deals, error: queryError } = await query;

      if (queryError) {
        console.error('Deals query error:', queryError);
        return NextResponse.json({ error: queryError.message }, { status: 500 });
      }

      // Group by status and calculate totals
      const statuses: DealStatus[] = [
        'discovery', 'proposal', 'negotiation', 'contract_sent', 'won', 'lost'
      ];

      const pipeline: DealKanbanBoard = {
        discovery: [],
        proposal: [],
        negotiation: [],
        contract_sent: [],
        won: [],
        lost: [],
      };

      let totalValue = 0;
      let wonValue = 0;
      const statusTotals: Record<DealStatus, { count: number; value: number }> = {
        discovery: { count: 0, value: 0 },
        proposal: { count: 0, value: 0 },
        negotiation: { count: 0, value: 0 },
        contract_sent: { count: 0, value: 0 },
        won: { count: 0, value: 0 },
        lost: { count: 0, value: 0 },
      };

      (deals as Deal[]).forEach(deal => {
        if (pipeline[deal.status]) {
          pipeline[deal.status].push(deal);
          statusTotals[deal.status].count++;
          statusTotals[deal.status].value += deal.amount || 0;
          totalValue += deal.amount || 0;
          if (deal.status === 'won') {
            wonValue += deal.amount || 0;
          }
        }
      });

      return NextResponse.json({
        pipeline,
        statuses,
        stats: {
          totalDeals: deals?.length || 0,
          totalValue,
          wonValue,
          statusTotals,
        },
      });
    }

    // Apply pagination for list view
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: deals, error: queryError, count } = await query;

    if (queryError) {
      console.error('Deals query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const total = count || 0;
    const response: CRMListResponse<Deal> = {
      data: deals as Deal[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Deals list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/crm/deals - Create a new deal
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
    const body: DealInsert = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }
    if (!body.contact_id) {
      return NextResponse.json(
        { error: 'contact_id is required' },
        { status: 400 }
      );
    }

    // Set defaults
    const dealData = {
      ...body,
      agent_id: body.agent_id || user.id,
      status: body.status || 'discovery',
      probability: body.probability || 50,
      currency: body.currency || 'ILS',
      policy_details: body.policy_details || {},
      tags: body.tags || [],
    };

    // Insert deal
    const { data: deal, error: insertError } = await supabase
      .from('crm_deals')
      .insert(dealData)
      .select()
      .single();

    if (insertError) {
      console.error('Deal insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create activity log
    await supabase.from('crm_deal_activities').insert({
      deal_id: deal.id,
      user_id: user.id,
      activity_type: 'created',
      description: 'עסקה חדשה נוצרה',
      metadata: {
        amount: body.amount,
        product_type: body.product_type,
      },
    });

    // If deal is from a lead, mark the lead as converted
    if (body.lead_id) {
      await supabase
        .from('crm_leads')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString(),
        })
        .eq('id', body.lead_id);
    }

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error('Deal create error:', error);
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
