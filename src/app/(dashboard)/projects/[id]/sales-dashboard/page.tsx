'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  Users,
  Building2,
  PieChart,
  BarChart3,
  RefreshCw,
  Filter,
  Download,
  UserCheck,
  Package,
  Wallet,
  ChevronLeft,
  Bug,
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardStats {
  totalRecords: number;
  totalAccumulation: number;
  totalPremium: number;
  uniqueAgents: number;
  uniqueSupervisors: number;
}

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

interface StatusBreakdown {
  status: string;
  count: number;
}

interface DebugInfo {
  hasRawData?: boolean;
  sampleAgent?: string;
  sampleSupervisor?: string;
  sampleAgentNumber?: string;
  keysWithAgent?: string[];
  keysWithSupervisor?: string[];
  totalRawDataKeys?: number;
  sampleRows?: Array<{
    agent: string;
    supervisor: string;
    agentNumber: string;
  }>;
}

// Navigation tabs for project
interface NavTab {
  id: string;
  label: string;
  href: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `₪${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `₪${(value / 1000).toFixed(1)}K`;
  }
  return `₪${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('he-IL');
}

export default function SalesDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topAgents, setTopAgents] = useState<AgentStats[]>([]);
  const [topSupervisors, setTopSupervisors] = useState<SupervisorStats[]>([]);
  const [products, setProducts] = useState<ProductStats[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [agentSearch, setAgentSearch] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<'agents' | 'supervisors'>('agents');

  // Navigation tabs
  const navTabs: NavTab[] = [
    { id: 'dashboard', label: 'דשבורד', href: `/projects/${projectId}` },
    { id: 'sales-dashboard', label: 'דשבורד מכירות', href: `/projects/${projectId}/sales-dashboard` },
    { id: 'reports', label: 'דוחות מכירות', href: `/projects/${projectId}/reports` },
    { id: 'data', label: 'תצוגת נתונים', href: `/projects/${projectId}/data` },
    { id: 'import', label: 'ייבוא נתונים', href: `/projects/${projectId}/import` },
    { id: 'settings', label: 'הגדרות', href: `/projects/${projectId}/settings` },
  ];

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (agentSearch) searchParams.append('agent', agentSearch);
      if (supervisorFilter) searchParams.append('supervisor', supervisorFilter);

      const response = await fetch(
        `/api/projects/${projectId}/sales-dashboard?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setStats(data.stats);
      setTopAgents(data.topAgents || []);
      setTopSupervisors(data.topSupervisors || []);
      setProducts(data.products || []);
      setStatusBreakdown(data.statusBreakdown || []);
      setDebugInfo(data._debug || null);

      // Log debug info to console
      console.log('Sales Dashboard Debug:', data._debug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
      toast.error('שגיאה בטעינת הדשבורד');
    } finally {
      setLoading(false);
    }
  }, [projectId, agentSearch, supervisorFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Prepare chart data
  const agentChartData = topAgents.slice(0, 10).map(agent => ({
    name: agent.name.length > 15 ? agent.name.substring(0, 15) + '...' : agent.name,
    צבירה: agent.totalAccumulation,
    count: agent.count,
  }));

  const productChartData = products.slice(0, 8).map(product => ({
    name: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
    value: product.totalAccumulation,
  }));

  const statusChartData = statusBreakdown.slice(0, 6).map(item => ({
    name: item.status,
    value: item.count,
  }));

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Header title="דשבורד מכירות" />

      {/* Horizontal Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6" dir="rtl">
        <nav className="flex items-center gap-1 -mb-px">
          {navTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                tab.id === 'sales-dashboard'
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
          {/* Header Controls */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">דשבורד מכירות</h1>
              <p className="text-sm text-slate-500">צפי צבירה והפקדה חד פעמית משולבים</p>
            </div>
            <div className="flex items-center gap-2">
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
          </div>

          {/* Filters */}
          <Card className="bg-white border-slate-200">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">סינון:</span>
                </div>
                <Input
                  placeholder="חיפוש סוכן..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="w-48 h-9"
                />
                <Input
                  placeholder="חיפוש מפקח..."
                  value={supervisorFilter}
                  onChange={(e) => setSupervisorFilter(e.target.value)}
                  className="w-48 h-9"
                />
                {(agentSearch || supervisorFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAgentSearch('');
                      setSupervisorFilter('');
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
                        <p className="text-xs font-medium text-emerald-100 uppercase">צבירה + הפקדה</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAccumulation)}</p>
                      </div>
                      <Wallet className="h-8 w-8 text-emerald-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-100 uppercase">פרמיה צפויה</p>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalPremium)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>

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
                        <p className="text-xs font-medium text-slate-300 uppercase">מפקחים</p>
                        <p className="text-2xl font-bold mt-1">{formatNumber(stats.uniqueSupervisors)}</p>
                      </div>
                      <UserCheck className="h-8 w-8 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent Performance Chart */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      ביצועי סוכנים - צבירה
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-700">
                      {topAgents.length} סוכנים
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={agentChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value) || 0)}
                          labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Bar dataKey="צבירה" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Product Distribution Chart */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-semibold text-slate-800">
                      התפלגות מוצרים
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {products.length} מוצרים
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={productChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {productChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                      </RechartsPie>
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
                            <div>
                              <p className="text-sm font-medium text-slate-800">{agent.name}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                {agent.agentNumber && (
                                  <span>מס׳ {agent.agentNumber}</span>
                                )}
                                {agent.supervisor && agent.supervisor !== 'לא ידוע' && (
                                  <span>• מפקח: {agent.supervisor}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(agent.totalAccumulation)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatNumber(agent.count)} עסקאות
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Supervisors Table */}
                <Card className="bg-white border-slate-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-purple-500" />
                      מפקחים ומטפלים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {topSupervisors.slice(0, 15).map((supervisor, index) => (
                        <div
                          key={supervisor.name}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg',
                            index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <UserCheck className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{supervisor.name}</p>
                              <p className="text-xs text-slate-400">
                                {supervisor.agents.length} סוכנים
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-purple-600">
                              {formatCurrency(supervisor.totalAccumulation)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatNumber(supervisor.count)} עסקאות
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Breakdown */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-orange-500" />
                    התפלגות סטטוסים
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-3">
                    {statusBreakdown.map((item, index) => (
                      <Badge
                        key={item.status}
                        className="py-2 px-3"
                        style={{ backgroundColor: `${COLORS[index % COLORS.length]}20`, color: COLORS[index % COLORS.length] }}
                      >
                        {item.status}: {formatNumber(item.count)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Products Detail Table */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
                  <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-500" />
                    פירוט מוצרים
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-right py-3 px-4 font-semibold text-slate-600">מוצר</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-600">כמות</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-600">צבירה</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-600">אחוז</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product, index) => (
                          <tr key={product.name} className={cn(index % 2 === 0 ? 'bg-slate-50' : '')}>
                            <td className="py-3 px-4 font-medium text-slate-800">{product.name}</td>
                            <td className="py-3 px-4 text-slate-600">{formatNumber(product.count)}</td>
                            <td className="py-3 px-4 text-emerald-600 font-medium">{formatCurrency(product.totalAccumulation)}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${product.percentage}%` }}
                                  />
                                </div>
                                <span className="text-slate-500">{product.percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Debug Panel */}
              {debugInfo && (
                <Card className="bg-slate-800 text-slate-100 border-slate-700">
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowDebug(!showDebug)}>
                    <CardTitle className="text-sm font-mono flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-yellow-400" />
                        Debug Info (לפיתוח)
                      </span>
                      {showDebug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                  {showDebug && (
                    <CardContent className="pt-2 font-mono text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-yellow-400">hasRawData:</p>
                          <p>{debugInfo.hasRawData ? 'true' : 'false'}</p>
                        </div>
                        <div>
                          <p className="text-yellow-400">totalRawDataKeys:</p>
                          <p>{debugInfo.totalRawDataKeys}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-yellow-400">keysWithAgent:</p>
                        <p className="text-green-400">{debugInfo.keysWithAgent?.join(', ') || 'none'}</p>
                      </div>
                      <div>
                        <p className="text-yellow-400">keysWithSupervisor:</p>
                        <p className="text-green-400">{debugInfo.keysWithSupervisor?.join(', ') || 'none'}</p>
                      </div>
                      <div>
                        <p className="text-yellow-400">sampleAgent:</p>
                        <p className="text-blue-400">{String(debugInfo.sampleAgent) || 'null'}</p>
                      </div>
                      <div>
                        <p className="text-yellow-400">sampleSupervisor:</p>
                        <p className="text-blue-400">{String(debugInfo.sampleSupervisor) || 'null'}</p>
                      </div>
                      <div>
                        <p className="text-yellow-400">sampleAgentNumber:</p>
                        <p className="text-blue-400">{String(debugInfo.sampleAgentNumber) || 'null'}</p>
                      </div>
                      {debugInfo.sampleRows && (
                        <div>
                          <p className="text-yellow-400">sampleRows (first 3):</p>
                          <pre className="text-xs bg-slate-900 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(debugInfo.sampleRows, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
