import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

export interface ProjectAccessResult {
  hasAccess: boolean;
  role: string | null;
  userType: string | null;
  isAdmin: boolean;
  isManager: boolean;
  error?: string;
}

/**
 * Check if a user has access to a project
 * Admins and managers get implicit access to all projects
 * Other users need explicit access in user_project_access table
 *
 * NOTE: Uses adminClient to bypass RLS and properly check user roles
 */
export async function checkProjectAccess(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined,
  projectId: string
): Promise<ProjectAccessResult> {
  // Use admin client to bypass RLS when checking user roles
  const adminClient = createAdminClient();

  // Get user's role from users table - try auth_id first, then email
  let userRecord = null;

  const { data: byAuthId } = await adminClient
    .from('users')
    .select('user_type')
    .eq('auth_id', userId)
    .maybeSingle();

  if (byAuthId) {
    userRecord = byAuthId;
  } else {
    const { data: byEmail } = await adminClient
      .from('users')
      .select('user_type')
      .eq('email', userEmail?.toLowerCase() || '')
      .maybeSingle();
    userRecord = byEmail;
  }

  const userType = userRecord?.user_type || null;
  const isAdmin = userType === 'admin';
  const isManager = userType === 'manager';

  // Admins and managers get implicit access to all projects
  if (isAdmin || isManager) {
    return {
      hasAccess: true,
      role: 'admin',
      userType,
      isAdmin,
      isManager,
    };
  }

  // Check user_project_access for other users
  const { data: projectAccess } = await adminClient
    .from('user_project_access')
    .select('role')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (!projectAccess) {
    return {
      hasAccess: false,
      role: null,
      userType,
      isAdmin,
      isManager,
      error: 'Access denied',
    };
  }

  return {
    hasAccess: true,
    role: projectAccess.role,
    userType,
    isAdmin,
    isManager,
  };
}

/**
 * Check if user is admin or manager (can access projects)
 *
 * NOTE: Uses adminClient to bypass RLS
 */
export async function checkIsAdminOrManager(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined
): Promise<{ isAdmin: boolean; isManager: boolean; userType: string | null }> {
  // Use admin client to bypass RLS
  const adminClient = createAdminClient();

  let userRecord = null;

  const { data: byAuthId } = await adminClient
    .from('users')
    .select('user_type')
    .eq('auth_id', userId)
    .maybeSingle();

  if (byAuthId) {
    userRecord = byAuthId;
  } else {
    const { data: byEmail } = await adminClient
      .from('users')
      .select('user_type')
      .eq('email', userEmail?.toLowerCase() || '')
      .maybeSingle();
    userRecord = byEmail;
  }

  const userType = userRecord?.user_type || null;

  return {
    isAdmin: userType === 'admin',
    isManager: userType === 'manager',
    userType,
  };
}
