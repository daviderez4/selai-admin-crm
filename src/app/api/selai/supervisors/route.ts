/**
 * @feature HIER-SUP-001
 * @module Hierarchy
 * @description Get all supervisors with their agents count
 * @related HIER-AGT-001, HIER-AGT-003
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';

// GET /api/selai/supervisors - Get all supervisors with their agents count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') !== 'false';

    const selai = createSelaiServerClient();

    // Get supervisors
    let query = selai
      .from('supervisors')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: supervisors, error: supervisorsError } = await query.order('name');

    if (supervisorsError) {
      throw supervisorsError;
    }

    // Get agent counts per supervisor
    const supervisorsWithCounts = await Promise.all(
      (supervisors || []).map(async (supervisor) => {
        const { count: agentsCount } = await selai
          .from('external_agents')
          .select('*', { count: 'exact', head: true })
          .eq('supervisor_id', supervisor.id)
          .eq('is_active_in_sela', true);

        return {
          ...supervisor,
          agents_count: agentsCount || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        supervisors: supervisorsWithCounts,
        total: supervisorsWithCounts.length
      }
    });

  } catch (error) {
    console.error('Supervisors fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supervisors' },
      { status: 500 }
    );
  }
}

// GET supervisor by ID with their agents
export async function POST(request: NextRequest) {
  try {
    const { supervisorId } = await request.json();

    if (!supervisorId) {
      return NextResponse.json(
        { success: false, error: 'Supervisor ID is required' },
        { status: 400 }
      );
    }

    const selai = createSelaiServerClient();

    // Get supervisor details
    const { data: supervisor, error: supervisorError } = await selai
      .from('supervisors')
      .select('*')
      .eq('id', supervisorId)
      .single();

    if (supervisorError) {
      throw supervisorError;
    }

    // Get supervisor's agents
    const { data: agents, error: agentsError } = await selai
      .from('external_agents')
      .select(`
        id,
        full_name,
        email,
        mobile_phone,
        is_active_in_sela,
        onboarded_to_app,
        business_unit:business_units(id, name)
      `)
      .eq('supervisor_id', supervisorId)
      .order('full_name');

    if (agentsError) {
      throw agentsError;
    }

    // Calculate stats
    const stats = {
      totalAgents: agents?.length || 0,
      activeAgents: agents?.filter(a => a.is_active_in_sela).length || 0,
      onboardedAgents: agents?.filter(a => a.onboarded_to_app).length || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        supervisor,
        agents,
        stats
      }
    });

  } catch (error) {
    console.error('Supervisor details fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supervisor details' },
      { status: 500 }
    );
  }
}
