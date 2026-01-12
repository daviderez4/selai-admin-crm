import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

/**
 * View Dashboard API
 * Fetches data from view-based tables (nifraim, gemel)
 *
 * These views have specific columns:
 * - provider: יצרן
 * - processing_month: תאריך עיבוד
 * - branch: ענף
 * - agent_name: שם סוכן
 * - comission: עמלה
 * - premium: פרמיה (nifraim only)
 * - accumulation_balance: צבירה (gemel only)
 */

interface AgentStats {
  name: string;
  count: number;
  commission: number;
  premium: number;
  accumulation: number;
}

interface ProviderStats {
  name: string;
  count: number;
  commission: number;
  premium: number;
  accumulation: number;
}

interface BranchStats {
  name: string;
  count: number;
  commission: number;
}

interface MonthlyData {
  month: string;
  commission: number;
  premium: number;
  accumulation: number;
  count: number;
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

    const tableName = project.table_name || 'nifraim';

    // Determine dashboard type based on table name
    const isNifraim = tableName === 'nifraim';
    const isGemel = tableName === 'gemel';

    if (!isNifraim && !isGemel) {
      return NextResponse.json({
        error: 'This dashboard is only for nifraim or gemel views',
        tableName
      }, { status: 400 });
    }

    // Determine if this is a local or external project
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local';

    let projectClient;

