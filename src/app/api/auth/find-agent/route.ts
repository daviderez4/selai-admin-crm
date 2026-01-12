/**
 * Find Agent API (Public - no auth required)
 * Searches for agent in SELAI database by ID number, phone, or name
 * Used during registration to match user with existing agent record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';

export async function POST(request: NextRequest) {
  try {
    const selai = createSelaiServerClient();

    const body = await request.json();
    const { id_number, phone, full_name } = body;

    if (!id_number && !phone && !full_name) {
      return NextResponse.json({
        error: 'At least one identifier is required (id_number, phone, or full_name)'
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
      business_unit_id
    `);

    // Build OR conditions based on provided identifiers
    const conditions: string[] = [];

    if (id_number) {
      // Clean ID number - remove any non-digits
      const cleanId = id_number.replace(/\D/g, '');
      conditions.push(`id_number.eq.${cleanId}`);
    }

    if (phone) {
      // Normalize phone number (remove dashes, spaces)
      const normalizedPhone = phone.replace(/[-\s]/g, '');
      // Match last 9 digits
      conditions.push(`mobile_phone.ilike.%${normalizedPhone.slice(-9)}`);
    }

    if (full_name) {
      // Search by name (partial match)
      conditions.push(`full_name.ilike.%${full_name}%`);
    }

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    // Only return active agents
    query = query.eq('is_active_in_sela', true);

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
      const cleanId = id_number.replace(/\D/g, '');
      const exactMatch = agents.find(a => a.id_number === cleanId);
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

    // Return agent info (mask sensitive data)
    return NextResponse.json({
      found: true,
      agent: {
        id: matchedAgent.id,
        full_name: matchedAgent.full_name,
        email: matchedAgent.email ? maskEmail(matchedAgent.email) : null,
        phone: matchedAgent.mobile_phone ? maskPhone(matchedAgent.mobile_phone) : null,
        id_number_masked: matchedAgent.id_number ? '***' + matchedAgent.id_number.slice(-4) : null,
        supervisor: supervisor ? { id: supervisor.id, name: supervisor.name } : null,
        already_registered: matchedAgent.onboarded_to_app || false
      },
      match_confidence: id_number ? 'high' : (phone ? 'medium' : 'low'),
      multiple_matches: agents.length > 1
    });

  } catch (error) {
    console.error('Find agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions to mask sensitive data
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***@***';
  const maskedUser = user.length > 2
    ? user[0] + '***' + user.slice(-1)
    : '***';
  return `${maskedUser}@${domain}`;
}

function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return '***';
  return '***-' + clean.slice(-4);
}
