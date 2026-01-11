// ============================================
// Role-Based Permission System for SELAI
// ============================================

/**
 * User Roles Hierarchy:
 * 1. admin - Full system access, can manage everything
 * 2. manager - Can see specific supervisors/projects assigned to them
 * 3. supervisor - Can see their agents and agents' data
 * 4. agent - Can see only their own data (leads, clients, policies)
 * 5. client - Can see only their own policies and communicate with agent
 */
export type SystemRole = 'admin' | 'manager' | 'supervisor' | 'agent' | 'client';

/**
 * Permission actions
 */
export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'import'
  | 'assign'
  | 'manage';

/**
 * Resource types that can be accessed
 */
export type ResourceType =
  | 'users'
  | 'projects'
  | 'agents'
  | 'supervisors'
  | 'managers'
  | 'clients'
  | 'leads'
  | 'deals'
  | 'contacts'
  | 'tasks'
  | 'meetings'
  | 'messages'
  | 'campaigns'
  | 'policies'
  | 'reports'
  | 'settings'
  | 'audit_logs';

/**
 * Permission definition
 */
export interface Permission {
  resource: ResourceType;
  actions: PermissionAction[];
  scope: 'all' | 'own' | 'team' | 'assigned';
}

/**
 * Role configuration with permissions
 */
export interface RoleConfig {
  id: SystemRole;
  label: string;
  labelHe: string;
  description: string;
  level: number; // Higher = more permissions
  permissions: Permission[];
  canManageRoles: SystemRole[]; // Which roles this role can manage
}

/**
 * Complete role definitions
 */
