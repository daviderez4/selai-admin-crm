'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  Banknote,
  Users,
  Building2,
  PieChart,
  BarChart3,
  RefreshCw,
  Filter,
  Download,
  ArrowRight,
  Calendar,
  Wallet,
  Banknote,
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
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

interface DashboardStats {
  total: number;
  totalCommission: number;
  totalPremium: number;
  totalAccumulation: number;
  nifraimCount: number;
  gemelCount: number;
  uniqueAgents: number;
  byProvider: Record<string, number>;
  byBranch: Record<string, number>;
}

interface AgentStats {
  name: string;
  count: number;
  commission: number;
  premium: number;
  accumulation: number;
}

interface MonthlyData {
  month: string;
  commission: number;
  premium: number;
  accumulation: number;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const PROVIDER_COLORS: Record<string, string> = {
  phoenix: '#FF6B35',
  harel: '#004E98',
};

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

export default function CommissionDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topAgents, setTopAgents] = useState<AgentStats[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [agentSearch, setAgentSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedProvider !== 'all') params.append('provider', selectedProvider);
      if (agentSearch) params.append('agent', agentSearch);
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      const response = await fetch(
        `/api/projects/${projectId}/unified-dashboard?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setStats(data.stats);
      setTopAgents(data.topAgents || []);
      setMonthlyTrend(data.monthlyTrend || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
      toast.error('שגיאה בטעינת הדשבורד');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedProvider, agentSearch, dateRange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Prepare chart data
  const providerData = stats
    ? Object.entries(stats.byProvider).map(([name, value]) => ({
        name: name === 'phoenix' ? 'פיניקס' : name === 'harel' ? 'הראל' : name,
        value,
        fill: PROVIDER_COLORS[name] || COLORS[0],
      }))
    : [];

  const branchData = stats
    ? Object.entries(stats.byBranch)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];

  const breadcrumbs = [
    { label: 'פרויקטים', href: '/' },
    { label: 'דשבורד עמלות' },
  ];

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header breadcrumbs={breadcrumbs} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchDashboard}>נסה שוב</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <Header breadcrumbs={breadcrumbs} />

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">דשבורד עמלות מאוחד</h1>
              <p className="text-slate-500">נפרעים + גמל | Phoenix + Harel</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboard}
                disabled={loading}
                className="bg-white"
              >
                <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
                רענן
              </Button>
              <Link href={`/projects/${projectId}/data`}>
                <Button variant="outline" size="sm" className="bg-white">
                  <BarChart3 className="h-4 w-4 ml-2" />
                  תצוגת נתונים
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white border-slate-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">סינון:</span>
                </div>

                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-[140px] bg-white">
                    <SelectValue placeholder="ספק" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הספקים</SelectItem>
                    <SelectItem value="phoenix">פיניקס</SelectItem>
                    <SelectItem value="harel">הראל</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="חיפוש סוכן..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="w-[180px] bg-white"
                />

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <Input
                    type="month"
                    value={dateRange.from}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                    className="w-[140px] bg-white"
                    placeholder="מתאריך"
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    type="month"
                    value={dateRange.to}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                    className="w-[140px] bg-white"
                    placeholder="עד תאריך"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">סה״כ רשומות</p>
                    <p className="text-3xl font-bold mt-1">
                      {loading ? '...' : formatNumber(stats?.total || 0)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-blue-400/30 text-white text-xs">
                        נפרעים: {formatNumber(stats?.nifraimCount || 0)}
                      </Badge>
                      <Badge className="bg-blue-400/30 text-white text-xs">
                        גמל: {formatNumber(stats?.gemelCount || 0)}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-blue-400/30 p-3 rounded-lg">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">סה״כ עמלות</p>
                    <p className="text-3xl font-bold mt-1">
                      {loading ? '...' : formatCurrency(stats?.totalCommission || 0)}
                    </p>
                  </div>
                  <div className="bg-emerald-400/30 p-3 rounded-lg">
                    <Banknote className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">סה״כ פרמיות</p>
                    <p className="text-3xl font-bold mt-1">
                      {loading ? '...' : formatCurrency(stats?.totalPremium || 0)}
                    </p>
                  </div>
                  <div className="bg-amber-400/30 p-3 rounded-lg">
                    <Banknote className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">סה״כ צבירה</p>
                    <p className="text-3xl font-bold mt-1">
                      {loading ? '...' : formatCurrency(stats?.totalAccumulation || 0)}
                    </p>
                  </div>
                  <div className="bg-purple-400/30 p-3 rounded-lg">
                    <Wallet className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  מגמת עמלות חודשית
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value.substring(5)}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
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
                )}
              </CardContent>
            </Card>

            {/* Provider Distribution */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  התפלגות לפי ספק
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ResponsiveContainer width="60%" height={200}>
                      <RechartsPie>
                        <Pie
                          data={providerData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {providerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatNumber(Number(value) || 0)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3">
                      {providerData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-sm text-slate-600">{item.name}</span>
                          <span className="text-sm font-medium text-slate-800 mr-auto">
                            {formatNumber(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Branch Distribution & Top Agents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branch Distribution */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  התפלגות לפי ענף
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={branchData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip formatter={(value) => formatNumber(Number(value) || 0)} />
                      <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Agents */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" />
                  סוכנים מובילים ({stats?.uniqueAgents || 0} סוכנים)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {topAgents.slice(0, 10).map((agent, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                              index === 0
                                ? 'bg-amber-500'
                                : index === 1
                                ? 'bg-slate-400'
                                : index === 2
                                ? 'bg-amber-700'
                                : 'bg-slate-300'
                            )}
                          >
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">
                            {agent.name}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatCurrency(agent.commission)}
                          </p>
                          <p className="text-xs text-slate-400">{agent.count} רשומות</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
