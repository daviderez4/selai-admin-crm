import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/permissions
 * Returns current user's effective permissions and team hierarchy
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user from users table
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, user_type, supervisor_id, agent_id, is_active, is_approved')
      .eq('auth_id', user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get permission template for user's role
    const { data: template } = await supabase
      .from('permission_templates')
      .select('*')
      .eq('role', currentUser.user_type)
      .single();

    // Get user's permission overrides
    const { data: overrides } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    // Build effective permissions (override takes precedence)
    const permissions = {
      can_view_all_users: overrides?.can_view_all_users ?? template?.can_view_all_users ?? false,
      can_view_team_users: overrides?.can_view_team_users ?? template?.can_view_team_users ?? false,
      can_view_own_data: overrides?.can_view_own_data ?? template?.can_view_own_data ?? true,
      can_manage_users: overrides?.can_manage_users ?? template?.can_manage_users ?? false,
      can_approve_registrations: overrides?.can_approve_registrations ?? template?.can_approve_registrations ?? false,
      can_assign_supervisors: overrides?.can_assign_supervisors ?? template?.can_assign_supervisors ?? false,
      can_view_all_contacts: overrides?.can_view_all_contacts ?? template?.can_view_all_contacts ?? false,
      can_view_team_contacts: overrides?.can_view_team_contacts ?? template?.can_view_team_contacts ?? false,
      can_view_own_contacts: overrides?.can_view_own_contacts ?? template?.can_view_own_contacts ?? true,
      can_edit_contacts: overrides?.can_edit_contacts ?? template?.can_edit_contacts ?? false,
      can_delete_contacts: overrides?.can_delete_contacts ?? template?.can_delete_contacts ?? false,
      can_view_financial_data: overrides?.can_view_financial_data ?? template?.can_view_financial_data ?? false,
      can_view_team_financial: overrides?.can_view_team_financial ?? template?.can_view_team_financial ?? false,
      can_view_own_financial: overrides?.can_view_own_financial ?? template?.can_view_own_financial ?? true,
      can_export_financial: overrides?.can_export_financial ?? template?.can_export_financial ?? false,
      can_manage_projects: overrides?.can_manage_projects ?? template?.can_manage_projects ?? false,
      can_view_all_projects: overrides?.can_view_all_projects ?? template?.can_view_all_projects ?? false,
      can_import_data: overrides?.can_import_data ?? template?.can_import_data ?? false,
      can_export_data: overrides?.can_export_data ?? template?.can_export_data ?? false,
      can_access_admin_panel: overrides?.can_access_admin_panel ?? template?.can_access_admin_panel ?? false,
      can_modify_permissions: overrides?.can_modify_permissions ?? template?.can_modify_permissions ?? false,
      can_view_audit_logs: overrides?.can_view_audit_logs ?? template?.can_view_audit_logs ?? false,
    };

    // Get visible user IDs based on role
    let visibleUserIds: string[] = [];

    if (currentUser.user_type === 'admin') {
      // Admin sees all
      const { data: allUsers } = await supabase
        .from('users')
        .select('id')
        .eq('is_active', true);
      visibleUserIds = allUsers?.map(u => u.id) || [];
    } else if (currentUser.user_type === 'manager') {
      // Manager sees assigned supervisors + their agents + clients
      const { data: assignments } = await supabase
        .from('manager_supervisor_assignments')
        .select('supervisor_id')
        .eq('manager_id', currentUser.id);

      const supervisorIds = assignments?.map(a => a.supervisor_id) || [];

      if (supervisorIds.length > 0) {
        const { data: agents } = await supabase
          .from('users')
          .select('id')
          .in('supervisor_id', supervisorIds)
          .eq('is_active', true);

        const agentIds = agents?.map(a => a.id) || [];

        const { data: clients } = await supabase
          .from('users')
          .select('id')
          .eq('user_type', 'client')
          .in('agent_id', agentIds)
          .eq('is_active', true);

        visibleUserIds = [
          currentUser.id,
          ...supervisorIds,
          ...agentIds,
          ...(clients?.map(c => c.id) || []),
        ];
      } else {
        visibleUserIds = [currentUser.id];
      }
    } else if (currentUser.user_type === 'supervisor') {
      // Supervisor sees their agents + clients
      const { data: agents } = await supabase
        .from('users')
        .select('id')
        .eq('supervisor_id', currentUser.id)
        .eq('is_active', true);

      const agentIds = agents?.map(a => a.id) || [];

      const { data: clients } = await supabase
        .from('users')
        .select('id')
        .eq('user_type', 'client')
        .in('agent_id', agentIds.length > 0 ? agentIds : ['none'])
        .eq('is_active', true);

      visibleUserIds = [
        currentUser.id,
        ...agentIds,
        ...(clients?.map(c => c.id) || []),
      ];
    } else if (currentUser.user_type === 'agent') {
      // Agent sees their clients
      const { data: clients } = await supabase
        .from('users')
        .select('id')
        .eq('user_type', 'client')
        .eq('agent_id', currentUser.id)
        .eq('is_active', true);

      visibleUserIds = [
        currentUser.id,
        ...(clients?.map(c => c.id) || []),
      ];
    } else {
      // Client sees only self
      visibleUserIds = [currentUser.id];
    }

    return NextResponse.json({
      user: {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: currentUser.user_type,
        is_active: currentUser.is_active,
        is_approved: currentUser.is_approved,
      },
      permissions,
      visible_user_ids: visibleUserIds,
      team_size: visibleUserIds.length - 1, // Exclude self
    });
  } catch (error) {
    console.error('Permissions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
