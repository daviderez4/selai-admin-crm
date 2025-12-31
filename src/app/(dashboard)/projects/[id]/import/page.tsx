'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  Columns,
  Import,
  Layers,
  Eye,
  ChevronDown,
  ChevronUp,
  Plus,
  LayoutDashboard,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { ExcelSheetInfo } from '@/types';

interface ImportProgress {
  currentSheet: string;
  sheetIndex: number;
  totalSheets: number;
  imported: number;
  total: number;
}

interface ExcelHeader {
  index: number;
  original: string;
  suggested: string;
}

interface ColumnMapping {
  excelColumn: string;
  dbColumn: string;
  transform: 'string' | 'number' | 'boolean' | 'date' | 'json';
  enabled: boolean;
}

interface SheetConfig {
  sheetName: string;
  selected: boolean;
  targetTable: string;
  columnMappings: ColumnMapping[];
  skipFirstRow: boolean;
  upsertColumn: string;
  headers: ExcelHeader[];
  preview: Record<string, string>[];
  rowCount: number;
}

interface TableInfo {
  name: string;
  schema: string;
}

type ImportStep = 'upload' | 'sheets' | 'mapping' | 'preview' | 'importing' | 'complete';

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sheetsInfo, setSheetsInfo] = useState<ExcelSheetInfo[]>([]);
  const [sheetConfigs, setSheetConfigs] = useState<Record<string, SheetConfig>>({});
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    sheetName: string;
    imported: number;
    total: number;
    errors?: string[];
  }[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/tables`);
        if (response.ok) {
          const data = await response.json();
          setTables(data.tables || []);
        }
      } catch (error) {
        console.error('Error fetching tables:', error);
      }
    };
    fetchTables();
  }, [projectId]);

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await handleFile(droppedFile);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await handleFile(selectedFile);
    }
  };

  // Process file
  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/projects/${projectId}/excel/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse file');
      }

      const result = await response.json();
      setSheetsInfo(result.sheetsInfo || []);

      // Initialize sheet configs
      const configs: Record<string, SheetConfig> = {};
      (result.sheetsInfo || []).forEach((sheet: ExcelSheetInfo) => {
        configs[sheet.name] = {
          sheetName: sheet.name,
          selected: sheet.index === 0, // Select first sheet by default
          targetTable: '',
          columnMappings: sheet.headers.map((h) => ({
            excelColumn: h,
            dbColumn: sanitizeColumnName(h),
            transform: 'string' as const,
            enabled: true,
          })),
          skipFirstRow: true,
          upsertColumn: '__none__',
          headers: sheet.headers.map((h, i) => ({
            index: i,
            original: h,
            suggested: sanitizeColumnName(h),
          })),
          preview: sheet.preview,
          rowCount: sheet.rowCount,
        };
      });
      setSheetConfigs(configs);

      if (result.sheetsInfo.length > 1) {
        setStep('sheets');
        toast.success(`נמצאו ${result.sheetsInfo.length} גיליונות`);
      } else {
        setStep('mapping');
        toast.success(`נטען: ${result.sheetsInfo[0]?.rowCount || 0} שורות`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בקריאת הקובץ');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sanitize column name
  const sanitizeColumnName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s\-]+/g, '_')
      .replace(/[^\w\u0590-\u05FF]/g, '')
      .replace(/^(\d)/, '_$1')
      .substring(0, 63);
  };

  // Transform preview data according to mappings
  const getTransformedPreview = (config: SheetConfig) => {
    const enabledMappings = config.columnMappings.filter(m => m.enabled);
    return config.preview.map(row => {
      const transformedRow: Record<string, unknown> = {};
      enabledMappings.forEach(mapping => {
        let value: unknown = row[mapping.excelColumn];

        // Apply transformation preview
        switch (mapping.transform) {
          case 'number':
            const numVal = value === '' || value === null ? null : Number(value);
            value = isNaN(numVal as number) ? null : numVal;
            break;
          case 'boolean':
            value = ['true', '1', 'yes', 'כן', 'אמת'].includes(
              String(value || '').toLowerCase()
            );
            break;
          case 'date':
            if (value) {
              const date = new Date(value as string);
              value = isNaN(date.getTime()) ? value : date.toLocaleDateString('he-IL');
            }
            break;
          default:
            value = value === '' ? null : value;
        }

        transformedRow[mapping.dbColumn] = value;
      });
      return transformedRow;
    });
  };

  // Map transform type to PostgreSQL type
  const transformToPgType = (transform: string): string => {
    switch (transform) {
      case 'number': return 'numeric';
      case 'boolean': return 'boolean';
      case 'date': return 'timestamp';
      case 'json': return 'jsonb';
      default: return 'text';
    }
  };

  // Toggle sheet selection
  const toggleSheetSelection = (sheetName: string) => {
    setSheetConfigs((prev) => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        selected: !prev[sheetName].selected,
      },
    }));
  };

  // Update sheet config
  const updateSheetConfig = (sheetName: string, updates: Partial<SheetConfig>) => {
    setSheetConfigs((prev) => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        ...updates,
      },
    }));
  };

  // Update column mapping
  const updateMapping = (sheetName: string, index: number, field: keyof ColumnMapping, value: unknown) => {
    setSheetConfigs((prev) => {
      const config = prev[sheetName];
      const mappings = [...config.columnMappings];
      mappings[index] = { ...mappings[index], [field]: value };
      return {
        ...prev,
        [sheetName]: { ...config, columnMappings: mappings },
      };
    });
  };

  // Get selected sheets
  const selectedSheets = Object.values(sheetConfigs).filter((c) => c.selected);

  // Handle import
  const handleImport = async () => {
    if (selectedSheets.length === 0) {
      toast.error('יש לבחור לפחות גיליון אחד');
      return;
    }

    // Check for sheets without table (excluding new table creation)
    const sheetsWithoutTable = selectedSheets.filter((s) => {
      if (s.targetTable === '__new__') {
        return !newTableName.trim();
      }
      return !s.targetTable;
    });
    if (sheetsWithoutTable.length > 0) {
      toast.error('יש לבחור טבלת יעד או להזין שם לטבלה חדשה');
      return;
    }

    setStep('importing');
    setIsLoading(true);
    const results: typeof importResults = [];
    const totalRows = selectedSheets.reduce((sum, s) => sum + s.rowCount, 0);
    let importedSoFar = 0;

    try {
      for (let sheetIdx = 0; sheetIdx < selectedSheets.length; sheetIdx++) {
        const config = selectedSheets[sheetIdx];
        const enabledMappings = config.columnMappings.filter((m) => m.enabled);
        const isNewTable = config.targetTable === '__new__';
        const actualTableName = isNewTable ? sanitizeColumnName(newTableName) : config.targetTable;

        // Update progress for current sheet
        setImportProgress({
          currentSheet: config.sheetName,
          sheetIndex: sheetIdx,
          totalSheets: selectedSheets.length,
          imported: importedSoFar,
          total: totalRows,
        });

        // Create new table if needed
        if (isNewTable) {
          const columns = enabledMappings.map(m => ({
            name: m.dbColumn,
            type: transformToPgType(m.transform),
          }));

          const createResponse = await fetch(`/api/projects/${projectId}/tables/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableName: actualTableName,
              columns,
            }),
          });

          if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.error || `Failed to create table ${actualTableName}`);
          }

          toast.success(`טבלה ${actualTableName} נוצרה בהצלחה`);
        }

        // Import data
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('tableName', actualTableName);
        formData.append('sheetName', config.sheetName);
        formData.append('columnMappings', JSON.stringify(enabledMappings));
        formData.append('skipFirstRow', String(config.skipFirstRow));
        if (config.upsertColumn && config.upsertColumn !== '__none__') {
          formData.append('upsertColumn', config.upsertColumn);
        }

        const response = await fetch(`/api/projects/${projectId}/excel/import`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        importedSoFar += result.imported || 0;
        setImportProgress({
          currentSheet: config.sheetName,
          sheetIndex: sheetIdx,
          totalSheets: selectedSheets.length,
          imported: importedSoFar,
          total: totalRows,
        });

        results.push({
          sheetName: config.sheetName,
          imported: result.imported || 0,
          total: result.total || config.rowCount,
          errors: result.errors,
        });
      }

      // Create dashboard template
      const firstSheet = selectedSheets[0];
      const isNewTable = firstSheet.targetTable === '__new__';
      const tableName = isNewTable ? sanitizeColumnName(newTableName) : firstSheet.targetTable;
      const enabledMappings = firstSheet.columnMappings.filter(m => m.enabled);

      try {
        const templateResponse = await fetch(`/api/projects/${projectId}/templates/from-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName,
            name: `דשבורד - ${tableName}`,
            columnMappings: enabledMappings,
            sampleData: firstSheet.preview,
          }),
        });

        if (templateResponse.ok) {
          const templateData = await templateResponse.json();
          setCreatedTemplateId(templateData.templateId);
        }
      } catch (templateError) {
        console.error('Failed to create template:', templateError);
        // Don't fail the import if template creation fails
      }

      setImportResults(results);
      setStep('complete');

      const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
      const hasErrors = results.some((r) => r.errors && r.errors.length > 0);

      if (hasErrors) {
        toast.warning(`יובאו ${totalImported} שורות עם שגיאות`);
      } else {
        toast.success(`יובאו ${totalImported} שורות בהצלחה!`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בייבוא');
      setStep('preview');
    } finally {
      setIsLoading(false);
      setImportProgress(null);
    }
  };

  // Reset and start over
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setSheetsInfo([]);
    setSheetConfigs({});
    setImportResults([]);
    setCurrentSheetIndex(0);
    setNewTableName('');
    setCreatedTemplateId(null);
    setImportProgress(null);
  };

  // Step indicator
  const steps = [
    { key: 'upload', label: 'העלאה', icon: Upload },
    { key: 'sheets', label: 'גיליונות', icon: Layers },
    { key: 'mapping', label: 'מיפוי', icon: Columns },
    { key: 'preview', label: 'תצוגה מקדימה', icon: Eye },
    { key: 'complete', label: 'סיום', icon: Check },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step || (step === 'importing' && s.key === 'complete'));

  return (
    <div className="flex flex-col h-full">
      <Header title="ייבוא מאקסל" />

      <div className="flex-1 p-6 overflow-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentStepIndex === i
                      ? 'bg-emerald-500 text-white'
                      : currentStepIndex > i
                      ? 'bg-emerald-500/20 text-emerald-500'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowLeft className="h-4 w-4 text-slate-600 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-5xl mx-auto">
          {/* Upload Step */}
          {step === 'upload' && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  העלאת קובץ אקסל
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
                      <p className="text-slate-300">מעבד את הקובץ...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-300 mb-2">גרור ושחרר קובץ אקסל כאן</p>
                      <p className="text-slate-500 text-sm mb-4">או לחץ לבחירת קובץ</p>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          asChild
                        >
                          <span>בחר קובץ</span>
                        </Button>
                      </label>
                      <p className="text-slate-600 text-xs mt-4">תומך ב: XLSX, XLS, CSV</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sheets Selection Step */}
          {step === 'sheets' && (
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-emerald-500" />
                    בחירת גיליונות לייבוא
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    נמצאו {sheetsInfo.length} גיליונות בקובץ. בחר את הגיליונות שברצונך לייבא:
                  </p>

                  <div className="space-y-3">
                    {sheetsInfo.map((sheet) => {
                      const config = sheetConfigs[sheet.name];
                      const isExpanded = expandedSheet === sheet.name;

                      return (
                        <div
                          key={sheet.name}
                          className={`border rounded-lg transition-colors ${
                            config?.selected
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-slate-700 bg-slate-800/30'
                          }`}
                        >
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer"
                            onClick={() => setExpandedSheet(isExpanded ? null : sheet.name)}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={config?.selected || false}
                                onCheckedChange={() => toggleSheetSelection(sheet.name)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <p className="text-white font-medium">{sheet.name}</p>
                                <p className="text-slate-400 text-sm">
                                  {sheet.rowCount} שורות • {sheet.headers.length} עמודות
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {config?.selected && config?.targetTable && (
                                <Badge className="bg-emerald-500/20 text-emerald-400">
                                  → {config.targetTable}
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-2">
                                  <Label className="text-slate-300">טבלת יעד</Label>
                                  <Select
                                    value={config?.targetTable || ''}
                                    onValueChange={(v) =>
                                      updateSheetConfig(sheet.name, { targetTable: v })
                                    }
                                  >
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                      <SelectValue placeholder="בחר טבלה" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                      {tables.map((t) => (
                                        <SelectItem
                                          key={t.name}
                                          value={t.name}
                                          className="text-slate-300 focus:bg-slate-700"
                                        >
                                          {t.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Preview */}
                              <div className="text-slate-400 text-sm mb-2">תצוגה מקדימה:</div>
                              <div className="overflow-x-auto rounded border border-slate-700">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-slate-700">
                                      {sheet.headers.slice(0, 5).map((h) => (
                                        <TableHead key={h} className="text-slate-400 text-xs">
                                          {h}
                                        </TableHead>
                                      ))}
                                      {sheet.headers.length > 5 && (
                                        <TableHead className="text-slate-500 text-xs">
                                          +{sheet.headers.length - 5} עוד
                                        </TableHead>
                                      )}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sheet.preview.slice(0, 3).map((row, i) => (
                                      <TableRow key={i} className="border-slate-700">
                                        {sheet.headers.slice(0, 5).map((h) => (
                                          <TableCell
                                            key={h}
                                            className="text-slate-300 text-xs py-2 max-w-32 truncate"
                                          >
                                            {row[h] || '-'}
                                          </TableCell>
                                        ))}
                                        {sheet.headers.length > 5 && (
                                          <TableCell className="text-slate-500 text-xs">
                                            ...
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-slate-600 text-slate-300"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזור
                </Button>
                <Button
                  onClick={() => setStep('mapping')}
                  disabled={selectedSheets.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  המשך למיפוי
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Mapping Step */}
          {step === 'mapping' && selectedSheets.length > 0 && (
            <div className="space-y-6">
              {/* Sheet tabs */}
              {selectedSheets.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedSheets.map((config, i) => (
                    <Button
                      key={config.sheetName}
                      variant={currentSheetIndex === i ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentSheetIndex(i)}
                      className={
                        currentSheetIndex === i
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'border-slate-600 text-slate-300'
                      }
                    >
                      {config.sheetName}
                    </Button>
                  ))}
                </div>
              )}

              {(() => {
                const config = selectedSheets[currentSheetIndex];
                if (!config) return null;

                return (
                  <>
                    {/* Table Selection */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">
                          הגדרות ייבוא - {config.sheetName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-slate-300">טבלת יעד</Label>
                            <Select
                              value={config.targetTable}
                              onValueChange={(v) =>
                                updateSheetConfig(config.sheetName, { targetTable: v })
                              }
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                <SelectValue placeholder="בחר טבלה" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem
                                  value="__new__"
                                  className="text-emerald-400 focus:bg-slate-700"
                                >
                                  <span className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    צור טבלה חדשה
                                  </span>
                                </SelectItem>
                                {tables.length > 0 && (
                                  <div className="h-px bg-slate-700 my-1" />
                                )}
                                {tables.map((t) => (
                                  <SelectItem
                                    key={t.name}
                                    value={t.name}
                                    className="text-slate-300 focus:bg-slate-700"
                                  >
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {config.targetTable === '__new__' && (
                              <Input
                                placeholder="שם הטבלה החדשה"
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white mt-2"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300">עמודת עדכון (אופציונלי)</Label>
                            <Select
                              value={config.upsertColumn}
                              onValueChange={(v) =>
                                updateSheetConfig(config.sheetName, { upsertColumn: v })
                              }
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                <SelectValue placeholder="ללא - הוספה בלבד" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem
                                  value="__none__"
                                  className="text-slate-300 focus:bg-slate-700"
                                >
                                  ללא - הוספה בלבד
                                </SelectItem>
                                {config.columnMappings
                                  .filter((m) => m.enabled)
                                  .map((m) => (
                                    <SelectItem
                                      key={m.dbColumn}
                                      value={m.dbColumn}
                                      className="text-slate-300 focus:bg-slate-700"
                                    >
                                      {m.dbColumn}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`skipFirst-${config.sheetName}`}
                            checked={config.skipFirstRow}
                            onCheckedChange={(checked) =>
                              updateSheetConfig(config.sheetName, { skipFirstRow: !!checked })
                            }
                          />
                          <Label
                            htmlFor={`skipFirst-${config.sheetName}`}
                            className="text-slate-300 cursor-pointer"
                          >
                            דלג על שורה ראשונה (כותרות)
                          </Label>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>{config.sheetName}</span>
                          <Badge variant="outline" className="border-slate-600">
                            {config.rowCount} שורות
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Column Mappings */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">מיפוי עמודות</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400 w-12">פעיל</TableHead>
                              <TableHead className="text-slate-400">עמודה באקסל</TableHead>
                              <TableHead className="text-slate-400">שם בטבלה</TableHead>
                              <TableHead className="text-slate-400">סוג נתון</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config.columnMappings.map((mapping, index) => (
                              <TableRow key={index} className="border-slate-700">
                                <TableCell>
                                  <Checkbox
                                    checked={mapping.enabled}
                                    onCheckedChange={(checked) =>
                                      updateMapping(config.sheetName, index, 'enabled', !!checked)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-white font-medium">
                                  {mapping.excelColumn}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={mapping.dbColumn}
                                    onChange={(e) =>
                                      updateMapping(config.sheetName, index, 'dbColumn', e.target.value)
                                    }
                                    disabled={!mapping.enabled}
                                    className="bg-slate-800 border-slate-700 text-white h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={mapping.transform}
                                    onValueChange={(v) =>
                                      updateMapping(config.sheetName, index, 'transform', v)
                                    }
                                    disabled={!mapping.enabled}
                                  >
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                      <SelectItem value="string" className="text-slate-300">
                                        טקסט
                                      </SelectItem>
                                      <SelectItem value="number" className="text-slate-300">
                                        מספר
                                      </SelectItem>
                                      <SelectItem value="boolean" className="text-slate-300">
                                        בוליאני
                                      </SelectItem>
                                      <SelectItem value="date" className="text-slate-300">
                                        תאריך
                                      </SelectItem>
                                      <SelectItem value="json" className="text-slate-300">
                                        JSON
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => (sheetsInfo.length > 1 ? setStep('sheets') : handleReset())}
                  className="border-slate-600 text-slate-300"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזור
                </Button>
                <Button
                  onClick={() => setStep('preview')}
                  disabled={selectedSheets.some((s) => !s.targetTable)}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  המשך לתצוגה מקדימה
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-emerald-500" />
                      תצוגה מקדימה
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-500">
                      {selectedSheets.length} גיליונות •{' '}
                      {selectedSheets.reduce((sum, s) => sum + s.rowCount, 0)} שורות
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedSheets.map((config) => {
                      const enabledMappings = config.columnMappings.filter(m => m.enabled);
                      const transformedPreview = getTransformedPreview(config);
                      const isNewTable = config.targetTable === '__new__';
                      const displayTableName = isNewTable ? `${newTableName} (חדשה)` : config.targetTable;

                      return (
                        <div
                          key={config.sheetName}
                          className="p-4 bg-slate-700/30 rounded-lg border border-slate-700"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                              <span className="text-white font-medium">{config.sheetName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isNewTable && (
                                <Badge className="bg-blue-500/20 text-blue-400">
                                  <Plus className="h-3 w-3 mr-1" />
                                  חדשה
                                </Badge>
                              )}
                              <Badge variant="outline" className="border-slate-600">
                                → {displayTableName}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-slate-400">שורות:</span>{' '}
                              <span className="text-white">{config.rowCount}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">עמודות:</span>{' '}
                              <span className="text-white">{enabledMappings.length}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">מצב:</span>{' '}
                              <span className="text-white">
                                {config.upsertColumn && config.upsertColumn !== '__none__'
                                  ? 'עדכון/הוספה'
                                  : 'הוספה בלבד'}
                              </span>
                            </div>
                          </div>

                          {/* Data Preview Table */}
                          <div className="text-slate-400 text-sm mb-2">
                            תצוגה מקדימה של הנתונים (עד 5 שורות):
                          </div>
                          <div className="overflow-x-auto rounded border border-slate-700">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-slate-700">
                                  {enabledMappings.map((m) => (
                                    <TableHead key={m.dbColumn} className="text-slate-400 text-xs whitespace-nowrap">
                                      <div className="flex flex-col">
                                        <span>{m.dbColumn}</span>
                                        <span className="text-slate-500 font-normal">
                                          ({m.transform === 'string' ? 'טקסט' :
                                            m.transform === 'number' ? 'מספר' :
                                            m.transform === 'boolean' ? 'בוליאני' :
                                            m.transform === 'date' ? 'תאריך' : 'JSON'})
                                        </span>
                                      </div>
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transformedPreview.slice(0, 5).map((row, i) => (
                                  <TableRow key={i} className="border-slate-700">
                                    {enabledMappings.map((m) => (
                                      <TableCell
                                        key={m.dbColumn}
                                        className="text-slate-300 text-xs py-2 max-w-40 truncate"
                                      >
                                        {row[m.dbColumn] === null ? (
                                          <span className="text-slate-500 italic">null</span>
                                        ) : typeof row[m.dbColumn] === 'boolean' ? (
                                          <Badge variant="outline" className={row[m.dbColumn] ? 'text-emerald-400 border-emerald-400/30' : 'text-slate-400'}>
                                            {row[m.dbColumn] ? 'כן' : 'לא'}
                                          </Badge>
                                        ) : (
                                          String(row[m.dbColumn])
                                        )}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Column badges */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {enabledMappings.slice(0, 6).map((m) => (
                              <Badge
                                key={m.excelColumn}
                                variant="outline"
                                className="border-slate-600 text-slate-400 text-xs"
                              >
                                {m.excelColumn} → {m.dbColumn}
                              </Badge>
                            ))}
                            {enabledMappings.length > 6 && (
                              <Badge
                                variant="outline"
                                className="border-slate-600 text-slate-500 text-xs"
                              >
                                +{enabledMappings.length - 6} עוד
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep('mapping')}
                  className="border-slate-600 text-slate-300"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזור למיפוי
                </Button>
                <Button onClick={handleImport} className="bg-emerald-500 hover:bg-emerald-600">
                  <Import className="h-4 w-4 ml-2" />
                  סיום
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                  <Loader2 className="h-16 w-16 text-emerald-500 animate-spin" />
                  <p className="text-xl text-white">מייבא נתונים...</p>

                  {importProgress && (
                    <div className="w-full space-y-4">
                      {/* Current sheet */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">
                          גיליון: {importProgress.currentSheet}
                        </span>
                        <span className="text-slate-400">
                          {importProgress.sheetIndex + 1}/{importProgress.totalSheets}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <Progress
                          value={(importProgress.imported / importProgress.total) * 100}
                          className="h-3 bg-slate-700"
                        />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-emerald-400 font-medium">
                            {importProgress.imported.toLocaleString('he-IL')} שורות יובאו
                          </span>
                          <span className="text-slate-400">
                            מתוך {importProgress.total.toLocaleString('he-IL')}
                          </span>
                        </div>
                      </div>

                      {/* Percentage */}
                      <p className="text-center text-2xl font-bold text-emerald-400">
                        {Math.round((importProgress.imported / importProgress.total) * 100)}%
                      </p>
                    </div>
                  )}

                  {!importProgress && (
                    <p className="text-slate-400">מתחיל ייבוא...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  {importResults.some((r) => r.errors && r.errors.length > 0) ? (
                    <AlertCircle className="h-16 w-16 text-amber-500" />
                  ) : (
                    <Check className="h-16 w-16 text-emerald-500" />
                  )}
                  <p className="text-xl text-white">
                    {importResults.some((r) => r.errors && r.errors.length > 0)
                      ? 'הייבוא הושלם עם שגיאות'
                      : 'הייבוא הושלם בהצלחה!'}
                  </p>

                  {/* Results */}
                  <div className="w-full max-w-lg space-y-3 mt-4">
                    {importResults.map((result) => (
                      <div
                        key={result.sheetName}
                        className="p-3 bg-slate-700/30 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{result.sheetName}</span>
                          <Badge
                            className={
                              result.errors && result.errors.length > 0
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }
                          >
                            {result.imported}/{result.total} שורות
                          </Badge>
                        </div>
                        {result.errors && result.errors.length > 0 && (
                          <div className="text-xs text-red-400 mt-2">
                            {result.errors.slice(0, 2).map((err, i) => (
                              <p key={i}>{err}</p>
                            ))}
                            {result.errors.length > 2 && (
                              <p>+{result.errors.length - 2} שגיאות נוספות</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {createdTemplateId && (
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 mt-2">
                      <p className="text-emerald-400 text-sm flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        דשבורד נוצר אוטומטית מהעמודות שנבחרו
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 mt-4">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="border-slate-600 text-slate-300"
                    >
                      ייבוא נוסף
                    </Button>
                    <Button
                      onClick={() => {
                        if (createdTemplateId) {
                          router.push(`/projects/${projectId}/dashboard/${createdTemplateId}`);
                        } else {
                          router.push(`/projects/${projectId}?tab=dashboard`);
                        }
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <LayoutDashboard className="h-4 w-4 ml-2" />
                      צפה בדשבורד
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
