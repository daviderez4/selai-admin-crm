/**
 * Hierarchy Stats API
 * Returns statistics about supervisors, agents and connected users
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSelaiServerClient } from '@/lib/supabase/selai-client';

export async function GET() {
  try {
    const supabase = await createClient();
    const selai = createSelaiServerClient();

    // Get counts from SELAI database (external_agents)
    const { count: totalAgents } = await selai
      .from('external_agents')
      .select('*', { count: 'exact', head: true });

    const { count: activeAgents } = await selai
      .from('external_agents')
      .select('*', { count: 'exact', head: true })
      .eq('is_active_in_sela', true);

    // Get supervisors count
    const { count: totalSupervisors } = await selai
      .from('supervisors')
      .select('*', { count: 'exact', head: true });

    // Get connected users from our users table (users with agent user_type)
    const { count: connectedAgents } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'agent')
      .eq('is_active', true)
      .eq('is_approved', true);

    // Get all active users count (any role)
    const { count: totalConnectedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_approved', true);

    return NextResponse.json({
      success: true,
      data: {
        totalSupervisors: totalSupervisors || 0,
        totalAgents: totalAgents || 0,
        activeAgents: activeAgents || 0,
        connectedAgents: connectedAgents || 0, // Agents with app accounts
        totalConnectedUsers: totalConnectedUsers || 0 // All users with accounts
      }
    });

  } catch (error) {
    console.error('Hierarchy stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
