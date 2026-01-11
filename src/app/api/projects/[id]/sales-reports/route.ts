import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';

// Types
interface ProductCategorySales {
  category: string;
  companies: CompanySales[];
  totals: {
    selfAgents: number;
    salesCenter: number;
    subAgencies: number;
    subAgenciesPercent: number;
    total: number;
  };
}

interface CompanySales {
  company: string;
  selfAgents: number;
  salesCenter: number;
  subAgencies: number;
  subAgenciesPercent: number;
  total: number;
}

interface SupervisorTarget {
  name: string;
  sales: number;
  target: number;
  percentage: number;
}

// Product categories mapping - matches actual data patterns
const productCategories: Record<string, string> = {
  // Gemel products - קופות גמל
  'קופת גמל': 'מוצרי גמל',
  'קופת גמל לתגמולים': 'מוצרי גמל',
  'קופת גמל להשקעה': 'מוצרי גמל',
  'חיסכון לכל ילד': 'מוצרי גמל',
  'קרן השתלמות': 'מוצרי גמל',
  // Pension - פנסיות
  'פנסיה': 'פנסיות',
  'קרן פנסיה': 'פנסיות',
  'פנסיה מקיפה': 'פנסיות',
  'פנסיה כללית': 'פנסיות',
  // Savings - פוליסות חיסכון
  'פוליסת חיסכון': 'פוליסות חיסכון',
  'חיסכון פיננסי': 'פוליסות חיסכון',
  'ביטוח חיסכון': 'פוליסות חיסכון',
  // Managed Portfolio - תיק מנוהל
  'תיק מנוהל': 'תיק מנוהל',
  'תיק השקעות': 'תיק מנוהל',
  'ניהול תיקים': 'תיק מנוהל',
  // Managers - מנהלים
  'מנהלים': 'מנהלים',
  'ביטוח מנהלים': 'מנהלים',
};

// Insurance company normalization
const companyNormalization: Record<string, string> = {
  'מיטב': 'מיטב',
  'מיטב דש': 'מיטב',
  'מיטב ניהול תיקים': 'מיטב',
  'הפניקס': 'הפניקס',
  'הפניקס פנסיה/אקסלנס': 'הפניקס',
  'הפניקס ביטוח': 'הפניקס',
  'פניקס': 'הפניקס',
  'הראל': 'הראל',
  'הראל פנסיה וגמל': 'הראל',
  'כלל': 'כלל',
  'כלל ביטוח': 'כלל',
  'כלל פנסיה וגמל': 'כלל',
  'מגדל': 'מגדל',
  'מגדל מקפת קרנות פנסיה וקופות גמל': 'מגדל',
  'מור': 'מור',
  'מור גמל ופנסיה': 'מור',
  'אלטשולר': 'אלטשולר',
  'אלטשולר שחם': 'אלטשולר',
  'הכשרה': 'הכשרה',
  'אינפיניטי': 'אינפיניטי',
  'אנליסט': 'אנליסט',
  'איילון': 'איילון',
  'איילון ביטוח': 'איילון',
};

// Supervisor targets - Monthly targets (will be editable later)
const supervisorTargets: Record<string, number> = {
  'אורי אלשיך': 25000000,
  'רפי דיין': 25000000,
  'לירון מאיר': 20000000,
  'רונן אייזיקוביץ': 20000000,
  'גיא בן נר': 18000000,
  'שמוליק לוי': 10000000,
  'ירון מועלם': 5000000,
};

function normalizeCompany(company: string | null): string {
  if (!company) return 'אחר';
  const trimmed = company.trim();
  return companyNormalization[trimmed] || trimmed;
}

function categorizeProduct(product: string | null): string {
  if (!product) return 'אחר';
  const trimmed = product.trim().toLowerCase();

  for (const [key, category] of Object.entries(productCategories)) {
    if (trimmed.includes(key.toLowerCase())) {
      return category;
    }
  }

  return 'אחר';
}

