import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: supervisors, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .in('user_type', ['supervisor', 'manager', 'admin'])
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supervisors: supervisors || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
