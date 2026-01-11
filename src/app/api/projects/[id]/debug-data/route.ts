import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

/**
 * Debug API - Shows exactly what's in the database
 * Returns full structure of raw_data for diagnosis
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

    // Get total count
    const { count: totalCount } = await projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Get first 5 raw rows with ALL fields
    const { data: rawRows, error: queryError } = await projectClient
      .from(tableName)
      .select('*')
      .limit(5);

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({
        error: 'No data in table',
        tableName,
        totalCount: 0
      }, { status: 404 });
    }

    // Analyze first row
    const firstRow = rawRows[0];
    const topLevelKeys = Object.keys(firstRow);

    // Check raw_data structure
    let rawDataAnalysis: Record<string, unknown> = {};
    const rawData = firstRow.raw_data;

    if (rawData === null) {
      rawDataAnalysis = { status: 'raw_data is NULL' };
    } else if (rawData === undefined) {
      rawDataAnalysis = { status: 'raw_data is UNDEFINED' };
    } else if (Array.isArray(rawData)) {
      rawDataAnalysis = {
        status: 'raw_data is ARRAY',
        length: rawData.length,
        first10Values: rawData.slice(0, 10),
        last10Values: rawData.slice(-10),
      };
    } else if (typeof rawData === 'object') {
      const keys = Object.keys(rawData as object);
      const sample: Record<string, unknown> = {};

      // Get first 30 key-value pairs
      keys.slice(0, 30).forEach(key => {
        sample[key] = (rawData as Record<string, unknown>)[key];
      });

      // Find specific fields
      const agentKeys = keys.filter(k => k.includes('סוכן') || k.includes('מטפל'));
      const supervisorKeys = keys.filter(k => k.includes('מפקח'));
      const productKeys = keys.filter(k => k.includes('מוצר') || k.includes('יצרן'));
      const accumulationKeys = keys.filter(k => k.includes('צבירה') || k.includes('הפקדה'));

      rawDataAnalysis = {
        status: 'raw_data is OBJECT',
        totalKeys: keys.length,
        allKeys: keys,
        sampleData: sample,
        foundFields: {
          agentKeys,
          supervisorKeys,
          productKeys,
          accumulationKeys,
          agentValues: agentKeys.map(k => ({ key: k, value: (rawData as Record<string, unknown>)[k] })),
          supervisorValues: supervisorKeys.map(k => ({ key: k, value: (rawData as Record<string, unknown>)[k] })),
        }
      };
    } else {
      rawDataAnalysis = {
        status: 'raw_data has unexpected type',
        type: typeof rawData,
        value: rawData,
      };
    }

    // Get sample values from multiple rows for key fields
    const multiRowSample = rawRows.map((row, idx) => {
      const rd = row.raw_data as Record<string, unknown> | null;
      if (!rd || typeof rd !== 'object') {
        return { rowIndex: idx, hasRawData: false };
      }

      return {
        rowIndex: idx,
        hasRawData: true,
        'מטפל': rd['מטפל'],
        'מפקח': rd['מפקח'],
        'מספר סוכן רשום': rd['מספר סוכן רשום'],
        'סוג מוצר חדש': rd['סוג מוצר חדש'],
        'יצרן חדש': rd['יצרן חדש'],
        'סטטוס': rd['סטטוס'],
        'סה"כ צבירה צפויה מניוד': rd['סה"כ צבירה צפויה מניוד'],
        'הפקדה חד פעמית צפויה': rd['הפקדה חד פעמית צפויה'],
        'פרמיה צפויה': rd['פרמיה צפויה'],
        // Also check computed field
        total_expected_accumulation: row.total_expected_accumulation,
      };
    });

    return NextResponse.json({
      success: true,
      projectName: project.name,
      tableName,
      totalCount,
      rowsReturned: rawRows.length,

      // Structure analysis
      topLevelKeys,
      hasRawDataColumn: topLevelKeys.includes('raw_data'),
      hasTotalExpectedAccumulation: topLevelKeys.includes('total_expected_accumulation'),

      // raw_data deep analysis
      rawDataAnalysis,

      // Multi-row sample of key fields
      multiRowSample,

      // First complete raw row for reference
      firstCompleteRow: rawRows[0],
    });

  } catch (error) {
    console.error('Debug data error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
