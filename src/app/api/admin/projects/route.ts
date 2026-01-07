import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/projects
 *
 * Returns all projects the user has admin access to with configuration status.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all projects the user has admin access to
    const { data: adminAccess, error: accessError } = await supabase
      .from('user_project_access')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 500 });
    }

    const projectIds = adminAccess?.map(a => a.project_id) || [];

    if (projectIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // Get project details with configuration status
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        supabase_url,
        table_name,
        data_type,
        icon,
        color,
        is_active,
        is_configured,
        connection_last_tested,
        connection_error,
        created_at,
        updated_at
      `)
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    // Get stats for each project
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        // Count team members
        const { count: memberCount } = await supabase
          .from('user_project_access')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        return {
          ...project,
          member_count: memberCount || 0,
        };
      })
    );

    return NextResponse.json({
      projects: projectsWithStats,
      total: projectsWithStats.length,
    });

  } catch (error) {
    console.error('Admin projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
