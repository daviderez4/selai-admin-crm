'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { FileText, User, Database, Clock, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from './DataTable';
import { useAuditStore } from '@/lib/stores/auditStore';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import type { ColumnDef } from '@tanstack/react-table';
import type { AuditLog as AuditLogType } from '@/types';

const actionLabels: Record<string, string> = {
  login: 'התחברות',
  logout: 'התנתקות',
  view_table: 'צפייה בטבלה',
  insert_row: 'הוספת שורה',
  update_row: 'עדכון שורה',
  delete_row: 'מחיקת שורה',
  import_excel: 'ייבוא מאקסל',
  create_project: 'יצירת פרויקט',
  delete_project: 'מחיקת פרויקט',
  enable_2fa: 'הפעלת אימות דו-שלבי',
  disable_2fa: 'ביטול אימות דו-שלבי',
};

const actionColors: Record<string, string> = {
  login: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  logout: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  view_table: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  insert_row: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  update_row: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  delete_row: 'bg-red-500/10 text-red-400 border-red-500/30',
  import_excel: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  create_project: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  delete_project: 'bg-red-500/10 text-red-400 border-red-500/30',
  enable_2fa: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  disable_2fa: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

const columns: ColumnDef<AuditLogType>[] = [
  {
    accessorKey: 'created_at',
    header: 'זמן',
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      return (
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="h-4 w-4" />
          <span className="whitespace-nowrap">
            {format(date, 'dd/MM/yyyy HH:mm', { locale: he })}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'user_email',
    header: 'משתמש',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-slate-500" />
        <span>{row.getValue('user_email') || '-'}</span>
      </div>
    ),
  },
  {
    accessorKey: 'action',
    header: 'פעולה',
    cell: ({ row }) => {
      const action = row.getValue('action') as string;
      const label = actionLabels[action] || action;
      const colorClass = actionColors[action] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      return (
        <Badge variant="outline" className={colorClass}>
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'project_name',
    header: 'פרויקט',
    cell: ({ row }) => {
      const projectName = row.getValue('project_name') as string | undefined;
      if (!projectName) return <span className="text-slate-500">-</span>;
      return (
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-500" />
          <span>{projectName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'details',
    header: 'פרטים',
    cell: ({ row }) => {
      const details = row.getValue('details') as Record<string, unknown> | undefined;
      if (!details) return <span className="text-slate-500">-</span>;
      return (
        <pre className="text-xs text-slate-400 max-w-xs truncate">
          {JSON.stringify(details, null, 0)}
        </pre>
      );
    },
  },
];

export function AuditLog() {
  const { logs, isLoading, pagination, filters, fetchLogs, setFilters, clearFilters } = useAuditStore();
  const { projects } = useProjectsStore();

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePageChange = (page: number) => {
    fetchLogs(page, pagination.pageSize);
  };

  const handlePageSizeChange = (pageSize: number) => {
    fetchLogs(1, pageSize);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">סינון:</span>
        </div>

        <Select
          value={filters.projectId || '__all__'}
          onValueChange={(value) => setFilters({ ...filters, projectId: value === '__all__' ? undefined : value })}
        >
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
            <SelectValue placeholder="כל הפרויקטים" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="__all__" className="text-white focus:bg-slate-700">
              כל הפרויקטים
            </SelectItem>
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                className="text-white focus:bg-slate-700"
              >
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.action || '__all__'}
          onValueChange={(value) => setFilters({ ...filters, action: value === '__all__' ? undefined : value })}
        >
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
            <SelectValue placeholder="כל הפעולות" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="__all__" className="text-white focus:bg-slate-700">
              כל הפעולות
            </SelectItem>
            {Object.entries(actionLabels).map(([value, label]) => (
              <SelectItem
                key={value}
                value={value}
                className="text-white focus:bg-slate-700"
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="מתאריך"
          className="w-40 bg-slate-800 border-slate-700 text-white"
          value={filters.startDate || ''}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
        />

        <Input
          type="date"
          placeholder="עד תאריך"
          className="w-40 bg-slate-800 border-slate-700 text-white"
          value={filters.endDate || ''}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
        />

        {Object.keys(filters).length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300"
            onClick={clearFilters}
          >
            נקה סינון
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
}
