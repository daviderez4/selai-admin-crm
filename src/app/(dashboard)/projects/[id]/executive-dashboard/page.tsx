'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  RefreshCw,
  Download,
  Loader2,
  Database,
  Activity,
  Target,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartTable } from '@/components/smart-table';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  analyzeTable,
  getStatusColor,
  type TableAnalysis,
} from '@/lib/utils/columnAnalyzer';

// Color palette for charts
const CHART_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

const STATUS_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  gray: '#64748b',
};

interface DataRow {
  id?: number;
  [key: string]: unknown;
}

export default function ExecutiveDashboard() {
  const params = useParams();
  const projectId = params.id as string;

  const [data, setData] = useState<DataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableName, setTableName] = useState<string>('');
  const [analysis, setAnalysis] = useState<TableAnalysis | null>(null);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // First get the tables
      const tablesRes = await fetch(`/api/projects/${projectId}/tables`);
      const tablesData = await tablesRes.json();

      if (tablesData.tables && tablesData.tables.length > 0) {
        // Get the most recently created table (or first one)
        const table = tablesData.tables[0];
        setTableName(table.name);

        // Fetch data from the table
        const dataRes = await fetch(`/api/projects/${projectId}/data?table=${table.name}&limit=10000`);
        const result = await dataRes.json();

        if (result.data) {
          setData(result.data);

          // Analyze the data
          const tableAnalysis = analyzeTable(result.data);
          setAnalysis(tableAnalysis);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-detect important columns
  const detectedColumns = useMemo(() => {
    if (!analysis) return { status: null, handler: null, processType: null, date: null };

    const statusCol = analysis.statusColumns[0]?.name || null;
    const handlerCol = analysis.columns.find(c =>
      c.name.includes('מטפל') || c.name.toLowerCase().includes('handler') ||
      c.name.includes('סוכן') || c.name.includes('נציג')
    )?.name || null;
    const processTypeCol = analysis.columns.find(c =>
      c.name.includes('סוג') || c.name.toLowerCase().includes('type') ||
      c.name.includes('קטגוריה')
    )?.name || null;
    const dateCol = analysis.dateColumns[0]?.name || null;

    return { status: statusCol, handler: handlerCol, processType: processTypeCol, date: dateCol };
  }, [analysis]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!analysis) return { statuses: 0, handlers: 0, processTypes: 0 };

    const statusCol = detectedColumns.status;
    const handlerCol = detectedColumns.handler;
    const processTypeCol = detectedColumns.processType;

    return {
      statuses: statusCol
        ? new Set(data.map(d => d[statusCol]).filter(Boolean)).size
        : 0,
      handlers: handlerCol
        ? new Set(data.map(d => d[handlerCol]).filter(Boolean)).size
        : 0,
      processTypes: processTypeCol
        ? new Set(data.map(d => d[processTypeCol]).filter(Boolean)).size
        : 0,
    };
  }, [data, analysis, detectedColumns]);

  // Chart data
  const statusChartData = useMemo(() => {
    const statusCol = detectedColumns.status;
    if (!statusCol) return [];

    const counts: Record<string, number> = {};
    data.forEach(row => {
      const status = String(row[statusCol] || 'לא ידוע');
      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: STATUS_COLOR_MAP[getStatusColor(name)] || CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [data, detectedColumns]);

  const handlerChartData = useMemo(() => {
    const handlerCol = detectedColumns.handler;
    if (!handlerCol) return [];

    const counts: Record<string, number> = {};
    data.forEach(row => {
      const handler = String(row[handlerCol] || 'לא ידוע');
      counts[handler] = (counts[handler] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data, detectedColumns]);

  const timelineChartData = useMemo(() => {
    const dateCol = detectedColumns.date;
    if (!dateCol) return [];

    const counts: Record<string, number> = {};
    data.forEach(row => {
      const dateVal = row[dateCol];
      if (dateVal) {
        const date = new Date(String(dateVal));
        if (!isNaN(date.getTime())) {
          const key = date.toISOString().split('T')[0];
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [data, detectedColumns]);

  const processTypeData = useMemo(() => {
    const processTypeCol = detectedColumns.processType;
    if (!processTypeCol) return [];

    const counts: Record<string, number> = {};
    data.forEach(row => {
      const type = String(row[processTypeCol] || 'לא ידוע');
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, detectedColumns]);

  // Export all data
  const exportAll = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${tableName || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('הקובץ יורד בהצלחה');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="דשבורד מנהלים" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
            <p className="text-slate-400">טוען נתונים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <Header title="דשבורד מנהלים" />

      <div className="flex-1 p-6 overflow-auto">
        {/* Header with refresh and export */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">סקירה כללית</h1>
            <p className="text-slate-400 text-sm">
              {tableName && `טבלה: ${tableName} • `}
              {data.length.toLocaleString('he-IL')} רשומות
              {analysis && ` • ${analysis.columns.length} עמודות`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchData}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              רענן
            </Button>
            <Button
              onClick={exportAll}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <Download className="h-4 w-4 ml-2" />
              ייצוא לאקסל
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Records */}
          <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-500/50 transition-all hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-emerald-400 text-sm font-medium mb-1">סה"כ רשומות</p>
                  <p className="text-4xl font-bold text-white">
                    {data.length.toLocaleString('he-IL')}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {analysis?.columns.length || 0} עמודות
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Database className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unique Statuses */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/50 transition-all hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-400 text-sm font-medium mb-1">סטטוסים</p>
                  <p className="text-4xl font-bold text-white">
                    {summaryStats.statuses}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {statusChartData.slice(0, 3).map((s, i) => (
                      <Badge
                        key={i}
                        className="text-xs"
                        style={{ backgroundColor: `${s.color}20`, color: s.color, borderColor: `${s.color}50` }}
                      >
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unique Handlers */}
          <Card className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/30 hover:border-violet-500/50 transition-all hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-violet-400 text-sm font-medium mb-1">מטפלים</p>
                  <p className="text-4xl font-bold text-white">
                    {summaryStats.handlers}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {detectedColumns.handler ? 'מטפלים פעילים במערכת' : 'לא זוהה עמודת מטפל'}
                  </p>
                </div>
                <div className="p-3 bg-violet-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Types */}
          <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30 hover:border-amber-500/50 transition-all hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-amber-400 text-sm font-medium mb-1">סוגי תהליכים</p>
                  <p className="text-4xl font-bold text-white">
                    {summaryStats.processTypes}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    {processTypeData[0]?.name || 'לא זוהו סוגים'}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Target className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Pie Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-emerald-400" />
                התפלגות לפי סטטוס
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#64748b' }}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        direction: 'rtl',
                      }}
                      formatter={(value) => [Number(value || 0).toLocaleString('he-IL'), 'כמות']}
                    />
                    <Legend
                      wrapperStyle={{ direction: 'rtl' }}
                      formatter={(value) => <span className="text-slate-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  אין נתוני סטטוס להצגה
                </div>
              )}
            </CardContent>
          </Card>

          {/* Handler Bar Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                רשומות לפי מטפל
              </CardTitle>
            </CardHeader>
            <CardContent>
              {handlerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={handlerChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      stroke="#64748b"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        direction: 'rtl',
                      }}
                      formatter={(value) => [Number(value || 0).toLocaleString('he-IL'), 'רשומות']}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {handlerChartData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  אין נתוני מטפלים להצגה
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Chart */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              מגמת רשומות לאורך זמן
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timelineChartData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      direction: 'rtl',
                    }}
                    formatter={(value) => [Number(value || 0).toLocaleString('he-IL'), 'רשומות']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('he-IL')}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                אין נתוני תאריכים להצגה
              </div>
            )}
          </CardContent>
        </Card>

        {/* Smart Table with Dynamic Filters */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-400" />
              טבלת נתונים חכמה
              <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                עם זיהוי אוטומטי
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SmartTable
              data={data}
              projectId={projectId}
              tableName={tableName}
              showFilters={true}
              showPresets={true}
              showSummary={true}
              showExport={true}
              pageSize={100}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
