'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Download,
  RefreshCw,
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface SalesReportData {
  categories: ProductCategorySales[];
  supervisorTargets: SupervisorTarget[];
  summary: {
    businessDaysPassed: number;
    businessDaysRemaining: number;
    mitavDashProjection: number;
    totalProjection: number;
    categoryPercentages: {
      gemel: number;
      managers: number;
      managedPortfolio: number;
      savings: number;
      pension: number;
    };
  };
  grandTotals: {
    selfAgents: number;
    salesCenter: number;
    subAgencies: number;
    total: number;
  };
}

// Navigation tabs
interface NavTab {
  id: string;
  label: string;
  href: string;
}

// Format currency
function formatCurrency(value: number, showDecimals = false): string {
  if (value === 0) return '-';
  const formatted = value.toLocaleString('he-IL', {
    minimumFractionDigits: showDecimals ? 1 : 0,
    maximumFractionDigits: showDecimals ? 1 : 0,
  });
  return `₪${formatted}`;
}

// Format percentage
function formatPercent(value: number): string {
  if (value === 0) return '-';
  return `${value.toFixed(1)}%`;
}

// Company colors for highlighting
const companyColors: Record<string, string> = {
  'מיטב': 'bg-yellow-50',
  'מיטב דש': 'bg-yellow-50',
  'הראל': 'bg-orange-50',
  'הפניקס': 'bg-red-50',
  'כלל': 'bg-blue-50',
  'מגדל': 'bg-purple-50',
  'מור': 'bg-green-50',
  'אלטשולר': 'bg-teal-50',
  'הכשרה': 'bg-indigo-50',
  'אינפיניטי': 'bg-pink-50',
  'אנליסט': 'bg-cyan-50',
  'איילון': 'bg-lime-50',
};

