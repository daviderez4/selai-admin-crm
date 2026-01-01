'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Database, BarChart3, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

type DrillDownType = 'accumulation' | 'handlers' | 'supervisors' | 'records';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DrillDownType | null;
  projectId: string;
}

interface ProducerData {
  name: string;
  count: number;
  total: number;
}

interface ProcessData {
  processId: string;
  customer: string;
  handler: string;
  accumulation: number;
}

interface HandlerData {
  name: string;
  count: number;
  accumulation: number;
  completed: number;
  successRate: number;
}

interface SupervisorData {
  name: string;
  handlerCount: number;
  processCount: number;
  accumulation: number;
  completed: number;
  successRate: number;
}

interface StatusData {
  name: string;
  count: number;
}

const statusColors: Record<string, string> = {
  'פעיל': 'bg-emerald-500',
  'בטיפול': 'bg-amber-500',
  'הושלם': 'bg-blue-500',
  'הצלחה': 'bg-green-500',
  'בוטל': 'bg-red-500',
  'רג\'קט': 'bg-red-500',
  'ממתין': 'bg-purple-500',
  'תהליך בסנכרון': 'bg-cyan-500',
  'ניוד': 'bg-cyan-500',
  'חדש': 'bg-green-500',
};

const chartColors = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-rose-500',
];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ₪`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ₪`;
  }
  return `${value.toLocaleString('he-IL')} ₪`;
}

