import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Try to get column info from projects table
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(0);

    // Get table info using RPC if available
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'projects' })
      .select('*');

    return NextResponse.json({
      selectError: error,
      tableInfo,
      tableError,
      message: 'Check Supabase dashboard for actual columns'
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
