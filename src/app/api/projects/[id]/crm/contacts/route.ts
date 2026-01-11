import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Contact, ContactInsert, CRMFilters, CRMListResponse } from '@/types/crm';

// GET /api/projects/[id]/crm/contacts - List contacts with pagination and filters
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
    const filters: CRMFilters = {
      search: url.searchParams.get('search') || undefined,
      status: url.searchParams.get('status') || undefined,
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
      .from('crm_contacts')
      .select('*', { count: 'exact' });

    // RLS filter based on role
    if (access.role === 'agent') {
      // Agents only see their own contacts
      query = query.eq('agent_id', user.id);
    } else if (access.role === 'supervisor') {
      // Supervisors see their team's contacts
      const { data: teamMembers } = await supabase
        .from('agent_supervisor_relations')
        .select('agent_id')
        .eq('supervisor_id', user.id)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.agent_id) || [];
      teamIds.push(user.id); // Include supervisor's own contacts
      query = query.in('agent_id', teamIds);
    }
    // Admin sees all contacts

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,` +
        `last_name.ilike.%${filters.search}%,` +
        `full_name.ilike.%${filters.search}%,` +
        `email.ilike.%${filters.search}%,` +
        `phone.ilike.%${filters.search}%,` +
        `mobile.ilike.%${filters.search}%,` +
        `id_number.ilike.%${filters.search}%`
      );
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply source filter
    if (filters.source) {
      query = query.eq('source', filters.source);
    }

    // Apply tags filter (any of the tags)
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

    // Apply pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: contacts, error: queryError, count } = await query;

    if (queryError) {
      console.error('Contacts query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    const total = count || 0;
    const response: CRMListResponse<Contact> = {
      data: contacts as Contact[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Contacts list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/crm/contacts - Create a new contact
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
    const body: ContactInsert = await request.json();

    // Validate required fields
    if (!body.first_name) {
      return NextResponse.json(
        { error: 'first_name is required' },
        { status: 400 }
      );
    }

    // Set agent_id to current user
    const contactData = {
      ...body,
      agent_id: user.id,
      source: body.source || 'manual',
      status: body.status || 'active',
      tags: body.tags || [],
    };

    // Check for duplicate phone number
    if (body.phone) {
      const { data: existing } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('agent_id', user.id)
        .eq('phone', body.phone)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: 'איש קשר עם מספר טלפון זה כבר קיים', code: 'DUPLICATE_PHONE' },
          { status: 409 }
        );
      }
    }

    // Insert contact
    const { data: contact, error: insertError } = await supabase
      .from('crm_contacts')
      .insert(contactData)
      .select()
      .single();

    if (insertError) {
      console.error('Contact insert error:', insertError);

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'איש קשר עם מספר טלפון זה כבר קיים', code: 'DUPLICATE_PHONE' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Contact create error:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
