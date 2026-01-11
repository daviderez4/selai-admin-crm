import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/auth/supervisors
 * Get list of active supervisors for agent registration dropdown
 * Public endpoint (no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First try to get from user_profiles table
    const { data: profileSupervisors, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('role', 'supervisor')
      .eq('is_active', true)
      .eq('registration_status', 'approved')
      .order('full_name');

    if (!profileError && profileSupervisors && profileSupervisors.length > 0) {
      return NextResponse.json({ supervisors: profileSupervisors });
    }

    // Fallback: try supervisors table if exists
    const { data: legacySupervisors, error: legacyError } = await supabase
      .from('supervisors')
      .select('id, name, email')
      .eq('is_active', true)
      .order('name');

    if (!legacyError && legacySupervisors) {
      const formatted = legacySupervisors.map(s => ({
        id: s.id,
        full_name: s.name,
        email: s.email,
      }));
      return NextResponse.json({ supervisors: formatted });
    }

    // If no supervisors found, return empty list
    // In production, you might want to seed some default supervisors
    return NextResponse.json({ supervisors: [] });
  } catch (error) {
    console.error('Get supervisors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supervisors' },
      { status: 500 }
    );
  }
}
