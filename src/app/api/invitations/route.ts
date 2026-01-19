/**
 * Invitations API
 * Manages invitation links for agents to join the Hub
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';
import crypto from 'crypto';

// GET - List all invitations (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all invitations
    const { data: invitations, error } = await supabase
      .from('hub_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: invitations || []
    });

  } catch (error) {
    console.error('Invitations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      role = 'agent', // admin, manager, supervisor, agent
      agent_id,       // Optional: link to existing agent in SELAI
      project_id,     // Optional: grant access to specific project on registration
      expires_days = 7
    } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_days);

    // If agent_id provided, verify it exists in SELAI
    if (agent_id) {
      try {
        const selai = createSelaiServerClient();
        const { data: agent, error: agentError } = await selai
          .from('external_agents')
          .select('id, full_name, email')
          .eq('id', agent_id)
          .single();

        if (agentError || !agent) {
          return NextResponse.json({ error: 'Agent not found in SELAI' }, { status: 404 });
        }
      } catch (e) {
        console.error('Error checking agent:', e);
      }
    }

    // If project_id provided, verify it exists
    if (project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', project_id)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('hub_invitations')
      .insert({
        email,
        token,
        role,
        agent_id,
        project_id,
        expires_at: expires_at.toISOString(),
        created_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // Check if table doesn't exist
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Invitations table not set up. Please run the setup script.',
          setup_required: true
        }, { status: 500 });
      }
      console.error('Error creating invitation:', error);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Generate invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/register?token=${token}`;

    return NextResponse.json({
      success: true,
      data: {
        ...invitation,
        invite_link: inviteLink
      }
    });

  } catch (error) {
    console.error('Invitations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