    if (isLocalProject) {
      // Use the main Supabase client for local projects
      projectClient = supabase;
    } else {
      // Create project-specific client for external projects
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

    // Parse query params
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');
    const agentName = url.searchParams.get('agent');
    const branch = url.searchParams.get('branch');
    const month = url.searchParams.get('month');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    // First, get the total count
    let countQuery = projectClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (provider) countQuery = countQuery.eq('provider', provider);
    if (agentName) countQuery = countQuery.ilike('agent_name', `%${agentName}%`);
    if (branch) countQuery = countQuery.eq('branch', branch);
    if (month) {
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-31`;
      countQuery = countQuery.gte('processing_month', monthStart).lte('processing_month', monthEnd);
    }
    if (fromDate) countQuery = countQuery.gte('processing_month', fromDate);
    if (toDate) countQuery = countQuery.lte('processing_month', toDate);

    const { count: totalCount } = await countQuery;
    const total = totalCount || 0;

    // Fetch ALL data in chunks to get accurate totals
    const CHUNK_SIZE = 1000;
    const allData: Record<string, unknown>[] = [];

    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      let query = projectClient
        .from(tableName)
        .select('*');

      if (provider) query = query.eq('provider', provider);
      if (agentName) query = query.ilike('agent_name', `%${agentName}%`);
      if (branch) query = query.eq('branch', branch);
      if (month) {
        const monthStart = `${month}-01`;
        const monthEnd = `${month}-31`;
        query = query.gte('processing_month', monthStart).lte('processing_month', monthEnd);
      }
      if (fromDate) query = query.gte('processing_month', fromDate);
      if (toDate) query = query.lte('processing_month', toDate);

      query = query.order('processing_month', { ascending: false }).range(offset, offset + CHUNK_SIZE - 1);

      const { data: chunkData, error: chunkError } = await query;

      if (chunkError) {
        console.error('View dashboard chunk error:', chunkError);
        return NextResponse.json({ error: chunkError.message }, { status: 500 });
      }

      if (chunkData) {
        allData.push(...chunkData);
      }
    }

    console.log(`View dashboard: Fetched ${allData.length} records (total: ${total})`);

    const data = allData;

    // Calculate statistics
    const agentMap = new Map<string, AgentStats>();
    const providerMap = new Map<string, ProviderStats>();
    const branchMap = new Map<string, BranchStats>();
    const monthMap = new Map<string, MonthlyData>();

    let totalCommission = 0;
    let totalPremium = 0;
    let totalAccumulation = 0;

    data.forEach((row: Record<string, unknown>) => {
      const commission = Number(row.comission) || 0;
      const premium = Number(row.premium) || 0;
      const accumulation = Number(row.accumulation_balance) || 0;
      const providerName = String(row.provider || 'לא ידוע');
      const branchName = String(row.branch || 'לא ידוע');
      const agentNameVal = String(row.agent_name || 'לא ידוע');
      const month = String(row.processing_month || '').substring(0, 7) || 'unknown';

      // Totals
      totalCommission += commission;
      totalPremium += premium;
      totalAccumulation += accumulation;

      // By Agent
      if (!agentMap.has(agentNameVal)) {
        agentMap.set(agentNameVal, {
          name: agentNameVal,
          count: 0,
          commission: 0,
          premium: 0,
          accumulation: 0,
        });
      }
      const agentStats = agentMap.get(agentNameVal)!;
      agentStats.count++;
      agentStats.commission += commission;
      agentStats.premium += premium;
      agentStats.accumulation += accumulation;

      // By Provider
      if (!providerMap.has(providerName)) {
        providerMap.set(providerName, {
          name: providerName,
          count: 0,
          commission: 0,
          premium: 0,
          accumulation: 0,
        });
      }
      const providerStats = providerMap.get(providerName)!;
      providerStats.count++;
      providerStats.commission += commission;
      providerStats.premium += premium;
      providerStats.accumulation += accumulation;

      // By Branch
      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          name: branchName,
          count: 0,
          commission: 0,
        });
      }
      const branchStats = branchMap.get(branchName)!;
      branchStats.count++;
      branchStats.commission += commission;

      // By Month
      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          commission: 0,
          premium: 0,
          accumulation: 0,
          count: 0,
        });
      }
      const monthStats = monthMap.get(month)!;
      monthStats.count++;
      monthStats.commission += commission;
      monthStats.premium += premium;
      monthStats.accumulation += accumulation;
    });

    // Sort and limit results
    const topAgents = Array.from(agentMap.values())
      .filter(a => a.name !== 'לא ידוע')
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 30);

    const providers = Array.from(providerMap.values())
      .filter(p => p.name !== 'לא ידוע')
      .sort((a, b) => b.commission - a.commission);

    // Filter branches to show only the main 4 branches for nifraim dashboard
    const mainBranches = ['בריאות', 'פנסיה', 'גמל', 'חיים'];
    const branches = Array.from(branchMap.values())
      .filter(b => b.name !== 'לא ידוע' && mainBranches.includes(b.name))
      .sort((a, b) => b.commission - a.commission);

    const monthlyTrend = Array.from(monthMap.values())
      .filter(m => m.month !== 'unknown')
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get unique values for filters
    const uniqueProviders = [...new Set(data.map((r: Record<string, unknown>) => String(r.provider || '')))].filter(Boolean);
    const uniqueBranches = [...new Set(data.map((r: Record<string, unknown>) => String(r.branch || '')))]
      .filter(b => b && mainBranches.includes(b));
    const uniqueAgents = [...new Set(data.map((r: Record<string, unknown>) => String(r.agent_name || '')))].filter(Boolean);
    const uniqueMonths = [...new Set(data.map((r: Record<string, unknown>) => {
      const date = String(r.processing_month || '');
      return date.substring(0, 7); // Get YYYY-MM format
    }))].filter(Boolean).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

    return NextResponse.json({
      // Meta info
      tableName,
      dashboardType: isNifraim ? 'nifraim' : 'gemel',

      // Stats
      stats: {
        totalRecords: total,
        totalCommission,
        totalPremium: isNifraim ? totalPremium : 0,
        totalAccumulation: isGemel ? totalAccumulation : 0,
        uniqueAgents: agentMap.size,
        uniqueProviders: providerMap.size,
        uniqueBranches: branchMap.size,
      },

      // Breakdown data
      topAgents,
      providers,
      branches,
      monthlyTrend,

      // Filter options
      filterOptions: {
        providers: uniqueProviders,
        branches: uniqueBranches,
        agents: uniqueAgents.slice(0, 100), // Limit for UI performance
        months: uniqueMonths,
      },

      // Recent records for table display
      recentRecords: data.slice(0, 50).map((row: Record<string, unknown>) => ({
        provider: row.provider,
        processing_month: row.processing_month,
        branch: row.branch,
        agent_name: row.agent_name,
        commission: row.comission,
        premium: isNifraim ? row.premium : null,
        accumulation: isGemel ? row.accumulation_balance : null,
      })),
    });

  } catch (error) {
    console.error('View dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
