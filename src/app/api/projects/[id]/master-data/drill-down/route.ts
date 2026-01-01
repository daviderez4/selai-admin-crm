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

// Column indices for master_data raw_data array
const COLUMNS = {
  PROCESS_ID: 0,
  PROCESS_TYPE: 1,
  STATUS: 3,
  HANDLER: 5,
  CUSTOMER_NAME: 6,
  EXPECTED_ACCUMULATION: 51,
  EXPECTED_PREMIUM: 118,
  NEW_PRODUCER: 57,
  SUPERVISOR: 121,
  OPEN_DATE: 7,
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'accumulation';

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

    // Fetch all data
    const { data: rawData, error: dataError } = await projectClient
      .from('master_data')
      .select('raw_data, total_expected_accumulation, producer_new')
      .eq('project_id', projectId);

    if (dataError) {
      console.error('Drill-down data error:', dataError);
      return NextResponse.json({ error: dataError.message }, { status: 500 });
    }

    const data = rawData || [];

    // Parse raw data into structured format
    const parsedData = data.map(row => {
      const raw = row.raw_data as unknown[];
      if (!Array.isArray(raw)) return null;

      const getNum = (idx: number): number => {
        const val = raw[idx];
        if (val === null || val === undefined || val === '') return 0;
        const cleaned = String(val).replace(/[,₪$€%\s]/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const getString = (idx: number): string => {
        return raw[idx] ? String(raw[idx]).trim() : '';
      };

      return {
        processId: getString(COLUMNS.PROCESS_ID),
        processType: getString(COLUMNS.PROCESS_TYPE),
        status: getString(COLUMNS.STATUS),
        handler: getString(COLUMNS.HANDLER),
        customer: getString(COLUMNS.CUSTOMER_NAME),
        accumulation: row.total_expected_accumulation || getNum(COLUMNS.EXPECTED_ACCUMULATION),
        premium: getNum(COLUMNS.EXPECTED_PREMIUM),
        producer: row.producer_new || getString(COLUMNS.NEW_PRODUCER),
        supervisor: getString(COLUMNS.SUPERVISOR),
        openDate: getString(COLUMNS.OPEN_DATE),
      };
    }).filter(Boolean);

    // Generate drill-down data based on type
    let result: Record<string, unknown> = {};

    switch (type) {
      case 'accumulation': {
        // Breakdown by producer
        const byProducer: Record<string, { count: number; total: number }> = {};
        parsedData.forEach(row => {
          if (!row) return;
          const producer = row.producer || 'לא צוין';
          if (!byProducer[producer]) {
            byProducer[producer] = { count: 0, total: 0 };
          }
          byProducer[producer].count++;
          byProducer[producer].total += row.accumulation;
        });

        const producerData = Object.entries(byProducer)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        // Top 10 processes by accumulation
        const topProcesses = [...parsedData]
          .filter(r => r && r.accumulation > 0)
          .sort((a, b) => (b?.accumulation || 0) - (a?.accumulation || 0))
          .slice(0, 10)
          .map(r => ({
            processId: r?.processId,
            customer: r?.customer,
            handler: r?.handler,
            accumulation: r?.accumulation,
          }));

        const totalAccumulation = parsedData.reduce((sum, r) => sum + (r?.accumulation || 0), 0);
        const avgAccumulation = parsedData.length > 0 ? totalAccumulation / parsedData.length : 0;

        result = {
          byProducer: producerData,
          topProcesses,
          totalAccumulation,
          avgAccumulation,
          processCount: parsedData.length,
        };
        break;
      }

      case 'handlers': {
        // Handler statistics
        const byHandler: Record<string, {
          count: number;
          accumulation: number;
          completed: number;
          statuses: Record<string, number>;
        }> = {};

        parsedData.forEach(row => {
          if (!row) return;
          const handler = row.handler || 'לא צוין';
          if (!byHandler[handler]) {
            byHandler[handler] = { count: 0, accumulation: 0, completed: 0, statuses: {} };
          }
          byHandler[handler].count++;
          byHandler[handler].accumulation += row.accumulation;
          if (row.status === 'הושלם' || row.status === 'הצלחה') {
            byHandler[handler].completed++;
          }
          const status = row.status || 'לא צוין';
          byHandler[handler].statuses[status] = (byHandler[handler].statuses[status] || 0) + 1;
        });

        const handlerData = Object.entries(byHandler)
          .map(([name, data]) => ({
            name,
            count: data.count,
            accumulation: data.accumulation,
            completed: data.completed,
            successRate: data.count > 0 ? (data.completed / data.count * 100) : 0,
          }))
          .sort((a, b) => b.accumulation - a.accumulation);

        result = {
          handlers: handlerData,
          totalHandlers: handlerData.length,
        };
        break;
      }

      case 'supervisors': {
        // Supervisor statistics
        const bySupervisor: Record<string, {
          handlers: Set<string>;
          count: number;
          accumulation: number;
          completed: number;
        }> = {};

        parsedData.forEach(row => {
          if (!row) return;
          const supervisor = row.supervisor || 'לא צוין';
          if (!bySupervisor[supervisor]) {
            bySupervisor[supervisor] = { handlers: new Set(), count: 0, accumulation: 0, completed: 0 };
          }
          if (row.handler) {
            bySupervisor[supervisor].handlers.add(row.handler);
          }
          bySupervisor[supervisor].count++;
          bySupervisor[supervisor].accumulation += row.accumulation;
          if (row.status === 'הושלם' || row.status === 'הצלחה') {
            bySupervisor[supervisor].completed++;
          }
        });

        const supervisorData = Object.entries(bySupervisor)
          .map(([name, data]) => ({
            name,
            handlerCount: data.handlers.size,
            processCount: data.count,
            accumulation: data.accumulation,
            completed: data.completed,
            successRate: data.count > 0 ? (data.completed / data.count * 100) : 0,
          }))
          .sort((a, b) => b.accumulation - a.accumulation);

        result = {
          supervisors: supervisorData,
          totalSupervisors: supervisorData.length,
        };
        break;
      }

      case 'records': {
        // Status distribution
        const byStatus: Record<string, number> = {};
        const byProcessType: Record<string, number> = {};

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        let newToday = 0;
        let newThisWeek = 0;

        parsedData.forEach(row => {
          if (!row) return;
          const status = row.status || 'לא צוין';
          const processType = row.processType || 'לא צוין';

          byStatus[status] = (byStatus[status] || 0) + 1;
          byProcessType[processType] = (byProcessType[processType] || 0) + 1;

          if (row.openDate) {
            const openDate = new Date(row.openDate);
            if (!isNaN(openDate.getTime())) {
              if (openDate >= today) newToday++;
              if (openDate >= weekAgo) newThisWeek++;
            }
          }
        });

        const statusData = Object.entries(byStatus)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        const processTypeData = Object.entries(byProcessType)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        result = {
          byStatus: statusData,
          byProcessType: processTypeData,
          newToday,
          newThisWeek,
          total: parsedData.length,
        };
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Drill-down error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drill-down data' },
      { status: 500 }
    );
  }
}
