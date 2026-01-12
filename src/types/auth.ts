// =====================================================
// SELAI Authentication & Identity Types
// =====================================================

// User Types
export type UserType = 'guest' | 'pending' | 'agent' | 'supervisor' | 'admin' | 'client';

export interface User {
  id: string;
  auth_id?: string;
  email: string;

  // Profile
  full_name?: string;
  phone?: string;
  national_id?: string;
  avatar_url?: string;

  // Role & Status
  user_type: UserType;
  role?: string; // Legacy field
  is_active: boolean;
  is_profile_complete: boolean;
  is_approved: boolean;

  // Hierarchy
  supervisor_id?: string;
  agent_id?: string;

  // Client Portal
  has_portal_access: boolean;
  portal_invite_token?: string;
  portal_invite_expires_at?: string;

  // Metadata
  company_name?: string;
  license_number?: string;
  notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
  last_login_at?: string;
}

export interface ApprovalRequest {
  id: string;
  user_id: string;
  requested_role: UserType;
  requested_supervisor_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  // Joined user data
  user?: User;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Registration Flow
export interface CompleteProfileData {
  full_name: string;
  phone: string;
  national_id: string;
  user_type: 'agent' | 'supervisor' | 'admin';
  supervisor_id?: string;
  company_name?: string;
  license_number?: string;
}

// Client Invitation
export interface ClientInvitation {
  id: string;
  agent_id: string;
  client_email: string;
  client_name?: string;
  client_phone?: string;
  invite_token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface CreateClientInvitation {
  client_email: string;
  client_name?: string;
  client_phone?: string;
}

// Auth Audit Log
export interface AuthAuditLog {
  id: string;
  user_id?: string;
  event_type: string;
  event_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Role Labels in Hebrew
export const USER_TYPE_LABELS: Record<UserType, string> = {
  guest: 'אורח',
  pending: 'ממתין לאישור',
  agent: 'סוכן',
  supervisor: 'מפקח',
  admin: 'מנהל',
  client: 'לקוח',
};

// Role Permissions
export const ROLE_PERMISSIONS: Record<UserType, string[]> = {
  guest: ['view_public'],
  pending: ['view_profile', 'edit_profile'],
  agent: ['view_dashboard', 'view_crm', 'manage_clients', 'view_reports_own'],
  supervisor: ['view_dashboard', 'view_crm', 'manage_clients', 'view_reports_team', 'manage_team'],
  admin: ['view_dashboard', 'view_crm', 'manage_clients', 'view_reports_all', 'manage_team', 'manage_users', 'manage_system'],
  client: ['view_portal', 'view_policies', 'view_documents'],
};

// Helper function to check permission
export function hasPermission(userType: UserType, permission: string): boolean {
  return ROLE_PERMISSIONS[userType]?.includes(permission) || false;
}

// Helper function to check if user can access a route
export function canAccessRoute(userType: UserType, route: string): boolean {
  const routePermissions: Record<string, UserType[]> = {
    '/': ['agent', 'supervisor', 'admin'],
    '/dashboard': ['agent', 'supervisor', 'admin'],
    '/crm': ['agent', 'supervisor', 'admin'],
    '/projects': ['agent', 'supervisor', 'admin'],
    '/reports': ['supervisor', 'admin'],
    '/admin': ['admin'],
    '/settings': ['agent', 'supervisor', 'admin'],
    '/portal': ['client'],
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return true; // Public route
  return allowedRoles.includes(userType);
}
