import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

/**
 * Data Stream API
 * Fetches ALL data from a project table in chunks to avoid Supabase's 1000 row limit
 * Uses server-side batching to return complete dataset
 */

// Known view schemas
const VIEW_SCHEMAS: Record<string, { columns: string[] }> = {
  nifraim: {
    columns: ['provider', 'processing_month', 'branch', 'agent_name', 'premium', 'comission'],
  },
  gemel: {
    columns: ['provider', 'processing_month', 'branch', 'agent_name', 'accumulation_balance', 'comission'],
  }
};

// Excel column indices (0-based) for field extraction from raw_data (legacy format)
const COLUMN_INDICES = {
  מספר_תהליך: 1,           // B
  סוג_תהליך: 4,            // E
  סטטוס: 5,                // F
  מטפל: 9,                 // J
  לקוח: 25,                // Z
  מזהה_לקוח: 28,           // AC (ת.ז.)
  סלולרי_לקוח: 34,         // AI
  סוג_מוצר_קיים: 36,       // AK
  יצרן_קיים: 37,           // AL
  מספר_חשבון_פוליסה_קיים: 45, // AT
  סהכ_צבירה_צפויה_מניוד: 51,  // AZ
  סוג_מוצר_חדש: 56,        // BE
  יצרן_חדש: 57,            // BF
  מספר_חשבון_פוליסה_חדש: 66, // BO
  תאריך_פתיחת_תהליך: 110,  // DG
  תאריך_העברת_מסמכים_ליצרן: 111, // DH
  פרמיה_צפויה: 118,        // DO
  מספר_סוכן_רשום: 132,     // EC
  מפקח: 136,               // EG
};

// Supabase has a hard limit of 1000 rows per request
// We use smaller chunks to ensure we get all data
const CHUNK_SIZE = 1000;