export default function SalesReportsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['מוצרי גמל', 'פנסיות']));
  const [activeReport, setActiveReport] = useState<'products' | 'targets'>('products');

  // Navigation tabs
  const navTabs: NavTab[] = [
    { id: 'dashboard', label: 'דשבורד', href: `/projects/${projectId}` },
    { id: 'sales-dashboard', label: 'דשבורד מכירות', href: `/projects/${projectId}/sales-dashboard` },
    { id: 'reports', label: 'דוחות מכירות', href: `/projects/${projectId}/reports` },
    { id: 'data', label: 'תצוגת נתונים', href: `/projects/${projectId}/data` },
    { id: 'import', label: 'ייבוא נתונים', href: `/projects/${projectId}/import` },
    { id: 'settings', label: 'הגדרות', href: `/projects/${projectId}/settings` },
  ];

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sales-reports`);
      if (!response.ok) throw new Error('Failed to fetch report data');

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('שגיאה בטעינת הדוח');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Calculate progress bar color based on percentage
  const getProgressColor = (percent: number): string => {
    if (percent >= 80) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-yellow-500';
    if (percent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Header title="דוחות מכירות" />

      {/* Horizontal Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6" dir="rtl">
        <nav className="flex items-center gap-1 -mb-px">
          {navTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                tab.id === 'reports'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">דוחות מכירות</h1>
              <p className="text-sm text-slate-500">סיכום מכירות לפי מוצר וחברה + עמידה ביעדים</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchReportData}
                disabled={loading}
                className="border-slate-200"
              >
                <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
                רענן
              </Button>
              <Button variant="outline" size="sm" className="border-slate-200">
                <Download className="h-4 w-4 ml-2" />
                ייצוא
              </Button>
            </div>
          </div>

          {/* Report Type Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeReport === 'products' ? 'default' : 'outline'}
              onClick={() => setActiveReport('products')}
              className={cn(
                activeReport === 'products'
                  ? 'bg-blue-600 text-white'
                  : 'border-slate-200 text-slate-600'
              )}
            >
              <BarChart3 className="h-4 w-4 ml-2" />
              סיכום לפי מוצר וחברה
            </Button>
            <Button
              variant={activeReport === 'targets' ? 'default' : 'outline'}
              onClick={() => setActiveReport('targets')}
              className={cn(
                activeReport === 'targets'
                  ? 'bg-blue-600 text-white'
                  : 'border-slate-200 text-slate-600'
              )}
            >
              <Target className="h-4 w-4 ml-2" />
              עמידה ביעדים לפי מפקח
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500">טוען דוחות...</p>
              </div>
            </div>
          ) : reportData && activeReport === 'products' ? (
            <>
              {/* Products Report */}
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4">
                  <CardTitle className="text-lg font-bold text-center">
                    סיכום מכירות לפי מוצר וחברת ביטוח
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Table Header */}
                  <div className="grid grid-cols-6 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700">
                    <div className="p-3 border-l border-slate-200">חברה</div>
                    <div className="p-3 border-l border-slate-200 text-center">סוכנים עצמאים</div>
                    <div className="p-3 border-l border-slate-200 text-center">מרכז מכירות</div>
                    <div className="p-3 border-l border-slate-200 text-center">סוכנויות משנה</div>
                    <div className="p-3 border-l border-slate-200 text-center">% משנה</div>
                    <div className="p-3 text-center">סה״כ</div>
                  </div>

                  {/* Category Sections */}
                  {reportData.categories.map((category) => (
                    <div key={category.category} className="border-b border-slate-200 last:border-b-0">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category.category)}
                        className="w-full grid grid-cols-6 bg-yellow-100 hover:bg-yellow-200 transition-colors text-sm font-bold"
                      >
                        <div className="p-3 border-l border-yellow-200 flex items-center gap-2 text-slate-800">
                          {expandedCategories.has(category.category) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {category.category}
                        </div>
                        <div className="p-3 border-l border-yellow-200 text-center text-slate-700">
                          {formatCurrency(category.totals.selfAgents)}
                        </div>
                        <div className="p-3 border-l border-yellow-200 text-center text-slate-700">
                          {formatCurrency(category.totals.salesCenter)}
                        </div>
                        <div className="p-3 border-l border-yellow-200 text-center text-slate-700">
                          {formatCurrency(category.totals.subAgencies)}
                        </div>
                        <div className="p-3 border-l border-yellow-200 text-center text-slate-700">
                          {formatPercent(category.totals.subAgenciesPercent)}
                        </div>
                        <div className="p-3 text-center font-bold text-slate-900">
                          {formatCurrency(category.totals.total)}
                        </div>
                      </button>

                      {/* Company Rows */}
                      {expandedCategories.has(category.category) && (
                        <div>
                          {category.companies.map((company, idx) => (
                            <div
                              key={company.company}
                              className={cn(
                                'grid grid-cols-6 text-sm border-t border-slate-100',
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                                companyColors[company.company] || ''
                              )}
                            >
                              <div className="p-3 border-l border-slate-100 font-medium text-slate-700">
                                {company.company}
                              </div>
                              <div className="p-3 border-l border-slate-100 text-center tabular-nums">
                                {formatCurrency(company.selfAgents)}
                              </div>
                              <div className="p-3 border-l border-slate-100 text-center tabular-nums">
                                {formatCurrency(company.salesCenter)}
                              </div>
                              <div className="p-3 border-l border-slate-100 text-center tabular-nums">
                                {formatCurrency(company.subAgencies)}
                              </div>
                              <div className="p-3 border-l border-slate-100 text-center tabular-nums text-slate-500">
                                {formatPercent(company.subAgenciesPercent)}
                              </div>
                              <div className="p-3 text-center font-semibold tabular-nums">
                                {formatCurrency(company.total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Grand Totals */}
                  <div className="grid grid-cols-6 bg-blue-600 text-white text-sm font-bold">
                    <div className="p-3 border-l border-blue-500">סה״כ</div>
                    <div className="p-3 border-l border-blue-500 text-center tabular-nums">
                      {formatCurrency(reportData.grandTotals.selfAgents)}
                    </div>
                    <div className="p-3 border-l border-blue-500 text-center tabular-nums">
                      {formatCurrency(reportData.grandTotals.salesCenter)}
                    </div>
                    <div className="p-3 border-l border-blue-500 text-center tabular-nums">
                      {formatCurrency(reportData.grandTotals.subAgencies)}
                    </div>
                    <div className="p-3 border-l border-blue-500 text-center">-</div>
                    <div className="p-3 text-center tabular-nums text-lg">
                      {formatCurrency(reportData.grandTotals.total)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Business Days */}
                <Card className="bg-white border-slate-200">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">קצב מכירות</p>
                        <p className="text-lg font-bold text-slate-800">
                          {reportData.summary.businessDaysPassed} / {reportData.summary.businessDaysPassed + reportData.summary.businessDaysRemaining}
                        </p>
                        <p className="text-xs text-slate-400">ימי עסקים</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Mitav Dash Projection */}
                <Card className="bg-white border-slate-200">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">צפי מיטב דש</p>
                        <p className="text-lg font-bold text-slate-800">
                          {formatCurrency(reportData.summary.mitavDashProjection)}
                        </p>
                        <p className="text-xs text-slate-400">בסיום החודש</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Projection */}
                <Card className="bg-white border-slate-200">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Calculator className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">צפי כולל</p>
                        <p className="text-lg font-bold text-slate-800">
                          {formatCurrency(reportData.summary.totalProjection)}
                        </p>
                        <p className="text-xs text-slate-400">בסיום החודש</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card className="bg-white border-slate-200">
                  <CardContent className="pt-5">
                    <p className="text-xs text-slate-500 mb-2">התפלגות לפי קטגוריה</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>גמל</span>
                        <span className="font-semibold">{reportData.summary.categoryPercentages.gemel}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>פנסיה</span>
                        <span className="font-semibold">{reportData.summary.categoryPercentages.pension}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>חיסכון</span>
                        <span className="font-semibold">{reportData.summary.categoryPercentages.savings}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>תיק מנוהל</span>
                        <span className="font-semibold">{reportData.summary.categoryPercentages.managedPortfolio}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>מנהלים</span>
                        <span className="font-semibold">{reportData.summary.categoryPercentages.managers}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : reportData && activeReport === 'targets' ? (
            <>
              {/* Supervisor Targets Report */}
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4">
                  <CardTitle className="text-lg font-bold text-center">
                    עמידה ביעדים לפי מפקח
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Table Header */}
                  <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200 text-sm font-bold text-slate-700">
                    <div className="p-4 border-l border-slate-200">שם מפקח</div>
                    <div className="p-4 border-l border-slate-200 text-center">מכירות</div>
                    <div className="p-4 border-l border-slate-200 text-center">יעד</div>
                    <div className="p-4 text-center">אחוז עמידה ביעד</div>
                  </div>

                  {/* Supervisor Rows */}
                  {reportData.supervisorTargets.map((supervisor, idx) => (
                    <div
                      key={supervisor.name}
                      className={cn(
                        'grid grid-cols-4 text-sm border-b border-slate-100',
                        idx % 2 === 0 ? 'bg-white' : 'bg-cyan-50/30'
                      )}
                    >
                      <div className="p-4 border-l border-slate-100 font-medium text-slate-800">
                        {supervisor.name}
                      </div>
                      <div className="p-4 border-l border-slate-100 text-center tabular-nums font-medium text-emerald-600">
                        {formatCurrency(supervisor.sales)}
                      </div>
                      <div className="p-4 border-l border-slate-100 text-center tabular-nums text-slate-600">
                        {formatCurrency(supervisor.target)}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-6 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', getProgressColor(supervisor.percentage))}
                              style={{ width: `${Math.min(supervisor.percentage, 100)}%` }}
                            />
                          </div>
                          <span className={cn(
                            'text-sm font-bold w-12 text-left',
                            supervisor.percentage >= 80 ? 'text-emerald-600' :
                            supervisor.percentage >= 50 ? 'text-yellow-600' :
                            supervisor.percentage >= 25 ? 'text-orange-600' : 'text-red-600'
                          )}>
                            {supervisor.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Totals Row */}
                  <div className="grid grid-cols-4 bg-emerald-600 text-white text-sm font-bold">
                    <div className="p-4 border-l border-emerald-500">סכום כולל</div>
                    <div className="p-4 border-l border-emerald-500 text-center tabular-nums text-lg">
                      {formatCurrency(
                        reportData.supervisorTargets.reduce((sum, s) => sum + s.sales, 0)
                      )}
                    </div>
                    <div className="p-4 border-l border-emerald-500 text-center tabular-nums">
                      {formatCurrency(
                        reportData.supervisorTargets.reduce((sum, s) => sum + s.target, 0)
                      )}
                    </div>
                    <div className="p-4 text-center">
                      {(() => {
                        const totalSales = reportData.supervisorTargets.reduce((sum, s) => sum + s.sales, 0);
                        const totalTarget = reportData.supervisorTargets.reduce((sum, s) => sum + s.target, 0);
                        return totalTarget > 0 ? `${Math.round((totalSales / totalTarget) * 100)}%` : '-';
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportData.supervisorTargets.slice(0, 3).map((supervisor, idx) => (
                  <Card key={supervisor.name} className="bg-white border-slate-200">
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold',
                            idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-400'
                          )}>
                            {idx + 1}
                          </div>
                          <span className="font-medium text-slate-800">{supervisor.name}</span>
                        </div>
                        <Badge className={cn(
                          supervisor.percentage >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        )}>
                          {supervisor.percentage}%
                        </Badge>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', getProgressColor(supervisor.percentage))}
                          style={{ width: `${Math.min(supervisor.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-500">
                        <span>{formatCurrency(supervisor.sales)}</span>
                        <span>מתוך {formatCurrency(supervisor.target)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
