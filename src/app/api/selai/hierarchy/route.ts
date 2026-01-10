import { NextRequest, NextResponse } from 'next/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';

// GET /api/selai/hierarchy - Get full hierarchy data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisor_id');
    const agentId = searchParams.get('agent_id');
    const role = searchParams.get('role');

    const selai = createSelaiServerClient();

    // Get supervisors
    const { data: supervisors, error: supervisorsError } = await selai
      .from('supervisors')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (supervisorsError) {
      throw supervisorsError;
    }

    // Build agents query based on role
    let agentsQuery = selai
      .from('external_agents')
      .select(`
        *,
        supervisor:supervisors(id, name)
      `)
      .eq('is_active_in_sela', true);

    // Filter by supervisor if provided (for supervisor role)
    if (role === 'supervisor' && supervisorId) {
      agentsQuery = agentsQuery.eq('supervisor_id', supervisorId);
    }

    // Filter by specific agent if provided (for agent role)
    if (role === 'agent' && agentId) {
      agentsQuery = agentsQuery.eq('id', agentId);
    }

    const { data: agents, error: agentsError } = await agentsQuery.order('full_name');

    if (agentsError) {
      throw agentsError;
    }

    // Get business units
    const { data: businessUnits, error: buError } = await selai
      .from('business_units')
      .select('*')
      .eq('is_active', true);

    if (buError) {
      throw buError;
    }

    // Calculate stats
    const stats = {
      totalSupervisors: supervisors?.length || 0,
      totalAgents: agents?.length || 0,
      activeAgents: agents?.filter(a => a.is_active_in_sela).length || 0,
      onboardedAgents: agents?.filter(a => a.onboarded_to_app).length || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        supervisors,
        agents,
        businessUnits,
        stats
      }
    });

  } catch (error) {
    console.error('Hierarchy fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hierarchy' },
      { status: 500 }
    );
  }
}
