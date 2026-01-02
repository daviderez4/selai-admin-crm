'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_TYPES,
  type DashboardType,
  type DashboardTypeConfig,
} from '@/lib/dashboardTypes';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Upload,
  FileSpreadsheet,
  X,
  Database,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: { id: string; name: string }) => void;
}

interface ProjectFormData {
  name: string;
  description: string;
  dashboardType: DashboardType;
  selectedTable: string;
}

interface DetectedColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  sample: string;
}

// Central Supabase URL - displayed in UI
const CENTRAL_SUPABASE_URL = 'https://vcskhgqeqctitubryoet.supabase.co';

// All available tables in the system (must exist in Supabase)
const AVAILABLE_TABLES = [
  { value: 'master_data', label: 'master_data', description: 'נתוני מכירות / צבירה', icon: '📊' },
  { value: 'insurance_data', label: 'insurance_data', description: 'נתוני ביטוח', icon: '🛡️' },
  { value: 'processes_data', label: 'processes_data', description: 'נתוני תהליכים', icon: '⚙️' },
  { value: 'commissions_data', label: 'commissions_data', description: 'נתוני עמלות', icon: '💵' },
];

const STEPS = [
  { id: 1, title: 'סוג דשבורד', description: 'בחר את סוג הדשבורד' },
  { id: 2, title: 'פרטים', description: 'שם, טבלה וקובץ' },
  { id: 3, title: 'סיכום', description: 'אישור ויצירה' },
];

