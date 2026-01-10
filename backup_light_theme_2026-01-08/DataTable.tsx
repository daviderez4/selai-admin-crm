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

// Light theme status colors
const statusColors: Record<string, string> = {
  'פעיל': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'בטיפול': 'bg-amber-100 text-amber-700 border-amber-200',
  'הושלם': 'bg-blue-100 text-blue-700 border-blue-200',
  'הצלחה': 'bg-green-100 text-green-700 border-green-200',
  'בוטל': 'bg-red-100 text-red-700 border-red-200',
  'רג\'קט': 'bg-red-100 text-red-700 border-red-200',
  'ממתין': 'bg-purple-100 text-purple-700 border-purple-200',
  'תהליך בסנכרון': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'ניוד': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'חדש': 'bg-green-100 text-green-700 border-green-200',
  'שינוי': 'bg-orange-100 text-orange-700 border-orange-200',
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

  // Format cell value - light theme
  const formatCell = (column: ColumnConfig, value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-400">-</span>;
    }

    switch (column.type) {
      case 'status':
        const statusClass = statusColors[String(value)] || 'bg-slate-100 text-slate-600 border-slate-200';
        return (
          <Badge className={cn('border text-xs font-normal', statusClass)}>
            {String(value)}
          </Badge>
        );

      case 'currency':
        const num = Number(value);
        if (isNaN(num)) return <span className="text-slate-400">-</span>;
        // Red for negative values
        const isNegative = num < 0;
        return (
          <span className={cn(
            'font-mono tabular-nums font-medium',
            isNegative ? 'text-red-600 font-semibold' : 'text-slate-800'
          )}>
            {new Intl.NumberFormat('he-IL', {
              style: 'currency',
              currency: 'ILS',
              maximumFractionDigits: 0,
            }).format(num)}
          </span>
        );

      case 'number':
        const numVal = Number(value);
        const isNeg = numVal < 0;
        return (
          <span className={cn(
            'font-mono tabular-nums font-medium',
            isNeg ? 'text-red-600 font-semibold' : 'text-slate-800'
          )}>
            {numVal.toLocaleString('he-IL')}
          </span>
        );

      case 'date':
        try {
          return (
            <span className="text-slate-700 font-medium">
              {new Date(String(value)).toLocaleDateString('he-IL')}
            </span>
          );
        } catch {
          return <span className="text-slate-400">-</span>;
        }

      case 'phone':
        const phone = String(value).replace(/\D/g, '');
        const formatted = phone.startsWith('972')
          ? '0' + phone.slice(3)
          : phone;
        return (
          <span className="font-mono text-slate-700 font-medium">
            {formatted.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
          </span>
        );

      default:
        const str = String(value);
        return (
          <span className="text-slate-800 font-medium" title={str.length > 30 ? str : undefined}>
            {str.length > 30 ? str.substring(0, 30) + '...' : str}
          </span>
        );
    }
  };

  // Visible columns for display
  const displayColumns = columns.filter(c => visibleColumns.has(c.key));

  return (
    <div className="flex flex-col gap-4">
      {/* Results count - professional styling */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-slate-500">
          מציג <span className="font-medium text-slate-700">{paginatedData.length.toLocaleString('he-IL')}</span> מתוך{' '}
          <span className="font-medium text-slate-700">{(totalCount ?? processedData.length).toLocaleString('he-IL')}</span> רשומות
        </p>
        {sortKey && (
          <p className="text-xs text-slate-400">
            ממוין לפי: {columns.find(c => c.key === sortKey)?.label} ({sortDirection === 'asc' ? 'עולה' : 'יורד'})
          </p>
        )}
      </div>

      {/* Table - Professional light theme with zebra rows */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[600px] rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {displayColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-right font-bold text-slate-700 border-b border-slate-200 whitespace-nowrap',
                    column.sortable !== false && 'cursor-pointer hover:bg-slate-100 select-none transition-colors'
                  )}
                  style={{ width: column.width, minWidth: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.icon && <span className="text-sm opacity-70">{column.icon}</span>}
                    <span>{column.label}</span>
                    {column.sortable !== false && (
                      <span className={cn(
                        'transition-colors',
                        sortKey === column.key ? 'text-blue-600' : 'text-slate-300'
                      )}>
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-4 w-4" />
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
                  <div className="flex items-center justify-center gap-3 text-slate-500">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span>טוען נתונים...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length} className="text-center py-16 text-slate-500">
                  <div className="text-4xl mb-2">📭</div>
                  לא נמצאו תוצאות
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-slate-100 transition-colors',
                    // Zebra striping
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                    onRowClick && 'cursor-pointer hover:bg-blue-50/50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {displayColumns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3"
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

      {/* Pagination - Professional light theme */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">
            עמוד <span className="font-medium text-slate-700">{currentPage.toLocaleString('he-IL')}</span> מתוך{' '}
            <span className="font-medium text-slate-700">{totalPages.toLocaleString('he-IL')}</span>
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
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
                      'h-8 w-8 p-0 font-medium',
                      currentPage === page
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
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
              className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="border-slate-200 h-8 w-8 p-0 hover:bg-slate-100 disabled:opacity-50"
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