function BarChart({ data, maxValue }: { data: { name: string; value: number }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={item.name} className="flex items-center gap-3">
          <div className="w-24 text-right text-sm text-slate-300 truncate" title={item.name}>
            {item.name}
          </div>
          <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', chartColors[idx % chartColors.length])}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <div className="w-20 text-left text-sm text-slate-400">
            {formatCurrency(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PieChartSimple({ data, total }: { data: StatusData[]; total: number }) {
  let offset = 0;
  const segments = data.slice(0, 8).map((item, idx) => {
    const percentage = total > 0 ? (item.count / total) * 100 : 0;
    const segment = {
      name: item.name,
      percentage,
      offset,
      color: statusColors[item.name] || chartColors[idx % chartColors.length],
    };
    offset += percentage;
    return segment;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {segments.map((segment, idx) => (
            <circle
              key={segment.name}
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              className={segment.color.replace('bg-', 'stroke-')}
              strokeWidth="3"
              strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{total.toLocaleString('he-IL')}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        {segments.map(segment => (
          <div key={segment.name} className="flex items-center gap-2 text-sm">
            <div className={cn('w-3 h-3 rounded-full', segment.color)} />
            <span className="text-slate-300">{segment.name}</span>
            <span className="text-slate-500 mr-auto">({segment.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DrillDownModal({ isOpen, onClose, type, projectId }: DrillDownModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (isOpen && type) {
      fetchData();
    }
  }, [isOpen, type, projectId]);

  const fetchData = async () => {
    if (!type) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/master-data/drill-down?type=${type}`);
      const result = await response.json();
      if (response.ok) {
        setData(result);
      }
    } catch (err) {
      console.error('Drill-down fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'accumulation': return 'פירוט צבירה צפויה';
      case 'handlers': return 'פירוט מטפלים';
      case 'supervisors': return 'פירוט מפקחים';
      case 'records': return 'פירוט רשומות';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'accumulation': return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case 'handlers': return <Users className="h-5 w-5 text-purple-400" />;
      case 'supervisors': return <Users className="h-5 w-5 text-amber-400" />;
      case 'records': return <Database className="h-5 w-5 text-blue-400" />;
      default: return null;
    }
  };

  const renderAccumulationView = () => {
    if (!data) return null;
    const byProducer = data.byProducer as ProducerData[] || [];
    const topProcesses = data.topProcesses as ProcessData[] || [];
    const totalAccumulation = data.totalAccumulation as number || 0;
    const avgAccumulation = data.avgAccumulation as number || 0;

    const maxProducerValue = Math.max(...byProducer.map(p => p.total), 1);

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-sm">סה״כ צבירה</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalAccumulation)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-sm">ממוצע לתהליך</p>
              <p className="text-xl font-bold text-white">{formatCurrency(avgAccumulation)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-sm">יצרנים</p>
              <p className="text-xl font-bold text-white">{byProducer.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* By Producer Chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              התפלגות לפי יצרן (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={byProducer.map(p => ({ name: p.name, value: p.total }))}
              maxValue={maxProducerValue}
            />
          </CardContent>
        </Card>

        {/* Top Processes */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Top 10 תהליכים לפי צבירה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProcesses.map((process, idx) => (
                <div
                  key={process.processId}
                  className="flex items-center gap-4 p-2 bg-slate-900/50 rounded-lg"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{process.customer || 'לא צוין'}</p>
                    <p className="text-slate-500 text-xs">מטפל: {process.handler || 'לא צוין'}</p>
                  </div>
                  <p className="text-emerald-400 font-medium">{formatCurrency(process.accumulation)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderHandlersView = () => {
    if (!data) return null;
    const handlers = data.handlers as HandlerData[] || [];

    return (
      <div className="space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
              <Users className="h-5 w-5 text-purple-400" />
              רשימת מטפלים ({handlers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-right py-2 px-2 text-slate-400 font-medium">מטפל</th>
                    <th className="text-center py-2 px-2 text-slate-400 font-medium">תהליכים</th>
                    <th className="text-center py-2 px-2 text-slate-400 font-medium">צבירה</th>
                    <th className="text-center py-2 px-2 text-slate-400 font-medium">הושלמו</th>
                    <th className="text-center py-2 px-2 text-slate-400 font-medium">הצלחה</th>
                  </tr>
                </thead>
                <tbody>
                  {handlers.map(handler => (
                    <tr key={handler.name} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 px-2 text-white">{handler.name}</td>
                      <td className="text-center py-2 px-2 text-slate-300">{handler.count}</td>
                      <td className="text-center py-2 px-2 text-emerald-400">{formatCurrency(handler.accumulation)}</td>
                      <td className="text-center py-2 px-2 text-slate-300">{handler.completed}</td>
                      <td className="text-center py-2 px-2">
                        <Badge
                          className={cn(
                            'text-xs',
                            handler.successRate >= 70
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : handler.successRate >= 40
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          )}
                        >
                          {handler.successRate.toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSupervisorsView = () => {
    if (!data) return null;
    const supervisors = data.supervisors as SupervisorData[] || [];

    return (
      <div className="space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
              <Users className="h-5 w-5 text-amber-400" />
              רשימת מפקחים ({supervisors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supervisors.map(supervisor => (
                <div
                  key={supervisor.name}
                  className="p-4 bg-slate-900/50 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-medium">{supervisor.name}</h4>
                    <Badge
                      className={cn(
                        'text-xs',
                        supervisor.successRate >= 70
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : supervisor.successRate >= 40
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {supervisor.successRate.toFixed(0)}% הצלחה
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">מטפלים</p>
                      <p className="text-white font-medium">{supervisor.handlerCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">תהליכים</p>
                      <p className="text-white font-medium">{supervisor.processCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">צבירה</p>
                      <p className="text-emerald-400 font-medium">{formatCurrency(supervisor.accumulation)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">הושלמו</p>
                      <p className="text-white font-medium">{supervisor.completed}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRecordsView = () => {
    if (!data) return null;
    const byStatus = data.byStatus as StatusData[] || [];
    const byProcessType = data.byProcessType as StatusData[] || [];
    const total = data.total as number || 0;
    const newToday = data.newToday as number || 0;
    const newThisWeek = data.newThisWeek as number || 0;

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-sm">סה״כ רשומות</p>
              <p className="text-xl font-bold text-white">{total.toLocaleString('he-IL')}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-sm">חדשים היום</p>
              <p className="text-xl font-bold text-emerald-400">{newToday.toLocaleString('he-IL')}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <p className="text-slate-400 text-sm">חדשים השבוע</p>
              <p className="text-xl font-bold text-blue-400">{newThisWeek.toLocaleString('he-IL')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
              <PieChart className="h-5 w-5 text-blue-400" />
              התפלגות לפי סטטוס
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartSimple data={byStatus} total={total} />
          </CardContent>
        </Card>

        {/* Process Type Distribution */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-200">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              התפלגות לפי סוג תהליך
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byProcessType.slice(0, 8).map(item => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{item.name}</span>
                      <span className="text-sm text-slate-500">{item.count.toLocaleString('he-IL')}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      );
    }

    switch (type) {
      case 'accumulation':
        return renderAccumulationView();
      case 'handlers':
        return renderHandlersView();
      case 'supervisors':
        return renderSupervisorsView();
      case 'records':
        return renderRecordsView();
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