export function NewProjectModal({ open, onOpenChange, onProjectCreated }: NewProjectModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [totalRows, setTotalRows] = useState(0);

  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    dashboardType: 'accumulation',
    selectedTable: 'master_data',
  });

  const selectedType = DASHBOARD_TYPES[formData.dashboardType];

  // File handling - analyze file and detect sheets
  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();

      // Try different read options to handle various Excel formats
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(buffer, {
          type: 'array',
          cellDates: true,
          codepage: 65001, // UTF-8
        });
      } catch (xlsxError) {
        // Try with different options if first attempt fails
        console.warn('First XLSX read attempt failed, trying alternative:', xlsxError);
        workbook = XLSX.read(buffer, {
          type: 'array',
        });
      }

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('לא נמצאו גיליונות בקובץ');
      }

      // Store workbook reference and available sheets
      setWorkbookRef(workbook);
      setAvailableSheets(workbook.SheetNames);

      // Auto-select first sheet
      const firstSheet = workbook.SheetNames[0];
      setSelectedSheet(firstSheet);

      // Analyze the first sheet
      analyzeSheet(workbook, firstSheet);
      setUploadedFile(file);
    } catch (err) {
      console.error('Excel parse error:', err);
      const errorMessage = err instanceof Error ? err.message : 'שגיאה בניתוח הקובץ';
      // Provide more helpful error messages
      if (errorMessage.includes('Bad uncompressed size') || errorMessage.includes('compression')) {
        setError('שגיאה בקריאת הקובץ - נסה לשמור את הקובץ מחדש כ-xlsx או להמיר ל-csv');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze a specific sheet
  const analyzeSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = workbook.Sheets[sheetName];

      // Get data as array of arrays - first row will be headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      }) as unknown[][];

      if (jsonData.length < 2) {
        setError('הגיליון ריק או ללא נתונים');
        setDetectedColumns([]);
        setTotalRows(0);
        return;
      }

      // First row is headers
      const headers = jsonData[0] as string[];
      // Second row is first data row (for sample values)
      const firstDataRow = jsonData[1] as unknown[];

      console.log('Sheet:', sheetName);
      console.log('Headers from first row:', headers);
      console.log('First data row:', firstDataRow);

      const columns: DetectedColumn[] = [];

      for (let index = 0; index < headers.length; index++) {
        const header = headers[index];
        // Skip empty headers
        if (!header || !String(header).trim()) continue;

        const sample = firstDataRow[index];
        let type: 'text' | 'number' | 'date' | 'boolean' = 'text';

        if (typeof sample === 'number') {
          type = 'number';
        } else if (sample instanceof Date) {
          type = 'date';
        } else if (typeof sample === 'boolean') {
          type = 'boolean';
        } else if (typeof sample === 'string' && sample.trim()) {
          // Try to detect number strings
          const cleaned = sample.replace(/[,₪$€%\s]/g, '').trim();
          if (cleaned && !isNaN(Number(cleaned))) {
            type = 'number';
          }
        }

        columns.push({
          name: String(header).trim(),
          type,
          sample: sample !== null && sample !== undefined && sample !== ''
            ? String(sample).slice(0, 50)
            : '-',
        });
      }

      if (columns.length === 0) {
        setError('לא נמצאו עמודות עם כותרות בגיליון');
        return;
      }

      setDetectedColumns(columns);
      setTotalRows(jsonData.length - 1); // Exclude header row
      setError(null);
    } catch (err) {
      console.error('Sheet analysis error:', err);
      setError('שגיאה בניתוח הגיליון');
    }
  };

  // Handle sheet selection change
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbookRef) {
      analyzeSheet(workbookRef, sheetName);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeFile(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx?|csv)$/i.test(file.name)) {
      analyzeFile(file);
    }
  };

  const handleTypeSelect = (type: DashboardType) => {
    const config = DASHBOARD_TYPES[type];
    setFormData(prev => ({
      ...prev,
      dashboardType: type,
      selectedTable: config.defaultTableName,
    }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Simple payload - API handles getting credentials from central Supabase
      const payload = {
        name: formData.name,
        description: formData.description,
        table_name: formData.selectedTable,
        data_type: formData.dashboardType,
        icon: selectedType.icon.displayName?.toLowerCase() || 'layout-dashboard',
        color: selectedType.color,
      };

      console.log('=== Creating new project ===');
      console.log('Payload:', payload);

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('API Response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create project');
      }

      const { project } = responseData;
      console.log('New project created:', project);
      console.log('New project ID:', project?.id);
      console.log('New project name:', project?.name);

      // If we have an uploaded file, import data using the import-master API
      if (uploadedFile && detectedColumns.length > 0) {
        console.log('Importing file to table:', formData.selectedTable, 'sheet:', selectedSheet);

        const importFormData = new FormData();
        importFormData.append('file', uploadedFile);
        importFormData.append('tableName', formData.selectedTable);
        importFormData.append('sheetName', selectedSheet); // Pass selected sheet
        importFormData.append('importMode', 'append');
        importFormData.append('importMonth', String(new Date().getMonth() + 1));
        importFormData.append('importYear', String(new Date().getFullYear()));

        const importRes = await fetch(`/api/projects/${project.id}/excel/import-master`, {
          method: 'POST',
          body: importFormData,
        });

        const importResult = await importRes.json();

        if (!importRes.ok) {
          console.warn('Import warning:', importResult);
          // Don't fail project creation, just warn
        } else {
          console.log('Import success:', importResult.message, '- imported', importResult.imported, 'rows');
        }
      }

      onProjectCreated?.(project);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הפרויקט');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      description: '',
      dashboardType: 'accumulation',
      selectedTable: 'master_data',
    });
    setUploadedFile(null);
    setDetectedColumns([]);
    setAvailableSheets([]);
    setSelectedSheet('');
    setWorkbookRef(null);
    setTotalRows(0);
    setError(null);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.dashboardType;
      case 2:
        return formData.name.trim().length > 0 && !!formData.selectedTable;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderDashboardTypeCard = (config: DashboardTypeConfig) => {
    const isSelected = formData.dashboardType === config.id;
    const Icon = config.icon;

    return (
      <button
        key={config.id}
        type="button"
        onClick={() => handleTypeSelect(config.id)}
        className={cn(
          'relative p-4 rounded-xl border-2 transition-all text-right',
          isSelected
            ? 'border-cyan-500 bg-cyan-500/10'
            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
        )}
      >
        {isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center bg-cyan-500">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
          `bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}`
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h4 className="font-semibold text-white mb-1">{config.name}</h4>
        <p className="text-xs text-slate-400">{config.description}</p>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">יצירת פרויקט חדש</DialogTitle>
        </DialogHeader>

        {/* Step Indicator - 3 Steps */}
        <div className="flex items-center justify-center mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    currentStep === step.id
                      ? 'bg-cyan-500 text-white'
                      : currentStep > step.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  )}
                >
                  {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                </div>
                <span className="text-xs text-slate-400 mt-1">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 sm:w-24 h-0.5 mx-3',
                    currentStep > step.id ? 'bg-emerald-500' : 'bg-slate-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[350px]">
          {/* Step 1: Dashboard Type */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">בחר את סוג הדשבורד:</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(DASHBOARD_TYPES).map(renderDashboardTypeCard)}
              </div>
            </div>
          )}

          {/* Step 2: Name + Table + File */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">שם הפרויקט *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="לדוגמה: דשבורד צבירה ראשי"
                  className="bg-slate-800 border-slate-700 text-white"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="תיאור קצר..."
                  className="bg-slate-800 border-slate-700 text-white resize-none"
                  rows={2}
                />
              </div>

              {/* Table Selection */}
              <div className="space-y-2">
                <Label className="text-slate-300">בחר טבלה לאחסון הנתונים</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_TABLES.map(table => (
                    <button
                      key={table.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, selectedTable: table.value }))}
                      className={cn(
                        'p-3 rounded-lg border transition-all text-right flex items-center gap-2',
                        formData.selectedTable === table.value
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      )}
                    >
                      <span className="text-lg">{table.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{table.description}</p>
                        <p className="text-xs text-slate-500 font-mono">{table.label}</p>
                      </div>
                      {formData.selectedTable === table.value && (
                        <Check className="h-4 w-4 text-cyan-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2 pt-2">
                <Label className="text-slate-300">העלאת קובץ אקסל (אופציונלי)</Label>
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-4 text-center transition-colors',
                    uploadedFile
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-slate-600 hover:border-emerald-500'
                  )}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                      <span className="text-slate-400 text-sm">מנתח קובץ...</span>
                    </div>
                  ) : !uploadedFile ? (
                    <label className="cursor-pointer block">
                      <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400 text-sm">גרור קובץ או לחץ לבחירה</p>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                        <div className="text-right">
                          <p className="font-medium text-white text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-slate-400">
                            {detectedColumns.length} עמודות • {totalRows.toLocaleString('he-IL')} שורות
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFile(null);
                            setDetectedColumns([]);
                            setAvailableSheets([]);
                            setSelectedSheet('');
                            setWorkbookRef(null);
                            setTotalRows(0);
                          }}
                          className="p-1 hover:bg-slate-700 rounded"
                        >
                          <X className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>

                      {/* Sheet Selector - show when multiple sheets */}
                      {availableSheets.length > 1 && (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-slate-400">גיליון:</span>
                          <select
                            value={selectedSheet}
                            onChange={(e) => handleSheetChange(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                          >
                            {availableSheets.map((sheet) => (
                              <option key={sheet} value={sheet}>
                                {sheet}
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-slate-500">
                            ({availableSheets.length} גיליונות)
                          </span>
                        </div>
                      )}

                      {/* Column Preview */}
                      {detectedColumns.length > 0 && (
                        <div className="max-h-24 overflow-y-auto text-right">
                          <p className="text-xs text-slate-500 mb-1">עמודות שזוהו:</p>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {detectedColumns.slice(0, 10).map((col, i) => (
                              <span
                                key={i}
                                className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300"
                              >
                                {col.name}
                              </span>
                            ))}
                            {detectedColumns.length > 10 && (
                              <span className="text-xs text-slate-500">
                                +{detectedColumns.length - 10} נוספות
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">סיכום הפרויקט:</p>

              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    `bg-gradient-to-br ${selectedType.gradientFrom} ${selectedType.gradientTo}`
                  )}>
                    <selectedType.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{formData.name}</h3>
                    <p className="text-sm text-slate-400">{selectedType.name}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">טבלה</p>
                    <p className="text-sm text-white font-mono bg-slate-700/50 px-2 py-1 rounded">
                      {formData.selectedTable}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Database</p>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-emerald-400">מרכזי</span>
                    </div>
                  </div>
                </div>

                {/* Supabase URL */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Supabase URL</p>
                  <p className="text-sm text-slate-300 font-mono bg-slate-700/50 px-2 py-1 rounded" dir="ltr">
                    {CENTRAL_SUPABASE_URL}
                  </p>
                </div>

                {/* File */}
                {uploadedFile && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">קובץ לייבוא</p>
                    <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-2 rounded flex-wrap">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-emerald-300">{uploadedFile.name}</span>
                      {availableSheets.length > 1 && (
                        <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">
                          גיליון: {selectedSheet}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        ({detectedColumns.length} עמודות • {totalRows.toLocaleString('he-IL')} שורות)
                      </span>
                    </div>
                  </div>
                )}

                {formData.description && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">תיאור</p>
                    <p className="text-sm text-slate-300">{formData.description}</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isCreating}
            className="text-slate-400 hover:text-white"
          >
            <ChevronRight className="h-4 w-4 ml-1" />
            הקודם
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              הבא
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canProceed() || isCreating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ml-2" />
                  צור פרויקט
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
