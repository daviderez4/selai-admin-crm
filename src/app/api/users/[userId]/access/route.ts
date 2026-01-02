import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/users/[userId]/access - Add or update user access to a project
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, role } = body;

    if (!projectId || !role) {
      return NextResponse.json({ error: 'projectId and role are required' }, { status: 400 });
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin, editor, or viewer' }, { status: 400 });
    }

    // Check if current user is admin of this project
    const { data: adminCheck } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!adminCheck || adminCheck.role !== 'admin') {
      return NextResponse.json({ error: 'Only project admins can manage access' }, { status: 403 });
    }

    // Upsert the access record
    const { data: accessData, error: accessError } = await supabase
      .from('user_project_access')
      .upsert({
        user_id: targetUserId,
        project_id: projectId,
        role: role
      }, {
        onConflict: 'user_id,project_id'
      })
      .select()
      .single();

    if (accessError) {
      console.error('Error updating access:', accessError);
      return NextResponse.json({ error: 'Failed to update access' }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'user_access_updated',
      details: {
        target_user_id: targetUserId,
        role: role,
        action_by: user.id
      }
    });

    return NextResponse.json({
      success: true,
      access: accessData,
      message: `Access updated successfully`
    });

  } catch (error) {
    console.error('Access API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[userId]/access - Remove user access from a project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Prevent removing yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot remove your own access' }, { status: 400 });
    }

    // Check if current user is admin of this project
    const { data: adminCheck } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!adminCheck || adminCheck.role !== 'admin') {
      return NextResponse.json({ error: 'Only project admins can manage access' }, { status: 403 });
    }

    // Delete the access record
    const { error: deleteError } = await supabase
      .from('user_project_access')
      .delete()
      .eq('user_id', targetUserId)
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('Error deleting access:', deleteError);
      return NextResponse.json({ error: 'Failed to remove access' }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'user_access_removed',
      details: {
        target_user_id: targetUserId,
        action_by: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Access removed successfully'
    });

  } catch (error) {
    console.error('Access API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
