import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check user_type - use adminClient to bypass RLS
    let userProfile = null;

    const { data: byAuthId } = await adminClient
      .from('users')
      .select('user_type')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      userProfile = byAuthId;
    } else {
      const { data: byEmail } = await adminClient
        .from('users')
        .select('user_type')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();
      userProfile = byEmail;
    }

    if (!userProfile || !['admin', 'manager'].includes(userProfile.user_type)) {
      console.log('Project access denied:', { userProfile, userId: user.id, email: user.email });
      return NextResponse.json({ error: 'אין לך הרשאה לצפות בפרויקטים' }, { status: 403 });
    }

    // Admins and managers get implicit access to all projects
    const isAdmin = userProfile.user_type === 'admin';
    const isManager = userProfile.user_type === 'manager';

    let access: { role: string } | null = null;

    if (isAdmin || isManager) {
      // Admins/managers have implicit admin access to all projects
      access = { role: 'admin' };
    } else {
      // Check user_project_access for other users
      const { data: projectAccess } = await adminClient
        .from('user_project_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      access = projectAccess;
    }

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project details (without sensitive keys) - use adminClient to bypass RLS
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, name, description, table_name, data_type, icon, color, supabase_url, created_at, updated_at')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project, role: access.role });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Failed to get project' },
      { status: 500 }
    );
  }
}
