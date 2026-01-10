import { NextRequest, NextResponse } from 'next/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';
import type { UserRole, HubUserProfile, ExternalAgent, Supervisor } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const selai = createSelaiServerClient();

    // First check if user exists in SELAI users table (registered app users)
    const { data: selaiUser, error: userError } = await selai
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (selaiUser) {
      // User found in SELAI - determine role and get related data
      const role = selaiUser.role as UserRole;

      let profile: Partial<HubUserProfile> = {
        email: selaiUser.email,
        full_name: selaiUser.full_name,
        role: role,
        selai_user_id: selaiUser.id,
        is_active: selaiUser.is_active,
        can_manage_users: role === 'admin',
        can_import_data: role === 'admin' || role === 'supervisor',
        can_export_data: true,
        can_view_all_agents: role === 'admin',
      };

      // If supervisor, find supervisor record
      if (role === 'supervisor') {
        const { data: supervisor } = await selai
          .from('supervisors')
          .select('id')
          .or(`selai_user_id.eq.${selaiUser.id},name.ilike.%${selaiUser.full_name}%`)
          .single();

        if (supervisor) {
          profile.supervisor_id = supervisor.id;
        }
      }

      // If agent, find external_agent record
      if (role === 'agent') {
        const { data: agent } = await selai
          .from('external_agents')
          .select('id, supervisor_id')
          .or(`selai_user_id.eq.${selaiUser.id},email.eq.${email}`)
          .single();

        if (agent) {
          profile.external_agent_id = agent.id;
          profile.supervisor_id = agent.supervisor_id;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          profile,
          source: 'selai_users'
        }
      });
    }

    // User not in SELAI users table - check if they're an external agent by email
    const { data: externalAgent } = await selai
      .from('external_agents')
      .select('*')
      .eq('email', email)
      .single();

    if (externalAgent) {
      // External agent found - they can access as agent
      const profile: Partial<HubUserProfile> = {
        email: externalAgent.email || email,
        full_name: externalAgent.full_name,
        role: 'agent',
        external_agent_id: externalAgent.id,
        supervisor_id: externalAgent.supervisor_id,
        is_active: externalAgent.is_active_in_sela,
        can_manage_users: false,
        can_import_data: false,
        can_export_data: true,
        can_view_all_agents: false,
      };

      return NextResponse.json({
        success: true,
        data: {
          profile,
          source: 'external_agents'
        }
      });
    }

    // User not found in SELAI at all - they might be a hub-only admin
    return NextResponse.json({
      success: true,
      data: {
        profile: null,
        source: 'hub_only'
      }
    });

  } catch (error) {
    console.error('SELAI verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify user' },
      { status: 500 }
    );
  }
}
