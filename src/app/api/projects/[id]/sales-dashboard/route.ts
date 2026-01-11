import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

/**
 * Sales Dashboard API
 * Fetches data from master_data table for sales analytics
 *
 * IMPORTANT: raw_data is stored as ARRAY (not object)
 * Column indices are based on the Excel file structure
 *
 * Features:
 * - Combined צפי צבירה + הפקדה חד פעמית (total_expected_accumulation)
 * - Per-agent breakdown
 * - Per-supervisor breakdown
 * - Product distribution
 */

// Excel column indices (0-based) - based on mechirot.xlsx analysis
const COLUMN_INDICES = {
  מספר_תהליך: 1,           // B
  סוג_תהליך: 4,            // E
  סטטוס: 5,                // F
  מטפל: 9,                 // J - Agent/Handler
  לקוח: 25,                // Z
  מזהה_לקוח: 28,           // AC (ת.ז.)
  סלולרי_לקוח: 34,         // AI
  סוג_מוצר_קיים: 35,       // AJ
  יצרן_קיים: 36,           // AK
  מספר_חשבון_פוליסה_קיים: 44, // AS
  סהכ_צבירה_צפויה_מניוד: 51,  // AZ - Expected accumulation from transfer
  סוג_מוצר_חדש: 56,        // BE - New product type
  יצרן_חדש: 57,            // BF - New producer
  מספר_חשבון_פוליסה_חדש: 65, // BN
  הפקדה_חד_פעמית_צפויה: 103, // CZ - One-time deposit expected
  תאריך_פתיחת_תהליך: 108,  // DE
  תאריך_העברת_מסמכים_ליצרן: 111, // DH
  פרמיה_צפויה: 119,        // DP - Expected premium
  מספר_סוכן_רשום: 141,     // EL - Registered agent number
  מפקח: 145,               // EP - Supervisor
};

interface AgentStats {
  name: string;
  agentNumber: string | null;
  supervisor: string | null;
  count: number;
  totalAccumulation: number;
  totalPremium: number;
}

interface SupervisorStats {
  name: string;
  agents: string[];
  count: number;
  totalAccumulation: number;
  totalPremium: number;
}

interface ProductStats {
  name: string;
  count: number;
  totalAccumulation: number;
  percentage: number;
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
      .select('supabase_url, supabase_service_key, name, table_name, is_configured')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const tableName = project.table_name || 'master_data';

    // Create project client
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

    const projectClient = clientResult.client!;

    // Parse query params
    const url = new URL(request.url);
    const agentFilter = url.searchParams.get('agent');
    const supervisorFilter = url.searchParams.get('supervisor');
    const productFilter = url.searchParams.get('product');
    const importMonth = url.searchParams.get('month');
    const importYear = url.searchParams.get('year');

    // Fetch data in batches for analysis (Supabase has 1000 row limit by default)
    const BATCH_SIZE = 1000;
    let allData: Record<string, unknown>[] = [];
    let offset = 0;
    let hasMore = true;
    let totalCount = 0;

    // First get the count
    const { count: recordCount, error: countError } = await projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Sales dashboard count error:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    totalCount = recordCount || 0;

    // Fetch data in batches (max 10,000 records for dashboard performance)
    const maxRecords = Math.min(totalCount, 10000);

    while (offset < maxRecords && hasMore) {
      let query = projectClient
        .from(tableName)
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1);

      // Apply filters
      if (importMonth) query = query.eq('import_month', parseInt(importMonth));
      if (importYear) query = query.eq('import_year', parseInt(importYear));

      const { data: batchData, error: queryError } = await query;

      if (queryError) {
        console.error('Sales dashboard query error:', queryError);
        return NextResponse.json({ error: queryError.message }, { status: 500 });
      }

