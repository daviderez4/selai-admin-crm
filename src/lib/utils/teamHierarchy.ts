import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Helper functions for team hierarchy management
 * Uses the users.supervisor_id field to determine team relationships
 */

interface CurrentUser {
  id: string;
  user_type: 'admin' | 'manager' | 'supervisor' | 'agent' | 'client' | 'pending' | 'guest';
}

/**
 * Get current user's info from users table
 */
export async function getCurrentUser(
  supabase: SupabaseClient,
  authUserId: string
): Promise<CurrentUser | null> {
  const { data } = await supabase
    .from('users')
    .select('id, user_type')
    .eq('auth_id', authUserId)
    .single();

  return data as CurrentUser | null;
}

/**
 * Get array of user IDs that are in the current user's team
 * Returns null for admin (meaning no filter needed - see all)
 */
export async function getTeamUserIds(
  supabase: SupabaseClient,
  currentUser: CurrentUser
): Promise<string[] | null> {
  // Admin sees all - return null to indicate no filter
  if (currentUser.user_type === 'admin') {
    return null;
  }

  // Agent only sees their own data
  if (currentUser.user_type === 'agent') {
    return [currentUser.id];
  }

  // Supervisor sees their agents + themselves
  if (currentUser.user_type === 'supervisor') {
    const { data: teamMembers } = await supabase
      .from('users')
      .select('id')
      .eq('supervisor_id', currentUser.id)
      .eq('is_active', true);

    const teamIds = teamMembers?.map(m => m.id) || [];
    teamIds.push(currentUser.id);
    return teamIds;
  }

  // Manager sees their assigned supervisors' teams + supervisors + themselves
  if (currentUser.user_type === 'manager') {
    const { data: assignedSupervisors } = await supabase
      .from('manager_supervisor_assignments')
      .select('supervisor_id')
      .eq('manager_id', currentUser.id);

    const supervisorIds = assignedSupervisors?.map(s => s.supervisor_id) || [];

    if (supervisorIds.length === 0) {
      // Manager with no assigned supervisors sees only themselves
      return [currentUser.id];
    }

    // Get all agents under these supervisors
    const { data: teamMembers } = await supabase
      .from('users')
      .select('id')
      .in('supervisor_id', supervisorIds)
      .eq('is_active', true);

    const teamIds = teamMembers?.map(m => m.id) || [];
    // Add supervisors themselves and the manager
    teamIds.push(...supervisorIds, currentUser.id);
    return teamIds;
  }

  // Client and other types only see their own
  return [currentUser.id];
}

/**
 * Apply team filter to a Supabase query
 * Use this helper for consistent filtering across all CRM routes
 */
export async function applyTeamFilter<T extends { eq: (column: string, value: string) => T; in: (column: string, values: string[]) => T }>(
  supabase: SupabaseClient,
  query: T,
  authUserId: string,
  agentIdColumn: string = 'agent_id'
): Promise<T> {
  const currentUser = await getCurrentUser(supabase, authUserId);

  if (!currentUser) {
    // No user found - filter to empty (will return no results)
    return query.eq(agentIdColumn, 'no-user-found');
  }

  const teamIds = await getTeamUserIds(supabase, currentUser);

  // null means admin - no filter needed
  if (teamIds === null) {
    return query;
  }

  // Single user (agent or client)
  if (teamIds.length === 1) {
    return query.eq(agentIdColumn, teamIds[0]);
  }

  // Multiple users (supervisor or manager team)
  return query.in(agentIdColumn, teamIds);
}
