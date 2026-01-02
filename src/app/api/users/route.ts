import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/users - List all users with their project access
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin of at least one project
    const { data: adminAccess } = await supabase
      .from('user_project_access')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!adminAccess || adminAccess.length === 0) {
      return NextResponse.json({ error: 'Only admins can view users' }, { status: 403 });
    }

    const adminProjectIds = adminAccess.map(a => a.project_id);

    // Get all users who have access to projects where current user is admin
    const { data: accessData, error: accessError } = await supabase
      .from('user_project_access')
      .select(`
        id,
        user_id,
        project_id,
        role,
        created_at,
        projects (
          id,
          name
        )
      `)
      .in('project_id', adminProjectIds);

    if (accessError) {
      console.error('Error fetching access data:', accessError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get unique user IDs
    const userIds = [...new Set(accessData?.map(a => a.user_id) || [])];

    // Fetch user details from auth.users via admin API or profiles
    // For now, we'll use the access data and get emails from a separate query
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, created_at, last_sign_in_at')
      .in('id', userIds);

    // If profiles table doesn't exist, try to get from auth metadata
    let usersMap: Record<string, { email: string; full_name?: string; created_at?: string }> = {};

    if (profiles && !profilesError) {
      profiles.forEach(p => {
        usersMap[p.id] = {
          email: p.email,
          full_name: p.full_name,
          created_at: p.created_at
        };
      });
    }

    // Group access by user
    const usersWithAccess: Record<string, {
      id: string;
      email: string;
      full_name?: string;
      projects: Array<{ id: string; name: string; role: string }>;
      created_at?: string;
    }> = {};

    accessData?.forEach(access => {
      const userId = access.user_id;
      if (!usersWithAccess[userId]) {
        usersWithAccess[userId] = {
          id: userId,
          email: usersMap[userId]?.email || `user-${userId.slice(0, 8)}`,
          full_name: usersMap[userId]?.full_name,
          projects: [],
          created_at: usersMap[userId]?.created_at || access.created_at
        };
      }

      const project = access.projects as unknown as { id: string; name: string } | null;
      if (project) {
        usersWithAccess[userId].projects.push({
          id: project.id,
          name: project.name,
          role: access.role
        });
      }
    });

    // Convert to array
    const users = Object.values(usersWithAccess);

    // Also return list of projects the admin manages (for the UI)
    const { data: adminProjects } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', adminProjectIds);

    return NextResponse.json({
      users,
      managedProjects: adminProjects || [],
      currentUserId: user.id
    });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
