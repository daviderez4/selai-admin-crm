/**
 * Verify Identity API
 * Matches Hub users with agents registered through the SELAI app
 * Uses ID number (teudat zehut), phone, or email to find matches
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const selai = createSelaiServerClient();

    // Verify current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id_number, phone, email } = body;

    if (!id_number && !phone && !email) {
      return NextResponse.json({
        error: 'At least one identifier is required (id_number, phone, or email)'
      }, { status: 400 });
    }

    // Search for matching agent in external_agents
    let query = selai.from('external_agents').select(`
      id,
      full_name,
      email,
      mobile_phone,
      id_number,
      supervisor_id,
      is_active_in_sela,
      onboarded_to_app,
      created_at
    `);

    // Build OR conditions based on provided identifiers
    const conditions: string[] = [];

    if (id_number) {
      conditions.push(`id_number.eq.${id_number}`);
    }
    if (phone) {
      // Normalize phone number (remove dashes, spaces)
      const normalizedPhone = phone.replace(/[-\s]/g, '');
      conditions.push(`mobile_phone.ilike.%${normalizedPhone.slice(-9)}`);
    }
    if (email) {
      conditions.push(`email.ilike.${email}`);
    }

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    const { data: agents, error: searchError } = await query;

    if (searchError) {
      console.error('Error searching agents:', searchError);
      return NextResponse.json({
        error: 'Failed to search for agent'
      }, { status: 500 });
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({
        found: false,
        message: 'No matching agent found in SELAI system'
      });
    }

    // If multiple matches, prefer exact ID match
    let matchedAgent = agents[0];
    if (agents.length > 1 && id_number) {
      const exactMatch = agents.find(a => a.id_number === id_number);
      if (exactMatch) matchedAgent = exactMatch;
    }

    // Get supervisor info
    let supervisor = null;
    if (matchedAgent.supervisor_id) {
      const { data: supervisorData } = await selai
        .from('supervisors')
        .select('id, name')
        .eq('id', matchedAgent.supervisor_id)
        .single();
      supervisor = supervisorData;
    }

    return NextResponse.json({
      found: true,
      agent: {
        id: matchedAgent.id,
        full_name: matchedAgent.full_name,
        email: matchedAgent.email,
        phone: matchedAgent.mobile_phone,
        id_number: matchedAgent.id_number ? '***' + matchedAgent.id_number.slice(-4) : null,
        is_active: matchedAgent.is_active_in_sela,
        onboarded_to_app: matchedAgent.onboarded_to_app,
        supervisor: supervisor
      },
      match_confidence: id_number ? 'high' : (phone ? 'medium' : 'low')
    });

  } catch (error) {
    console.error('Verify identity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Link Hub user to SELAI agent
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const selai = createSelaiServerClient();

    // Verify current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    // Verify agent exists in SELAI
    const { data: agent, error: agentError } = await selai
      .from('external_agents')
      .select('id, full_name, email, supervisor_id')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Update hub_invitations or users table to link this user to the agent
    // First check if user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          agent_id: agent_id,
          full_name: agent.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to link agent' }, { status: 500 });
      }
    } else {
      // Create new user record
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: agent.full_name,
          role: 'agent',
          agent_id: agent_id,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.json({ error: 'Failed to create user link' }, { status: 500 });
      }
    }

    // Mark agent as onboarded in SELAI
    await selai
      .from('external_agents')
      .update({ onboarded_to_app: true })
      .eq('id', agent_id);

    return NextResponse.json({
      success: true,
      message: 'User linked to agent successfully',
      agent: {
        id: agent.id,
        full_name: agent.full_name
      }
    });

  } catch (error) {
    console.error('Link agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
