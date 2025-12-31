'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ChartConfig } from '@/types/dashboard';

interface DashboardChartsProps {
  charts: ChartConfig[];
  data: Record<string, unknown>[];
  filters?: Record<string, unknown>;
  className?: string;
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#ef4444', '#6366f1',
  '#14b8a6', '#f97316', '#84cc16', '#a855f7',
];

export function DashboardCharts({ charts, data, filters, className }: DashboardChartsProps) {
  // Filter data if filters are provided
  const filteredData = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return data;

    return data.filter(row => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        if (row[key] !== value) return false;
      }
      return true;
    });
  }, [data, filters]);

  // Prepare chart data
  const chartDataList = useMemo(() => {
    return charts.map(chart => {
      if (!chart.groupBy) {
        return { chart, data: [] };
      }

      // Group data by the groupBy field
      const groups: Record<string, { count: number; sum: number }> = {};

      for (const row of filteredData) {
        const key = String(row[chart.groupBy] || 'לא מוגדר');
        if (!groups[key]) {
          groups[key] = { count: 0, sum: 0 };
        }
        groups[key].count++;

        if (chart.yAxis) {
          const val = row[chart.yAxis];
          const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,₪$€%]/g, ''));
          if (!isNaN(num)) {
            groups[key].sum += num;
          }
        }
      }

      // Convert to chart data format
      const chartData = Object.entries(groups)
        .map(([name, values]) => ({
          name,
          value: chart.aggregation === 'count'
            ? values.count
            : chart.aggregation === 'sum'
            ? values.sum
            : chart.aggregation === 'avg' && values.count > 0
            ? values.sum / values.count
            : values.count,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Limit to top 10

      return { chart, data: chartData };
    });
  }, [charts, filteredData]);

  if (charts.length === 0) return null;

  return (
    <div
      className={cn(
        'grid gap-6',
        charts.length === 1
          ? 'grid-cols-1'
          : charts.length === 2
          ? 'grid-cols-1 lg:grid-cols-2'
          : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
        className
      )}
      dir="rtl"
    >
      {chartDataList.map(({ chart, data: chartData }, index) => (
        <motion.div
          key={chart.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl border p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            {chart.title}
          </h3>

          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              אין נתונים להצגה
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart(chart, chartData)}
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Render chart based on type
function renderChart(
  config: ChartConfig,
  data: { name: string; value: number }[]
): React.ReactElement {
  const commonProps = {
    data,
  };

  switch (config.type) {
    case 'pie':
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={config.showValues}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={config.showValues ? (renderCustomLabel as any) : false}
            outerRadius={80}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          {config.showLegend && (
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          )}
          <Tooltip
            formatter={(value) => formatNumber(Number(value) || 0)}
            contentStyle={{ direction: 'rtl' }}
          />
        </PieChart>
      );

    case 'donut':
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          {config.showLegend && (
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
            />
          )}
          <Tooltip
            formatter={(value) => formatNumber(Number(value) || 0)}
            contentStyle={{ direction: 'rtl' }}
          />
        </PieChart>
      );

    case 'bar':
      return (
        <BarChart {...commonProps} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatNumber(Number(value) || 0)}
            contentStyle={{ direction: 'rtl' }}
          />
          {config.showLegend && <Legend />}
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      );

    case 'line':
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatNumber(Number(value) || 0)}
            contentStyle={{ direction: 'rtl' }}
          />
          {config.showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey="value"
            stroke={COLORS[0]}
            strokeWidth={2}
            dot={{ fill: COLORS[0], strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      );

    case 'area':
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatNumber(Number(value) || 0)}
            contentStyle={{ direction: 'rtl' }}
          />
          {config.showLegend && <Legend />}
          <Area
            type="monotone"
            dataKey="value"
            stroke={COLORS[0]}
            fill={COLORS[0]}
            fillOpacity={0.3}
          />
        </AreaChart>
      );

    default:
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill={COLORS[0]} />
        </BarChart>
      );
  }
}

// Custom label for pie chart
function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}) {
  if (cx === undefined || cy === undefined || midAngle === undefined ||
      innerRadius === undefined || outerRadius === undefined ||
      percent === undefined || name === undefined) {
    return null;
  }

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show labels for small slices

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
}

// Format number with locale
function formatNumber(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    maximumFractionDigits: 2,
  }).format(value);
}
