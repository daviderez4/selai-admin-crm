'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ColumnConfig {
  key: string;
  label: string;
  icon?: string;
  sortable?: boolean;
  type?: 'text' | 'number' | 'date' | 'status' | 'currency' | 'phone';
  width?: string;
  visible?: boolean;
}

interface DataTableProps {
  data: Record<string, unknown>[];
  columns: ColumnConfig[];
  loading?: boolean;
  pageSize?: number;
  onRowClick?: (row: Record<string, unknown>) => void;
  visibleColumns: Set<string>;
  totalCount?: number; // Total count from DB (for accurate display even with client-side filtering)
}

const statusColors: Record<string, string> = {
  'פעיל': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'בטיפול': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'הושלם': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'הצלחה': 'bg-green-500/20 text-green-400 border-green-500/30',
  'בוטל': 'bg-red-500/20 text-red-400 border-red-500/30',
  'רג\'קט': 'bg-red-500/20 text-red-400 border-red-500/30',
  'ממתין': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'תהליך בסנכרון': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'ניוד': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'חדש': 'bg-green-500/20 text-green-400 border-green-500/30',
  'שינוי': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function DataTable({
  data,
  columns,
  loading = false,
  pageSize = 50,
  onRowClick,
  visibleColumns,
  totalCount,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sort handler
  const handleSort = useCallback((key: string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
  }, [sortKey, sortDirection]);

  // Process and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Handle numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const comparison = String(aVal).localeCompare(String(bVal), 'he', { numeric: true });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Format cell value
  const formatCell = (column: ColumnConfig, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-600">-</span>;
    }

    switch (column.type) {
      case 'status':
        const statusClass = statusColors[String(value)] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        return (
          <Badge className={cn('border text-xs', statusClass)}>
            {String(value)}
          </Badge>
        );

      case 'currency':
        const num = Number(value);
        if (isNaN(num)) return <span className="text-slate-600">-</span>;
        return (
          <span className="font-mono text-emerald-400">
            {new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              maximumFractionDigits: 0,
            }).format(num)}
          </span>
        );

      case 'number':
        return (
          <span className="font-mono text-slate-300">
            {Number(value).toLocaleString('he-IL')}
          </span>
        );

      case 'date':
        try {
          return (
            <span className="text-slate-300">
              {new Date(String(value)).toLocaleDateString('he-IL')}
            </span>
          );
        } catch {
          return <span className="text-slate-600">-</span>;
        }

      case 'phone':
        const phone = String(value).replace(/\D/g, '');
        const formatted = phone.startsWith('972')
          ? '0' + phone.slice(3)
          : phone;
        return (
          <span className="font-mono text-slate-300">
            {formatted.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
          </span>
        );

      default:
        const str = String(value);
        return (
          <span className="text-slate-300" title={str.length > 30 ? str : undefined}>
            {str.length > 30 ? str.substring(0, 30) + '...' : str}
          </span>
        );
    }
  };

  // Visible columns for display
  const displayColumns = columns.filter(c => visibleColumns.has(c.key));

  return (
    <div className="flex flex-col gap-4">
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          מציג {paginatedData.length.toLocaleString('he-IL')} מתוך{' '}
          {(totalCount ?? processedData.length).toLocaleString('he-IL')} רשומות
        </p>
      </div>

      {/* Table - with horizontal scroll */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[600px] rounded-lg border border-slate-700 bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-slate-800/80 sticky top-0 z-10">
            <tr>
              {displayColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 py-3 text-right font-medium text-slate-300 border-b border-slate-700 whitespace-nowrap',
                    column.sortable !== false && 'cursor-pointer hover:bg-slate-700/50 select-none transition-colors'
                  )}
                  style={{ width: column.width, minWidth: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {column.icon && <span className="text-xs">{column.icon}</span>}
                    <span>{column.label}</span>
                    {column.sortable !== false && (
                      <span className="text-slate-500">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={displayColumns.length} className="text-center py-16">
                  <div className="flex items-center justify-center gap-3 text-slate-400">
                    <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
                    <span>טוען נתונים...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length} className="text-center py-16 text-slate-500">
                  לא נמצאו תוצאות
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-slate-800/50 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-slate-800/70'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {displayColumns.map((column) => (
                    <td
                      key={column.key}
                      className="px-3 py-2.5"
                      style={{ maxWidth: column.width }}
                    >
                      {formatCell(column, row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            עמוד {currentPage.toLocaleString('he-IL')} מתוך {totalPages.toLocaleString('he-IL')}
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="border-slate-700 h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              className="border-slate-700 h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'h-8 w-8 p-0',
                      currentPage === page
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'border-slate-700'
                    )}
                  >
                    {page.toLocaleString('he-IL')}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
              className="border-slate-700 h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="border-slate-700 h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
