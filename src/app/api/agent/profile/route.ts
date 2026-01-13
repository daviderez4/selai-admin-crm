/**
 * Agent Profile API
 * Returns the current user's profile from the users table
 * Includes supervisor information if assigned
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        id_number,
        user_type,
        supervisor_id,
        manager_id,
        is_active,
        is_approved,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);

      // If user doesn't exist in users table, return auth data
      return NextResponse.json({
        profile: {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          user_type: 'agent',
          is_active: true,
          is_approved: true,
        },
        supervisor: null,
        needsProfileSync: true
      });
    }

    // Get supervisor info if assigned
    let supervisor = null;
    if (profile.supervisor_id) {
      const { data: supervisorData } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .eq('id', profile.supervisor_id)
        .single();

      supervisor = supervisorData;
    }

    // Get manager info if assigned
    let manager = null;
    if (profile.manager_id) {
      const { data: managerData } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .eq('id', profile.manager_id)
        .single();

      manager = managerData;
    }

    return NextResponse.json({
      profile,
      supervisor,
      manager
    });

  } catch (error) {
    console.error('Agent profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
