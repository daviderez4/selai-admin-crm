import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DealUpdate } from '@/types/crm';

// GET /api/projects/[id]/crm/deals/[dealId] - Get single deal with relations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; dealId: string }> }
) {
  try {
    const { id: projectId, dealId } = await params;
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

    // Fetch deal with relations
    let query = supabase
      .from('crm_deals')
      .select(`
        *,
        contact:crm_contacts(*),
        lead:crm_leads(*),
        activities:crm_deal_activities(*, user:users(full_name)),
        insurance_company:crm_insurance_companies(*)
      `)
      .eq('id', dealId);

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

    const { data: deal, error: queryError } = await query.single();

    if (queryError) {
      if (queryError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }
      console.error('Deal query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Deal get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/crm/deals/[dealId] - Update deal
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; dealId: string }> }
) {
  try {
    const { id: projectId, dealId } = await params;
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

    // Get current deal for activity tracking
    const { data: currentDeal } = await supabase
      .from('crm_deals')
      .select('status, amount')
      .eq('id', dealId)
      .single();

    // Parse request body
    const body: DealUpdate = await request.json();

    // Build update query with RLS
    let query = supabase
      .from('crm_deals')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId);

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

    const { data: deal, error: updateError } = await query.select().single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Deal not found or access denied' }, { status: 404 });
      }
      console.error('Deal update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create activity log for status changes
    if (currentDeal && body.status && body.status !== currentDeal.status) {
      await supabase.from('crm_deal_activities').insert({
        deal_id: dealId,
        user_id: user.id,
        activity_type: 'status_changed',
        description: `סטטוס שונה מ-${currentDeal.status} ל-${body.status}`,
        metadata: {
          from_status: currentDeal.status,
          to_status: body.status,
        },
      });

      // If deal is won, set actual close date
      if (body.status === 'won' && !body.actual_close_date) {
        await supabase
          .from('crm_deals')
          .update({ actual_close_date: new Date().toISOString().split('T')[0] })
          .eq('id', dealId);
      }
    }

    // Create activity log for amount changes
    if (currentDeal && body.amount && body.amount !== currentDeal.amount) {
      await supabase.from('crm_deal_activities').insert({
        deal_id: dealId,
        user_id: user.id,
        activity_type: 'amount_changed',
        description: `סכום עסקה שונה מ-${currentDeal.amount} ל-${body.amount}`,
        metadata: {
          from_amount: currentDeal.amount,
          to_amount: body.amount,
        },
      });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Deal update error:', error);
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/crm/deals/[dealId] - Delete deal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; dealId: string }> }
) {
  try {
    const { id: projectId, dealId } = await params;
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
      .from('crm_deals')
      .delete()
      .eq('id', dealId);

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
      console.error('Deal delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Deal delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    );
  }
}
