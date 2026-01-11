import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Contact, ContactUpdate } from '@/types/crm';

// GET /api/projects/[id]/crm/contacts/[contactId] - Get single contact with relations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: projectId, contactId } = await params;
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

    // Parse query params for relations
    const url = new URL(request.url);
    const includeRelations = url.searchParams.get('include')?.split(',') || [];

    // Fetch contact with optional relations
    let query = supabase
      .from('crm_contacts')
      .select('*')
      .eq('id', contactId);

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

    const { data: contact, error: queryError } = await query.single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }
      console.error('Contact query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Fetch related data if requested
    const result: Contact = contact as Contact;

    // Fetch relations in parallel if requested
    const relationQueries: Promise<void>[] = [];

    if (includeRelations.includes('family')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_contact_family')
            .select('*')
            .eq('contact_id', contactId);
          result.family = data || [];
        })()
      );
    }

    if (includeRelations.includes('assets')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_contact_assets')
            .select('*')
            .eq('contact_id', contactId);
          result.assets = data || [];
        })()
      );
    }

    if (includeRelations.includes('scores')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_contact_scores')
            .select('*')
            .eq('contact_id', contactId)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .single();
          result.scores = data || undefined;
        })()
      );
    }

    if (includeRelations.includes('policies')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_policies')
            .select('*')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });
          result.policies = data || [];
        })()
      );
    }

    if (includeRelations.includes('leads')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });
          result.leads = data || [];
        })()
      );
    }

    if (includeRelations.includes('deals')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_deals')
            .select('*')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });
          result.deals = data || [];
        })()
      );
    }

    if (includeRelations.includes('tasks')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_tasks')
            .select('*')
            .eq('contact_id', contactId)
            .order('due_date', { ascending: true });
          result.tasks = data || [];
        })()
      );
    }

    if (includeRelations.includes('meetings')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_meetings')
            .select('*')
            .eq('contact_id', contactId)
            .order('start_time', { ascending: false });
          result.meetings = data || [];
        })()
      );
    }

    if (includeRelations.includes('messages')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_messages')
            .select('*')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(50);
          result.messages = data || [];
        })()
      );
    }

    if (includeRelations.includes('coverage_gaps')) {
      relationQueries.push(
        (async () => {
          const { data } = await supabase
            .from('crm_coverage_gaps')
            .select('*')
            .eq('contact_id', contactId)
            .order('priority', { ascending: true });
          result.coverage_gaps = data || [];
        })()
      );
    }

    // Wait for all relation queries
    await Promise.all(relationQueries);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Contact get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/crm/contacts/[contactId] - Update contact
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: projectId, contactId } = await params;
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
    const body: ContactUpdate = await request.json();

    // Build update query with RLS
    let query = supabase
      .from('crm_contacts')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

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

    const { data: contact, error: updateError } = await query.select().single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Contact not found or access denied' }, { status: 404 });
      }
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'מספר טלפון זה כבר קיים עבור איש קשר אחר', code: 'DUPLICATE_PHONE' },
          { status: 409 }
        );
      }
      console.error('Contact update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Contact update error:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/crm/contacts/[contactId] - Delete contact
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id: projectId, contactId } = await params;
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

    // Only admin and supervisors can delete contacts
    if (access.role === 'agent') {
      // Agents can only delete their own contacts
      const { error: deleteError } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', contactId)
        .eq('agent_id', user.id);

      if (deleteError) {
        console.error('Contact delete error:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    } else if (access.role === 'supervisor') {
      // Supervisors can delete their team's contacts
      const { data: teamMembers } = await supabase
        .from('agent_supervisor_relations')
        .select('agent_id')
        .eq('supervisor_id', user.id)
        .eq('is_active', true);

      const teamIds = teamMembers?.map(m => m.agent_id) || [];
      teamIds.push(user.id);

      const { error: deleteError } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', contactId)
        .in('agent_id', teamIds);

      if (deleteError) {
        console.error('Contact delete error:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    } else {
      // Admin can delete any contact
      const { error: deleteError } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', contactId);

      if (deleteError) {
        console.error('Contact delete error:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
