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
  Mail,
  Share2,
  Table2,
  BarChart3,
  Calculator,
  PieChart,
  HelpCircle,
  MessageCircle,
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
import { BulkActionsToolbar } from '@/components/dashboard/BulkActionsToolbar';
import { WhatsAppPreview, useWhatsAppPreview } from '@/components/automation/WhatsAppPreview';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// Message template type
interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  template_text: string;
  placeholders?: string[];
}

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
  { key: 'total_expected_accumulation', label: 'צבירה + הפקדה', icon: '💎', type: 'currency', width: '130px', sortable: true },
  { key: 'סוג_מוצר_חדש', label: 'מוצר חדש', icon: '🆕', type: 'text', width: '120px', sortable: true },
  { key: 'יצרן_חדש', label: 'יצרן חדש', icon: '🏢', type: 'text', width: '110px', sortable: true },
  { key: 'מספר_חשבון_פוליסה_חדש', label: 'מספר חדש', icon: '🔖', type: 'text', width: '110px', sortable: true },
  { key: 'תאריך_פתיחת_תהליך', label: 'תאריך פתיחה', icon: '📅', type: 'date', width: '110px', sortable: true },
  { key: 'תאריך_העברת_מסמכים_ליצרן', label: 'תאריך העברה', icon: '📤', type: 'date', width: '110px', sortable: true },
  { key: 'פרמיה_צפויה', label: 'פרמיה צפויה', icon: '💵', type: 'currency', width: '110px', sortable: true },
  { key: 'מספר_סוכן_רשום', label: 'מס\' סוכן', icon: '🔢', type: 'text', width: '90px', sortable: true },
  { key: 'מפקח', label: 'מפקח', icon: '👨‍💼', type: 'text', width: '120px', sortable: true },
];

// Default visible columns - empty set means "show all" until user customizes
// When this is empty, all columns will be shown
const DEFAULT_VISIBLE_COLUMNS = new Set<string>();

// Fallback for legacy master_data - used only if no dynamic columns
const LEGACY_VISIBLE_COLUMNS = new Set([
  'מספר_תהליך',
  'סוג_תהליך',
  'סטטוס',
  'מטפל',
  'לקוח',
  'סהכ_צבירה_צפויה_מניוד',
  'total_expected_accumulation',
  'יצרן_חדש',
  'תאריך_פתיחת_תהליך',
  'פרמיה_צפויה',
]);

// Initial filter state - empty for dynamic filters
const INITIAL_FILTERS: DynamicFilterValues = {};

