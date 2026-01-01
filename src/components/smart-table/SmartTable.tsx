'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Settings2,
  GripVertical,
  CheckSquare,
  Square,
  MinusSquare,
  MoreVertical,
  Eye,
  EyeOff,
  Filter,
  Pin,
  Copy,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DynamicFilterBar } from './DynamicFilterBar';
import { FilterPresets } from './FilterPresets';
import { SummaryRow } from './SummaryRow';
import {
  analyzeTable,
  applyFilters,
  sortData,
  getStatusColor,
  type ColumnAnalysis,
  type ActiveFilter,
  type SortDirection,
  type TableAnalysis,
} from '@/lib/utils/columnAnalyzer';
import * as XLSX from 'xlsx';

interface SmartTableProps {
  data: Record<string, unknown>[];
  projectId?: string;
  tableName?: string;
  onRowSelect?: (selectedRows: Record<string, unknown>[]) => void;
  onRowAction?: (action: string, row: Record<string, unknown>) => void;
  className?: string;
  showFilters?: boolean;
  showPresets?: boolean;
  showSummary?: boolean;
  showExport?: boolean;
  pageSize?: number;
}

export function SmartTable({
  data,
  projectId,
  tableName = 'data',
  onRowSelect,
  onRowAction,
  className,
  showFilters = true,
  showPresets = true,
  showSummary = true,
  showExport = true,
  pageSize: initialPageSize = 25,
}: SmartTableProps) {
  // State
  const [analysis, setAnalysis] = useState<TableAnalysis | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [pinnedColumn, setPinnedColumn] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [showSummaryRow, setShowSummaryRow] = useState(false);
  const [summaryType, setSummaryType] = useState<'sum' | 'avg' | 'min' | 'max'>('sum');

  const tableRef = useRef<HTMLDivElement>(null);

  // Analyze table when data changes
  useEffect(() => {
    if (data.length > 0) {
      const result = analyzeTable(data);
      setAnalysis(result);

      // Initialize visible columns (all columns)
      setVisibleColumns(new Set(result.columns.map(c => c.name)));

      // Initialize column order
      setColumnOrder(result.columns.map(c => c.name));
    }
  }, [data]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = applyFilters(data, activeFilters, globalSearch);
    if (sortColumn && sortDirection) {
      result = sortData(result, sortColumn, sortDirection);
    }
    return result;
  }, [data, activeFilters, globalSearch, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeFilters, globalSearch]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle row selection
  const handleSelectRow = (index: number) => {
    const globalIndex = (page - 1) * pageSize + index;
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(globalIndex)) {
        next.delete(globalIndex);
      } else {
        next.add(globalIndex);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(processedData.map((_, i) => i)));
    }
  };

  // Notify parent of selection changes
  useEffect(() => {
    if (onRowSelect) {
      const selected = Array.from(selectedRows).map(i => processedData[i]).filter(Boolean);
      onRowSelect(selected);
    }
  }, [selectedRows, processedData, onRowSelect]);

  // Export to Excel
  const handleExport = useCallback((exportFiltered: boolean) => {
    const exportData = exportFiltered ? processedData : data;
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tableName);

    const fileName = `${tableName}_${exportFiltered ? 'filtered_' : ''}${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [data, processedData, tableName]);

  // Column visibility toggle
  const handleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  // Get ordered and visible columns
  const displayColumns = useMemo(() => {
    return columnOrder.filter(col => visibleColumns.has(col));
  }, [columnOrder, visibleColumns]);

  // Get column analysis for a specific column
  const getColumnAnalysis = useCallback((name: string): ColumnAnalysis | undefined => {
    return analysis?.columns.find(c => c.name === name);
  }, [analysis]);

  // Format cell value
  const formatCell = (value: unknown, column: ColumnAnalysis | undefined) => {
    if (value === null || value === undefined) {
      return <span className="text-slate-500 italic">-</span>;
    }

    // Status column with color coding
    if (column?.isStatusColumn) {
      const color = getStatusColor(String(value));
      const colorClasses = {
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        gray: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      };
      return (
        <Badge variant="outline" className={cn('font-normal', colorClasses[color])}>
          {String(value)}
        </Badge>
      );
    }

    // Number formatting
    if (column?.type === 'number') {
      const num = parseFloat(String(value).replace(/[,₪$€%\s]/g, ''));
      if (!isNaN(num)) {
        return <span className="tabular-nums">{num.toLocaleString('he-IL')}</span>;
      }
    }

    // Date formatting
    if (column?.type === 'date') {
      const date = new Date(String(value));
      if (!isNaN(date.getTime())) {
        return <span>{date.toLocaleDateString('he-IL')}</span>;
      }
    }

    // Boolean formatting
    if (column?.type === 'boolean') {
      const bool = ['true', 'כן', 'yes', '1', 'אמת'].includes(String(value).toLowerCase());
      return (
        <Badge variant="outline" className={bool ? 'text-emerald-400' : 'text-slate-400'}>
          {bool ? 'כן' : 'לא'}
        </Badge>
      );
    }

    // Default string formatting
    const str = String(value);
    if (str.length > 50) {
      return <span title={str}>{str.slice(0, 50)}...</span>;
    }
    return str;
  };

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Bar */}
      {showFilters && (
        <DynamicFilterBar
          columns={analysis.columns}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          totalRows={data.length}
          filteredRows={processedData.length}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Filter Presets */}
          {showPresets && projectId && (
            <FilterPresets
              projectId={projectId}
              tableName={tableName}
              currentFilters={activeFilters}
              globalSearch={globalSearch}
              onLoadPreset={(filters, search) => {
                setActiveFilters(filters);
                setGlobalSearch(search || '');
              }}
            />
          )}

          {/* Selection info */}
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
              {selectedRows.size} נבחרו
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Summary toggle */}
          {showSummary && analysis.numericColumns.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSummaryRow(!showSummaryRow)}
              className={cn(
                'border-slate-700',
                showSummaryRow && 'bg-emerald-500/20 border-emerald-500'
              )}
            >
              <span className="text-xs">Σ סיכום</span>
            </Button>
          )}

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-slate-700">
                <Settings2 className="h-4 w-4 ml-1" />
                עמודות ({visibleColumns.size}/{analysis.columns.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-800 border-slate-700 w-56 max-h-80 overflow-auto"
            >
              <DropdownMenuLabel className="text-slate-400">הצג/הסתר עמודות</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              {analysis.columns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.name}
                  checked={visibleColumns.has(col.name)}
                  onCheckedChange={() => handleColumnVisibility(col.name)}
                  className="text-slate-300"
                >
                  {col.name}
                  <span className="text-xs text-slate-500 mr-auto">
                    {col.type}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          {showExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-slate-700">
                  <Download className="h-4 w-4 ml-1" />
                  ייצוא
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                <DropdownMenuItem onClick={() => handleExport(true)}>
                  ייצא נתונים מסוננים ({processedData.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(false)}>
                  ייצא הכל ({data.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="border border-slate-700 rounded-lg overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                {/* Selection checkbox */}
                <th className="w-10 p-3 text-center sticky right-0 bg-slate-800 z-10">
                  <Checkbox
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-slate-500"
                  />
                </th>

                {/* Column headers */}
                {displayColumns.map(colName => {
                  const col = getColumnAnalysis(colName);
                  const isSorted = sortColumn === colName;
                  const isPinned = pinnedColumn === colName;

                  return (
                    <th
                      key={colName}
                      className={cn(
                        'p-3 text-right font-medium text-slate-300 whitespace-nowrap',
                        isPinned && 'sticky right-10 bg-slate-800 z-10 border-l border-slate-700'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {/* Sort button */}
                        <button
                          onClick={() => handleSort(colName)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <span>{colName}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </button>

                        {/* Column menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100">
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem onClick={() => setPinnedColumn(isPinned ? null : colName)}>
                              <Pin className="h-3 w-3 ml-2" />
                              {isPinned ? 'בטל הצמדה' : 'הצמד עמודה'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnVisibility(colName)}>
                              <EyeOff className="h-3 w-3 ml-2" />
                              הסתר עמודה
                            </DropdownMenuItem>
                            {col && col.filterType !== 'none' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const exists = activeFilters.some(f => f.column === colName);
                                  if (!exists) {
                                    setActiveFilters([
                                      ...activeFilters,
                                      { column: colName, type: col.filterType, value: undefined },
                                    ]);
                                  }
                                }}
                              >
                                <Filter className="h-3 w-3 ml-2" />
                                הוסף פילטר
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Column type badge */}
                        {col && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({col.uniqueCount})
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Actions column */}
                {onRowAction && (
                  <th className="w-10 p-3 text-center">
                    <span className="sr-only">פעולות</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {paginatedData.map((row, rowIndex) => {
                const globalIndex = (page - 1) * pageSize + rowIndex;
                const isSelected = selectedRows.has(globalIndex);

                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors',
                      isSelected && 'bg-blue-500/10'
                    )}
                  >
                    {/* Selection checkbox */}
                    <td className="p-3 text-center sticky right-0 bg-slate-900 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectRow(rowIndex)}
                        className="border-slate-500"
                      />
                    </td>

                    {/* Data cells */}
                    {displayColumns.map(colName => {
                      const col = getColumnAnalysis(colName);
                      const isPinned = pinnedColumn === colName;

                      return (
                        <td
                          key={colName}
                          className={cn(
                            'p-3 text-slate-300',
                            isPinned && 'sticky right-10 bg-slate-900 z-10 border-l border-slate-700'
                          )}
                        >
                          {formatCell(row[colName], col)}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    {onRowAction && (
                      <td className="p-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem onClick={() => onRowAction('view', row)}>
                              <Eye className="h-3 w-3 ml-2" />
                              צפה
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRowAction('copy', row)}>
                              <Copy className="h-3 w-3 ml-2" />
                              העתק
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                              onClick={() => onRowAction('delete', row)}
                              className="text-red-400"
                            >
                              <Trash2 className="h-3 w-3 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* Empty state */}
              {paginatedData.length === 0 && (
                <tr>
                  <td
                    colSpan={displayColumns.length + 2}
                    className="p-8 text-center text-slate-400"
                  >
                    {data.length === 0 ? 'אין נתונים להצגה' : 'לא נמצאו תוצאות לפילטרים שנבחרו'}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Summary row */}
            {showSummaryRow && analysis.numericColumns.length > 0 && (
              <tfoot>
                <SummaryRow
                  data={processedData}
                  columns={displayColumns}
                  numericColumns={analysis.numericColumns.map(c => c.name)}
                  summaryType={summaryType}
                  onSummaryTypeChange={setSummaryType}
                />
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">שורות בעמוד:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-20 h-8 bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {[10, 25, 50, 100].map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            עמוד {page} מתוך {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="border-slate-700 h-8 w-8 p-0"
            >
              »
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-slate-700 h-8 w-8 p-0"
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="border-slate-700 h-8 w-8 p-0"
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 0}
              className="border-slate-700 h-8 w-8 p-0"
            >
              «
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
