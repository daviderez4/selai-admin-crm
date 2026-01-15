/**
 * @feature HIER-AGT-001
 * @module Hierarchy
 * @description Get all agents with filtering, search, pagination
 * @related HIER-AGT-003, HIER-SUP-001
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';

// GET /api/selai/agents - Get agents with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisor_id');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active_only') !== 'false';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const selai = createSelaiServerClient();

    let query = selai
      .from('external_agents')
      .select(`
        *,
        supervisor:supervisors(id, name),
        business_unit:business_units(id, name)
      `, { count: 'exact' });

    // Apply filters
    if (activeOnly) {
      query = query.eq('is_active_in_sela', true);
    }

    if (supervisorId) {
      query = query.eq('supervisor_id', supervisorId);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,id_number.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('full_name');

    const { data: agents, count, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        agents,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Agents fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// GET agent by ID with full details including producer numbers
export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    const selai = createSelaiServerClient();

    // Get agent details
    const { data: agent, error: agentError } = await selai
      .from('external_agents')
      .select(`
        *,
        supervisor:supervisors(id, name, email, phone),
        business_unit:business_units(id, name)
      `)
      .eq('id', agentId)
      .single();

    if (agentError) {
      throw agentError;
    }

    // Get agent's producer numbers (their numbers at each insurance company)
    const { data: producerNumbers, error: pnError } = await selai
      .from('agent_producer_numbers')
      .select(`
        *,
        producer:producers(id, name, parent_company_id)
      `)
      .eq('external_agent_id', agentId)
      .order('agent_number');

    if (pnError) {
      throw pnError;
    }

    // Get agent's clients count
    const { count: clientsCount } = await selai
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    // Get agent's contacts count
    const { count: contactsCount } = await selai
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId);

    return NextResponse.json({
      success: true,
      data: {
        agent,
        producerNumbers,
        stats: {
          clientsCount: clientsCount || 0,
          contactsCount: contactsCount || 0,
          producerNumbersCount: producerNumbers?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Agent details fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent details' },
      { status: 500 }
    );
  }
}