      if (batchData && batchData.length > 0) {
        allData = allData.concat(batchData);
        offset += BATCH_SIZE;
        hasMore = batchData.length === BATCH_SIZE;
      } else {
        hasMore = false;
      }
    }

    const data = allData;

    // Debug info
    const debugInfo: Record<string, unknown> = {};

    // Detect data format and build debug info
    if (data.length > 0) {
      const firstRow = data[0];
      const rawData = firstRow.raw_data;

      debugInfo.firstRowKeys = Object.keys(firstRow);
      debugInfo.hasRawData = rawData !== undefined && rawData !== null;
      debugInfo.rawDataIsArray = Array.isArray(rawData);
      debugInfo.rawDataIsObject = typeof rawData === 'object' && !Array.isArray(rawData);

      if (Array.isArray(rawData)) {
        debugInfo.arrayLength = rawData.length;
        // Show sample values at key indices
        debugInfo.sampleArrayValues = {
          'index_9_מטפל': rawData[9],
          'index_5_סטטוס': rawData[5],
          'index_51_צבירה': rawData[51],
          'index_56_מוצר': rawData[56],
          'index_57_יצרן': rawData[57],
          'index_103_הפקדה': rawData[103],
          'index_119_פרמיה': rawData[119],
          'index_141_מספר_סוכן': rawData[141],
          'index_145_מפקח': rawData[145],
        };
      } else if (typeof rawData === 'object' && rawData !== null) {
        const keys = Object.keys(rawData);
        debugInfo.objectKeysCount = keys.length;
        debugInfo.sampleObjectKeys = keys.slice(0, 20);
      }

      // Sample first 3 rows
      debugInfo.sampleRows = data.slice(0, 3).map((r, idx) => {
        const rd = r.raw_data;
        if (Array.isArray(rd)) {
          return {
            rowIndex: idx,
            format: 'array',
            agent: rd[COLUMN_INDICES.מטפל],
            supervisor: rd[COLUMN_INDICES.מפקח],
            agentNumber: rd[COLUMN_INDICES.מספר_סוכן_רשום],
            product: rd[COLUMN_INDICES.סוג_מוצר_חדש],
            producer: rd[COLUMN_INDICES.יצרן_חדש],
            status: rd[COLUMN_INDICES.סטטוס],
            accumulation: rd[COLUMN_INDICES.סהכ_צבירה_צפויה_מניוד],
            oneTimeDeposit: rd[COLUMN_INDICES.הפקדה_חד_פעמית_צפויה],
            premium: rd[COLUMN_INDICES.פרמיה_צפויה],
          };
        } else if (typeof rd === 'object' && rd !== null) {
          const obj = rd as Record<string, unknown>;
          return {
            rowIndex: idx,
            format: 'object',
            agent: obj['מטפל'],
            supervisor: obj['מפקח'],
            agentNumber: obj['מספר סוכן רשום'],
            product: obj['סוג מוצר חדש'],
            producer: obj['יצרן חדש'],
            status: obj['סטטוס'],
          };
        }
        return { rowIndex: idx, format: 'unknown' };
      });
    }

    // Helper to parse numbers from various formats
    const parseNumber = (val: unknown): number => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return val;
      const cleaned = String(val).replace(/[₪,$€,\s]/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    // Helper to get value from raw_data (supports both array and object format)
    const getFieldValue = (rawData: unknown, arrayIndex: number, objectKey: string): unknown => {
      if (Array.isArray(rawData)) {
        return rawData[arrayIndex];
      } else if (typeof rawData === 'object' && rawData !== null) {
        return (rawData as Record<string, unknown>)[objectKey];
      }
      return null;
    };

    // Calculate aggregates
    const stats = {
      totalRecords: totalCount || data.length,
      totalAccumulation: 0,
      totalPremium: 0,
      uniqueAgents: new Set<string>(),
      uniqueSupervisors: new Set<string>(),
    };

    const agentMap = new Map<string, AgentStats>();
    const supervisorMap = new Map<string, SupervisorStats>();
    const productMap = new Map<string, ProductStats>();
    const statusMap = new Map<string, number>();

    // Process each row
    data.forEach(row => {
      const rawData = row.raw_data;

      // Extract field values (supports both array and object format)
      const agent = String(getFieldValue(rawData, COLUMN_INDICES.מטפל, 'מטפל') || 'לא ידוע');
      const agentNumber = getFieldValue(rawData, COLUMN_INDICES.מספר_סוכן_רשום, 'מספר סוכן רשום') as string | null;
      const supervisor = String(getFieldValue(rawData, COLUMN_INDICES.מפקח, 'מפקח') || 'לא ידוע');
      const product = String(getFieldValue(rawData, COLUMN_INDICES.סוג_מוצר_חדש, 'סוג מוצר חדש') || 'לא ידוע');
      const producer = String(getFieldValue(rawData, COLUMN_INDICES.יצרן_חדש, 'יצרן חדש') || '');
      const status = String(getFieldValue(rawData, COLUMN_INDICES.סטטוס, 'סטטוס') || 'לא ידוע');

      // Get accumulation values
      // First try the computed field total_expected_accumulation
      const totalExpected = parseNumber(row.total_expected_accumulation);

      // If not available, calculate from raw_data
      const accumulation = parseNumber(getFieldValue(rawData, COLUMN_INDICES.סהכ_צבירה_צפויה_מניוד, 'סה"כ צבירה צפויה מניוד'));
      const oneTimeDeposit = parseNumber(getFieldValue(rawData, COLUMN_INDICES.הפקדה_חד_פעמית_צפויה, 'הפקדה חד פעמית צפויה'));
      const premium = parseNumber(getFieldValue(rawData, COLUMN_INDICES.פרמיה_צפויה, 'פרמיה צפויה'));

      // Use total_expected_accumulation if available, otherwise sum the parts
      const rowAccumulation = totalExpected > 0 ? totalExpected : (accumulation + oneTimeDeposit);

      // Update totals
      stats.totalAccumulation += rowAccumulation;
      stats.totalPremium += premium;

      // Track unique agents/supervisors
      if (agent && agent !== 'לא ידוע' && agent.trim() !== '') {
        stats.uniqueAgents.add(agent);
      }
      if (supervisor && supervisor !== 'לא ידוע' && supervisor.trim() !== '') {
        stats.uniqueSupervisors.add(supervisor);
      }

      // Apply filters
      if (agentFilter && !agent.includes(agentFilter)) return;
      if (supervisorFilter && !supervisor.includes(supervisorFilter)) return;
      if (productFilter && !product.includes(productFilter)) return;

      // Agent stats
      const agentKey = agent || 'לא ידוע';
      if (!agentMap.has(agentKey)) {
        agentMap.set(agentKey, {
          name: agentKey,
          agentNumber: agentNumber ? String(agentNumber) : null,
          supervisor,
          count: 0,
          totalAccumulation: 0,
          totalPremium: 0,
        });
      }
      const agentStats = agentMap.get(agentKey)!;
      agentStats.count++;
      agentStats.totalAccumulation += rowAccumulation;
      agentStats.totalPremium += premium;

      // Supervisor stats
      const supervisorKey = supervisor || 'לא ידוע';
      if (!supervisorMap.has(supervisorKey)) {
        supervisorMap.set(supervisorKey, {
          name: supervisorKey,
          agents: [],
          count: 0,
          totalAccumulation: 0,
          totalPremium: 0,
        });
      }
      const supervisorStats = supervisorMap.get(supervisorKey)!;
      supervisorStats.count++;
      supervisorStats.totalAccumulation += rowAccumulation;
      supervisorStats.totalPremium += premium;
      if (!supervisorStats.agents.includes(agentKey)) {
        supervisorStats.agents.push(agentKey);
      }

      // Product stats
      const productKey = product || 'לא ידוע';
      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          name: productKey,
          count: 0,
          totalAccumulation: 0,
          percentage: 0,
        });
      }
      const productStats = productMap.get(productKey)!;
      productStats.count++;
      productStats.totalAccumulation += rowAccumulation;

      // Status stats
      const statusKey = status || 'לא ידוע';
      statusMap.set(statusKey, (statusMap.get(statusKey) || 0) + 1);
    });

    // Calculate percentages for products
    productMap.forEach(product => {
      product.percentage = stats.totalAccumulation > 0
        ? Math.round((product.totalAccumulation / stats.totalAccumulation) * 100)
        : 0;
    });

    // Sort and limit results
    const topAgents = Array.from(agentMap.values())
      .filter(a => a.name !== 'לא ידוע')
      .sort((a, b) => b.totalAccumulation - a.totalAccumulation)
      .slice(0, 30);

    const topSupervisors = Array.from(supervisorMap.values())
      .filter(s => s.name !== 'לא ידוע')
      .sort((a, b) => b.totalAccumulation - a.totalAccumulation)
      .slice(0, 20);

    const products = Array.from(productMap.values())
      .filter(p => p.name !== 'לא ידוע')
      .sort((a, b) => b.totalAccumulation - a.totalAccumulation);

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      stats: {
        totalRecords: stats.totalRecords,
        totalAccumulation: stats.totalAccumulation,
        totalPremium: stats.totalPremium,
        uniqueAgents: stats.uniqueAgents.size,
        uniqueSupervisors: stats.uniqueSupervisors.size,
      },
      topAgents,
      topSupervisors,
      products,
      statusBreakdown,
      // Column indices reference for debugging
      columnIndices: COLUMN_INDICES,
      // Debug info
      _debug: debugInfo,
    });

  } catch (error) {
    console.error('Sales dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