// Helper functions for parsing values
const parseNumber = (val: unknown): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/[₪,$€,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const parseDate = (val: unknown): string | null => {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val);
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
};

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

    const tableName = project.table_name || 'master_data';
    const viewSchema = VIEW_SCHEMAS[tableName];
    const isKnownView = !!viewSchema;

    // Check if this is a LOCAL project (data stored in main Supabase)
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local';

    // For local projects, use the main Supabase client
    // For external projects, create a project-specific client
    let projectClient;

    if (isLocalProject) {
      // Use main Supabase client for local projects
      projectClient = supabase;
    } else {
      // Create external project client
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

    // Get total count
    const { count: totalCount, error: countError } = await projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const total = totalCount || 0;
    console.log(`Fetching ${total} records from ${tableName} in chunks of ${CHUNK_SIZE}`);

    // Fetch all data in chunks
    const allData: Record<string, unknown>[] = [];
    const sortKey = isKnownView ? 'processing_month' : 'created_at';
    let offset = 0;

    // Keep fetching until we have all records
    let consecutiveEmptyChunks = 0;

    while (allData.length < total && consecutiveEmptyChunks < 3) {
      const { data: chunk, error: chunkError } = await projectClient
        .from(tableName)
        .select('*')
        .order(sortKey, { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (chunkError) {
        console.error(`Chunk error at offset ${offset}:`, chunkError);
        break;
      }

      if (chunk && chunk.length > 0) {
        allData.push(...chunk);
        console.log(`Fetched chunk: ${offset} - ${offset + chunk.length} (${allData.length}/${total})`);
        consecutiveEmptyChunks = 0;
      } else {
        consecutiveEmptyChunks++;
        console.log(`Empty chunk at offset ${offset}, consecutive: ${consecutiveEmptyChunks}`);
      }

      offset += CHUNK_SIZE;

      // Safety limit - prevent infinite loops
      if (offset > 500000) {
        console.warn('Safety limit reached at 500k records');
        break;
      }
    }

    console.log(`Total fetched: ${allData.length} records (expected: ${total})`);

    // If we still don't have all records, try a single large fetch as fallback
    if (allData.length < total && allData.length === 0) {
      console.log('Trying fallback single fetch...');
      const { data: fallbackData } = await projectClient
        .from(tableName)
        .select('*')
        .order(sortKey, { ascending: false });

      if (fallbackData && fallbackData.length > 0) {
        allData.push(...fallbackData);
        console.log(`Fallback fetched: ${fallbackData.length} records`);
      }
    }

    // Process data - transform raw_data arrays to Hebrew column names for legacy tables
    const processedData = allData.map((row, index) => {
      // Views have direct columns, no processing needed
      if (isKnownView) {
        return { id: index, ...row };
      }

      // Legacy tables - process raw_data
      let rawDataParsed: unknown = null;
      if (row.raw_data) {
        try {
          if (typeof row.raw_data === 'string') {
            rawDataParsed = JSON.parse(row.raw_data);
          } else {
            rawDataParsed = row.raw_data;
          }
        } catch {
          // Failed to parse
        }
      }

      const isObjectFormat = rawDataParsed && typeof rawDataParsed === 'object' && !Array.isArray(rawDataParsed);
      const arr = Array.isArray(rawDataParsed) ? rawDataParsed : [];
      const obj = isObjectFormat ? (rawDataParsed as Record<string, unknown>) : {};

      // For master_data table
      if (tableName === 'master_data') {
        if (isObjectFormat) {
          return {
            id: row.id,
            ...obj,
            total_expected_accumulation: row.total_expected_accumulation,
            import_month: row.import_month,
            import_year: row.import_year,
            created_at: row.created_at,
          };
        }
        // Array format - map to Hebrew column names
        return {
          id: row.id,
          מספר_תהליך: arr[COLUMN_INDICES.מספר_תהליך] || null,
          סוג_תהליך: arr[COLUMN_INDICES.סוג_תהליך] || null,
          סטטוס: arr[COLUMN_INDICES.סטטוס] || null,
          מטפל: arr[COLUMN_INDICES.מטפל] || null,
          לקוח: arr[COLUMN_INDICES.לקוח] || null,
          מזהה_לקוח: arr[COLUMN_INDICES.מזהה_לקוח] || null,
          סלולרי_לקוח: arr[COLUMN_INDICES.סלולרי_לקוח] || null,
          סוג_מוצר_קיים: arr[COLUMN_INDICES.סוג_מוצר_קיים] || null,
          יצרן_קיים: arr[COLUMN_INDICES.יצרן_קיים] || null,
          מספר_חשבון_פוליסה_קיים: arr[COLUMN_INDICES.מספר_חשבון_פוליסה_קיים] || null,
          סהכ_צבירה_צפויה_מניוד: parseNumber(arr[COLUMN_INDICES.סהכ_צבירה_צפויה_מניוד]),
          סוג_מוצר_חדש: arr[COLUMN_INDICES.סוג_מוצר_חדש] || row.product_type_new || null,
          יצרן_חדש: arr[COLUMN_INDICES.יצרן_חדש] || row.producer_new || null,
          מספר_חשבון_פוליסה_חדש: arr[COLUMN_INDICES.מספר_חשבון_פוליסה_חדש] || null,
          תאריך_פתיחת_תהליך: parseDate(arr[COLUMN_INDICES.תאריך_פתיחת_תהליך]),
          תאריך_העברת_מסמכים_ליצרן: parseDate(arr[COLUMN_INDICES.תאריך_העברת_מסמכים_ליצרן]) || row.documents_transfer_date,
          פרמיה_צפויה: parseNumber(arr[COLUMN_INDICES.פרמיה_צפויה]),
          מספר_סוכן_רשום: arr[COLUMN_INDICES.מספר_סוכן_רשום] || null,
          מפקח: arr[COLUMN_INDICES.מפקח] || null,
          total_expected_accumulation: row.total_expected_accumulation,
          import_month: row.import_month,
          import_year: row.import_year,
          created_at: row.created_at,
        };
      }

      // Other tables
      if (isObjectFormat) {
        return {
          id: row.id,
          ...obj,
          import_batch: row.import_batch,
          import_date: row.import_date,
          import_month: row.import_month,
          import_year: row.import_year,
          created_at: row.created_at,
        };
      }

      // Fallback - return with raw_data
      return {
        id: row.id,
        raw_data: arr,
        import_batch: row.import_batch,
        import_date: row.import_date,
        import_month: row.import_month,
        import_year: row.import_year,
        created_at: row.created_at,
      };
    });

    // Calculate stats based on table type
    const stats = isKnownView
      ? calculateViewStats(processedData, tableName)
      : calculateLegacyStats(processedData);

    return NextResponse.json({
      data: processedData,
      tableName,
      isView: isKnownView,
      viewSchema: viewSchema || null,
      stats,
      pagination: {
        total: processedData.length,
        totalInDb: total,
        chunksLoaded: Math.ceil(allData.length / CHUNK_SIZE),
      },
    });

  } catch (error) {
    console.error('Data stream error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

function calculateViewStats(data: Record<string, unknown>[], tableName: string) {
  const stats = {
    total: data.length,
    byProvider: {} as Record<string, number>,
    byBranch: {} as Record<string, number>,
    totalCommission: 0,
    totalPremium: 0,
    totalAccumulation: 0,
    uniqueAgents: new Set<string>(),
  };

  data.forEach(row => {
    // Provider breakdown
    if (row.provider) {
      const provider = String(row.provider);
      stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
    }
    // Branch breakdown
    if (row.branch) {
      const branch = String(row.branch);
      stats.byBranch[branch] = (stats.byBranch[branch] || 0) + 1;
    }
    // Commission total
    if (row.comission) {
      stats.totalCommission += Number(row.comission) || 0;
    }
    // Premium total (nifraim)
    if (row.premium) {
      stats.totalPremium += Number(row.premium) || 0;
    }
    // Accumulation total (gemel)
    if (row.accumulation_balance) {
      stats.totalAccumulation += Number(row.accumulation_balance) || 0;
    }
    // Unique agents
    if (row.agent_name) {
      stats.uniqueAgents.add(String(row.agent_name));
    }
  });

  return {
    total: stats.total,
    byProvider: stats.byProvider,
    byBranch: stats.byBranch,
    totalCommission: stats.totalCommission,
    totalPremium: stats.totalPremium,
    totalAccumulation: stats.totalAccumulation,
    uniqueAgents: stats.uniqueAgents.size,
  };
}

function calculateLegacyStats(data: Record<string, unknown>[]) {
  const stats = {
    total: data.length,
    byStatus: {} as Record<string, number>,
    byProcessType: {} as Record<string, number>,
    totalAccumulation: 0,
    totalPremium: 0,
    uniqueHandlers: new Set<string>(),
    uniqueSupervisors: new Set<string>(),
  };

  data.forEach(row => {
    // Status count
    const status = String(row.סטטוס || 'לא ידוע');
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // Process type count
    const processType = String(row.סוג_תהליך || 'לא ידוע');
    stats.byProcessType[processType] = (stats.byProcessType[processType] || 0) + 1;

    // Total accumulation
    const accumulation = row.סהכ_צבירה_צפויה_מניוד || row.total_expected_accumulation;
    if (accumulation) {
      stats.totalAccumulation += Number(accumulation) || 0;
    }

    // Total premium
    if (row.פרמיה_צפויה) {
      stats.totalPremium += Number(row.פרמיה_צפויה) || 0;
    }

    // Unique handlers
    if (row.מטפל) {
      stats.uniqueHandlers.add(String(row.מטפל));
    }

    // Unique supervisors
    if (row.מפקח) {
      stats.uniqueSupervisors.add(String(row.מפקח));
    }
  });

  return {
    total: stats.total,
    byStatus: stats.byStatus,
    byProcessType: stats.byProcessType,
    totalAccumulation: stats.totalAccumulation,
    totalPremium: stats.totalPremium,
    uniqueHandlers: stats.uniqueHandlers.size,
    uniqueSupervisors: stats.uniqueSupervisors.size,
  };
}
