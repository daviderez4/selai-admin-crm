'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
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
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  INSURANCE_CATEGORIES,
  getStatusPatternColor,
  type InsuranceCategory,
} from '@/lib/insurance-patterns';
import {
  analyzeProjectData,
  type ProjectAnalysis,
  type ProjectConfiguration,
} from '@/lib/project-analyzer';

interface InsuranceDashboardProps {
  projectId: string;
  config?: ProjectConfiguration | null;
  onSetupClick?: () => void;
}

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

const STATUS_COLOR_MAP: Record<string, string> = {
  green: '#10b981',
  red: '#ef4444',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  gray: '#64748b',
};

export function InsuranceDashboard({
  projectId,
  config,
  onSetupClick,
}: InsuranceDashboardProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableName, setTableName] = useState('');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const tablesRes = await fetch(`/api/projects/${projectId}/tables`);
      const tablesData = await tablesRes.json();

      if (tablesData.tables && tablesData.tables.length > 0) {
        const table = config?.tableName || tablesData.tables[0].name;
        setTableName(table);

        const dataRes = await fetch(`/api/projects/${projectId}/data?table=${table}&limit=10000`);
        const result = await dataRes.json();

        if (result.data) {
          setData(result.data);
          const projectAnalysis = analyzeProjectData(projectId, table, result.data);
          setAnalysis(projectAnalysis);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected categories from config or analysis
  const selectedCategories = useMemo(() => {
    if (config?.selectedCategories) {
      return config.selectedCategories
        .map(id => INSURANCE_CATEGORIES.find(c => c.id === id))
        .filter(Boolean) as InsuranceCategory[];
    }
    return analysis?.detectedCategories || [];
  }, [config, analysis]);

  // Generate chart data for each category
  const categoryChartData = useMemo(() => {
    if (!analysis) return new Map();

    const chartDataMap = new Map<string, Array<{ name: string; value: number; color?: string }>>();

    analysis.categoryAnalyses.forEach(ca => {
      const enumColumn = ca.columns.find(c => c.dataType === 'text' && c.uniqueCount > 1 && c.uniqueCount <= 20);

      if (enumColumn) {
        const counts: Record<string, number> = {};
        data.forEach(row => {
          const value = String(row[enumColumn.columnName] || 'לא ידוע');
          counts[value] = (counts[value] || 0) + 1;
        });

        const chartData = Object.entries(counts)
          .map(([name, value], index) => {
            const statusColor = getStatusPatternColor(name);
            return {
              name,
              value,
              color: statusColor !== 'gray' ? STATUS_COLOR_MAP[statusColor] : CHART_COLORS[index % CHART_COLORS.length],
            };
          })
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        chartDataMap.set(ca.category.id, chartData);
      }
    });

    return chartDataMap;
  }, [analysis, data]);

  // Generate summary cards
  const summaryCards = useMemo(() => {
    if (!analysis) return [];

    return selectedCategories.slice(0, 4).map(category => {
      const categoryAnalysis = analysis.categoryAnalyses.find(ca => ca.category.id === category.id);
      const metric = categoryAnalysis?.metrics[0];

      // Calculate trend (mock - in real app would compare to previous period)
      const trend = Math.random() > 0.5 ? 'up' : 'down';
      const trendValue = Math.floor(Math.random() * 20) + 1;

      return {
        category,
        title: category.name,
        value: metric?.formatted || data.length.toLocaleString('he-IL'),
        trend,
        trendValue,
      };
    });
  }, [analysis, selectedCategories, data]);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${tableName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('הקובץ יורד בהצלחה');
  };

  // Render chart based on category type
  const renderChart = (category: InsuranceCategory, chartData: Array<{ name: string; value: number; color?: string }>) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center text-slate-400">
          אין נתונים להצגה
        </div>
      );
    }

    switch (category.chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                labelLine={{ stroke: '#64748b' }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
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
              <Legend wrapperStyle={{ direction: 'rtl' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'leaderboard':
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
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
                formatter={(value) => [Number(value || 0).toLocaleString('he-IL'), 'כמות']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  direction: 'rtl',
                }}
              />
              <Funnel
                dataKey="value"
                data={chartData}
                isAnimationActive
              >
                <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );

      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${category.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={category.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={category.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  direction: 'rtl',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={category.color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${category.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  direction: 'rtl',
                }}
              />
              <Bar dataKey="value" fill={category.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
          <p className="text-slate-400">טוען דשבורד...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">דשבורד ביטוח</h1>
          <p className="text-slate-400 text-sm">
            {tableName && `טבלה: ${tableName} • `}
            {data.length.toLocaleString('he-IL')} רשומות
          </p>
        </div>
        <div className="flex gap-3">
          {onSetupClick && (
            <Button
              variant="outline"
              onClick={onSetupClick}
              className="border-slate-600 text-slate-300"
            >
              <Settings className="h-4 w-4 ml-2" />
              הגדרות
            </Button>
          )}
          <Button
            variant="outline"
            onClick={fetchData}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן
          </Button>
          <Button onClick={exportToExcel} className="bg-emerald-500 hover:bg-emerald-600">
            <Download className="h-4 w-4 ml-2" />
            ייצוא
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <Card
            key={index}
            className="border-slate-700 hover:border-slate-600 transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${card.category.color}20 0%, ${card.category.color}05 100%)`,
              borderColor: `${card.category.color}30`,
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: card.category.color }}>
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {card.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    )}
                    <span
                      className={`text-sm ${card.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {card.trendValue}%
                    </span>
                    <span className="text-xs text-slate-500">מהחודש הקודם</span>
                  </div>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${card.category.color}20` }}
                >
                  {card.category.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedCategories.slice(0, 4).map(category => {
          const chartData = categoryChartData.get(category.id);

          return (
            <Card key={category.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  {category.name}
                  <Badge
                    variant="outline"
                    className="text-xs mr-auto"
                    style={{ borderColor: `${category.color}50`, color: category.color }}
                  >
                    {category.chartType === 'pie' ? 'פילוח' :
                     category.chartType === 'bar' ? 'עמודות' :
                     category.chartType === 'leaderboard' ? 'דירוג' :
                     category.chartType === 'funnel' ? 'משפך' :
                     category.chartType === 'timeline' ? 'ציר זמן' : 'גרף'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart(category, chartData || [])}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Smart Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <span className="text-xl">📊</span>
            טבלת נתונים חכמה
            <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
              עם פילטרים אוטומטיים
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
  );
}
