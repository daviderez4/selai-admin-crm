'use client';

import { useState, useEffect } from 'react';
import { History, CheckCircle2, XCircle, AlertCircle, Clock, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface ImportLog {
  id: string;
  file_name: string;
  target_table: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'partial';
  rows_total: number;
  rows_imported: number;
  rows_failed: number;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

interface ImportHistoryProps {
  projectId: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-slate-500', text: 'ממתין' },
  processing: { icon: RefreshCw, color: 'bg-blue-500', text: 'מעבד' },
  success: { icon: CheckCircle2, color: 'bg-emerald-500', text: 'הצליח' },
  failed: { icon: XCircle, color: 'bg-red-500', text: 'נכשל' },
  partial: { icon: AlertCircle, color: 'bg-amber-500', text: 'חלקי' },
};

export function ImportHistory({ projectId }: ImportHistoryProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/import-logs?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch import logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, projectId]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
          <History className="h-4 w-4 ml-2" />
          היסטוריית ייבוא
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-white max-h-[80vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-500" />
              היסטוריית ייבוא ({total} רשומות)
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] space-y-3 pr-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>אין היסטוריית ייבוא</p>
            </div>
          ) : (
            logs.map((log) => {
              const config = statusConfig[log.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={log.id}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`${config.color} text-white`}>
                        <StatusIcon className={`h-3 w-3 ml-1 ${log.status === 'processing' ? 'animate-spin' : ''}`} />
                        {config.text}
                      </Badge>
                      <span className="text-white font-medium">{log.file_name}</span>
                    </div>
                    <span className="text-slate-400 text-sm">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: he })}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-slate-400">
                      טבלה: <span className="text-slate-300">{log.target_table}</span>
                    </div>
                    <div className="text-slate-400">
                      שורות: <span className="text-emerald-400">{log.rows_imported}</span>
                      {log.rows_failed > 0 && (
                        <span className="text-red-400"> / {log.rows_failed} נכשלו</span>
                      )}
                      <span className="text-slate-500"> מתוך {log.rows_total}</span>
                    </div>
                    <div className="text-slate-400">
                      זמן: <span className="text-slate-300">{formatDuration(log.duration_ms)}</span>
                    </div>
                  </div>

                  {/* Error message */}
                  {log.error_message && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                      {log.error_message}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
