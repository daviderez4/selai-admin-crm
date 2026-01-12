'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Database,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  Download,
  Table2,
  BarChart3,
  Calendar,
  Hash,
  Type,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ColumnInfo {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'unknown';
  sampleValues: unknown[];
  uniqueCount: number;
  nullCount: number;
  total?: number;
}

interface GroupStats {
  name: string;
  count: number;
  [key: string]: unknown;
}

interface DashboardData {
  tableName: string;
  projectName: string;
  storageMode: 'local' | 'external';
  stats: Record<string, unknown>;
  total: number;
  fetchedRecords: number;
  columns: ColumnInfo[];
  numericColumns: string[];
  textColumns: string[];
  groupedData?: GroupStats[];
  filterOptions: Record<string, string[]>;
  importBatches: string[];
  importMonths: string[];
  data: Record<string, unknown>[];
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString('he-IL', { maximumFractionDigits: 2 });
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `${num.toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })}`;
}

export default function SmartDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<'summary' | 'table' | 'grouped'>('summary');

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (selectedMonth !== 'all') searchParams.append('month', selectedMonth);
      if (selectedBatch !== 'all') searchParams.append('batch', selectedBatch);
      if (groupBy) searchParams.append('groupBy', groupBy);
      searchParams.append('mode', viewMode === 'table' ? 'full' : 'summary');

      const response = await fetch(
        `/api/projects/${projectId}/generic-dashboard?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const result: DashboardData = await response.json();
      setDashboardData(result);

      // Initialize visible columns with all columns
      if (result.columns.length > 0 && visibleColumns.size === 0) {
        setVisibleColumns(new Set(result.columns.map(c => c.name)));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedMonth, selectedBatch, groupBy, viewMode, visibleColumns.size]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Export to Excel
  const handleExport = () => {
    if (!dashboardData) return;

    const exportData = dashboardData.data.map(row => {
      const cleanRow: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        if (key !== 'id' && visibleColumns.has(key)) {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${dashboardData.tableName}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('הקובץ יוצא בהצלחה');
  };

  // Toggle column visibility
  const toggleColumn = (columnName: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  // Select/deselect all columns
  const selectAllColumns = (select: boolean) => {
    if (select && dashboardData) {
      setVisibleColumns(new Set(dashboardData.columns.map(c => c.name)));
    } else {
      setVisibleColumns(new Set());
    }
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Filter and sort data
  const filteredData = dashboardData?.data
    .filter(row => {
      if (!searchQuery) return true;
      return Object.values(row).some(val =>
        String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === bVal) return 0;
      const comparison = String(aVal || '').localeCompare(String(bVal || ''), 'he', { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    }) || [];

  // Get visible columns for display
  const displayColumns = dashboardData?.columns.filter(c => visibleColumns.has(c.name)) || [];

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="mr-3 text-lg">טוען נתונים...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">שגיאה בטעינת הנתונים</h3>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
              <Button onClick={fetchData} className="mt-4" variant="outline">
                <RefreshCw className="h-4 w-4 ml-2" />
                נסה שוב
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" dir="rtl">
      <Header />

      <main className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-500" />
              דשבורד חכם - {dashboardData?.projectName || 'טוען...'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              טבלה: {dashboardData?.tableName} | מצב: {dashboardData?.storageMode === 'local' ? 'מקומי' : 'חיצוני'} |
              סה"כ רשומות: {formatNumber(dashboardData?.total)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={fetchData} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              רענן
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 ml-2" />
              ייצא לאקסל
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {dashboardData?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">סה"כ רשומות</p>
                    <p className="text-2xl font-bold">{formatNumber(dashboardData.total)}</p>
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            {/* Show numeric column totals */}
            {dashboardData.numericColumns.slice(0, 3).map(col => {
              const total = dashboardData.stats[`total_${col}`];
              if (!total) return null;
              return (
                <Card key={col}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 truncate">{col}</p>
                        <p className="text-xl font-bold">{formatCurrency(total)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Filters Row */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="חיפוש בכל העמודות..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* Month Filter */}
              {dashboardData?.importMonths && dashboardData.importMonths.length > 0 && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="h-4 w-4 ml-2 text-slate-400" />
                    <SelectValue placeholder="חודש" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל החודשים</SelectItem>
                    {dashboardData.importMonths.map(m => (
                      <SelectItem key={m} value={m || 'unknown'}>{m || 'לא ידוע'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Batch Filter */}
              {dashboardData?.importBatches && dashboardData.importBatches.length > 1 && (
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="w-[160px]">
                    <Hash className="h-4 w-4 ml-2 text-slate-400" />
                    <SelectValue placeholder="יבוא" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל היבואים</SelectItem>
                    {dashboardData.importBatches.map(b => (
                      <SelectItem key={b} value={b}>{b.slice(0, 20)}...</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Group By */}
              {dashboardData?.textColumns && dashboardData.textColumns.length > 0 && (
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-[160px]">
                    <BarChart3 className="h-4 w-4 ml-2 text-slate-400" />
                    <SelectValue placeholder="קבץ לפי" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ללא קיבוץ</SelectItem>
                    {dashboardData.textColumns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* View Mode */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'summary' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('summary')}
                >
                  סיכום
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="h-4 w-4 ml-1" />
                  טבלה
                </Button>
              </div>

              {/* Column Selector Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
              >
                {showColumnSelector ? <EyeOff className="h-4 w-4 ml-1" /> : <Eye className="h-4 w-4 ml-1" />}
                עמודות ({visibleColumns.size})
              </Button>
            </div>

            {/* Column Selector */}
            {showColumnSelector && dashboardData?.columns && (
              <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">בחר עמודות להצגה:</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => selectAllColumns(true)}>
                      בחר הכל
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => selectAllColumns(false)}>
                      נקה הכל
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
                  {dashboardData.columns.map(col => (
                    <label
                      key={col.name}
                      className="flex items-center gap-2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={visibleColumns.has(col.name)}
                        onCheckedChange={() => toggleColumn(col.name)}
                      />
                      <span className="text-sm truncate" title={col.name}>
                        {col.type === 'number' && <Hash className="inline h-3 w-3 ml-1 text-green-500" />}
                        {col.type === 'text' && <Type className="inline h-3 w-3 ml-1 text-blue-500" />}
                        {col.type === 'date' && <Calendar className="inline h-3 w-3 ml-1 text-purple-500" />}
                        {col.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grouped Data */}
        {groupBy && dashboardData?.groupedData && dashboardData.groupedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                קיבוץ לפי: {groupBy}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{groupBy}</TableHead>
                      <TableHead className="text-right">כמות</TableHead>
                      {dashboardData.numericColumns.slice(0, 5).map(col => (
                        <TableHead key={col} className="text-right">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.groupedData.slice(0, 20).map((group, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{formatNumber(group.count)}</TableCell>
                        {dashboardData.numericColumns.slice(0, 5).map(col => (
                          <TableCell key={col}>
                            {formatCurrency(group[`total_${col}`])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-blue-500" />
                נתונים ({formatNumber(filteredData.length)} מתוך {formatNumber(dashboardData?.total)})
              </span>
              <Badge variant="outline">
                {displayColumns.length} עמודות מוצגות
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {displayColumns.map(col => (
                      <TableHead
                        key={col.name}
                        className="text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => handleSort(col.name)}
                      >
                        <div className="flex items-center gap-1">
                          {col.name}
                          {sortColumn === col.name && (
                            sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.slice(0, 100).map((row, idx) => (
                    <TableRow key={row.id as string || idx}>
                      <TableCell className="text-slate-400">{idx + 1}</TableCell>
                      {displayColumns.map(col => (
                        <TableCell key={col.name}>
                          {col.type === 'number'
                            ? formatNumber(row[col.name])
                            : col.type === 'date'
                              ? String(row[col.name] || '-').split('T')[0]
                              : String(row[col.name] || '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredData.length > 100 && (
              <div className="mt-4 text-center text-slate-500">
                מציג 100 רשומות ראשונות מתוך {formatNumber(filteredData.length)}. ייצא לאקסל לצפייה בכל הנתונים.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column Info */}
        {viewMode === 'summary' && dashboardData?.columns && (
          <Card>
            <CardHeader>
              <CardTitle>מידע על העמודות ({dashboardData.columns.length} עמודות)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardData.columns.map(col => (
                  <div
                    key={col.name}
                    className="p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate" title={col.name}>{col.name}</span>
                      <Badge variant={col.type === 'number' ? 'default' : 'secondary'}>
                        {col.type === 'number' ? 'מספר' : col.type === 'date' ? 'תאריך' : 'טקסט'}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500 mt-1 space-y-1">
                      <div>ערכים ייחודיים: {formatNumber(col.uniqueCount)}</div>
                      {col.type === 'number' && col.total && (
                        <div className="text-green-600">סה"כ: {formatCurrency(col.total)}</div>
                      )}
                      {col.sampleValues.length > 0 && (
                        <div className="text-xs truncate" title={col.sampleValues.join(', ')}>
                          דוגמאות: {col.sampleValues.slice(0, 3).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
