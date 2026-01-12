import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// POST /api/users/invite - Invite a new user by email
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, projectIds, role } = body;

    if (!email || !projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({
        error: 'email and projectIds array are required'
      }, { status: 400 });
    }

    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({
        error: 'Valid role is required (admin, editor, viewer)'
      }, { status: 400 });
    }

    // Check if current user is admin of all requested projects
    const { data: adminAccess } = await supabase
      .from('user_project_access')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .in('project_id', projectIds);

    if (!adminAccess || adminAccess.length !== projectIds.length) {
      return NextResponse.json({
        error: 'You must be admin of all selected projects'
      }, { status: 403 });
    }

    // Check if user already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    let targetUserId: string;

    if (existingProfile) {
      // User exists - just add access
      targetUserId = existingProfile.id;
    } else {
      // User doesn't exist - send magic link invitation via Supabase Auth
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://selai.app'}/complete-profile`,
          data: {
            invited_by: user.id,
            invited_role: role,
            project_ids: projectIds
          }
        }
      );

      if (inviteError) {
        console.error('Error sending invite email:', inviteError);
        return NextResponse.json({
          error: `Failed to send invitation: ${inviteError.message}`
        }, { status: 500 });
      }

      // Also save to pending_invitations table for tracking
      await supabase
        .from('pending_invitations')
        .upsert({
          email: email.toLowerCase(),
          invited_by: user.id,
          project_ids: projectIds,
          role: role,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }, {
          onConflict: 'email'
        })
        .select()
        .single();

      // Log the action (ignore errors)
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'user_invited',
          details: {
            invited_email: email,
            project_ids: projectIds,
            role: role,
            auth_user_id: inviteData.user?.id
          }
        });
      } catch {
        // Ignore audit log errors
      }

      return NextResponse.json({
        success: true,
        status: 'invited',
        message: `הזמנה נשלחה ל-${email}`,
        invitedUserId: inviteData.user?.id
      });
    }

    // User exists - add access to all projects
    const accessRecords = projectIds.map(projectId => ({
      user_id: targetUserId,
      project_id: projectId,
      role: role
    }));

    const { error: accessError } = await supabase
      .from('user_project_access')
      .upsert(accessRecords, {
        onConflict: 'user_id,project_id'
      });

    if (accessError) {
      console.error('Error adding access:', accessError);
      return NextResponse.json({ error: 'Failed to add access' }, { status: 500 });
    }

    // Log the action (ignore errors)
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'user_invited',
        details: {
          invited_email: email,
          target_user_id: targetUserId,
          project_ids: projectIds,
          role: role
        }
      });
    } catch {
      // Ignore audit log errors
    }

    return NextResponse.json({
      success: true,
      status: 'access_granted',
      message: `גישה ניתנה ל-${email}`,
      userId: targetUserId
    });

  } catch (error) {
    console.error('Invite API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
