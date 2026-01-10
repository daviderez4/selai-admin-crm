/**
 * Single Invitation API
 * Verify and use invitation tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Verify invitation token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Find invitation by token
    const { data: invitation, error } = await supabase
      .from('hub_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired invitation link'
      }, { status: 404 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    // Check if already used
    if (invitation.status === 'used') {
      return NextResponse.json({
        valid: false,
        error: 'Invitation has already been used'
      }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        agent_id: invitation.agent_id
      }
    });

  } catch (error) {
    console.error('Invitation verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Use invitation (register)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { password, full_name } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({
        error: 'Password must be at least 6 characters'
      }, { status: 400 });
    }

    // Find and validate invitation
    const { data: invitation, error: invError } = await supabase
      .from('hub_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invError || !invitation) {
      return NextResponse.json({
        error: 'Invalid invitation link'
      }, { status: 404 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    if (invitation.status === 'used') {
      return NextResponse.json({
        error: 'Invitation has already been used'
      }, { status: 410 });
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: {
          full_name: full_name || '',
          role: invitation.role
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return NextResponse.json({
        error: authError.message
      }, { status: 400 });
    }

    // Mark invitation as used
    await supabase
      .from('hub_invitations')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        user_id: authData.user?.id
      })
      .eq('id', invitation.id);

    // Create user profile in users table
    if (authData.user) {
      await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: invitation.email,
          full_name: full_name || '',
          role: invitation.role,
          agent_id: invitation.agent_id,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: authData.user,
        role: invitation.role
      }
    });

  } catch (error) {
    console.error('Invitation use error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel/revoke invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Verify current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete invitation
    const { error } = await supabase
      .from('hub_invitations')
      .delete()
      .eq('token', token);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled'
    });

  } catch (error) {
    console.error('Invitation delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
