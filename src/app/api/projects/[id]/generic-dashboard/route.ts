import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

/**
 * Generic Smart Dashboard API
 * Auto-detects columns and works with ANY table structure
 * Supports both local (Excel/Hub) and external (Supabase) data sources
 *
 * Features:
 * - Auto-detect all columns from raw_data JSONB
 * - Dynamic statistics based on numeric columns
 * - Grouping by any column
 * - Full data export capability
 * - Month/period filtering
 */

interface ColumnInfo {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'unknown';
  sampleValues: unknown[];
  uniqueCount: number;
  nullCount: number;
  total?: number; // For numeric columns
}

interface GroupStats {
  name: string;
  count: number;
  [key: string]: unknown; // Dynamic numeric totals
}

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
      .select('supabase_url, supabase_service_key, name, table_name, is_configured, storage_mode')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse query params
    const url = new URL(request.url);
    const tableName = url.searchParams.get('table') || project.table_name || 'master_data';
    const groupBy = url.searchParams.get('groupBy'); // Column to group by
    const filterColumn = url.searchParams.get('filterColumn');
    const filterValue = url.searchParams.get('filterValue');
    const importMonth = url.searchParams.get('month'); // YYYY-MM format
    const importYear = url.searchParams.get('year');
    const batchId = url.searchParams.get('batch');
    const mode = url.searchParams.get('mode') || 'summary'; // 'summary' | 'full' | 'columns'

    // Determine if this is a local or external project
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local';

    let projectClient;

    if (isLocalProject) {
      projectClient = supabase;
    } else {
      const clientResult = createProjectClient({
        supabase_url: project.supabase_url,
        supabase_service_key: project.supabase_service_key,
        table_name: tableName,
        is_configured: project.is_configured,
      });

      if (!clientResult.success) {
        return NextResponse.json({
          error: 'מסד הנתונים לא מוגדר',
          details: clientResult.error,
        }, { status: 400 });
      }

      projectClient = clientResult.client!;
    }

    // First, get the total count with filters
    let countQuery = projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (importMonth) {
      const [year, month] = importMonth.split('-').map(Number);
      countQuery = countQuery.eq('import_year', year).eq('import_month', month);
    }
    if (importYear) {
      countQuery = countQuery.eq('import_year', parseInt(importYear));
    }
    if (batchId) {
      countQuery = countQuery.eq('import_batch', batchId);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
      // Table might not exist or different structure
      return NextResponse.json({
        error: `טבלה "${tableName}" לא נמצאה או אין גישה`,
        details: countError.message,
        tableName,
      }, { status: 400 });
    }

    const total = totalCount || 0;

    if (total === 0) {
      return NextResponse.json({
        tableName,
        total: 0,
        columns: [],
        data: [],
        message: 'אין נתונים בטבלה',
      });
    }

    // Fetch data in chunks for large datasets
    const CHUNK_SIZE = 1000;
    const MAX_RECORDS = mode === 'full' ? 50000 : 10000; // Limit for memory
    const allData: Record<string, unknown>[] = [];

    const recordsToFetch = Math.min(total, MAX_RECORDS);

    for (let offset = 0; offset < recordsToFetch; offset += CHUNK_SIZE) {
      let query = projectClient
        .from(tableName)
        .select('*');

      // Apply same filters
      if (importMonth) {
        const [year, month] = importMonth.split('-').map(Number);
        query = query.eq('import_year', year).eq('import_month', month);
      }
      if (importYear) {
        query = query.eq('import_year', parseInt(importYear));
      }
      if (batchId) {
        query = query.eq('import_batch', batchId);
      }

      query = query.range(offset, offset + CHUNK_SIZE - 1);

      const { data: chunkData, error: chunkError } = await query;

      if (chunkError) {
        console.error('Chunk error:', chunkError);
        break;
      }

      if (chunkData) {
        allData.push(...chunkData);
      }
    }

    console.log(`Generic dashboard: Fetched ${allData.length} records for table ${tableName}`);

    // Analyze column structure from raw_data
    const columnMap = new Map<string, ColumnInfo>();
    const numericColumns: string[] = [];
    const textColumns: string[] = [];

    // Also track system columns
    const systemColumns = ['id', 'project_id', 'import_batch', 'import_date', 'import_month', 'import_year', 'sheet_name', 'created_at', 'updated_at'];

    allData.forEach((row) => {
      // Analyze raw_data columns (the actual Excel columns)
      const rawData = row.raw_data as Record<string, unknown> | null;
      if (rawData && typeof rawData === 'object') {
        Object.entries(rawData).forEach(([key, value]) => {
          if (!columnMap.has(key)) {
            columnMap.set(key, {
              name: key,
              type: 'unknown',
              sampleValues: [],
              uniqueCount: 0,
              nullCount: 0,
            });
          }

          const colInfo = columnMap.get(key)!;

          // Determine type
          if (value === null || value === undefined || value === '') {
            colInfo.nullCount++;
          } else if (typeof value === 'number') {
            colInfo.type = 'number';
            colInfo.total = (colInfo.total || 0) + value;
            if (!numericColumns.includes(key)) numericColumns.push(key);
          } else if (typeof value === 'boolean') {
            colInfo.type = 'boolean';
          } else if (typeof value === 'string') {
            // Try to detect if it's a date
            if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{2}\/\d{2}\/\d{4}/.test(value)) {
              colInfo.type = 'date';
            } else if (colInfo.type === 'unknown') {
              colInfo.type = 'text';
              if (!textColumns.includes(key)) textColumns.push(key);
            }
          }

          // Collect sample values (up to 5)
          if (colInfo.sampleValues.length < 5 && value !== null && value !== undefined && value !== '') {
            if (!colInfo.sampleValues.includes(value)) {
              colInfo.sampleValues.push(value);
            }
          }
        });
      }
    });

    // Calculate unique counts
    const columns = Array.from(columnMap.values());
    columns.forEach(col => {
      const uniqueValues = new Set(allData.map(row => {
        const rawData = row.raw_data as Record<string, unknown> | null;
        return rawData?.[col.name];
      }).filter(v => v !== null && v !== undefined && v !== ''));
      col.uniqueCount = uniqueValues.size;
    });

    // If mode is 'columns', return just column info
    if (mode === 'columns') {
      return NextResponse.json({
        tableName,
        total,
        columns: columns.sort((a, b) => a.name.localeCompare(b.name)),
        numericColumns,
        textColumns,
      });
    }

    // Calculate statistics
    const stats: Record<string, unknown> = {
      totalRecords: total,
      fetchedRecords: allData.length,
    };

    // Add totals for numeric columns
    columns.filter(c => c.type === 'number' && c.total).forEach(col => {
      stats[`total_${col.name}`] = col.total;
    });

    // Group by analysis (if requested)
    let groupedData: GroupStats[] = [];
    if (groupBy) {
      const groupMap = new Map<string, GroupStats>();

      allData.forEach((row) => {
        const rawData = row.raw_data as Record<string, unknown> | null;
        if (!rawData) return;

        const groupValue = String(rawData[groupBy] || 'לא ידוע');

        if (!groupMap.has(groupValue)) {
          groupMap.set(groupValue, {
            name: groupValue,
            count: 0,
          });
        }

        const group = groupMap.get(groupValue)!;
        group.count++;

        // Sum numeric columns
        numericColumns.forEach(numCol => {
          const value = Number(rawData[numCol]) || 0;
          group[`total_${numCol}`] = ((group[`total_${numCol}`] as number) || 0) + value;
        });
      });

      groupedData = Array.from(groupMap.values())
        .sort((a, b) => b.count - a.count);
    }

    // Get unique import batches
    const importBatches = [...new Set(allData.map(r => r.import_batch as string))].filter(Boolean);
    const importMonths = [...new Set(allData.map(r => {
      const year = r.import_year;
      const month = r.import_month;
      if (year && month) {
        return `${year}-${String(month).padStart(2, '0')}`;
      }
      return null;
    }))].filter(Boolean).sort((a, b) => (b || '').localeCompare(a || ''));

    // Filter by column value if requested
    let filteredData = allData;
    if (filterColumn && filterValue) {
      filteredData = allData.filter(row => {
        const rawData = row.raw_data as Record<string, unknown> | null;
        if (!rawData) return false;
        return String(rawData[filterColumn]).toLowerCase().includes(filterValue.toLowerCase());
      });
    }

    // Prepare response data
    const responseData = mode === 'full'
      ? filteredData.map(row => ({
          id: row.id,
          import_date: row.import_date,
          import_month: row.import_month,
          import_year: row.import_year,
          import_batch: row.import_batch,
          sheet_name: row.sheet_name,
          ...((row.raw_data as Record<string, unknown>) || {}),
        }))
      : filteredData.slice(0, 100).map(row => ({
          id: row.id,
          import_date: row.import_date,
          ...((row.raw_data as Record<string, unknown>) || {}),
        }));

    // Get unique values for filter dropdowns (for text columns with reasonable cardinality)
    const filterOptions: Record<string, string[]> = {};
    textColumns.slice(0, 10).forEach(colName => {
      const col = columnMap.get(colName);
      if (col && col.uniqueCount <= 100) {
        const uniqueValues = [...new Set(allData.map(row => {
          const rawData = row.raw_data as Record<string, unknown> | null;
          return rawData?.[colName];
        }))].filter(v => v !== null && v !== undefined && v !== '').map(String);
        filterOptions[colName] = uniqueValues.sort();
      }
    });

    return NextResponse.json({
      tableName,
      projectName: project.name,
      storageMode: isLocalProject ? 'local' : 'external',

      // Statistics
      stats,
      total,
      fetchedRecords: allData.length,

      // Column info
      columns: columns.sort((a, b) => {
        // Sort: numbers first, then text, then others
        if (a.type === 'number' && b.type !== 'number') return -1;
        if (a.type !== 'number' && b.type === 'number') return 1;
        return a.name.localeCompare(b.name);
      }),
      numericColumns,
      textColumns: textColumns.slice(0, 20),

      // Grouped data (if groupBy specified)
      groupedData: groupedData.length > 0 ? groupedData.slice(0, 50) : undefined,

      // Filter options
      filterOptions,
      importBatches: importBatches.slice(0, 20),
      importMonths,

      // Data rows
      data: responseData,
    });

  } catch (error) {
    console.error('Generic dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
