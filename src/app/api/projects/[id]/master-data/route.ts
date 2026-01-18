import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

// Known view schemas - when table is one of these, use direct column mapping
const VIEW_SCHEMAS: Record<string, { columns: string[], numericFields: string[], aggregateFields: Record<string, string> }> = {
  nifraim: {
    columns: ['provider', 'processing_month', 'branch', 'agent_name', 'premium', 'comission'],
    numericFields: ['premium', 'comission'],
    aggregateFields: {
      totalPremium: 'premium',
      totalCommission: 'comission',
      byProvider: 'provider',
      byBranch: 'branch',
      byAgent: 'agent_name'
    }
  },
  gemel: {
    columns: ['provider', 'processing_month', 'branch', 'agent_name', 'accumulation_balance', 'comission'],
    numericFields: ['accumulation_balance', 'comission'],
    aggregateFields: {
      totalAccumulation: 'accumulation_balance',
      totalCommission: 'comission',
      byProvider: 'provider',
      byAgent: 'agent_name'
    }
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's role from users table - use adminClient to bypass RLS
    let userRecord = null;

    const { data: byAuthId } = await adminClient
      .from('users')
      .select('user_type')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      userRecord = byAuthId;
    } else {
      const { data: byEmail } = await adminClient
        .from('users')
        .select('user_type')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();
      userRecord = byEmail;
    }

    const isAdmin = userRecord?.user_type === 'admin';
    const isManager = userRecord?.user_type === 'manager';

    // Check access - admins and managers get full access to all projects
    let access: { role: string } | null = null;

    if (isAdmin || isManager) {
      // Admins/managers have implicit admin access to all projects
      access = { role: 'admin' };
    } else {
      // Check user_project_access for other users
      const { data: projectAccess } = await adminClient
        .from('user_project_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .single();

      access = projectAccess;
    }

    if (!access) {
      console.log('Master data access denied:', { userRecord, userId: user.id, email: user.email });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project details including credentials and configuration status - use adminClient to bypass RLS
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('supabase_url, supabase_anon_key, supabase_service_key, name, table_name, is_configured, storage_mode')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Use project's table_name or default to master_data
    const tableName = project.table_name || 'master_data';
    console.log('Using table:', tableName, 'for project:', project.name);

    // Parse query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    // No limit by default - fetch all records. Use limit=N to paginate server-side
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : null; // null = no limit
    const search = url.searchParams.get('search') || '';
    const sortKey = url.searchParams.get('sortKey') || 'created_at';
    const sortDir = url.searchParams.get('sortDir') || 'desc';

    // =========================================================================
    // PROJECT CLIENT - Local or External
    // =========================================================================

    // Check if this is a LOCAL project (data stored in main Supabase)
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local';

    let projectClient;

    if (isLocalProject) {
      // Use main Supabase client for local projects
      projectClient = supabase;
      console.log('Using main Supabase for local project:', project.name, 'table:', tableName);
    } else {
      // STRICT PROJECT ISOLATION - Each project MUST have its own database credentials
      const clientResult = createProjectClient({
        supabase_url: project.supabase_url,
        supabase_service_key: project.supabase_service_key,
        table_name: tableName,
        is_configured: project.is_configured,
      });

      if (!clientResult.success) {
        console.error('Project client creation failed:', project.name, clientResult.errorCode, clientResult.error);
        return NextResponse.json({
          error: 'מסד הנתונים של הפרויקט לא מוגדר',
          details: clientResult.error,
          errorCode: clientResult.errorCode,
          action: 'configure_project',
          noData: true
        }, { status: 400 });
      }

      projectClient = clientResult.client!;
      console.log('Connected to external project database:', project.name, 'table:', tableName);
    }

    // Check if this is a known view schema
    const viewSchema = VIEW_SCHEMAS[tableName];
    const isKnownView = !!viewSchema;

    // First verify connection by checking if the table/view exists
    // For views without 'id' column, just check count
    const { count: checkCount, error: tableCheckError } = await projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (tableCheckError) {
      console.error('Table check error:', tableCheckError);
      // Check if the error message is HTML (invalid credentials)
      if (tableCheckError.message && tableCheckError.message.includes('<!DOCTYPE')) {
        return NextResponse.json({
          error: 'חיבור למסד הנתונים נכשל. פרטי ההתחברות ל-Supabase אינם תקינים.',
          details: 'התשובה מצביעה על URL או מפתח API שגויים.'
        }, { status: 500 });
      }
      // Check if table doesn't exist
      if (tableCheckError.code === 'PGRST116' || tableCheckError.code === '42P01' || tableCheckError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: `הטבלה "${tableName}" לא קיימת במסד הנתונים של הפרויקט.`,
          details: 'יש לייבא נתונים תחילה דרך עמוד הייבוא.'
        }, { status: 404 });
      }
      return NextResponse.json({ error: tableCheckError.message }, { status: 500 });
    }

    // Build query
    let query = projectClient
      .from(tableName)
      .select('*', { count: 'exact' });

    // RLS filtering based on role
    if (access.role === 'agent') {
      // Agent sees only their own records
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('handler_name')
        .eq('user_id', user.id)
        .single();

      if (userProfile?.handler_name) {
        // For known views, filter by agent_name column
        if (isKnownView) {
          query = query.eq('agent_name', userProfile.handler_name);
        } else {
          // For legacy tables, filter by raw_data
          query = query.contains('raw_data', { מטפל: userProfile.handler_name });
        }
      }
    } else if (access.role === 'supervisor') {
      // Supervisor sees their team's records
      const { data: teamMembers } = await supabase
        .from('user_profiles')
        .select('handler_name')
        .eq('supervisor_id', user.id);

      if (teamMembers && teamMembers.length > 0) {
        const handlerNames = teamMembers.map(m => m.handler_name).filter(Boolean);
        if (isKnownView && handlerNames.length > 0) {
          query = query.in('agent_name', handlerNames);
        }
      }
    }
    // Admin sees all records

    // Note: Each project uses its own table (master_data, insurance_data, etc.)
    // No need to filter by project_id since tables are now separate

    // Order - use appropriate column for views vs legacy tables
    const defaultSortKey = isKnownView ? 'processing_month' : 'created_at';
    const actualSortKey = sortKey === 'created_at' && isKnownView ? defaultSortKey : sortKey;
    query = query.order(actualSortKey, { ascending: sortDir === 'asc' });

    // Get total count first to know how many records exist
    const { count: totalCount } = await projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Pagination - apply range based on limit or fetch all
    if (limit !== null) {
      // Server-side pagination with specified limit
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);
    } else {
      // No limit specified - fetch ALL records (override Supabase's 1000 default)
      const total = totalCount || 50000;
      query = query.range(0, total - 1);
    }

    // Execute query
    const { data: rawData, error: queryError, count } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      // Check if the error message is HTML (invalid credentials)
      if (queryError.message && queryError.message.includes('<!DOCTYPE')) {
        return NextResponse.json({
          error: 'חיבור למסד הנתונים נכשל. פרטי ההתחברות ל-Supabase אינם תקינים.',
          details: 'נסה לעדכן את פרטי החיבור בהגדרות הפרויקט.'
        }, { status: 500 });
      }
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

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
      // Try to parse various date formats
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      // Try DD/MM/YYYY format
      const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (match) {
        const [, day, month, year] = match;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    };

    // Process data - different handling based on table type
    const processedData = (rawData || []).map((row, index) => {
      // =============================================
      // KNOWN VIEWS (nifraim, gemel) - direct columns
      // =============================================
      if (isKnownView) {
        // Views have direct columns, no raw_data processing needed
        return {
          id: index, // Views don't have ID, use index
          ...row,
        };
      }

      // =============================================
      // LEGACY TABLES - raw_data processing
      // =============================================
      let rawDataParsed: unknown = null;

      // Parse raw_data - could be array (old format) or object (new format)
      if (row.raw_data) {
        try {
          if (typeof row.raw_data === 'string') {
            rawDataParsed = JSON.parse(row.raw_data);
          } else {
            rawDataParsed = row.raw_data;
          }
        } catch {
          console.log('Failed to parse raw_data');
        }
      }

      // Check if raw_data is an object (new format with Hebrew keys) or array (old format)
      const isObjectFormat = rawDataParsed && typeof rawDataParsed === 'object' && !Array.isArray(rawDataParsed);
      const arr = Array.isArray(rawDataParsed) ? rawDataParsed : [];
      const obj = isObjectFormat ? (rawDataParsed as Record<string, unknown>) : {};

      // For master_data table - use predefined column mapping (for old array format)
      // or use object keys directly (for new object format)
      if (tableName === 'master_data') {
        if (isObjectFormat) {
          // New format - raw_data is already an object with Hebrew keys
          return {
            id: row.id,
            ...obj, // Spread all Hebrew column names directly
            total_expected_accumulation: row.total_expected_accumulation,
            import_month: row.import_month,
            import_year: row.import_year,
            created_at: row.created_at,
          };
        }
        // Old format - use column indices
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

      // For other tables - spread raw_data object directly (Hebrew keys!)
      // or keep as raw_data for old array format
      if (isObjectFormat) {
        // New format - spread Hebrew column names directly into the row
        return {
          id: row.id,
          ...obj, // All columns with Hebrew names
          import_batch: row.import_batch,
          import_date: row.import_date,
          import_month: row.import_month,
          import_year: row.import_year,
          created_at: row.created_at,
        };
      }

      // Old array format - keep as raw_data
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

    // Calculate stats - use totalCount from the count query for accuracy
    const stats = {
      total: totalCount || count || processedData.length,
      byStatus: {} as Record<string, number>,
      byProcessType: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      byBranch: {} as Record<string, number>,
      totalAccumulation: 0,
      totalPremium: 0,
      totalCommission: 0,
      uniqueHandlers: new Set<string>(),
      uniqueSupervisors: new Set<string>(),
      uniqueAgents: new Set<string>(),
    };

    processedData.forEach(row => {
      // =============================================
      // KNOWN VIEWS - use view-specific fields
      // =============================================
      if (isKnownView) {
        // Provider breakdown
        if (row.provider) {
          stats.byProvider[row.provider] = (stats.byProvider[row.provider] || 0) + 1;
        }
        // Branch breakdown
        if (row.branch) {
          stats.byBranch[row.branch] = (stats.byBranch[row.branch] || 0) + 1;
        }
        // Commission total
        if (row.comission) {
          stats.totalCommission += Number(row.comission) || 0;
        }
        // Premium total (nifraim view)
        if (row.premium) {
          stats.totalPremium += Number(row.premium) || 0;
        }
        // Accumulation total (gemel view)
        if (row.accumulation_balance) {
          stats.totalAccumulation += Number(row.accumulation_balance) || 0;
        }
        // Unique agents
        if (row.agent_name) {
          stats.uniqueAgents.add(String(row.agent_name));
        }
        return;
      }

      // =============================================
      // LEGACY TABLES - use Hebrew field names
      // =============================================
      // Status count
      const status = String(row.סטטוס || 'לא ידוע');
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Process type count
      const processType = String(row.סוג_תהליך || 'לא ידוע');
      stats.byProcessType[processType] = (stats.byProcessType[processType] || 0) + 1;

      // Total accumulation (use both fields)
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

    const totalRecords = totalCount || count || processedData.length;

    // Build response with view-appropriate stats
    const responseStats = isKnownView ? {
      total: totalRecords,
      byProvider: stats.byProvider,
      byBranch: stats.byBranch,
      totalCommission: stats.totalCommission,
      totalPremium: stats.totalPremium,
      totalAccumulation: stats.totalAccumulation,
      uniqueAgents: stats.uniqueAgents.size,
    } : {
      total: totalRecords,
      byStatus: stats.byStatus,
      byProcessType: stats.byProcessType,
      totalAccumulation: stats.totalAccumulation,
      totalPremium: stats.totalPremium,
      uniqueHandlers: stats.uniqueHandlers.size,
      uniqueSupervisors: stats.uniqueSupervisors.size,
    };

    return NextResponse.json({
      data: processedData,
      tableName, // Include table name for frontend to know the table type
      isView: isKnownView,
      viewSchema: viewSchema || null,
      stats: responseStats,
      pagination: {
        page,
        limit: limit || totalRecords,
        total: totalRecords,
        totalPages: limit ? Math.ceil(totalRecords / limit) : 1,
      },
    });
  } catch (error) {
    console.error('Master data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
