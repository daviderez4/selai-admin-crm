import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

/**
 * Unified Dashboard API
 * Fetches data from both nifraim and gemel views for a combined dashboard
 */

interface ViewStats {
  total: number;
  totalCommission: number;
  totalPremium: number;
  totalAccumulation: number;
  byProvider: Record<string, number>;
  byBranch: Record<string, number>;
  byAgent: Record<string, { count: number; commission: number; premium: number; accumulation: number }>;
  byMonth: Record<string, { commission: number; premium: number; accumulation: number; count: number }>;
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
      .select('supabase_url, supabase_service_key, name, is_configured')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create project client
    const clientResult = createProjectClient({
      supabase_url: project.supabase_url,
      supabase_service_key: project.supabase_service_key,
      table_name: 'nifraim', // Will query multiple views
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
    const provider = url.searchParams.get('provider'); // phoenix, harel, or null for all
    const agentName = url.searchParams.get('agent');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Fetch nifraim data
    let nifraimQuery = projectClient
      .from('nifraim')
      .select('*', { count: 'exact' });

    if (provider) nifraimQuery = nifraimQuery.eq('provider', provider);
    if (agentName) nifraimQuery = nifraimQuery.ilike('agent_name', `%${agentName}%`);
    if (fromDate) nifraimQuery = nifraimQuery.gte('processing_month', fromDate);
    if (toDate) nifraimQuery = nifraimQuery.lte('processing_month', toDate);

    nifraimQuery = nifraimQuery.order('processing_month', { ascending: false }).limit(limit);

    // Fetch gemel data
    let gemelQuery = projectClient
      .from('gemel')
      .select('*', { count: 'exact' });

    if (provider) gemelQuery = gemelQuery.eq('provider', provider);
    if (agentName) gemelQuery = gemelQuery.ilike('agent_name', `%${agentName}%`);
    if (fromDate) gemelQuery = gemelQuery.gte('processing_month', fromDate);
    if (toDate) gemelQuery = gemelQuery.lte('processing_month', toDate);

    gemelQuery = gemelQuery.order('processing_month', { ascending: false }).limit(limit);

    // Execute both queries in parallel
    const [nifraimResult, gemelResult] = await Promise.all([
      nifraimQuery,
      gemelQuery,
    ]);

    if (nifraimResult.error) {
      console.error('Nifraim query error:', nifraimResult.error);
    }
    if (gemelResult.error) {
      console.error('Gemel query error:', gemelResult.error);
    }

    const nifraimData = nifraimResult.data || [];
    const gemelData = gemelResult.data || [];

    // Calculate unified statistics
    const stats: ViewStats = {
      total: (nifraimResult.count || 0) + (gemelResult.count || 0),
      totalCommission: 0,
      totalPremium: 0,
      totalAccumulation: 0,
      byProvider: {},
      byBranch: {},
      byAgent: {},
      byMonth: {},
    };

    // Process nifraim data
    nifraimData.forEach((row: Record<string, unknown>) => {
      const commission = Number(row.comission) || 0;
      const premium = Number(row.premium) || 0;
      const provider = String(row.provider || 'unknown');
      const branch = String(row.branch || 'unknown');
      const agent = String(row.agent_name || 'unknown');
      const month = String(row.processing_month || 'unknown').substring(0, 7); // YYYY-MM

      stats.totalCommission += commission;
      stats.totalPremium += premium;

      // By provider
      stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

      // By branch
      stats.byBranch[branch] = (stats.byBranch[branch] || 0) + 1;

      // By agent
      if (!stats.byAgent[agent]) {
        stats.byAgent[agent] = { count: 0, commission: 0, premium: 0, accumulation: 0 };
      }
      stats.byAgent[agent].count++;
      stats.byAgent[agent].commission += commission;
      stats.byAgent[agent].premium += premium;

      // By month
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { commission: 0, premium: 0, accumulation: 0, count: 0 };
      }
      stats.byMonth[month].commission += commission;
      stats.byMonth[month].premium += premium;
      stats.byMonth[month].count++;
    });

    // Process gemel data
    gemelData.forEach((row: Record<string, unknown>) => {
      const commission = Number(row.comission) || 0;
      const accumulation = Number(row.accumulation_balance) || 0;
      const provider = String(row.provider || 'unknown');
      const branch = String(row.branch || 'גמל');
      const agent = String(row.agent_name || 'unknown');
      const month = String(row.processing_month || 'unknown').substring(0, 7);

      stats.totalCommission += commission;
      stats.totalAccumulation += accumulation;

      // By provider
      stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;

      // By branch
      stats.byBranch[branch] = (stats.byBranch[branch] || 0) + 1;

      // By agent
      if (!stats.byAgent[agent]) {
        stats.byAgent[agent] = { count: 0, commission: 0, premium: 0, accumulation: 0 };
      }
      stats.byAgent[agent].count++;
      stats.byAgent[agent].commission += commission;
      stats.byAgent[agent].accumulation += accumulation;

      // By month
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { commission: 0, premium: 0, accumulation: 0, count: 0 };
      }
      stats.byMonth[month].commission += commission;
      stats.byMonth[month].accumulation += accumulation;
      stats.byMonth[month].count++;
    });

    // Sort agents by commission (top performers)
    const topAgents = Object.entries(stats.byAgent)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 20);

    // Sort months chronologically
    const monthlyTrend = Object.entries(stats.byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      stats: {
        total: stats.total,
        totalCommission: stats.totalCommission,
        totalPremium: stats.totalPremium,
        totalAccumulation: stats.totalAccumulation,
        nifraimCount: nifraimResult.count || 0,
        gemelCount: gemelResult.count || 0,
        uniqueAgents: Object.keys(stats.byAgent).length,
        byProvider: stats.byProvider,
        byBranch: stats.byBranch,
      },
      topAgents,
      monthlyTrend,
      recentNifraim: nifraimData.slice(0, 10),
      recentGemel: gemelData.slice(0, 10),
    });

  } catch (error) {
    console.error('Unified dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
