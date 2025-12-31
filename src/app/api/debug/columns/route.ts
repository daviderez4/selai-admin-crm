import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try multiple approaches to discover column names

    // Approach 1: Try inserting with wrong column to get error hint
    const testColumns = [
      'id', 'name', 'description', 'supabase_url', 'supabase_anon_key',
      'supabase_service_key', 'service_key', 'service_key_encrypted',
      'user_id', 'created_by', 'owner_id', 'created_at', 'updated_at'
    ];

    const columnTests: Record<string, string> = {};

    for (const col of testColumns) {
      const { error } = await supabase
        .from('projects')
        .select(col)
        .limit(0);

      columnTests[col] = error ? `NOT FOUND: ${error.message}` : 'EXISTS';
    }

    // Approach 2: Try to get data
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    return NextResponse.json({
      columnTests,
      existingColumns: Object.entries(columnTests)
        .filter(([, v]) => v === 'EXISTS')
        .map(([k]) => k),
      dataCheck: {
        hasData: data && data.length > 0,
        sampleColumns: data && data.length > 0 ? Object.keys(data[0]) : [],
        error: error?.message
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