interface Stats {
  total: number;
  byStatus?: Record<string, number>;
  byProcessType?: Record<string, number>;
  byProvider?: Record<string, number>;
  byBranch?: Record<string, number>;
  totalAccumulation: number;
  totalPremium: number;
  totalCommission?: number;
  uniqueHandlers?: number;
  uniqueSupervisors?: number;
  uniqueAgents?: number;
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
  const [columnPrefsLoaded, setColumnPrefsLoaded] = useState(false);
  const [filters, setFilters] = useState<DynamicFilterValues>(INITIAL_FILTERS);
  const [activeQuickView, setActiveQuickView] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drillDownType, setDrillDownType] = useState<'accumulation' | 'handlers' | 'supervisors' | 'records' | null>(null);
  const [drillDownOpen, setDrillDownOpen] = useState(false);

  // View mode - table or dashboard
  const [viewMode, setViewMode] = useState<'table' | 'dashboard'>('table');

  // Summary columns configuration (columns to sum up)
  const [summaryColumns, setSummaryColumns] = useState<Set<string>>(new Set());
  const [showSummaryConfig, setShowSummaryConfig] = useState(false);

  // Help modal
  const [showHelp, setShowHelp] = useState(false);

  // Selection state for bulk actions
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Message templates
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  // WhatsApp preview hook
  const whatsAppPreview = useWhatsAppPreview();

  // Load column preferences from localStorage
  useEffect(() => {
    const storageKey = `column_prefs_${projectId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColumns(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load column preferences:', e);
    }
    setColumnPrefsLoaded(true);
  }, [projectId]);

  // Save column preferences to localStorage when they change
  useEffect(() => {
    if (!columnPrefsLoaded) return; // Don't save before initial load
    // Only save if user actually customized (not showing all)
    if (visibleColumns.size === 0) return;
    const storageKey = `column_prefs_${projectId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(visibleColumns)));
    } catch (e) {
      console.error('Failed to save column preferences:', e);
    }
  }, [visibleColumns, projectId, columnPrefsLoaded]);

  // When dynamic columns are loaded and no preferences saved, show ALL columns
  useEffect(() => {
    if (!columnPrefsLoaded || dynamicColumns.length === 0) return;

    // Check if user has saved preferences
    const storageKey = `column_prefs_${projectId}`;
    const saved = localStorage.getItem(storageKey);

    // If no saved preferences, set visible columns to ALL dynamic columns
    if (!saved) {
      const allColumnKeys = dynamicColumns.map(c => c.key);
      setVisibleColumns(new Set(allColumnKeys));
    }
  }, [dynamicColumns, columnPrefsLoaded, projectId]);

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

  // Fetch data - using data-stream API for complete dataset (NO 1000 LIMIT!)
  const fetchData = useCallback(async () => {
    console.log('🚀 fetchData: Using data-stream API for project:', projectId);
    setLoading(true);
    setError(null);

    try {
      // Use data-stream API which fetches ALL records in chunks
      const response = await fetch(`/api/projects/${projectId}/data-stream`);

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
      // Works for ALL tables - master_data, insurance_data, views (nifraim, gemel), etc.
      if (fetchedData.length > 0) {
        const firstRow = fetchedData[0];
        const isView = result.isView;
        const viewSchema = result.viewSchema;

        // Meta columns to exclude from display
        const metaColumns = ['id', 'raw_data', 'created_at', 'updated_at', 'import_batch',
          'import_date', 'import_month', 'import_year', 'project_id'];

        // =============================================
        // VIEWS (nifraim, gemel) - direct columns with friendly labels
        // =============================================
        if (isView && viewSchema) {
          console.log('Detected VIEW schema:', tableName, viewSchema.columns);

          // Friendly labels for view columns
          const columnLabels: Record<string, { label: string; icon: string; type: string }> = {
            provider: { label: 'ספק', icon: '🏢', type: 'text' },
            processing_month: { label: 'חודש עיבוד', icon: '📅', type: 'date' },
            branch: { label: 'ענף', icon: '📁', type: 'text' },
            agent_name: { label: 'שם סוכן', icon: '👤', type: 'text' },
            premium: { label: 'פרמיה', icon: '💵', type: 'currency' },
            comission: { label: 'עמלה', icon: '💰', type: 'currency' },
            accumulation_balance: { label: 'צבירה', icon: '💎', type: 'currency' },
          };

          const dynamicCols: ColumnConfig[] = viewSchema.columns.map((key: string) => {
            const config = columnLabels[key] || { label: key, icon: '📄', type: 'text' };
            return {
              key,
              label: config.label,
              icon: config.icon,
              type: config.type as 'text' | 'currency' | 'date' | 'status' | 'phone',
              width: key === 'agent_name' ? '180px' : '130px',
              sortable: true,
            };
          });
          setDynamicColumns(dynamicCols);
        }
        // =============================================
        // LEGACY TABLES - raw_data processing
        // =============================================
        else {
          // Check raw_data format
          const rawData = firstRow.raw_data;
          console.log('raw_data type:', typeof rawData, 'isArray:', Array.isArray(rawData));

          // Helper function to detect column type and icon based on Hebrew column name
          const getColumnConfig = (key: string): { icon: string; type: 'text' | 'currency' | 'date' | 'status' | 'phone'; width: string } => {
            // Agent/Handler fields
            if (/סוכן|מטפל|agent|handler/i.test(key)) {
              return { icon: '👤', type: 'text', width: '140px' };
            }
            // Supervisor fields
            if (/מפקח|supervisor|manager/i.test(key)) {
              return { icon: '👨‍💼', type: 'text', width: '140px' };
            }
            // Accumulation/Financial fields
            if (/צבירה|הפקדה|accumulation|deposit|סכום/i.test(key)) {
              return { icon: '💰', type: 'currency', width: '130px' };
            }
            // Premium fields
            if (/פרמיה|premium/i.test(key)) {
              return { icon: '💵', type: 'currency', width: '120px' };
            }
            // Commission fields
            if (/עמלה|commission/i.test(key)) {
              return { icon: '💎', type: 'currency', width: '120px' };
            }
            // Status fields
            if (/סטטוס|status|מצב/i.test(key)) {
              return { icon: '📋', type: 'status', width: '110px' };
            }
            // Product fields
            if (/מוצר|product|יצרן|producer/i.test(key)) {
              return { icon: '📦', type: 'text', width: '130px' };
            }
            // Date fields
            if (/תאריך|date|תקופה/i.test(key)) {
              return { icon: '📅', type: 'date', width: '110px' };
            }
            // Phone fields
            if (/טלפון|סלולרי|phone|mobile/i.test(key)) {
              return { icon: '📱', type: 'phone', width: '120px' };
            }
            // ID fields
            if (/מספר|מזהה|id|ת\.?ז/i.test(key)) {
              return { icon: '🔢', type: 'text', width: '100px' };
            }
            // Client fields
            if (/לקוח|client|customer/i.test(key)) {
              return { icon: '👥', type: 'text', width: '140px' };
            }
            // Default
            return { icon: '📄', type: 'text', width: '120px' };
          };

          if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            // New format - raw_data is an object with Hebrew column names as keys
            const columnKeys = Object.keys(rawData);
            console.log('Hebrew column keys from raw_data:', columnKeys);

            const dynamicCols: ColumnConfig[] = columnKeys.map(key => {
              const config = getColumnConfig(key);
              return {
                key: `raw_data.${key}`, // Access nested property
                label: key, // Hebrew column name directly
                icon: config.icon,
                type: config.type,
                width: config.width,
                sortable: true,
              };
            });
            setDynamicColumns(dynamicCols);
          } else if (rawData && Array.isArray(rawData)) {
            // Old format - raw_data is an array, create col_X columns
            const rawColumns: ColumnConfig[] = rawData.map((_: unknown, index: number) => ({
              key: `col_${index}`,
              label: `עמודה ${index + 1}`,
              icon: '📄',
              type: 'text' as const,
              width: '120px',
              sortable: true,
            }));
            setDynamicColumns(rawColumns);
          } else {
            // Fallback - data has Hebrew keys directly spread at top level (new master_data format)
            const columnKeys = Object.keys(firstRow).filter(key => !metaColumns.includes(key));
            console.log('Direct Hebrew column keys:', columnKeys);

            const dynamicCols: ColumnConfig[] = columnKeys.map(key => {
              const config = getColumnConfig(key);
              return {
                key,
                label: key.replace(/_/g, ' '),
                icon: config.icon,
                type: config.type,
                width: config.width,
                sortable: true,
              };
            });
            setDynamicColumns(dynamicCols);
          }
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

  // Fetch message templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/message-templates`);
        if (response.ok) {
          const result = await response.json();
          setTemplates(result.templates || []);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, [projectId]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedRows(new Set());
  }, [data]);

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

  // Helper to get value from row - checks both direct fields and raw_data
  const getRowValue = useCallback((row: Record<string, unknown>, fieldNames: string[]): unknown => {
    for (const field of fieldNames) {
      // Try direct field
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        return row[field];
      }
      // Try raw_data
      const rawData = row.raw_data as Record<string, unknown> | undefined;
      if (rawData && typeof rawData === 'object') {
        if (rawData[field] !== undefined && rawData[field] !== null && rawData[field] !== '') {
          return rawData[field];
        }
        // Try partial match
        for (const key of Object.keys(rawData)) {
          if (key.includes(field) || field.includes(key)) {
            if (rawData[key] !== undefined && rawData[key] !== null && rawData[key] !== '') {
              return rawData[key];
            }
          }
        }
      }
    }
    return null;
  }, []);

  // Quick views configuration - use stats.total for accurate count from DB
  const quickViews = useMemo(() => {
    const statusFields = ['סטטוס', 'סטטוס תהליך', 'status'];
    const accumulationFields = ['סהכ_צבירה_צפויה_מניוד', 'total_expected_accumulation', 'צבירה צפויה', 'סכום צבירה'];
    const dateFields = ['תאריך_פתיחת_תהליך', 'תאריך פתיחת תהליך', 'תאריך פתיחה', 'created_at'];

    const activeCount = data.filter(r => {
      const status = String(getRowValue(r, statusFields) || '').toLowerCase();
      return status.includes('פעיל') || status.includes('בטיפול') || status.includes('active');
    }).length;

    const pendingCount = data.filter(r => {
      const status = String(getRowValue(r, statusFields) || '').toLowerCase();
      return status.includes('ממתין') || status.includes('pending') || status.includes('המתנה');
    }).length;

    const highValueCount = data.filter(r => {
      const value = getRowValue(r, accumulationFields);
      const num = typeof value === 'number' ? value : parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
      return !isNaN(num) && num > 100000;
    }).length;

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekCount = data.filter(r => {
      const dateVal = getRowValue(r, dateFields);
      if (!dateVal) return false;
      const date = new Date(String(dateVal));
      return !isNaN(date.getTime()) && date >= weekAgo;
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
  }, [data, stats, getRowValue]);

  // Apply filters and search
  const filteredData = useMemo(() => {
    let result = [...displayData];

    // Field name variations for filtering
    const statusFields = ['סטטוס', 'סטטוס תהליך', 'status'];
    const accumulationFields = ['סהכ_צבירה_צפויה_מניוד', 'total_expected_accumulation', 'צבירה צפויה', 'סכום צבירה'];
    const dateFields = ['תאריך_פתיחת_תהליך', 'תאריך פתיחת תהליך', 'תאריך פתיחה', 'created_at'];

    // Quick view filter
    if (activeQuickView !== 'all') {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      switch (activeQuickView) {
        case 'active':
          result = result.filter(r => {
            const status = String(getRowValue(r, statusFields) || '').toLowerCase();
            return status.includes('פעיל') || status.includes('בטיפול') || status.includes('active');
          });
          break;
        case 'pending':
          result = result.filter(r => {
            const status = String(getRowValue(r, statusFields) || '').toLowerCase();
            return status.includes('ממתין') || status.includes('pending') || status.includes('המתנה');
          });
          break;
        case 'highValue':
          result = result.filter(r => {
            const value = getRowValue(r, accumulationFields);
            const num = typeof value === 'number' ? value : parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
            return !isNaN(num) && num > 100000;
          });
          break;
        case 'thisWeek':
          result = result.filter(r => {
            const dateVal = getRowValue(r, dateFields);
            if (!dateVal) return false;
            const date = new Date(String(dateVal));
            return !isNaN(date.getTime()) && date >= weekAgo;
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
        // String comparison for other columns - handle null/undefined values
        const filterStr = String(filterValue).toLowerCase().trim();
        result = result.filter(r => {
          const rowValue = r[columnName];
          // Skip rows with null/undefined values
          if (rowValue === null || rowValue === undefined) return false;
          // Case-insensitive comparison with trimming
          return String(rowValue).toLowerCase().trim() === filterStr;
        });
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
  }, [displayData, filters, searchQuery, activeQuickView, getRowValue]);

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

  // Export schema/structure handler (without actual data)
  const handleExportSchema = useCallback(() => {
    if (activeColumns.length === 0) {
      toast.error('אין שדות לייצוא');
      return;
    }

    try {
      // Create schema data - export field information without actual data
      const schemaData = activeColumns.map((col, index) => ({
        'מספר': index + 1,
        'מזהה שדה': col.key,
        'שם שדה': col.label,
        'סוג': col.type || 'text',
        'רוחב': col.width || 'auto',
        'ניתן למיון': col.sortable !== false ? 'כן' : 'לא',
        'גלוי': visibleColumns.has(col.key) ? 'כן' : 'לא',
      }));

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Project Info
      const projectInfoData = [
        { 'מאפיין': 'שם הפרויקט', 'ערך': projectInfo?.name || '-' },
        { 'מאפיין': 'שם הטבלה', 'ערך': projectInfo?.table_name || '-' },
        { 'מאפיין': 'תיאור', 'ערך': projectInfo?.description || '-' },
        { 'מאפיין': 'סה"כ שדות', 'ערך': activeColumns.length.toString() },
        { 'מאפיין': 'סה"כ רשומות', 'ערך': filteredData.length.toLocaleString('he-IL') },
        { 'מאפיין': 'תאריך יצוא', 'ערך': new Date().toLocaleDateString('he-IL') },
        { 'מאפיין': 'שעת יצוא', 'ערך': new Date().toLocaleTimeString('he-IL') },
      ];
      const infoSheet = XLSX.utils.json_to_sheet(projectInfoData);
      infoSheet['!dir'] = 'rtl';
      infoSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'פרטי פרויקט');

      // Sheet 2: Schema/Fields
      const schemaSheet = XLSX.utils.json_to_sheet(schemaData);
      schemaSheet['!dir'] = 'rtl';
      schemaSheet['!cols'] = [
        { wch: 8 },   // מספר
        { wch: 25 },  // מזהה שדה
        { wch: 30 },  // שם שדה
        { wch: 12 },  // סוג
        { wch: 10 },  // רוחב
        { wch: 12 },  // ניתן למיון
        { wch: 8 },   // גלוי
      ];
      XLSX.utils.book_append_sheet(workbook, schemaSheet, 'מבנה שדות');

      // Sheet 3: Sample values (first value from each column, no personal data)
      const sampleData = activeColumns.map((col) => {
        // Get unique values count
        const uniqueValues = new Set(filteredData.map(row => row[col.key]));
        const nonEmptyCount = filteredData.filter(row => row[col.key] != null && row[col.key] !== '').length;

        return {
          'שם שדה': col.label,
          'מזהה': col.key,
          'ערכים ייחודיים': uniqueValues.size,
          'אחוז מילוי': filteredData.length > 0
            ? `${Math.round((nonEmptyCount / filteredData.length) * 100)}%`
            : '0%',
        };
      });
      const sampleSheet = XLSX.utils.json_to_sheet(sampleData);
      sampleSheet['!dir'] = 'rtl';
      sampleSheet['!cols'] = [
        { wch: 30 },  // שם שדה
        { wch: 25 },  // מזהה
        { wch: 15 },  // ערכים ייחודיים
        { wch: 12 },  // אחוז מילוי
      ];
      XLSX.utils.book_append_sheet(workbook, sampleSheet, 'סטטיסטיקות שדות');

      const tableName = projectInfo?.table_name || 'schema';
      const fileName = `${tableName}_מבנה_${new Date().toISOString().split('T')[0]}`;

      XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' });

      toast.success(`מבנה השדות יוצא בהצלחה (${activeColumns.length} שדות)`);
    } catch {
      toast.error('שגיאה בייצוא מבנה השדות');
    }
  }, [activeColumns, visibleColumns, projectInfo, filteredData]);

  // Share via email handler
  const handleShareEmail = useCallback(() => {
    if (filteredData.length === 0) {
      toast.error('אין נתונים לשיתוף');
      return;
    }

    // Build email body with summary
    const visibleKeys = activeColumns.filter(c => visibleColumns.has(c.key)).map(c => c.key);
    const visibleLabels = activeColumns.filter(c => visibleColumns.has(c.key)).map(c => c.label);

    const subject = encodeURIComponent(`דו"ח ${projectInfo?.name || 'נתונים'} - ${new Date().toLocaleDateString('he-IL')}`);

    // Create a summary of the data
    let body = `דו"ח ${projectInfo?.name || 'פרויקט'}\n`;
    body += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n`;
    body += `סה"כ רשומות: ${filteredData.length.toLocaleString('he-IL')}\n\n`;
    body += `עמודות: ${visibleLabels.join(', ')}\n\n`;

    // Add first 10 rows as preview (if not too long)
    if (filteredData.length > 0) {
      body += '--- תצוגה מקדימה (10 רשומות ראשונות) ---\n\n';
      filteredData.slice(0, 10).forEach((row, idx) => {
        body += `${idx + 1}. `;
        const values = visibleKeys.slice(0, 5).map(key => {
          const col = activeColumns.find(c => c.key === key);
          const value = row[key];
          return `${col?.label || key}: ${value || '-'}`;
        });
        body += values.join(' | ') + '\n';
      });
    }

    body += '\n---\nלצפייה בדו"ח המלא, היכנס למערכת.';

    // Open email client
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
    toast.success('נפתח חלון דוא"ל');
  }, [filteredData, activeColumns, visibleColumns, projectInfo?.name]);

  // Copy link handler
  const handleCopyLink = useCallback(() => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      toast.success('הקישור הועתק ללוח');
    }).catch(() => {
      toast.error('שגיאה בהעתקת הקישור');
    });
  }, []);

  // Helper to get phone from row
  const getPhoneFromRow = useCallback((row: Record<string, unknown>): string => {
    // Try common phone field names
    const phoneFields = ['סלולרי_לקוח', 'טלפון', 'phone', 'mobile', 'סלולרי', 'נייד'];
    for (const field of phoneFields) {
      if (row[field]) return String(row[field]);
    }
    return '';
  }, []);

  // Helper to get name from row
  const getNameFromRow = useCallback((row: Record<string, unknown>): string => {
    const nameFields = ['לקוח', 'שם_לקוח', 'שם', 'name', 'client_name', 'customer'];
    for (const field of nameFields) {
      if (row[field]) return String(row[field]);
    }
    return '';
  }, []);

  // Handle bulk WhatsApp send
  const handleBulkWhatsApp = useCallback(async (templateId: string, records: Record<string, unknown>[]) => {
    setBulkLoading(true);
    try {
      // Find template
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        toast.error('תבנית לא נמצאה');
        return;
      }

      // Prepare records for API
      const apiRecords = records.map(row => ({
        phone: getPhoneFromRow(row),
        name: getNameFromRow(row),
        placeholders: {
          'שם_לקוח': getNameFromRow(row),
          'לקוח': getNameFromRow(row),
          'סטטוס': String(row['סטטוס'] || row['status'] || ''),
          'סכום': String(row['סהכ_צבירה_צפויה_מניוד'] || row['total_expected_accumulation'] || ''),
          'מספר_תהליך': String(row['מספר_תהליך'] || row['id'] || ''),
        },
      })).filter(r => r.phone); // Filter out records without phone

      if (apiRecords.length === 0) {
        toast.error('לא נמצאו מספרי טלפון ברשומות שנבחרו');
        return;
      }

      // Call API to generate messages
      const response = await fetch(`/api/projects/${projectId}/whatsapp/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          records: apiRecords,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate messages');
      }

      const result = await response.json();

      if (result.messages && result.messages.length > 0) {
        // Open WhatsApp preview
        whatsAppPreview.openPreview(result.messages, template.name);
        toast.success(`נוצרו ${result.messages.length} הודעות`);
      } else {
        toast.error('לא נוצרו הודעות');
      }

    } catch (err) {
      console.error('Bulk WhatsApp error:', err);
      toast.error('שגיאה ביצירת הודעות WhatsApp');
    } finally {
      setBulkLoading(false);
    }
  }, [projectId, templates, whatsAppPreview, getPhoneFromRow, getNameFromRow]);

  // Handle bulk export
  const handleBulkExport = useCallback((format: 'excel' | 'whatsapp-ready') => {
    const selectedData = filteredData.filter(row => selectedRows.has(row.id as number));

    if (selectedData.length === 0) {
      toast.error('לא נבחרו רשומות');
      return;
    }

    try {
      if (format === 'whatsapp-ready') {
        // Export only phone and name for WhatsApp
        const exportData = selectedData.map(row => ({
          'שם': getNameFromRow(row),
          'טלפון': getPhoneFromRow(row),
        })).filter(r => r['טלפון']); // Filter out records without phone

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'רשימת טלפונים');
        XLSX.writeFile(workbook, `whatsapp_contacts_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`יוצאו ${exportData.length} אנשי קשר`);
      } else {
        // Export all visible columns
        const visibleKeys = activeColumns.filter(c => visibleColumns.has(c.key)).map(c => c.key);
        const exportData = selectedData.map(row => {
          const exportRow: Record<string, unknown> = {};
          visibleKeys.forEach(key => {
            const column = activeColumns.find(c => c.key === key);
            exportRow[column?.label || key] = row[key];
          });
          return exportRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'נתונים נבחרים');
        XLSX.writeFile(workbook, `selected_data_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`יוצאו ${selectedData.length} רשומות`);
      }
    } catch {
      toast.error('שגיאה בייצוא');
    }
  }, [filteredData, selectedRows, activeColumns, visibleColumns, getPhoneFromRow, getNameFromRow]);

  // Load summary columns from localStorage
  useEffect(() => {
    const storageKey = `summary_cols_${projectId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSummaryColumns(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load summary columns:', e);
    }
  }, [projectId]);

  // Save summary columns to localStorage
  useEffect(() => {
    const storageKey = `summary_cols_${projectId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(summaryColumns)));
    } catch (e) {
      console.error('Failed to save summary columns:', e);
    }
  }, [summaryColumns, projectId]);

  // Calculate summaries for selected columns
  const columnSummaries = useMemo(() => {
    if (summaryColumns.size === 0 || filteredData.length === 0) return {};

    const summaries: Record<string, { sum: number; avg: number; min: number; max: number; count: number }> = {};

    summaryColumns.forEach(colKey => {
      let sum = 0;
      let count = 0;
      let min = Infinity;
      let max = -Infinity;

      filteredData.forEach(row => {
        // Handle nested raw_data columns
        let value: unknown;
        if (colKey.startsWith('raw_data.')) {
          const rawData = row.raw_data as Record<string, unknown> | undefined;
          const nestedKey = colKey.replace('raw_data.', '');
          value = rawData?.[nestedKey];
        } else {
          value = row[colKey];
        }

        // Parse value to number
        const num = typeof value === 'number' ? value : parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
        if (!isNaN(num)) {
          sum += num;
          count++;
          min = Math.min(min, num);
          max = Math.max(max, num);
        }
      });

      if (count > 0) {
        summaries[colKey] = {
          sum,
          avg: sum / count,
          min: min === Infinity ? 0 : min,
          max: max === -Infinity ? 0 : max,
          count,
        };
      }
    });

    return summaries;
  }, [summaryColumns, filteredData]);

  // Get column label by key
  const getColumnLabel = useCallback((key: string) => {
    const col = activeColumns.find(c => c.key === key);
    return col?.label || key.replace('raw_data.', '');
  }, [activeColumns]);

  // Detect numeric columns
  const numericColumns = useMemo(() => {
    if (filteredData.length === 0) return [];

    return activeColumns.filter(col => {
      // Sample a few rows to determine if column is numeric
      const sampleSize = Math.min(10, filteredData.length);
      let numericCount = 0;

      for (let i = 0; i < sampleSize; i++) {
        const row = filteredData[i];
        let value: unknown;
        if (col.key.startsWith('raw_data.')) {
          const rawData = row.raw_data as Record<string, unknown> | undefined;
          const nestedKey = col.key.replace('raw_data.', '');
          value = rawData?.[nestedKey];
        } else {
          value = row[col.key];
        }

        const num = typeof value === 'number' ? value : parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
        if (!isNaN(num) && num !== 0) {
          numericCount++;
        }
      }

      return numericCount >= sampleSize * 0.5; // At least 50% numeric
    });
  }, [activeColumns, filteredData]);

  // Group data by category for charts
  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {};

    // Helper to get value from row - checks both direct fields and raw_data
    const getValue = (row: Record<string, unknown>, field: string): unknown => {
      // First try direct field
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        return row[field];
      }
      // Then try raw_data if it exists
      const rawData = row.raw_data as Record<string, unknown> | undefined;
      if (rawData && typeof rawData === 'object') {
        // Try exact match
        if (rawData[field] !== undefined) return rawData[field];
        // Try partial match (field might have different naming)
        for (const key of Object.keys(rawData)) {
          if (key.includes(field) || field.includes(key)) {
            return rawData[key];
          }
        }
      }
      return null;
    };

    // Group by common fields - try multiple variations
    const groupByFieldsMap: Record<string, string[]> = {
      'מפקח': ['מפקח', 'מפקח אחראי', 'שם מפקח'],
      'יצרן_חדש': ['יצרן_חדש', 'יצרן חדש', 'יצרן', 'שם יצרן'],
      'סוג_מוצר_חדש': ['סוג_מוצר_חדש', 'סוג מוצר חדש', 'סוג מוצר', 'סוג_מוצר'],
      'מטפל': ['מטפל', 'שם מטפל', 'סוכן'],
    };

    Object.entries(groupByFieldsMap).forEach(([displayName, fieldVariations]) => {
      const fieldGroups: Record<string, number> = {};
      filteredData.forEach(row => {
        let value: unknown = null;
        // Try each variation until we find a value
        for (const field of fieldVariations) {
          value = getValue(row, field);
          if (value !== null && value !== undefined && value !== '') break;
        }

        const key = String(value || 'לא מוגדר');
        fieldGroups[key] = (fieldGroups[key] || 0) + 1;
      });
      groups[displayName] = fieldGroups;
    });

    return groups;
  }, [filteredData]);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="תצוגת נתונים"
        subtitle={projectInfo?.table_name || 'טוען...'}
      />

      <div className="flex-1 p-6 overflow-auto space-y-6 bg-slate-50/50" dir="rtl">
        {/* View Mode Tabs + Help Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg w-fit shadow-sm">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                'gap-2',
                viewMode === 'table'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}
            >
              <Table2 className="h-4 w-4" />
              טבלה
            </Button>
            <Button
              variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('dashboard')}
              className={cn(
                'gap-2',
                viewMode === 'dashboard'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}
            >
              <BarChart3 className="h-4 w-4" />
              דשבורד מנהלים
            </Button>
          </div>

          {/* Help Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelp(true)}
            className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            עזרה
          </Button>
        </div>

        {/* Stats Cards - Light Theme with Emojis */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Records - Always show */}
            <Card
              className="bg-white border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group cursor-pointer shadow-sm"
              onClick={() => openDrillDown('records')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">סה״כ רשומות</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      {stats.total.toLocaleString('he-IL')}
                    </p>
                  </div>
                  <div className="text-3xl">📊</div>
                </div>
              </CardContent>
            </Card>

            {/* Commission - For views (nifraim/gemel) */}
            {stats.totalCommission !== undefined && (
              <Card className="bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">סה״כ עמלות</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.totalCommission.toLocaleString('he-IL', {
                          style: 'currency',
                          currency: 'ILS',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="text-3xl">💎</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Accumulation - For legacy tables */}
            {stats.uniqueHandlers !== undefined && (
              <Card
                className="bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200 group cursor-pointer shadow-sm"
                onClick={() => openDrillDown('accumulation')}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">צבירה צפויה</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.totalAccumulation.toLocaleString('he-IL', {
                          style: 'currency',
                          currency: 'ILS',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="text-3xl">💰</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Premium - For nifraim view */}
            {projectInfo?.table_name === 'nifraim' && (
              <Card className="bg-white border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all duration-200 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">סה״כ פרמיה</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.totalPremium.toLocaleString('he-IL', {
                          style: 'currency',
                          currency: 'ILS',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="text-3xl">💵</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Accumulation - For gemel view */}
            {projectInfo?.table_name === 'gemel' && (
              <Card className="bg-white border-slate-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">סה״כ צבירה</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.totalAccumulation.toLocaleString('he-IL', {
                          style: 'currency',
                          currency: 'ILS',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="text-3xl">💰</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Premium - For legacy tables */}
            {stats.uniqueHandlers !== undefined && (
              <Card
                className="bg-white border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all duration-200 group cursor-pointer shadow-sm"
                onClick={() => openDrillDown('accumulation')}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">פרמיה צפויה</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.totalPremium.toLocaleString('he-IL', {
                          style: 'currency',
                          currency: 'ILS',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="text-3xl">💵</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unique Agents - For views */}
            {stats.uniqueAgents !== undefined && (
              <Card className="bg-white border-slate-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">סוכנים</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.uniqueAgents.toLocaleString('he-IL')}
                      </p>
                    </div>
                    <div className="text-3xl">👥</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unique Handlers - For legacy tables */}
            {stats.uniqueHandlers !== undefined && (
              <Card
                className="bg-white border-slate-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 group cursor-pointer shadow-sm"
                onClick={() => openDrillDown('handlers')}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">מטפלים</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.uniqueHandlers.toLocaleString('he-IL')}
                      </p>
                    </div>
                    <div className="text-3xl">👥</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unique Supervisors - For legacy tables */}
            {stats.uniqueSupervisors !== undefined && (
              <Card
                className="bg-white border-slate-200 hover:border-amber-300 hover:shadow-md transition-all duration-200 group cursor-pointer shadow-sm"
                onClick={() => openDrillDown('supervisors')}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">מפקחים</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {stats.uniqueSupervisors.toLocaleString('he-IL')}
                      </p>
                    </div>
                    <div className="text-3xl">👨‍💼</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Providers count - For views */}
            {stats.byProvider && Object.keys(stats.byProvider).length > 0 && (
              <Card className="bg-white border-slate-200 hover:border-amber-300 hover:shadow-md transition-all duration-200 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">יצרנים</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                        {Object.keys(stats.byProvider).length.toLocaleString('he-IL')}
                      </p>
                    </div>
                    <div className="text-3xl">🏢</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Views */}
        <QuickViews
          views={quickViews}
          activeView={activeQuickView}
          onViewChange={setActiveQuickView}
        />

        {/* Search and Actions Bar - Light Theme */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="חיפוש חופשי..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              'border-slate-200 text-slate-600 hover:bg-slate-100 bg-white',
              activeFiltersCount > 0 && 'border-blue-400 text-blue-600'
            )}
          >
            <Filter className="h-4 w-4 ml-2" />
            פילטרים
            {activeFiltersCount > 0 && (
              <span className="mr-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Columns Button */}
          <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white">
                <Columns3 className="h-4 w-4 ml-2" />
                עמודות
                <span className="mr-2 text-xs text-slate-400">
                  ({visibleColumns.size}/{activeColumns.length})
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-white border-slate-200 w-72 max-h-80 overflow-y-auto shadow-lg"
            >
              <div className="p-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-slate-700 text-sm font-medium">בחר עמודות</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleColumns(new Set(activeColumns.map(c => c.key)))}
                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="h-3 w-3 ml-1" />
                    בחר הכל
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleColumns(new Set())}
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 ml-1" />
                    הסר הכל
                  </Button>
                </div>
              </div>
              {activeColumns.map((column, index) => {
                // Convert index to Excel column letter (A, B, C, ..., Z, AA, AB, ...)
                const getExcelColumn = (idx: number): string => {
                  let col = '';
                  let n = idx;
                  while (n >= 0) {
                    col = String.fromCharCode((n % 26) + 65) + col;
                    n = Math.floor(n / 26) - 1;
                  }
                  return col;
                };
                const excelLetter = getExcelColumn(index);

                return (
                  <DropdownMenuItem
                    key={column.key}
                    onClick={(e) => {
                      e.preventDefault();
                      handleColumnToggle(column.key);
                    }}
                    className="flex items-center gap-2 text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={visibleColumns.has(column.key)}
                      className="border-slate-300 data-[state=checked]:bg-blue-600"
                    />
                    <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded min-w-[28px] text-center">
                      {excelLetter}
                    </span>
                    <span className="text-sm">{column.icon}</span>
                    <span className="truncate">{column.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white">
                <Download className="h-4 w-4 ml-2" />
                ייצוא
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white border-slate-200 shadow-lg">
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                className="text-slate-700 cursor-pointer hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-4 w-4 ml-2 text-emerald-600" />
                ייצוא ל-Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                className="text-slate-700 cursor-pointer hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-4 w-4 ml-2 text-blue-600" />
                ייצוא ל-CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExportSchema()}
                className="text-slate-700 cursor-pointer hover:bg-slate-50"
              >
                <Columns3 className="h-4 w-4 ml-2 text-purple-600" />
                ייצוא מבנה שדות
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share/Email Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white">
                <Share2 className="h-4 w-4 ml-2" />
                שיתוף
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white border-slate-200 shadow-lg">
              <DropdownMenuItem
                onClick={() => handleShareEmail()}
                className="text-slate-700 cursor-pointer hover:bg-slate-50"
              >
                <Mail className="h-4 w-4 ml-2 text-blue-600" />
                שלח במייל
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCopyLink()}
                className="text-slate-700 cursor-pointer hover:bg-slate-50"
              >
                <Share2 className="h-4 w-4 ml-2 text-purple-600" />
                העתק קישור
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={loading}
            className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Error State - Light Theme */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="text-red-700 font-medium">שגיאה בטעינת הנתונים</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  className="mr-auto border-red-300 text-red-600 hover:bg-red-100"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  נסה שוב
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedRows.size > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedRows.size}
            selectedRows={selectedRows}
            data={filteredData}
            rowIdKey="id"
            templates={templates}
            onClearSelection={() => setSelectedRows(new Set())}
            onSendWhatsApp={handleBulkWhatsApp}
            onExport={handleBulkExport}
            loading={bulkLoading}
          />
        )}

        {/* View Content Based on Mode */}
        {viewMode === 'table' ? (
          /* Data Table */
          <DataTable
            data={filteredData}
            columns={activeColumns}
            loading={loading}
            pageSize={100}
            onRowClick={handleRowClick}
            visibleColumns={visibleColumns}
            totalCount={stats?.total}
            selectable={true}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            rowIdKey="id"
          />
        ) : (
          /* Dashboard View */
          <div className="space-y-6">
            {/* Summary Configuration */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧮</span>
                    <h3 className="text-slate-800 font-semibold">עמודות לסיכום</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSummaryConfig(!showSummaryConfig)}
                    className="border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    {showSummaryConfig ? 'סגור' : 'הגדר עמודות'}
                  </Button>
                </div>

                {showSummaryConfig && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4 max-h-64 overflow-y-auto">
                    <p className="text-slate-600 text-sm mb-3">בחר עמודות לסיכום (מספריות יחושבו אוטומטית):</p>
                    <div className="flex flex-wrap gap-2">
                      {activeColumns.map((col, index) => {
                        const getExcelColumn = (idx: number): string => {
                          let colStr = '';
                          let n = idx;
                          while (n >= 0) {
                            colStr = String.fromCharCode((n % 26) + 65) + colStr;
                            n = Math.floor(n / 26) - 1;
                          }
                          return colStr;
                        };
                        const excelLetter = getExcelColumn(index);
                        const isNumeric = numericColumns.some(nc => nc.key === col.key);

                        return (
                          <button
                            key={col.key}
                            onClick={() => {
                              setSummaryColumns(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(col.key)) {
                                  newSet.delete(col.key);
                                } else {
                                  newSet.add(col.key);
                                }
                                return newSet;
                              });
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors',
                              summaryColumns.has(col.key)
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            )}
                          >
                            <span className="font-mono text-xs opacity-60">{excelLetter}</span>
                            {col.label}
                            {isNumeric && <span className="text-xs text-blue-600">#</span>}
                          </button>
                        );
                      })}
                    </div>
                    {activeColumns.length === 0 && (
                      <p className="text-slate-400 text-sm">לא נמצאו עמודות בנתונים</p>
                    )}
                  </div>
                )}

                {/* Summary Cards */}
                {summaryColumns.size > 0 && Object.keys(columnSummaries).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto">
                    {Array.from(summaryColumns).map(colKey => {
                      const summary = columnSummaries[colKey];
                      if (!summary) return null;

                      return (
                        <div
                          key={colKey}
                          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <h4 className="text-slate-600 text-sm font-medium mb-3">{getColumnLabel(colKey)}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-sm">סה"כ:</span>
                              <span className="text-emerald-600 font-bold text-lg">
                                {summary.sum.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-sm">ממוצע:</span>
                              <span className="text-blue-600 font-medium">
                                {summary.avg.toLocaleString('he-IL', { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-sm">מינימום:</span>
                              <span className="text-slate-700">
                                {summary.min.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-sm">מקסימום:</span>
                              <span className="text-slate-700">
                                {summary.max.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                              <span className="text-slate-500 text-sm">רשומות:</span>
                              <span className="text-slate-600">{summary.count.toLocaleString('he-IL')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Combined Total Card */}
                    {summaryColumns.size >= 2 && (
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 shadow-sm">
                        <h4 className="text-emerald-700 text-sm font-medium mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          סה"כ משולב
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600 text-sm">סכום כל העמודות:</span>
                            <span className="text-emerald-600 font-bold text-xl">
                              {Object.values(columnSummaries)
                                .reduce((acc, s) => acc + s.sum, 0)
                                .toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {summaryColumns.size === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <span className="text-5xl mb-4 block">🧮</span>
                    <p className="text-slate-600 font-medium">בחר עמודות מספריות לסיכום</p>
                    <p className="text-sm mt-1">לחץ על "הגדר עמודות" למעלה</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-x-auto">
              {/* By Supervisor */}
              {groupedData['מפקח'] && Object.keys(groupedData['מפקח']).length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">👨‍💼</span>
                      <h3 className="text-slate-800 font-semibold">התפלגות לפי מפקח</h3>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Object.entries(groupedData['מפקח'])
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([name, count]) => {
                          const percentage = (count / filteredData.length) * 100;
                          return (
                            <div key={name} className="flex items-center gap-3">
                              <div className="w-24 truncate text-slate-700 text-sm font-medium">{name}</div>
                              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-purple-400 h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="w-16 text-left text-slate-800 text-sm font-semibold">
                                {count.toLocaleString('he-IL')}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Manufacturer */}
              {groupedData['יצרן_חדש'] && Object.keys(groupedData['יצרן_חדש']).length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">🏭</span>
                      <h3 className="text-slate-800 font-semibold">התפלגות לפי יצרן</h3>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Object.entries(groupedData['יצרן_חדש'])
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([name, count]) => {
                          const percentage = (count / filteredData.length) * 100;
                          return (
                            <div key={name} className="flex items-center gap-3">
                              <div className="w-24 truncate text-slate-700 text-sm font-medium">{name}</div>
                              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="w-16 text-left text-slate-800 text-sm font-semibold">
                                {count.toLocaleString('he-IL')}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Product Type */}
              {groupedData['סוג_מוצר_חדש'] && Object.keys(groupedData['סוג_מוצר_חדש']).length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">📦</span>
                      <h3 className="text-slate-800 font-semibold">התפלגות לפי סוג מוצר</h3>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Object.entries(groupedData['סוג_מוצר_חדש'])
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([name, count]) => {
                          const percentage = (count / filteredData.length) * 100;
                          return (
                            <div key={name} className="flex items-center gap-3">
                              <div className="w-24 truncate text-slate-700 text-sm font-medium">{name}</div>
                              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="w-16 text-left text-slate-800 text-sm font-semibold">
                                {count.toLocaleString('he-IL')}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Handler */}
              {groupedData['מטפל'] && Object.keys(groupedData['מטפל']).length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">👥</span>
                      <h3 className="text-slate-800 font-semibold">התפלגות לפי מטפל</h3>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Object.entries(groupedData['מטפל'])
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([name, count]) => {
                          const percentage = (count / filteredData.length) * 100;
                          return (
                            <div key={name} className="flex items-center gap-3">
                              <div className="w-24 truncate text-slate-700 text-sm font-medium">{name}</div>
                              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="w-16 text-left text-slate-800 text-sm font-semibold">
                                {count.toLocaleString('he-IL')}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
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

      {/* WhatsApp Preview Modal */}
      <WhatsAppPreview
        isOpen={whatsAppPreview.isOpen}
        onClose={whatsAppPreview.closePreview}
        messages={whatsAppPreview.messages}
        templateName={whatsAppPreview.templateName}
      />

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-2xl">📖</span>
                מדריך שימוש במערכת
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6" dir="rtl">
              {/* View Modes */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  מצבי תצוגה
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <Table2 className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-slate-800 font-medium">טבלה</span>
                      <span className="text-slate-600"> - תצוגת כל הנתונים בטבלה עם אפשרות סינון, מיון וחיפוש</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-4 w-4 text-purple-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-slate-800 font-medium">דשבורד מנהלים</span>
                      <span className="text-slate-600"> - סיכומים, גרפים והתפלגויות לניתוח מהיר</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column Selection */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <Columns3 className="h-5 w-5" />
                  בחירת עמודות
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700 border border-slate-100">
                  <p>לחץ על כפתור <span className="text-slate-800 font-medium">"עמודות"</span> כדי לבחור אילו עמודות להציג</p>
                  <ul className="list-disc mr-5 space-y-1 text-sm">
                    <li>כל עמודה מסומנת באות אקסל (A, B, C...)</li>
                    <li><span className="text-emerald-600 font-medium">"בחר הכל"</span> - מציג את כל העמודות</li>
                    <li><span className="text-red-600 font-medium">"הסר הכל"</span> - מסתיר את כל העמודות</li>
                    <li>ההעדפות נשמרות אוטומטית לפרויקט</li>
                  </ul>
                </div>
              </div>

              {/* Dashboard Summary */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  סיכום עמודות בדשבורד
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700 border border-slate-100">
                  <p>במצב דשבורד, ניתן לבחור עמודות לסיכום:</p>
                  <ul className="list-disc mr-5 space-y-1 text-sm">
                    <li>לחץ <span className="text-slate-800 font-medium">"הגדר עמודות"</span> לבחירת העמודות</li>
                    <li>עמודות מספריות מסומנות ב-<span className="text-blue-600 font-medium">#</span></li>
                    <li>לכל עמודה מוצגים: סה"כ, ממוצע, מינימום, מקסימום</li>
                    <li className="text-emerald-600 font-medium">טיפ: "צבירה + הפקדה" כולל את שתי העמודות יחד!</li>
                  </ul>
                </div>
              </div>

              {/* Export & Share */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  ייצוא ושיתוף
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <Download className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-slate-800 font-medium">ייצוא</span>
                      <span className="text-slate-600"> - הורדת הנתונים כקובץ Excel או CSV</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-slate-800 font-medium">שלח במייל</span>
                      <span className="text-slate-600"> - שליחת סיכום הדוח בדוא"ל</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Share2 className="h-4 w-4 text-purple-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-slate-800 font-medium">העתק קישור</span>
                      <span className="text-slate-600"> - העתקת קישור לדף הנוכחי</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  סינון וחיפוש
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-slate-700 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <Search className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-slate-800 font-medium">חיפוש</span>
                      <span className="text-slate-600"> - חיפוש חופשי בכל השדות</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Filter className="h-4 w-4 text-amber-500 mt-1 shrink-0" />
                    <div>
                      <span className="text-slate-800 font-medium">סינון מתקדם</span>
                      <span className="text-slate-600"> - סינון לפי ערכים ספציפיים בכל עמודה</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  כרטיסי סטטיסטיקה
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 text-slate-700 border border-slate-100">
                  <p className="text-sm">לחיצה על כרטיס סטטיסטיקה פותחת חלון עם פירוט מלא (drill-down)</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 bg-slate-50">
              <Button
                onClick={() => setShowHelp(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                הבנתי, תודה!
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
