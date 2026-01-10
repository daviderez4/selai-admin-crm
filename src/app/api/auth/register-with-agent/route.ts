/**
 * Register with Agent API
 * Creates a new Hub account and links it to an existing SELAI agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const selai = createSelaiServerClient();

    const body = await request.json();
    const { email, password, full_name, agent_id } = body;

    // Validate inputs
    if (!email || !password || !agent_id) {
      return NextResponse.json({
        error: 'Missing required fields (email, password, agent_id)'
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({
        error: 'Password must be at least 6 characters'
      }, { status: 400 });
    }

    // Verify agent exists in SELAI
    const { data: agent, error: agentError } = await selai
      .from('external_agents')
      .select('id, full_name, email, supervisor_id, is_active_in_sela')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({
        error: 'Agent not found in SELAI system'
      }, { status: 404 });
    }

    // Check if agent is active
    if (!agent.is_active_in_sela) {
      return NextResponse.json({
        error: 'This agent account is not active. Please contact your supervisor.'
      }, { status: 403 });
    }

    // Create user account in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || agent.full_name,
          role: 'agent',
          agent_id: agent_id
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);

      // Handle specific errors
      if (authError.message.includes('already registered')) {
        return NextResponse.json({
          error: 'משתמש עם אימייל זה כבר קיים במערכת'
        }, { status: 400 });
      }

      return NextResponse.json({
        error: authError.message
      }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({
        error: 'Failed to create user account'
      }, { status: 500 });
    }

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: full_name || agent.full_name,
        role: 'agent',
        agent_id: agent_id,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail the registration, just log
    }

    // Mark agent as onboarded in SELAI
    const { error: updateError } = await selai
      .from('external_agents')
      .update({
        onboarded_to_app: true,
        // Optionally update email if it was different
        email: email
      })
      .eq('id', agent_id);

    if (updateError) {
      console.error('Failed to update agent onboarding status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created and linked successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        agent_id: agent_id,
        agent_name: agent.full_name
      }
    });

  } catch (error) {
    console.error('Register with agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
