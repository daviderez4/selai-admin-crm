import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

/**
 * API to extract ALL unique column names from raw_data JSONB
 * This helps understand what columns exist in the imported Excel data
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key, name, table_name, is_configured')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const tableName = project.table_name || 'master_data';

    const clientResult = createProjectClient({
      supabase_url: project.supabase_url,
      supabase_service_key: project.supabase_service_key,
      table_name: tableName,
      is_configured: project.is_configured,
    });

    if (!clientResult.success) {
      return NextResponse.json({
        error: 'Project database not configured',
        details: clientResult.error,
      }, { status: 400 });
    }

    const projectClient = clientResult.client!;

    // Get sample rows to analyze raw_data structure
    const { data: sampleRows, error: queryError } = await projectClient
      .from(tableName)
      .select('raw_data, total_expected_accumulation, import_month, import_year')
      .limit(100);

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!sampleRows || sampleRows.length === 0) {
      return NextResponse.json({ error: 'No data in table' }, { status: 404 });
    }

    // Extract all unique column names from raw_data
    const allColumns = new Map<string, {
      count: number;
      sampleValues: unknown[];
      dataType: string;
      isNumeric: boolean;
      index?: number; // For array format
    }>();

    // Check if raw_data is array (old format) or object (new format)
    const firstRow = sampleRows[0];
    let rawDataFormat: 'array' | 'object' | 'unknown' = 'unknown';

    if (firstRow.raw_data) {
      if (Array.isArray(firstRow.raw_data)) {
        rawDataFormat = 'array';
      } else if (typeof firstRow.raw_data === 'object') {
        rawDataFormat = 'object';
      }
    }

    // Process each row
    sampleRows.forEach(row => {
      if (!row.raw_data) return;

      if (rawDataFormat === 'object') {
        // New format: raw_data is an object with Hebrew keys
        const rawObj = row.raw_data as Record<string, unknown>;
        Object.entries(rawObj).forEach(([key, value]) => {
          if (!allColumns.has(key)) {
            allColumns.set(key, {
              count: 0,
              sampleValues: [],
              dataType: 'unknown',
              isNumeric: false,
            });
          }

          const col = allColumns.get(key)!;
          col.count++;

          if (value !== null && value !== undefined && value !== '') {
            if (col.sampleValues.length < 5) {
              col.sampleValues.push(value);
            }

            // Detect data type
            if (typeof value === 'number' || !isNaN(Number(value))) {
              col.isNumeric = true;
              col.dataType = 'number';
            } else if (typeof value === 'string') {
              if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)) {
                col.dataType = 'date';
              } else {
                col.dataType = 'text';
              }
            }
          }
        });
      } else if (rawDataFormat === 'array') {
        // Old format: raw_data is an array
        const rawArr = row.raw_data as unknown[];
        rawArr.forEach((value, index) => {
          const key = `עמודה_${index + 1}`;
          if (!allColumns.has(key)) {
            allColumns.set(key, {
              count: 0,
              sampleValues: [],
              dataType: 'unknown',
              isNumeric: false,
              index,
            });
          }

          const col = allColumns.get(key)!;
          col.count++;

          if (value !== null && value !== undefined && value !== '') {
            if (col.sampleValues.length < 3) {
              col.sampleValues.push(value);
            }
          }
        });
      }
    });

    // Convert to array and sort
    const columnsArray = Array.from(allColumns.entries())
      .map(([name, info]) => ({
        name,
        ...info,
        fillRate: Math.round((info.count / sampleRows.length) * 100),
      }))
      .sort((a, b) => b.fillRate - a.fillRate || a.name.localeCompare(b.name, 'he'));

    // Identify key fields for agents/supervisors
    const agentFields = columnsArray.filter(col =>
      /סוכן|מטפל|agent|handler/i.test(col.name)
    );

    const supervisorFields = columnsArray.filter(col =>
      /מפקח|supervisor|manager/i.test(col.name)
    );

    const accumulationFields = columnsArray.filter(col =>
      /צבירה|הפקדה|accumulation|deposit/i.test(col.name)
    );

    const productFields = columnsArray.filter(col =>
      /מוצר|יצרן|product|producer|company/i.test(col.name)
    );

    const statusFields = columnsArray.filter(col =>
      /סטטוס|status|מצב/i.test(col.name)
    );

    return NextResponse.json({
      tableName,
      rawDataFormat,
      totalRows: sampleRows.length,
      totalColumns: columnsArray.length,
      columns: columnsArray,
      keyFieldsFound: {
        agentFields: agentFields.map(f => ({ name: f.name, sample: f.sampleValues[0] })),
        supervisorFields: supervisorFields.map(f => ({ name: f.name, sample: f.sampleValues[0] })),
        accumulationFields: accumulationFields.map(f => ({ name: f.name, sample: f.sampleValues[0] })),
        productFields: productFields.map(f => ({ name: f.name, sample: f.sampleValues[0] })),
        statusFields: statusFields.map(f => ({ name: f.name, sample: f.sampleValues[0] })),
      },
      // Provide specific column mappings based on import-master route
      suggestedMapping: {
        'סה״כ צבירה צפויה מניוד': 'AZ (index 51)',
        'הפקדה חד פעמית צפויה': 'CZ (index 103)',
        'סוג מוצר חדש': 'BE (index 56)',
        'יצרן חדש': 'BF (index 57)',
        'תאריך העברת מסמכים ליצרן': 'DH (index 111)',
      },
    });
  } catch (error) {
    console.error('Raw columns error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
