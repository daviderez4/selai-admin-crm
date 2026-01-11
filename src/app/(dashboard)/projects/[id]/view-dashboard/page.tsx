'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Users,
  Building2,
  PieChart,
  BarChart3,
  RefreshCw,
  Filter,
  Calendar,
  Wallet,
  Banknote,
  Table2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface DashboardStats {
  totalRecords: number;
  totalCommission: number;
  totalPremium: number;
  totalAccumulation: number;
  uniqueAgents: number;
  uniqueProviders: number;
  uniqueBranches: number;
}

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

interface RecentRecord {
  provider: string;
  processing_month: string;
  branch: string;
  agent_name: string;
  commission: number;
  premium: number | null;
  accumulation: number | null;
}

interface FilterOptions {
  providers: string[];
  branches: string[];
  agents: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `₪${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `₪${(value / 1000).toFixed(1)}K`;
  }
  return `₪${value.toFixed(2)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('he-IL');
}

// Navigation tabs for project
interface NavTab {
  id: string;
  label: string;
  href: string;
}

export default function ViewDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [dashboardType, setDashboardType] = useState<'nifraim' | 'gemel' | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topAgents, setTopAgents] = useState<AgentStats[]>([]);
  const [providers, setProviders] = useState<ProviderStats[]>([]);
  const [branches, setBranches] = useState<BranchStats[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ providers: [], branches: [], agents: [] });
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [agentSearch, setAgentSearch] = useState('');
  const [showTable, setShowTable] = useState(false);

  // Navigation tabs
  const navTabs: NavTab[] = [
    { id: 'dashboard', label: 'דשבורד', href: `/projects/${projectId}` },
    { id: 'view-dashboard', label: dashboardType === 'nifraim' ? 'דשבורד נפרעים' : 'דשבורד גמל', href: `/projects/${projectId}/view-dashboard` },
    { id: 'data', label: 'תצוגת נתונים', href: `/projects/${projectId}/data` },
    { id: 'import', label: 'ייבוא נתונים', href: `/projects/${projectId}/import` },
    { id: 'settings', label: 'הגדרות', href: `/projects/${projectId}/settings` },
  ];

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (selectedProvider !== 'all') searchParams.append('provider', selectedProvider);
      if (selectedBranch !== 'all') searchParams.append('branch', selectedBranch);
      if (agentSearch) searchParams.append('agent', agentSearch);

      const response = await fetch(
        `/api/projects/${projectId}/view-dashboard?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const data = await response.json();

      setDashboardType(data.dashboardType);
      setStats(data.stats);
      setTopAgents(data.topAgents || []);
      setProviders(data.providers || []);
      setBranches(data.branches || []);
      setMonthlyTrend(data.monthlyTrend || []);
      setRecentRecords(data.recentRecords || []);
      setFilterOptions(data.filterOptions || { providers: [], branches: [], agents: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
      toast.error('שגיאה בטעינת הדשבורד');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedProvider, selectedBranch, agentSearch]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Is this a nifraim or gemel dashboard?
  const isNifraim = dashboardType === 'nifraim';
  const valueField = isNifraim ? 'premium' : 'accumulation';
  const valueLabel = isNifraim ? 'פרמיה' : 'צבירה';

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Header title={isNifraim ? 'דשבורד נפרעים' : dashboardType === 'gemel' ? 'דשבורד גמל' : 'דשבורד עמלות'} />

      {/* Horizontal Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6" dir="rtl">
        <nav className="flex items-center gap-1 -mb-px">
          {navTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                tab.id === 'view-dashboard'
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
              <h1 className="text-xl font-semibold text-slate-800">
                {isNifraim ? 'דשבורד נפרעים' : dashboardType === 'gemel' ? 'דשבורד גמל' : 'דשבורד עמלות'}
              </h1>
              <p className="text-sm text-slate-500">
                יצרן | תאריך עיבוד | ענף | שם סוכן | עמלה | {valueLabel}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              disabled={loading}
              className="border-slate-200 text-slate-600"
            >
              <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
              רענן
            </Button>
          </div>

          {/* Filters */}
          <Card className="bg-white border-slate-200">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">סינון:</span>
                </div>

                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="יצרן" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל היצרנים</SelectItem>
                    {filterOptions.providers.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="ענף" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הענפים</SelectItem>
                    {filterOptions.branches.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="חיפוש סוכן..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="w-48 h-9"
                />

                {(selectedProvider !== 'all' || selectedBranch !== 'all' || agentSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProvider('all');
                      setSelectedBranch('all');
                      setAgentSearch('');
                    }}
                    className="text-slate-500"
                  >
                    נקה פילטרים
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500">טוען נתונים...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="py-6 text-center">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchDashboard} variant="outline" className="mt-4">
                  נסה שוב
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Dashboard Content */}
          {!loading && !error && stats && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-100 uppercase">סה״כ רשומות</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(stats.totalRecords)}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-emerald-100 uppercase">סה״כ עמלות</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalCommission)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-emerald-200" />
                    </div>
                  </CardContent>
                </Card>

                {isNifraim ? (
                  <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-amber-100 uppercase">סה״כ פרמיה</p>
                          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalPremium)}</p>
                        </div>
                        <Banknote className="h-8 w-8 text-amber-200" />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium text-purple-100 uppercase">סה״כ צבירה</p>
                          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAccumulation)}</p>
                        </div>
                        <Wallet className="h-8 w-8 text-purple-200" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-orange-100 uppercase">סוכנים</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(stats.uniqueAgents)}</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-300 uppercase">יצרנים</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(stats.uniqueProviders)}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      מגמת עמלות חודשית
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {monthlyTrend.length} חודשים
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => v.substring(5)}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value) || 0)}
                          labelFormatter={(label) => `חודש: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="commission"
                          name="עמלות"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Providers Bar Chart */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      עמלות לפי יצרן
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-700">
                      {providers.length} יצרנים
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={providers.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                        <Bar dataKey="commission" name="עמלה" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tables Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Agents Table */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      סוכנים מובילים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {topAgents.slice(0, 15).map((agent, index) => (
                        <div
                          key={agent.name}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg',
                            index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                              index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'
                            )}>
                              {index + 1}
                            </div>
                            <p className="text-sm font-medium text-slate-800">{agent.name}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(agent.commission)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatNumber(agent.count)} רשומות
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Branches Table */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-500" />
                      עמלות לפי ענף
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {branches.slice(0, 15).map((branch, index) => (
                        <div
                          key={branch.name}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg',
                            index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                          )}
                        >
                          <p className="text-sm font-medium text-slate-800">{branch.name}</p>
                          <div className="text-left">
                            <p className="text-sm font-bold text-purple-600">
                              {formatCurrency(branch.commission)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatNumber(branch.count)} רשומות
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Records Table */}
              <Card className="bg-white border-slate-200">
                <CardHeader
                  className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 cursor-pointer"
                  onClick={() => setShowTable(!showTable)}
                >
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Table2 className="h-5 w-5 text-slate-500" />
                    נתונים אחרונים ({recentRecords.length})
                  </CardTitle>
                  {showTable ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardHeader>
                {showTable && (
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-right py-3 px-4 font-semibold text-slate-600">יצרן</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-600">תאריך עיבוד</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-600">ענף</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-600">שם סוכן</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-600">עמלה</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-600">{valueLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentRecords.map((record, index) => (
                            <tr key={index} className={cn(index % 2 === 0 ? 'bg-slate-50' : '')}>
                              <td className="py-3 px-4 text-slate-800">{record.provider}</td>
                              <td className="py-3 px-4 text-slate-600">{record.processing_month}</td>
                              <td className="py-3 px-4 text-slate-600">{record.branch}</td>
                              <td className="py-3 px-4 font-medium text-slate-800">{record.agent_name}</td>
                              <td className="py-3 px-4 text-emerald-600 font-medium">
                                {formatCurrency(record.commission || 0)}
                              </td>
                              <td className="py-3 px-4 text-blue-600 font-medium">
                                {formatCurrency(isNifraim ? (record.premium || 0) : (record.accumulation || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