export const ROLE_CONFIGS: Record<SystemRole, RoleConfig> = {
  admin: {
    id: 'admin',
    label: 'Administrator',
    labelHe: 'מנהל מערכת',
    description: 'Full system access, can manage all users and settings',
    level: 100,
    permissions: [
      { resource: 'users', actions: ['view', 'create', 'edit', 'delete', 'manage'], scope: 'all' },
      { resource: 'projects', actions: ['view', 'create', 'edit', 'delete', 'manage'], scope: 'all' },
      { resource: 'agents', actions: ['view', 'create', 'edit', 'delete', 'assign'], scope: 'all' },
      { resource: 'supervisors', actions: ['view', 'create', 'edit', 'delete', 'assign'], scope: 'all' },
      { resource: 'managers', actions: ['view', 'create', 'edit', 'delete', 'assign'], scope: 'all' },
      { resource: 'clients', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: 'leads', actions: ['view', 'create', 'edit', 'delete', 'assign', 'export', 'import'], scope: 'all' },
      { resource: 'deals', actions: ['view', 'create', 'edit', 'delete', 'export'], scope: 'all' },
      { resource: 'contacts', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'], scope: 'all' },
      { resource: 'tasks', actions: ['view', 'create', 'edit', 'delete', 'assign'], scope: 'all' },
      { resource: 'meetings', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: 'messages', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: 'campaigns', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
      { resource: 'policies', actions: ['view', 'create', 'edit', 'delete', 'export'], scope: 'all' },
      { resource: 'reports', actions: ['view', 'create', 'export'], scope: 'all' },
      { resource: 'settings', actions: ['view', 'edit', 'manage'], scope: 'all' },
      { resource: 'audit_logs', actions: ['view'], scope: 'all' },
    ],
    canManageRoles: ['admin', 'manager', 'supervisor', 'agent', 'client'],
  },

  manager: {
    id: 'manager',
    label: 'Manager',
    labelHe: 'מנהל',
    description: 'Can view assigned supervisors and their teams, specific projects',
    level: 80,
    permissions: [
      { resource: 'supervisors', actions: ['view', 'edit'], scope: 'assigned' },
      { resource: 'agents', actions: ['view'], scope: 'team' }, // Agents under assigned supervisors
      { resource: 'projects', actions: ['view'], scope: 'assigned' },
      { resource: 'leads', actions: ['view', 'export'], scope: 'team' },
      { resource: 'deals', actions: ['view', 'export'], scope: 'team' },
      { resource: 'contacts', actions: ['view', 'export'], scope: 'team' },
      { resource: 'tasks', actions: ['view'], scope: 'team' },
      { resource: 'policies', actions: ['view', 'export'], scope: 'team' },
      { resource: 'reports', actions: ['view', 'export'], scope: 'team' },
      { resource: 'clients', actions: ['view'], scope: 'team' },
    ],
    canManageRoles: [],
  },

  supervisor: {
    id: 'supervisor',
    label: 'Supervisor',
    labelHe: 'מפקח',
    description: 'Can view and manage agents under their supervision',
    level: 60,
    permissions: [
      { resource: 'agents', actions: ['view', 'edit'], scope: 'team' },
      { resource: 'leads', actions: ['view', 'create', 'edit', 'assign', 'export'], scope: 'team' },
      { resource: 'deals', actions: ['view', 'edit', 'export'], scope: 'team' },
      { resource: 'contacts', actions: ['view', 'create', 'edit', 'export'], scope: 'team' },
      { resource: 'tasks', actions: ['view', 'create', 'edit', 'assign'], scope: 'team' },
      { resource: 'meetings', actions: ['view', 'create', 'edit'], scope: 'team' },
      { resource: 'messages', actions: ['view'], scope: 'team' },
      { resource: 'campaigns', actions: ['view', 'create', 'edit'], scope: 'team' },
      { resource: 'policies', actions: ['view', 'export'], scope: 'team' },
      { resource: 'reports', actions: ['view', 'export'], scope: 'team' },
      { resource: 'clients', actions: ['view'], scope: 'team' },
    ],
    canManageRoles: ['agent'],
  },

  agent: {
    id: 'agent',
    label: 'Agent',
    labelHe: 'סוכן',
    description: 'Can manage their own leads, clients, and data',
    level: 40,
    permissions: [
      { resource: 'leads', actions: ['view', 'create', 'edit'], scope: 'own' },
      { resource: 'deals', actions: ['view', 'create', 'edit'], scope: 'own' },
      { resource: 'contacts', actions: ['view', 'create', 'edit'], scope: 'own' },
      { resource: 'tasks', actions: ['view', 'create', 'edit'], scope: 'own' },
      { resource: 'meetings', actions: ['view', 'create', 'edit'], scope: 'own' },
      { resource: 'messages', actions: ['view', 'create'], scope: 'own' },
      { resource: 'campaigns', actions: ['view'], scope: 'own' },
      { resource: 'policies', actions: ['view', 'create', 'edit'], scope: 'own' },
      { resource: 'clients', actions: ['view', 'create', 'edit'], scope: 'own' },
      { resource: 'reports', actions: ['view'], scope: 'own' },
    ],
    canManageRoles: [],
  },

  client: {
    id: 'client',
    label: 'Client',
    labelHe: 'לקוח',
    description: 'Can view their own policies and communicate with their agent',
    level: 10,
    permissions: [
      { resource: 'policies', actions: ['view'], scope: 'own' },
      { resource: 'messages', actions: ['view', 'create'], scope: 'own' },
      { resource: 'meetings', actions: ['view'], scope: 'own' },
    ],
    canManageRoles: [],
  },
};

/**
 * Extended user profile with full permission context
 */
export interface UserProfile {
  id: string;
  auth_user_id: string; // Supabase auth.users.id
  email: string;
  full_name: string;
  id_number?: string; // Israeli ID
  mobile?: string;
  role: SystemRole;

  // Role-specific links
  supervisor_id?: string; // For agents: their supervisor
  manager_id?: string; // For supervisors: their manager (if any)

  // For managers: which supervisors they can see
  assigned_supervisor_ids?: string[];
  // For managers: which projects they can see
  assigned_project_ids?: string[];

  // For clients: which agent manages them
  agent_id?: string;

  // Status
  is_active: boolean;
  is_verified: boolean;
  registration_status: 'pending' | 'approved' | 'rejected';

  // Metadata
  avatar_url?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Registration request (pending approval)
 */
export interface RegistrationRequest {
  id: string;
  email: string;
  full_name: string;
  id_number: string;
  mobile: string;
  requested_role: 'agent' | 'supervisor';
  supervisor_id?: string; // For agents
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

/**
 * Client invitation
 */
export interface ClientInvitation {
  id: string;
  agent_id: string;
  client_email: string;
  client_name: string;
  client_phone?: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

/**
 * Check if a user has permission for an action on a resource
 */
export function hasPermission(
  userRole: SystemRole,
  resource: ResourceType,
  action: PermissionAction
): boolean {
  const roleConfig = ROLE_CONFIGS[userRole];
  if (!roleConfig) return false;

  const permission = roleConfig.permissions.find(p => p.resource === resource);
  if (!permission) return false;

  return permission.actions.includes(action);
}

/**
 * Get the permission scope for a resource
 */
export function getPermissionScope(
  userRole: SystemRole,
  resource: ResourceType
): 'all' | 'own' | 'team' | 'assigned' | null {
  const roleConfig = ROLE_CONFIGS[userRole];
  if (!roleConfig) return null;

  const permission = roleConfig.permissions.find(p => p.resource === resource);
  return permission?.scope || null;
}

/**
 * Check if one role can manage another
 */
export function canManageRole(managerRole: SystemRole, targetRole: SystemRole): boolean {
  const roleConfig = ROLE_CONFIGS[managerRole];
  return roleConfig?.canManageRoles.includes(targetRole) || false;
}

/**
 * Get role display info
 */
export function getRoleInfo(role: SystemRole): { label: string; labelHe: string; level: number } {
  const config = ROLE_CONFIGS[role];
  return {
    label: config?.label || role,
    labelHe: config?.labelHe || role,
    level: config?.level || 0,
  };
}

/**
 * Get all roles a user can assign
 */
export function getAssignableRoles(userRole: SystemRole): SystemRole[] {
  return ROLE_CONFIGS[userRole]?.canManageRoles || [];
}
