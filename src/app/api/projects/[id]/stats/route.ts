import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');

    if (!tableName) {
      return NextResponse.json({ error: 'Table name required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Connect to project's Supabase
    const serviceKey = decrypt(project.supabase_service_key);
    const projectClient = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get total count
    const { count: totalRecords } = await projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Get sample data to analyze columns
    const { data: sampleData } = await projectClient
      .from(tableName)
      .select('*')
      .limit(100);

    // Analyze columns
    const columns: { name: string; type: string; unique_values?: number; null_count: number }[] = [];
    const statusBreakdown: Record<string, number> = {};
    const dateDistribution: { date: string; count: number }[] = [];

    if (sampleData && sampleData.length > 0) {
      const columnNames = Object.keys(sampleData[0]);

      for (const colName of columnNames) {
        const values = sampleData.map(row => row[colName]);
        const nonNullValues = values.filter(v => v !== null && v !== undefined);
        const uniqueValues = new Set(nonNullValues.map(v => String(v)));

        let colType = 'unknown';
        if (nonNullValues.length > 0) {
          const sample = nonNullValues[0];
          if (typeof sample === 'number') colType = 'number';
          else if (typeof sample === 'boolean') colType = 'boolean';
          else if (typeof sample === 'string') {
            if (sample.match(/^\d{4}-\d{2}-\d{2}/)) colType = 'date';
            else colType = 'string';
          }
          else if (typeof sample === 'object') colType = 'json';
        }

        columns.push({
          name: colName,
          type: colType,
          unique_values: uniqueValues.size,
          null_count: values.length - nonNullValues.length,
        });

        // Check for status-like columns
        if (
          (colName.toLowerCase().includes('status') ||
            colName.toLowerCase().includes('state') ||
            colName.toLowerCase().includes('type')) &&
          uniqueValues.size <= 10
        ) {
          for (const val of uniqueValues) {
            const count = values.filter(v => String(v) === val).length;
            statusBreakdown[val] = (statusBreakdown[val] || 0) + count;
          }
        }

        // Check for date columns for distribution
        if (colType === 'date' && colName.toLowerCase().includes('created')) {
          const dateCounts: Record<string, number> = {};
          for (const val of nonNullValues) {
            const dateStr = String(val).substring(0, 10);
            dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
          }
          Object.entries(dateCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([date, count]) => {
              dateDistribution.push({ date, count });
            });
        }
      }
    }

    // Get last import info
    const { data: lastImport } = await supabase
      .from('import_history')
      .select('created_at, rows_imported, file_name')
      .eq('project_id', projectId)
      .eq('table_name', tableName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      total_records: totalRecords || 0,
      last_import_date: lastImport?.created_at,
      last_import_file: lastImport?.file_name,
      last_import_rows: lastImport?.rows_imported,
      columns,
      status_breakdown: Object.keys(statusBreakdown).length > 0 ? statusBreakdown : undefined,
      date_distribution: dateDistribution.length > 0 ? dateDistribution : undefined,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