function getBusinessDays(): { passed: number; remaining: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let totalBusinessDays = 0;
  let passedBusinessDays = 0;

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    // Israel: Sun-Thu are business days
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      totalBusinessDays++;
      if (d <= now) {
        passedBusinessDays++;
      }
    }
  }

  return {
    passed: passedBusinessDays,
    remaining: totalBusinessDays - passedBusinessDays,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // Check auth
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

    // Get project credentials
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key, table_name, is_configured, name')
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

    if (!clientResult.success || !clientResult.client) {
      return NextResponse.json({
        error: 'מסד הנתונים של הפרויקט לא מוגדר',
        details: clientResult.error,
      }, { status: 400 });
    }

    const projectSupabase = clientResult.client;

    // Fetch all data - with specific columns we need
    const { data: rawData, error: dataError } = await projectSupabase
      .from(tableName)
      .select('product_type_new, producer_new, total_expected_accumulation, raw_data');

    if (dataError) {
      console.error('Error fetching data:', dataError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Process data from actual database structure
    const categoryData: Record<string, Record<string, CompanySales>> = {};
    const supervisorSalesMap: Record<string, number> = {};

    for (const row of rawData || []) {
      // Get values from the actual columns
      const product = row.product_type_new as string | null;
      const company = row.producer_new as string | null;
      const accumulation = Number(row.total_expected_accumulation) || 0;

      // Get supervisor from raw_data array index 145
      let supervisor: string | null = null;
      if (row.raw_data && Array.isArray(row.raw_data)) {
        supervisor = row.raw_data[145] as string | null;
      }

      // Categorize product
      const category = categorizeProduct(product);
      if (category === 'אחר') continue;

      // Normalize company name
      const normalizedCompany = normalizeCompany(company);

      // Initialize category if needed
      if (!categoryData[category]) {
        categoryData[category] = {};
      }

      // Initialize company if needed
      if (!categoryData[category][normalizedCompany]) {
        categoryData[category][normalizedCompany] = {
          company: normalizedCompany,
          selfAgents: 0,
          salesCenter: 0,
          subAgencies: 0,
          subAgenciesPercent: 0,
          total: 0,
        };
      }

      // Add to selfAgents (default - we can expand this later)
      categoryData[category][normalizedCompany].selfAgents += accumulation;
      categoryData[category][normalizedCompany].total += accumulation;

      // Track supervisor sales
      if (supervisor && supervisor.trim()) {
        const supervisorName = supervisor.trim();
        supervisorSalesMap[supervisorName] = (supervisorSalesMap[supervisorName] || 0) + accumulation;
      }
    }

    // Build categories array
    const categoriesOrder = ['מוצרי גמל', 'פנסיות', 'פוליסות חיסכון', 'תיק מנוהל', 'מנהלים'];
    const categories: ProductCategorySales[] = [];

    for (const categoryName of categoriesOrder) {
      const companyData = categoryData[categoryName];
      if (!companyData) continue;

      const companies = Object.values(companyData).sort((a, b) => b.total - a.total);

      const totals = {
        selfAgents: companies.reduce((sum, c) => sum + c.selfAgents, 0),
        salesCenter: companies.reduce((sum, c) => sum + c.salesCenter, 0),
        subAgencies: companies.reduce((sum, c) => sum + c.subAgencies, 0),
        subAgenciesPercent: 0,
        total: companies.reduce((sum, c) => sum + c.total, 0),
      };

      if (totals.total > 0) {
        totals.subAgenciesPercent = (totals.subAgencies / totals.total) * 100;
        for (const company of companies) {
          if (company.total > 0) {
            company.subAgenciesPercent = (company.subAgencies / company.total) * 100;
          }
        }
      }

      categories.push({
        category: categoryName,
        companies,
        totals,
      });
    }

    // Build supervisor targets from actual data
    const supervisorTargetsList: SupervisorTarget[] = Object.entries(supervisorTargets)
      .map(([name, target]) => ({
        name,
        sales: supervisorSalesMap[name] || 0,
        target,
        percentage: target > 0 ? Math.round(((supervisorSalesMap[name] || 0) / target) * 100) : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    // Calculate grand totals
    const grandTotals = {
      selfAgents: categories.reduce((sum, c) => sum + c.totals.selfAgents, 0),
      salesCenter: categories.reduce((sum, c) => sum + c.totals.salesCenter, 0),
      subAgencies: categories.reduce((sum, c) => sum + c.totals.subAgencies, 0),
      total: categories.reduce((sum, c) => sum + c.totals.total, 0),
    };

    // Calculate business days and projections
    const businessDays = getBusinessDays();
    const dailyRate = businessDays.passed > 0 ? grandTotals.total / businessDays.passed : 0;
    const totalBusinessDays = businessDays.passed + businessDays.remaining;

    // Calculate category percentages
    const categoryPercentages = {
      gemel: grandTotals.total > 0 ? Math.round((categories.find(c => c.category === 'מוצרי גמל')?.totals.total || 0) / grandTotals.total * 100) : 0,
      pension: grandTotals.total > 0 ? Math.round((categories.find(c => c.category === 'פנסיות')?.totals.total || 0) / grandTotals.total * 100) : 0,
      savings: grandTotals.total > 0 ? Math.round((categories.find(c => c.category === 'פוליסות חיסכון')?.totals.total || 0) / grandTotals.total * 100) : 0,
      managedPortfolio: grandTotals.total > 0 ? Math.round((categories.find(c => c.category === 'תיק מנוהל')?.totals.total || 0) / grandTotals.total * 100) : 0,
      managers: grandTotals.total > 0 ? Math.round((categories.find(c => c.category === 'מנהלים')?.totals.total || 0) / grandTotals.total * 100) : 0,
    };

    // Mitav's portion calculation
    const mitavTotal = categories.reduce((sum, c) => {
      const mitavCompany = c.companies.find(comp => comp.company === 'מיטב');
      return sum + (mitavCompany?.total || 0);
    }, 0);

    const summary = {
      businessDaysPassed: businessDays.passed,
      businessDaysRemaining: businessDays.remaining,
      mitavDashProjection: businessDays.passed > 0 ? (mitavTotal / businessDays.passed) * totalBusinessDays : 0,
      totalProjection: dailyRate * totalBusinessDays,
      categoryPercentages,
    };

    return NextResponse.json({
      categories,
      supervisorTargets: supervisorTargetsList,
      summary,
      grandTotals,
      debug: {
        totalRecords: rawData?.length || 0,
        supervisorsFound: Object.keys(supervisorSalesMap),
      }
    });

  } catch (error) {
    console.error('Sales reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sales reports', details: String(error) },
      { status: 500 }
    );
  }
}
