import { SupabaseClient } from '@supabase/supabase-js';

export type UserType = 'admin' | 'manager' | 'supervisor' | 'agent' | 'client';

export interface UserProfile {
  id: string;
  user_type: UserType;
  auth_id?: string;
  email?: string;
}

/**
 * Get user profile by auth ID or email
 * Searches by auth_id first, then falls back to email
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  authUserId: string,
  authUserEmail?: string
): Promise<UserProfile | null> {
  // Try by auth_id first
  const { data: byAuthId } = await supabase
    .from('users')
    .select('id, user_type, auth_id, email')
    .eq('auth_id', authUserId)
    .maybeSingle();

  if (byAuthId) {
    return byAuthId as UserProfile;
  }

  // Fall back to email
  if (authUserEmail) {
    const { data: byEmail } = await supabase
      .from('users')
      .select('id, user_type, auth_id, email')
      .eq('email', authUserEmail.toLowerCase())
      .maybeSingle();

    return byEmail as UserProfile | null;
  }

  return null;
}

/**
 * Check if user has required permission level for an action
 * @param userType - The user's type
 * @param requiredTypes - Array of user types that have permission
 */
export function hasPermission(
  userType: UserType | undefined | null,
  requiredTypes: UserType[]
): boolean {
  if (!userType) return false;
  return requiredTypes.includes(userType);
}

/**
 * Check if user can access projects (admin/manager only)
 */
export function canAccessProjects(userType: UserType | undefined | null): boolean {
  return hasPermission(userType, ['admin', 'manager']);
}

/**
 * Check if user can manage other users (admin/manager only)
 */
export function canManageUsers(userType: UserType | undefined | null): boolean {
  return hasPermission(userType, ['admin', 'manager']);
}

/**
 * Check if user can approve registrations (admin/manager/supervisor)
 */
export function canApproveRegistrations(userType: UserType | undefined | null): boolean {
  return hasPermission(userType, ['admin', 'manager', 'supervisor']);
}

/**
 * User hierarchy levels for permission checks
 */
export const USER_HIERARCHY: Record<UserType, number> = {
  admin: 100,
  manager: 80,
  supervisor: 60,
  agent: 40,
  client: 20,
};

/**
 * Check if actingUser can modify targetUser based on hierarchy
 */
export function canModifyUser(
  actingUserType: UserType | undefined | null,
  targetUserType: UserType | undefined | null
): boolean {
  if (!actingUserType || !targetUserType) return false;
  const actingLevel = USER_HIERARCHY[actingUserType] || 0;
  const targetLevel = USER_HIERARCHY[targetUserType] || 0;
  return actingLevel > targetLevel;
}
