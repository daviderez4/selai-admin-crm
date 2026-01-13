import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// User types hierarchy for permission checks
const USER_HIERARCHY: Record<string, number> = {
  admin: 100,
  manager: 80,
  supervisor: 60,
  agent: 40,
  client: 20,
};

// GET /api/users - List all users (for admin/manager)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile - search by auth_id first, then by email
    let currentProfile = null;

    const { data: byAuthId } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      currentProfile = byAuthId;
    } else {
      // Try by email
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();

      currentProfile = byEmail;
    }

    if (!currentProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    const userType = currentProfile.user_type;

    // Only admin and manager can view all users
    if (!['admin', 'manager'].includes(userType)) {
      return NextResponse.json({ error: 'Only admins and managers can view users' }, { status: 403 });
    }

    // Build query based on user type
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        id_number,
        user_type,
        supervisor_id,
        manager_id,
        is_active,
        is_approved,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    // Managers can only see users below them (supervisors, agents, clients)
    if (userType === 'manager') {
      query = query.in('user_type', ['supervisor', 'agent', 'client']);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Fetch pending registration requests
    const { data: pendingRequests } = await supabase
      .from('registration_requests')
      .select('*')
      .in('status', ['pending', 'needs_review'])
      .order('created_at', { ascending: false });

    return NextResponse.json({
      users: users || [],
      pendingRequests: pendingRequests || [],
      currentUserId: user.id,
      currentUserType: userType
    });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users - Update user (suspend/activate/change role)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile - search by auth_id first, then by email
    let currentProfile = null;

    const { data: byAuthId } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      currentProfile = byAuthId;
    } else {
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();

      currentProfile = byEmail;
    }

    if (!currentProfile || !['admin', 'manager'].includes(currentProfile.user_type)) {
      return NextResponse.json({ error: 'Not authorized to modify users' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, data } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    // Get target user
    const { data: targetUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check hierarchy - can only modify users below you
    const currentLevel = USER_HIERARCHY[currentProfile.user_type] || 0;
    const targetLevel = USER_HIERARCHY[targetUser.user_type] || 0;

    if (targetLevel >= currentLevel) {
      return NextResponse.json({ error: 'Cannot modify user with same or higher role' }, { status: 403 });
    }

    let updateData: Record<string, any> = {};

    switch (action) {
      case 'suspend':
        updateData = { is_active: false };
        break;

      case 'activate':
        updateData = { is_active: true };
        break;

      case 'update_role':
        if (!data?.user_type) {
          return NextResponse.json({ error: 'Missing user_type' }, { status: 400 });
        }
        // Can't promote to same or higher level
        const newLevel = USER_HIERARCHY[data.user_type] || 0;
        if (newLevel >= currentLevel) {
          return NextResponse.json({ error: 'Cannot promote user to same or higher role' }, { status: 403 });
        }
        updateData = { user_type: data.user_type };
        break;

      case 'update_supervisor':
        updateData = { supervisor_id: data?.supervisor_id || null };
        break;

      case 'update':
        // General update - filter allowed fields
        const allowedFields = ['full_name', 'phone', 'supervisor_id', 'manager_id'];
        allowedFields.forEach(field => {
          if (data?.[field] !== undefined) {
            updateData[field] = data[field];
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${action === 'suspend' ? 'suspended' : action === 'activate' ? 'activated' : 'updated'} successfully`
    });

  } catch (error) {
    console.error('Users PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile - only admin can delete
    let currentProfile = null;

    const { data: byAuthId } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      currentProfile = byAuthId;
    } else {
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();

      currentProfile = byEmail;
    }

    if (!currentProfile || currentProfile.user_type !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Delete from users table
    const { error: deleteUserError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    // Delete from auth
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      // User already deleted from users table, continue
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('Users DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
