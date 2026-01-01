'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Database,
  RefreshCw,
  FileSpreadsheet,
  Users,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  Columns3,
  Download,
  X,
  Check,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { DataTable, ColumnConfig } from '@/components/dashboard/DataTable';
import { FilterSidebar, DynamicFilterValues } from '@/components/dashboard/FilterSidebar';
import { QuickViews } from '@/components/dashboard/QuickViews';
import { RecordDetails } from '@/components/dashboard/RecordDetails';
import { DrillDownModal } from '@/components/dashboard/DrillDownModal';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// Column configuration for master_data
const COLUMNS: ColumnConfig[] = [
  { key: 'מספר_תהליך', label: 'מספר תהליך', icon: '🔢', type: 'text', width: '100px', sortable: true },
  { key: 'סוג_תהליך', label: 'סוג תהליך', icon: '📁', type: 'status', width: '130px', sortable: true },
  { key: 'סטטוס', label: 'סטטוס', icon: '📋', type: 'status', width: '100px', sortable: true },
  { key: 'מטפל', label: 'מטפל', icon: '👤', type: 'text', width: '120px', sortable: true },
  { key: 'לקוח', label: 'לקוח', icon: '👥', type: 'text', width: '140px', sortable: true },
  { key: 'מזהה_לקוח', label: 'ת.ז.', icon: '🪪', type: 'text', width: '100px', sortable: true },
  { key: 'סלולרי_לקוח', label: 'טלפון', icon: '📱', type: 'phone', width: '120px', sortable: false },
  { key: 'סוג_מוצר_קיים', label: 'מוצר קיים', icon: '📦', type: 'text', width: '120px', sortable: true },
  { key: 'יצרן_קיים', label: 'יצרן קיים', icon: '🏭', type: 'text', width: '120px', sortable: true },
  { key: 'מספר_חשבון_פוליסה_קיים', label: 'מספר פוליסה', icon: '📄', type: 'text', width: '120px', sortable: true },
  { key: 'סהכ_צבירה_צפויה_מניוד', label: 'צבירה צפויה', icon: '💰', type: 'currency', width: '120px', sortable: true },
  { key: 'סוג_מוצר_חדש', label: 'מוצר חדש', icon: '🆕', type: 'text', width: '120px', sortable: true },
  { key: 'יצרן_חדש', label: 'יצרן חדש', icon: '🏢', type: 'text', width: '110px', sortable: true },
  { key: 'מספר_חשבון_פוליסה_חדש', label: 'מספר חדש', icon: '🔖', type: 'text', width: '110px', sortable: true },
  { key: 'תאריך_פתיחת_תהליך', label: 'תאריך פתיחה', icon: '📅', type: 'date', width: '110px', sortable: true },
  { key: 'תאריך_העברת_מסמכים_ליצרן', label: 'תאריך העברה', icon: '📤', type: 'date', width: '110px', sortable: true },
  { key: 'פרמיה_צפויה', label: 'פרמיה צפויה', icon: '💵', type: 'currency', width: '110px', sortable: true },
  { key: 'מספר_סוכן_רשום', label: 'מס\' סוכן', icon: '🔢', type: 'text', width: '90px', sortable: true },
  { key: 'מפקח', label: 'מפקח', icon: '👨‍💼', type: 'text', width: '120px', sortable: true },
];

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS = new Set([
  'מספר_תהליך',
  'סוג_תהליך',
  'סטטוס',
  'מטפל',
  'לקוח',
  'סהכ_צבירה_צפויה_מניוד',
  'יצרן_חדש',
  'תאריך_פתיחת_תהליך',
  'פרמיה_צפויה',
]);

// Initial filter state - empty for dynamic filters
const INITIAL_FILTERS: DynamicFilterValues = {};

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byProcessType: Record<string, number>;
  totalAccumulation: number;
  totalPremium: number;
  uniqueHandlers: number;
  uniqueSupervisors: number;
}

