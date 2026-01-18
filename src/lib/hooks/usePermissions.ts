import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UserPermissions {
  can_view_all_users: boolean;
  can_view_team_users: boolean;
  can_view_own_data: boolean;
  can_manage_users: boolean;
  can_approve_registrations: boolean;
  can_assign_supervisors: boolean;
  can_view_all_contacts: boolean;
  can_view_team_contacts: boolean;
  can_view_own_contacts: boolean;
  can_edit_contacts: boolean;
  can_delete_contacts: boolean;
  can_view_financial_data: boolean;
  can_view_team_financial: boolean;
  can_view_own_financial: boolean;
  can_export_financial: boolean;
  can_manage_projects: boolean;
  can_view_all_projects: boolean;
  can_import_data: boolean;
  can_export_data: boolean;
  can_access_admin_panel: boolean;
  can_modify_permissions: boolean;
  can_view_audit_logs: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'supervisor' | 'agent' | 'client' | 'pending' | 'guest';
  is_active: boolean;
  is_approved: boolean;
}

export interface PermissionsState {
  user: CurrentUser | null;
  permissions: UserPermissions | null;
  visibleUserIds: string[];
  teamSize: number;
  isLoading: boolean;
  error: string | null;
}

const defaultPermissions: UserPermissions = {
  can_view_all_users: false,
  can_view_team_users: false,
  can_view_own_data: true,
  can_manage_users: false,
  can_approve_registrations: false,
  can_assign_supervisors: false,
  can_view_all_contacts: false,
  can_view_team_contacts: false,
  can_view_own_contacts: true,
  can_edit_contacts: false,
  can_delete_contacts: false,
  can_view_financial_data: false,
  can_view_team_financial: false,
  can_view_own_financial: true,
  can_export_financial: false,
  can_manage_projects: false,
  can_view_all_projects: false,
  can_import_data: false,
  can_export_data: false,
  can_access_admin_panel: false,
  can_modify_permissions: false,
  can_view_audit_logs: false,
};

export function usePermissions() {
  const [state, setState] = useState<PermissionsState>({
    user: null,
    permissions: null,
    visibleUserIds: [],
    teamSize: 0,
    isLoading: true,
    error: null,
  });

  const fetchPermissions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/permissions');

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();

      setState({
        user: data.user,
        permissions: data.permissions,
        visibleUserIds: data.visible_user_ids || [],
        teamSize: data.team_size || 0,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Helper functions
  const isAdmin = () => state.user?.role === 'admin';
  const isManager = () => state.user?.role === 'manager';
  const isSupervisor = () => state.user?.role === 'supervisor';
  const isAgent = () => state.user?.role === 'agent';
  const isClient = () => state.user?.role === 'client';

  const canViewUser = (userId: string) => {
    if (!state.visibleUserIds.length) return false;
    return state.visibleUserIds.includes(userId);
  };

  const hasPermission = (permission: keyof UserPermissions) => {
    return state.permissions?.[permission] ?? defaultPermissions[permission];
  };

  const getRoleLevel = () => {
    const levels: Record<string, number> = {
      admin: 100,
      manager: 80,
      supervisor: 60,
      agent: 40,
      client: 20,
      pending: 10,
      guest: 5,
    };
    return levels[state.user?.role || 'guest'] || 0;
  };

  return {
    ...state,
    // Role checks
    isAdmin,
    isManager,
    isSupervisor,
    isAgent,
    isClient,
    // Permission checks
    hasPermission,
    canViewUser,
    getRoleLevel,
    // Actions
    refresh: fetchPermissions,
  };
}

/**
 * Server-side helper to get user permissions
 * Use this in API routes
 */
export async function getServerPermissions(authUserId: string) {
  const supabase = createClient();

  // Get user from users table
  const { data: user } = await supabase
    .from('users')
    .select('id, user_type')
    .eq('auth_id', authUserId)
    .single();

  if (!user) {
    return { user: null, permissions: defaultPermissions, visibleUserIds: [] };
  }

  // Get template
  const { data: template } = await supabase
    .from('permission_templates')
    .select('*')
    .eq('role', user.user_type)
    .single();

  // Get overrides
  const { data: overrides } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Build effective permissions
  const permissions: UserPermissions = {
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

  return { user, permissions };
}
