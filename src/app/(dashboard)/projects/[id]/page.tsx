'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Database,
  Table as TableIcon,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  Calendar,
  Hash,
  Eye,
  EyeOff,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useUserPreferencesStore } from '@/lib/stores/userPreferencesStore';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import type { TableRow, ImportedDataStats } from '@/types';

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params.id as string;
  const initialTab = searchParams.get('tab') || 'data';

  const {
    projects,
    selectedProject,
    tables,
    selectedTable,
    tableData,
    tableDataPagination,
    isLoadingTables,
    isLoadingData,
    connectToProject,
    selectTable,
    fetchTableData,
    deleteRow,
  } = useProjectsStore();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState<ImportedDataStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  const {
    getProjectPreferences,
    setVisibleColumns: saveVisibleColumns,
    setLastSelectedTable,
    setFilters,
  } = useUserPreferencesStore();

  // Find and connect to project
  useEffect(() => {
    const project = projects.find((p) => p.id === projectId);
    if (project && (!selectedProject || selectedProject.id !== projectId)) {
      connectToProject(project);
    }
  }, [projectId, projects, selectedProject, connectToProject]);

  // Fetch stats when table is selected
  const fetchStats = useCallback(async () => {
    if (!selectedTable || !projectId) return;

    setIsLoadingStats(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/stats?table=${encodeURIComponent(selectedTable)}`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedTable, projectId]);

  // Load saved column preferences when table changes
  useEffect(() => {
    if (selectedTable && projectId) {
      const prefs = getProjectPreferences(`${projectId}:${selectedTable}`);
      if (prefs.visible_columns.length > 0) {
        setVisibleColumns(new Set(prefs.visible_columns));
      }
      // Load saved search filter
      const savedSearch = (prefs.filters?.search as string) || '';
      setSearchFilter(savedSearch);
      // Save last selected table
      setLastSelectedTable(projectId, selectedTable);
      // Fetch stats
      fetchStats();
    }
  }, [selectedTable, projectId, getProjectPreferences, setLastSelectedTable, fetchStats]);

  // Handle search change with persistence
  const handleSearchChange = (value: string) => {
    setSearchFilter(value);
    if (selectedTable && projectId) {
      setFilters(projectId, selectedTable, { search: value });
    }
  };

  // Initialize visible columns when data loads
  useEffect(() => {
    if (tableData.length > 0 && visibleColumns.size === 0) {
      const allColumns = Object.keys(tableData[0]);
      setVisibleColumns(new Set(allColumns));
    }
  }, [tableData, visibleColumns.size]);

  const handleTableSelect = (tableName: string) => {
    selectTable(tableName);
  };

  const handleColumnToggle = (columnName: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnName)) {
        next.delete(columnName);
      } else {
        next.add(columnName);
      }
      // Save to preferences
      if (selectedTable && projectId) {
        saveVisibleColumns(projectId, selectedTable, Array.from(next));
      }
      return next;
    });
  };

  const handleRefresh = () => {
    if (selectedTable) {
      fetchTableData(selectedTable);
      toast.success('הנתונים רועננו');
    }
  };

  const handlePageChange = (page: number) => {
    if (selectedTable) {
      fetchTableData(selectedTable, page, tableDataPagination.pageSize);
    }
  };

  const handlePageSizeChange = (pageSize: number) => {
    if (selectedTable) {
      fetchTableData(selectedTable, 1, pageSize);
    }
  };

  const handleDeleteRow = async (id: string | number) => {
    if (!selectedTable) return;

    if (confirm('האם אתה בטוח שברצונך למחוק את השורה?')) {
      const success = await deleteRow(selectedTable, id);
      if (success) {
        toast.success('השורה נמחקה בהצלחה');
      } else {
        toast.error('שגיאה במחיקת השורה');
      }
    }
  };

  // Get all column names from data
  const allColumnNames = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  // Generate columns dynamically from data (filtered by visibility)
  const columns: ColumnDef<TableRow>[] = tableData.length > 0
    ? [
        ...allColumnNames
          .filter((key) => visibleColumns.has(key))
          .map((key) => ({
            accessorKey: key,
            header: key,
            cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
              const value = row.getValue(key);
              if (value === null || value === undefined) {
                return <span className="text-slate-500">null</span>;
              }
              if (typeof value === 'object') {
                return (
                  <pre className="text-xs max-w-xs truncate">
                    {JSON.stringify(value)}
                  </pre>
                );
              }
              if (typeof value === 'boolean') {
                return (
                  <Badge variant="outline" className={value ? 'text-emerald-400' : 'text-red-400'}>
                    {value ? 'true' : 'false'}
                  </Badge>
                );
              }
              return String(value);
            },
          })),
        {
          id: 'actions',
          header: 'פעולות',
          cell: ({ row }: { row: { original: TableRow } }) => {
            const id = row.original.id;
            if (!id) return null;
            return (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-400"
                  onClick={() => handleDeleteRow(id as string | number)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          },
        },
      ]
    : [];

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Database className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={selectedProject.name} />

      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4 ml-2" />
              דשבורד
            </TabsTrigger>
            <TabsTrigger
              value="data"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            >
              <TableIcon className="h-4 w-4 ml-2" />
              נתונים
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              onClick={() => router.push(`/projects/${projectId}/import`)}
            >
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              ייבוא
            </TabsTrigger>
            <TabsTrigger
              value="builder"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              onClick={() => router.push(`/projects/${projectId}/dashboard-builder`)}
            >
              <Sparkles className="h-4 w-4 ml-2" />
              בונה דשבורד
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            >
              הגדרות
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-4">
            {/* Table Selection for Dashboard */}
            <div className="flex items-center gap-4">
              <Select
                value={selectedTable || ''}
                onValueChange={handleTableSelect}
              >
                <SelectTrigger className="w-64 bg-slate-800 border-slate-700">
                  <SelectValue placeholder="בחר טבלה לצפייה בסטטיסטיקות" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {tables.map((table) => (
                    <SelectItem
                      key={table.name}
                      value={table.name}
                      className="text-white focus:bg-slate-700"
                    >
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={fetchStats}
                  disabled={isLoadingStats}
                >
                  <RefreshCw className={`h-4 w-4 ml-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
                  רענן סטטיסטיקות
                </Button>
              )}
            </div>

            {selectedTable && stats ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">סה״כ רשומות</p>
                          <p className="text-2xl font-bold text-white">
                            {stats.total_records.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/10">
                          <Hash className="h-6 w-6 text-emerald-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">עמודות</p>
                          <p className="text-2xl font-bold text-white">
                            {stats.columns.length}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10">
                          <TableIcon className="h-6 w-6 text-blue-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {stats.last_import_date && (
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-400">ייבוא אחרון</p>
                            <p className="text-lg font-bold text-white">
                              {new Date(stats.last_import_date).toLocaleDateString('he-IL')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {stats.last_import_rows?.toLocaleString()} שורות
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-purple-500/10">
                            <Calendar className="h-6 w-6 text-purple-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {stats.status_breakdown && Object.keys(stats.status_breakdown).length > 0 && (
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-400">סטטוסים</p>
                            <p className="text-2xl font-bold text-white">
                              {Object.keys(stats.status_breakdown).length}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-amber-500/10">
                            <PieChart className="h-6 w-6 text-amber-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Status Breakdown */}
                {stats.status_breakdown && Object.keys(stats.status_breakdown).length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-emerald-500" />
                        התפלגות סטטוסים
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(stats.status_breakdown).map(([status, count]) => {
                          const percentage = (count / stats.total_records) * 100;
                          return (
                            <div key={status} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-300">{status}</span>
                                <span className="text-slate-400">
                                  {count.toLocaleString()} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Column Info */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <TableIcon className="h-5 w-5 text-blue-500" />
                      מבנה הטבלה
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stats.columns.map((col) => (
                        <div
                          key={col.name}
                          className="p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">{col.name}</span>
                            <Badge
                              variant="outline"
                              className="border-slate-500 text-slate-400 text-xs"
                            >
                              {col.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500">
                            {col.unique_values !== undefined && (
                              <span>{col.unique_values} ערכים ייחודיים</span>
                            )}
                            {(col.null_count ?? 0) > 0 && (
                              <span className="mr-2">• {col.null_count} null</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : selectedTable && isLoadingStats ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">טוען סטטיסטיקות...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border border-dashed border-slate-700 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">בחר טבלה לצפייה בסטטיסטיקות</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4 mt-4">
            {/* Table Selection & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedTable || '__none__'}
                  onValueChange={(value) => value !== '__none__' && value !== '__loading__' && value !== '__empty__' && handleTableSelect(value)}
                >
                  <SelectTrigger className="w-64 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="בחר טבלה" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {isLoadingTables ? (
                      <SelectItem value="__loading__" disabled className="text-slate-500">
                        טוען טבלאות...
                      </SelectItem>
                    ) : tables.length > 0 ? (
                      tables.map((table) => (
                        <SelectItem
                          key={table.name}
                          value={table.name}
                          className="text-white focus:bg-slate-700"
                        >
                          {table.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__empty__" disabled className="text-slate-500">
                        לא נמצאו טבלאות
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {selectedTable && (
                  <Badge variant="outline" className="border-slate-600 text-slate-400">
                    {tableDataPagination.total} שורות
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Column Visibility Dropdown */}
                {allColumnNames.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-700 text-slate-300"
                      >
                        <Settings2 className="h-4 w-4 ml-2" />
                        עמודות ({visibleColumns.size}/{allColumnNames.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-slate-800 border-slate-700 w-56 max-h-80 overflow-auto"
                    >
                      <DropdownMenuLabel className="text-slate-400">
                        הצג/הסתר עמודות
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      {allColumnNames.map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col}
                          checked={visibleColumns.has(col)}
                          onCheckedChange={() => handleColumnToggle(col)}
                          className="text-slate-300 focus:bg-slate-700"
                        >
                          {col}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={handleRefresh}
                  disabled={!selectedTable || isLoadingData}
                >
                  <RefreshCw className={`h-4 w-4 ml-2 ${isLoadingData ? 'animate-spin' : ''}`} />
                  רענן
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={() => router.push(`/projects/${projectId}/import`)}
                >
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  ייבוא מאקסל
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  disabled={!selectedTable}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף שורה
                </Button>
              </div>
            </div>

            {/* Data Table */}
            {selectedTable ? (
              <DataTable
                columns={columns}
                data={tableData}
                isLoading={isLoadingData}
                searchKey="id"
                searchPlaceholder="חיפוש..."
                initialSearchValue={searchFilter}
                onSearchChange={handleSearchChange}
                pagination={{
                  page: tableDataPagination.page,
                  pageSize: tableDataPagination.pageSize,
                  total: tableDataPagination.total,
                  onPageChange: handlePageChange,
                  onPageSizeChange: handlePageSizeChange,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 border border-dashed border-slate-700 rounded-lg">
                <div className="text-center">
                  <TableIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">בחר טבלה לצפייה בנתונים</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="max-w-2xl space-y-6">
              <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">פרטי הפרויקט</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-slate-400">שם</dt>
                    <dd className="text-white">{selectedProject.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-400">URL</dt>
                    <dd className="text-white font-mono text-sm">
                      {selectedProject.supabase_url}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-slate-400">תיאור</dt>
                    <dd className="text-white">
                      {selectedProject.description || '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-6 bg-red-500/10 rounded-lg border border-red-500/30">
                <h3 className="text-lg font-semibold text-red-400 mb-2">אזור מסוכן</h3>
                <p className="text-sm text-slate-400 mb-4">
                  מחיקת הפרויקט היא פעולה בלתי הפיכה
                </p>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 ml-2" />
                  מחק פרויקט
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