export default function DataPage() {
  const params = useParams();
  const projectId = params.id as string;

  // Project info
  const [projectInfo, setProjectInfo] = useState<{ name: string; table_name: string } | null>(null);

  // Data state
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dynamic columns extracted from raw_data
  const [dynamicColumns, setDynamicColumns] = useState<ColumnConfig[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(DEFAULT_VISIBLE_COLUMNS);
  const [filters, setFilters] = useState<DynamicFilterValues>(INITIAL_FILTERS);
  const [activeQuickView, setActiveQuickView] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drillDownType, setDrillDownType] = useState<'accumulation' | 'handlers' | 'supervisors' | 'records' | null>(null);
  const [drillDownOpen, setDrillDownOpen] = useState(false);

  // Fetch project info
  useEffect(() => {
    const fetchProjectInfo = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const result = await response.json();
          setProjectInfo({
            name: result.project?.name || 'פרויקט',
            table_name: result.project?.table_name || 'master_data',
          });
        }
      } catch (err) {
        console.error('Failed to fetch project info:', err);
      }
    };
    fetchProjectInfo();
  }, [projectId]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/master-data`);

      // Check content type to avoid parsing HTML as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('שגיאת שרת - התשובה אינה בפורמט תקין');
      }

      const result = await response.json();

      if (!response.ok) {
        // Handle error with details if available
        const errorMsg = result.details
          ? `${result.error}\n${result.details}`
          : result.error || 'Failed to fetch data';
        throw new Error(errorMsg);
      }

      const fetchedData = result.data || [];
      const tableName = result.tableName || 'master_data';

      setData(fetchedData);
      setStats(result.stats);

      // Update project info from API response
      setProjectInfo(prev => ({
        name: prev?.name || 'פרויקט',
        table_name: tableName,
      }));

      // Extract dynamic columns from data
      // Works for ALL tables - master_data, insurance_data, etc.
      if (fetchedData.length > 0) {
        const firstRow = fetchedData[0];

        // Meta columns to exclude from display
        const metaColumns = ['id', 'raw_data', 'created_at', 'updated_at', 'import_batch',
          'import_date', 'import_month', 'import_year', 'project_id', 'total_expected_accumulation'];

        // Check if data has old array format (raw_data as array) or new object format
        if (firstRow.raw_data && Array.isArray(firstRow.raw_data)) {
          // Old format - raw_data is an array, create col_X columns
          const rawColumns: ColumnConfig[] = firstRow.raw_data.map((_: unknown, index: number) => ({
            key: `col_${index}`,
            label: `עמודה ${index + 1}`,
            icon: '📄',
            type: 'text' as const,
            width: '120px',
            sortable: true,
          }));
          setDynamicColumns(rawColumns);
        } else {
          // New format - Hebrew column names are directly on the row
          // Extract all column keys except meta columns
          const columnKeys = Object.keys(firstRow).filter(key => !metaColumns.includes(key));
          const dynamicCols: ColumnConfig[] = columnKeys.map(key => ({
            key,
            label: key.replace(/_/g, ' '), // Replace underscores with spaces for display
            icon: '📄',
            type: 'text' as const,
            width: '120px',
            sortable: true,
          }));
          setDynamicColumns(dynamicCols);
        }
      } else {
        setDynamicColumns([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה בטעינת הנתונים';
      // Make sure error message doesn't contain HTML
      const safeMessage = message.includes('<!DOCTYPE') || message.includes('<html')
        ? 'שגיאת חיבור למסד הנתונים - פרטי ההתחברות לא תקינים'
        : message;
      setError(safeMessage);
      toast.error(safeMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Determine which columns to use - dynamic columns for all tables!
  const activeColumns = useMemo(() => {
    // If we have dynamic columns extracted from data, use them
    if (dynamicColumns.length > 0) {
      return dynamicColumns;
    }
    // Fallback to predefined COLUMNS for old master_data format
    return COLUMNS;
  }, [dynamicColumns]);

  // Transform data for display - handle old array format only
  const displayData = useMemo(() => {
    // Check if data has old array format that needs transformation
    if (data.length > 0 && data[0].raw_data && Array.isArray(data[0].raw_data)) {
      // Old format - transform raw_data array to col_X keys
      return data.map(row => {
        const rawData = row.raw_data as unknown[];
        if (!rawData || !Array.isArray(rawData)) return row;

        const transformedRow: Record<string, unknown> = {
          id: row.id,
          import_month: row.import_month,
          import_year: row.import_year,
          import_batch: row.import_batch,
          import_date: row.import_date,
          created_at: row.created_at,
        };
        rawData.forEach((value, index) => {
          transformedRow[`col_${index}`] = value;
        });
        return transformedRow;
      });
    }

    // New format - data already has Hebrew column names, use as-is
    return data;
  }, [data]);

  // Quick views configuration - use stats.total for accurate count from DB
  const quickViews = useMemo(() => {
    const activeCount = data.filter(r => r.סטטוס === 'פעיל' || r.סטטוס === 'בטיפול').length;
    const pendingCount = data.filter(r => r.סטטוס === 'ממתין').length;
    const highValueCount = data.filter(r => Number(r.סהכ_צבירה_צפויה_מניוד) > 100000).length;

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekCount = data.filter(r => {
      const date = r.תאריך_פתיחת_תהליך ? new Date(String(r.תאריך_פתיחת_תהליך)) : null;
      return date && date >= weekAgo;
    }).length;

    // Use stats.total for the "all" count - it comes from DB count: 'exact'
    const totalCount = stats?.total ?? data.length;

    return [
      { id: 'all', label: 'הכל', icon: '📊', count: totalCount },
      { id: 'active', label: 'פעילים', icon: '🟢', count: activeCount },
      { id: 'pending', label: 'ממתינים', icon: '⏳', count: pendingCount },
      { id: 'highValue', label: 'צבירה גבוהה', icon: '💎', count: highValueCount },
      { id: 'thisWeek', label: 'השבוע', icon: '📅', count: thisWeekCount },
    ];
  }, [data, stats]);

  // Apply filters and search
  const filteredData = useMemo(() => {
    let result = [...displayData];

    // Quick view filter
    if (activeQuickView !== 'all') {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      switch (activeQuickView) {
        case 'active':
          result = result.filter(r => r.סטטוס === 'פעיל' || r.סטטוס === 'בטיפול');
          break;
        case 'pending':
          result = result.filter(r => r.סטטוס === 'ממתין');
          break;
        case 'highValue':
          result = result.filter(r => Number(r.סהכ_צבירה_צפויה_מניוד) > 100000);
          break;
        case 'thisWeek':
          result = result.filter(r => {
            const date = r.תאריך_פתיחת_תהליך ? new Date(String(r.תאריך_פתיחת_תהליך)) : null;
            return date && date >= weekAgo;
          });
          break;
      }
    }

    // Dynamic sidebar filters - apply all active filters
    Object.entries(filters).forEach(([columnName, filterValue]) => {
      if (filterValue === null || filterValue === '' || filterValue === undefined) return;

      // Special handling for import_month and import_year (numeric comparison)
      if (columnName === 'import_month' || columnName === 'import_year') {
        const numValue = Number(filterValue);
        result = result.filter(r => Number(r[columnName]) === numValue);
      } else {
        // String comparison for other columns
        result = result.filter(r => String(r[columnName]) === String(filterValue));
      }
    });

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(row => {
        return Object.values(row).some(value =>
          value && String(value).toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [displayData, filters, searchQuery, activeQuickView]);

  // Active filters count - count non-null/empty values
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== null && v !== '' && v !== undefined).length;
  }, [filters]);

  // Column toggle handler
  const handleColumnToggle = (key: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Update visible columns when active columns change
  useEffect(() => {
    if (projectInfo?.table_name !== 'master_data' && dynamicColumns.length > 0) {
      // For dynamic tables, show all columns by default (up to 50)
      setVisibleColumns(new Set(dynamicColumns.slice(0, 50).map(c => c.key)));
    }
  }, [projectInfo?.table_name, dynamicColumns]);

  // Row click handler
  const handleRowClick = (row: Record<string, unknown>) => {
    setSelectedRecord(row);
    setDetailsOpen(true);
  };

  // Drill-down handler
  const openDrillDown = (type: 'accumulation' | 'handlers' | 'supervisors' | 'records') => {
    setDrillDownType(type);
    setDrillDownOpen(true);
  };

  // Export handler
  const handleExport = useCallback((format: 'csv' | 'excel') => {
    if (filteredData.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    try {
      const visibleKeys = activeColumns.filter(c => visibleColumns.has(c.key)).map(c => c.key);
      const exportData = filteredData.map(row => {
        const exportRow: Record<string, unknown> = {};
        visibleKeys.forEach(key => {
          const column = activeColumns.find(c => c.key === key);
          exportRow[column?.label || key] = row[key];
        });
        return exportRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'נתונים');

      worksheet['!dir'] = 'rtl';

      const maxWidths = activeColumns.filter(c => visibleColumns.has(c.key)).map((col) => {
        const values = exportData.map(row => String(row[col.label] || ''));
        const maxLength = Math.max(col.label.length, ...values.map(v => v.length));
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!cols'] = maxWidths;

      const tableName = projectInfo?.table_name || 'data';
      const fileName = `${tableName}_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' });
      }

      toast.success(`הקובץ יוצא בהצלחה (${filteredData.length.toLocaleString('he-IL')} רשומות)`);
    } catch {
      toast.error('שגיאה בייצוא הקובץ');
    }
  }, [filteredData, visibleColumns, activeColumns, projectInfo?.table_name]);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="תצוגת נתונים"
        subtitle={projectInfo?.table_name || 'טוען...'}
      />

      <div className="flex-1 p-6 overflow-auto space-y-6" dir="rtl">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Records */}
            <Card
              className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group cursor-pointer"
              onClick={() => openDrillDown('records')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500/30 to-blue-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Database className="h-7 w-7 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">סה״כ רשומות</p>
                    <p className="text-3xl font-bold text-white">
                      {stats.total.toLocaleString('he-IL')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Accumulation */}
            <Card
              className="bg-gradient-to-br from-emerald-900/50 to-slate-900 border-emerald-700/50 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 group cursor-pointer"
              onClick={() => openDrillDown('accumulation')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">צבירה צפויה</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {stats.totalAccumulation.toLocaleString('he-IL', {
                        style: 'currency',
                        currency: 'ILS',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Premium */}
            <Card
              className="bg-gradient-to-br from-cyan-900/50 to-slate-900 border-cyan-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group cursor-pointer"
              onClick={() => openDrillDown('accumulation')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileSpreadsheet className="h-7 w-7 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">פרמיה צפויה</p>
                    <p className="text-2xl font-bold text-cyan-400">
                      {stats.totalPremium.toLocaleString('he-IL', {
                        style: 'currency',
                        currency: 'ILS',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unique Handlers */}
            <Card
              className="bg-gradient-to-br from-purple-900/50 to-slate-900 border-purple-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 group cursor-pointer"
              onClick={() => openDrillDown('handlers')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500/30 to-purple-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-7 w-7 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">מטפלים</p>
                    <p className="text-3xl font-bold text-white">
                      {stats.uniqueHandlers.toLocaleString('he-IL')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unique Supervisors */}
            <Card
              className="bg-gradient-to-br from-amber-900/50 to-slate-900 border-amber-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 group cursor-pointer"
              onClick={() => openDrillDown('supervisors')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500/30 to-amber-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-7 w-7 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">מפקחים</p>
                    <p className="text-3xl font-bold text-white">
                      {stats.uniqueSupervisors.toLocaleString('he-IL')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Views */}
        <QuickViews
          views={quickViews}
          activeView={activeQuickView}
          onViewChange={setActiveQuickView}
        />

        {/* Search and Actions Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="חיפוש חופשי..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <Button
            variant="outline"
            onClick={() => setFilterSidebarOpen(true)}
            className={cn(
              'border-slate-700 text-slate-300 hover:bg-slate-800',
              activeFiltersCount > 0 && 'border-emerald-500/50 text-emerald-400'
            )}
          >
            <Filter className="h-4 w-4 ml-2" />
            פילטרים
            {activeFiltersCount > 0 && (
              <span className="mr-2 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Columns Button */}
          <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Columns3 className="h-4 w-4 ml-2" />
                עמודות
                <span className="mr-2 text-xs text-slate-500">
                  ({visibleColumns.size}/{activeColumns.length})
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-slate-800 border-slate-700 w-64 max-h-80 overflow-y-auto"
            >
              <div className="p-2 border-b border-slate-700 flex items-center justify-between">
                <span className="text-slate-300 text-sm font-medium">בחר עמודות</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleColumns(new Set(activeColumns.map(c => c.key)))}
                    className="h-7 text-xs text-slate-400 hover:text-white"
                  >
                    הכל
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleColumns(projectInfo?.table_name === 'master_data' ? DEFAULT_VISIBLE_COLUMNS : new Set(activeColumns.slice(0, 50).map(c => c.key)))}
                    className="h-7 text-xs text-slate-400 hover:text-white"
                  >
                    ברירת מחדל
                  </Button>
                </div>
              </div>
              {activeColumns.map(column => (
                <DropdownMenuItem
                  key={column.key}
                  onClick={(e) => {
                    e.preventDefault();
                    handleColumnToggle(column.key);
                  }}
                  className="flex items-center gap-2 text-slate-300 cursor-pointer"
                >
                  <Checkbox
                    checked={visibleColumns.has(column.key)}
                    className="border-slate-600 data-[state=checked]:bg-emerald-500"
                  />
                  <span className="text-sm">{column.icon}</span>
                  <span>{column.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Download className="h-4 w-4 ml-2" />
                ייצוא
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                className="text-slate-300 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 ml-2 text-emerald-400" />
                ייצוא ל-Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                className="text-slate-300 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 ml-2 text-blue-400" />
                ייצוא ל-CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={loading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium">שגיאה בטעינת הנתונים</p>
                  <p className="text-red-400/70 text-sm">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  className="mr-auto border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  נסה שוב
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <DataTable
          data={filteredData}
          columns={activeColumns}
          loading={loading}
          pageSize={50}
          onRowClick={handleRowClick}
          visibleColumns={visibleColumns}
          totalCount={stats?.total}
        />
      </div>

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={filterSidebarOpen}
        onClose={() => setFilterSidebarOpen(false)}
        data={displayData}
        filters={filters}
        onApply={setFilters}
      />

      {/* Record Details Panel */}
      <RecordDetails
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        record={selectedRecord}
        tableName={projectInfo?.table_name}
      />

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        type={drillDownType}
        projectId={projectId}
      />
    </div>
  );
}
