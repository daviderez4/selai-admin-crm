'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  LayoutDashboard,
  Sparkles,
  AlertCircle,
  Copy,
  ExternalLink,
  X,
  Trash2,
  History,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AnalysisSummary, TemplateSuggestions, CategoryColumnSelector } from '@/components/import';
import { ImportHistory } from '@/components/ImportHistory';
import type { AnalyzedColumn, ColumnCategory } from '@/types/dashboard';

interface CategorySummary {
  category: ColumnCategory;
  icon: string;
  label: string;
  count: number;
  columns: string[];
}

interface CalculatedField {
  name: string;
  displayName: string;
  formula: string;
  sourceColumns: string[];
  operation: 'sum' | 'subtract' | 'multiply' | 'divide' | 'concat';
}

interface ChartConfig {
  type: 'pie' | 'bar' | 'line' | 'area';
  title: string;
  valueColumn: string;
  groupByColumn: string;
}

interface TemplateSuggestion {
  id: string;
  name: string;
  icon: string;
  description: string;
  columns: string[];
  cardColumns: string[];
  filterColumns: string[];
  calculatedFields?: CalculatedField[];
  charts?: ChartConfig[];
}

interface AnalysisResult {
  fileName: string;
  sheetName: string;
  sheets: string[];
  totalRows: number;
  totalColumns: number;
  columns: AnalyzedColumn[];
  categories: Record<ColumnCategory, AnalyzedColumn[]>;
  categorySummary: CategorySummary[];
  keyFields: string[];
  recommendedFields: string[];
  templateSuggestions: TemplateSuggestion[];
}

interface ImportProgress {
  imported: number;
  total: number;
  status: string;
}

interface ImportHistoryItem {
  id: string;
  created_at: string;
  file_name: string;
  rows_imported: number;
  status: string;
  user_id: string;
}

interface CurrentStats {
  totalRecords: number;
  lastImport: string | null;
}

type ImportStep = 'upload' | 'analysis' | 'template' | 'importing' | 'complete';

// Fixed schema configuration for master project
const MASTER_PROJECT_CONFIG = {
  tableName: 'master_data',
  columns: {
    AZ: 51,   // סה"כ צבירה צפויה מניוד
    CZ: 103,  // הפקדה חד פעמית צפויה
    BE: 56,   // סוג מוצר חדש
    BF: 57,   // יצרן חדש
    DH: 111,  // תאריך העברת מסמכים ליצרן
    DO: 118,  // פרמיה צפויה
  },
};

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<TemplateSuggestion[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showCustomSelector, setShowCustomSelector] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [manualSql, setManualSql] = useState<string>('');
  const [pendingTableName, setPendingTableName] = useState<string>('');

  // Import mode is always append (growth mode)
  const importMode = 'append' as const;
  const [importMonth, setImportMonth] = useState(new Date().getMonth() + 1);
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [currentStats, setCurrentStats] = useState<CurrentStats>({ totalRecords: 0, lastImport: null });
  const [showHistory, setShowHistory] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  // Project info
  const [projectInfo, setProjectInfo] = useState<{ name: string; table_name: string } | null>(null);

  // Hebrew month names
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  // Table name descriptions
  const tableDescriptions: Record<string, string> = {
    master_data: 'נתוני מכירות / צבירה',
    insurance_data: 'נתוני ביטוח',
    processes_data: 'נתוני תהליכים',
    commissions_data: 'נתוני עמלות',
  };

  // Fetch project info first, then stats based on the project's table
  useEffect(() => {
    const fetchAll = async () => {
      // First, get project info
      try {
        const projectRes = await fetch(`/api/projects/${projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          const tableName = projectData.project?.table_name || 'master_data';
          setProjectInfo({
            name: projectData.project?.name || 'פרויקט',
            table_name: tableName,
          });
          console.log('Project uses table:', tableName);
        }
      } catch (error) {
        console.error('Failed to fetch project info:', error);
      }

      // Fetch current record count (API uses project's table_name internally)
      try {
        const statsRes = await fetch(`/api/projects/${projectId}/master-data?limit=1`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setCurrentStats({
            totalRecords: statsData.stats?.total || 0,
            lastImport: null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }

      // Fetch import history
      try {
        const historyRes = await fetch(`/api/projects/${projectId}/import-history`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setImportHistory(historyData.history || []);
          if (historyData.history?.length > 0) {
            setCurrentStats(prev => ({
              ...prev,
              lastImport: historyData.history[0].created_at,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    };

    fetchAll();
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

  // Process file - upload and analyze
  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/projects/${projectId}/excel/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze file');
      }

      const result = await response.json();

      setAnalysis(result);
      setNewTableName(sanitizeTableName(selectedFile.name.replace(/\.[^/.]+$/, '')));
      setStep('analysis');
      toast.success(`נותחו ${result.totalColumns} עמודות ו-${result.totalRows} שורות`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בניתוח הקובץ');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sanitize table name
  const sanitizeTableName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s\-]+/g, '_')
      .replace(/[^\w\u0590-\u05FF]/g, '')
      .replace(/^(\d)/, '_$1')
      .substring(0, 63);
  };

  // Handle template toggle (multiple selection)
  const handleTemplateToggle = (template: TemplateSuggestion) => {
    setSelectedTemplates(prev => {
      const isSelected = prev.some(t => t.id === template.id);
      let newSelected: TemplateSuggestion[];

      if (isSelected) {
        newSelected = prev.filter(t => t.id !== template.id);
      } else {
        newSelected = [...prev, template];
      }

      const combinedColumns = [...new Set(newSelected.flatMap(t => t.columns))];
      setSelectedColumns(combinedColumns);

      return newSelected;
    });
  };

  // Handle custom selection
  const handleCustomize = () => {
    setShowCustomSelector(true);
    setSelectedColumns(analysis?.recommendedFields || []);
  };

  // Confirm custom selection
  const handleCustomConfirm = () => {
    setShowCustomSelector(false);
    setSelectedTemplates([{
      id: 'custom',
      name: 'מותאם אישית',
      icon: '⚙️',
      description: `${selectedColumns.length} עמודות נבחרו`,
      columns: selectedColumns,
      cardColumns: [],
      filterColumns: [],
    }]);
  };

  // Handle delete all data
  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/master-data/clear`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete data');
      }

      toast.success(result.message || 'כל הנתונים נמחקו בהצלחה');
      setCurrentStats({ totalRecords: 0, lastImport: null });
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת הנתונים');
    } finally {
      setIsDeleting(false);
    }
  };

  // Show confirmation dialog before import
  const handleImportClick = () => {
    if (!file || !analysis) {
      toast.error('יש להעלות קובץ');
      return;
    }
    setShowImportConfirm(true);
  };

  // Handle direct import to project's table
  const handleDirectImport = async () => {
    setShowImportConfirm(false);

    if (!file || !analysis) {
      toast.error('יש להעלות קובץ');
      return;
    }

    const tableName = projectInfo?.table_name || 'master_data';

    setStep('importing');
    setIsLoading(true);
    setImportProgress({
      imported: 0,
      total: analysis.totalRows,
      status: `מייבא נתונים ל-${hebrewMonths[importMonth - 1]} ${importYear}...`
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', analysis.sheetName);
      formData.append('projectId', projectId);
      formData.append('importMode', importMode);
      formData.append('importMonth', String(importMonth));
      formData.append('importYear', String(importYear));
      formData.append('tableName', tableName);

      const response = await fetch(`/api/projects/${projectId}/excel/import-master`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to import');
      }

      if (result.imported === 0) {
        throw new Error(result.message || result.errors?.join(', ') || 'לא יובאו שורות');
      }

      setImportProgress({
        imported: result.imported,
        total: result.total,
        status: 'ייבוא הושלם!',
      });

      setCurrentStats({
        totalRecords: result.imported,
        lastImport: new Date().toISOString(),
      });

      setStep('complete');

      // Enhanced success toast with details
      const durationSec = result.durationMs ? (result.durationMs / 1000).toFixed(1) : '?';
      if (result.status === 'success') {
        toast.success(result.message || `✅ יובאו ${result.imported} שורות בהצלחה!`, {
          description: `טבלה: ${tableName} | זמן: ${durationSec} שניות`,
          duration: 5000,
        });
      } else if (result.status === 'partial') {
        toast.warning(`⚠️ יובאו ${result.imported} מתוך ${result.total} שורות`, {
          description: result.errors?.[0] || 'חלק מהנתונים לא יובאו',
          duration: 8000,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה בייבוא';
      toast.error(`❌ ${errorMessage}`, {
        description: 'בדוק את פורמט הקובץ ונסה שוב',
        duration: 8000,
      });
      setStep('upload');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!file || !analysis || selectedColumns.length === 0) {
      toast.error('יש לבחור לפחות עמודה אחת');
      return;
    }

    setStep('importing');
    setIsLoading(true);
    setImportProgress({ imported: 0, total: analysis.totalRows, status: 'מתחיל ייבוא...' });

    try {
      const tableName = sanitizeTableName(newTableName || file.name.replace(/\.[^/.]+$/, ''));

      const columnMappings = analysis.columns
        .filter(col => selectedColumns.includes(col.name))
        .map(col => ({
          excelColumn: col.name,
          dbColumn: sanitizeTableName(col.name),
          transform: col.dataType === 'number' ? 'number' :
                     col.dataType === 'date' ? 'date' :
                     col.dataType === 'boolean' ? 'boolean' : 'string',
        }));

      setImportProgress(prev => prev ? { ...prev, status: 'יוצר טבלה...' } : null);

      const columns = columnMappings.map(m => ({
        name: m.dbColumn,
        type: m.transform === 'number' ? 'numeric' :
              m.transform === 'date' ? 'timestamp' :
              m.transform === 'boolean' ? 'boolean' : 'text',
      }));

      const createResponse = await fetch(`/api/projects/${projectId}/tables/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName, columns }),
      });

      const createResult = await createResponse.json();

      if (createResult.needsManualCreation) {
        setManualSql(createResult.sql);
        setPendingTableName(tableName);
        setShowSqlModal(true);
        setStep('template');
        setIsLoading(false);
        return;
      }

      if (!createResponse.ok) {
        throw new Error(createResult.error || 'Failed to create table');
      }

      setImportProgress(prev => prev ? { ...prev, status: 'מייבא נתונים...' } : null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tableName', tableName);
      formData.append('sheetName', analysis.sheetName);
      formData.append('columnMappings', JSON.stringify(columnMappings));
      formData.append('skipFirstRow', 'true');

      const importResponse = await fetch(`/api/projects/${projectId}/excel/import`, {
        method: 'POST',
        body: formData,
      });

      const importResult = await importResponse.json();

      if (!importResponse.ok) {
        throw new Error(importResult.error || 'Failed to import data');
      }

      if (importResult.needsSetup) {
        setManualSql(importResult.setupSql);
        setPendingTableName(tableName);
        setShowSqlModal(true);
        setStep('template');
        setIsLoading(false);
        toast.error('יש להתקין את פונקציית SQL ראשית');
        return;
      }

      if (importResult.imported === 0) {
        const errorMsg = importResult.errors?.join(', ') || 'לא יובאו שורות - בדוק את הגדרות הטבלה';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (importResult.errors && importResult.errors.length > 0) {
        toast.warning(`חלק מהנתונים לא יובאו: ${importResult.errors[0]}`);
      }

      setImportProgress({
        imported: importResult.imported,
        total: importResult.total,
        status: 'ייבוא הושלם!',
      });

      setImportProgress(prev => prev ? { ...prev, status: 'יוצר דשבורד...' } : null);

      const templateResponse = await fetch(`/api/projects/${projectId}/templates/from-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          name: `דשבורד - ${tableName}`,
          columnMappings: columnMappings.map(m => ({ ...m, enabled: true })),
          sampleData: [],
        }),
      });

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        setCreatedTemplateId(templateData.templateId);
      }

      setStep('complete');
      toast.success(`יובאו ${importResult.imported} שורות בהצלחה!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בייבוא');
      setStep('template');
    } finally {
      setIsLoading(false);
    }
  };

  // Continue import after manual SQL execution
  const handleContinueAfterSql = async () => {
    setShowSqlModal(false);
    setStep('importing');
    setIsLoading(true);

    try {
      if (!file || !analysis) {
        throw new Error('Missing file or analysis data');
      }

      const tableName = pendingTableName;
      const columnMappings = analysis.columns
        .filter(col => selectedColumns.includes(col.name))
        .map(col => ({
          excelColumn: col.name,
          dbColumn: sanitizeTableName(col.name),
          transform: col.dataType === 'number' ? 'number' :
                     col.dataType === 'date' ? 'date' :
                     col.dataType === 'boolean' ? 'boolean' : 'string',
        }));

      setImportProgress({ imported: 0, total: analysis.totalRows, status: 'מייבא נתונים...' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tableName', tableName);
      formData.append('sheetName', analysis.sheetName);
      formData.append('columnMappings', JSON.stringify(columnMappings));
      formData.append('skipFirstRow', 'true');

      const importResponse = await fetch(`/api/projects/${projectId}/excel/import`, {
        method: 'POST',
        body: formData,
      });

      const importResult = await importResponse.json();

      if (!importResponse.ok) {
        throw new Error(importResult.error || 'Failed to import data');
      }

      if (importResult.imported === 0) {
        const errorMsg = importResult.errors?.join(', ') || 'לא יובאו שורות - ודא שהטבלה נוצרה';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (importResult.errors && importResult.errors.length > 0) {
        toast.warning(`חלק מהנתונים לא יובאו: ${importResult.errors[0]}`);
      }

      setImportProgress({
        imported: importResult.imported,
        total: importResult.total,
        status: 'ייבוא הושלם!',
      });

      setImportProgress(prev => prev ? { ...prev, status: 'יוצר דשבורד...' } : null);

      const templateResponse = await fetch(`/api/projects/${projectId}/templates/from-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          name: `דשבורד - ${tableName}`,
          columnMappings: columnMappings.map(m => ({ ...m, enabled: true })),
          sampleData: [],
        }),
      });

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        setCreatedTemplateId(templateData.templateId);
      }

      setStep('complete');
      toast.success(`יובאו ${importResult.imported} שורות בהצלחה!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בייבוא');
      setStep('template');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(manualSql);
      toast.success('SQL הועתק ללוח');
    } catch {
      toast.error('שגיאה בהעתקה');
    }
  };

  // Reset and start over
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setAnalysis(null);
    setSelectedTemplates([]);
    setSelectedColumns([]);
    setShowCustomSelector(false);
    setImportProgress(null);
    setCreatedTemplateId(null);
    setNewTableName('');
  };

  // Step indicator
  const steps = [
    { key: 'upload', label: 'העלאה', icon: Upload },
    { key: 'analysis', label: 'ניתוח', icon: Sparkles },
    { key: 'template', label: 'תבנית', icon: LayoutDashboard },
    { key: 'complete', label: 'סיום', icon: Check },
  ];

  const currentStepIndex = steps.findIndex(
    (s) => s.key === step || (step === 'importing' && s.key === 'complete')
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="ייבוא חכם מאקסל" />

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
        <div className="max-w-4xl mx-auto">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Current Stats Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Database className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">נתונים קיימים</h3>
                        <p className="text-slate-400 text-sm">
                          {currentStats.totalRecords.toLocaleString('he-IL')} רשומות בטבלת {projectInfo?.table_name || 'master_data'}
                        </p>
                        {currentStats.lastImport && (
                          <p className="text-slate-500 text-xs">
                            ייבוא אחרון: {new Date(currentStats.lastImport).toLocaleDateString('he-IL')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ImportHistory projectId={projectId} />
                      {currentStats.totalRecords > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          מחק הכל
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Import History */}
                  {showHistory && importHistory.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <h4 className="text-slate-300 text-sm font-medium mb-3">היסטוריית ייבואים</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {importHistory.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                              <span className="text-slate-300">{item.file_name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-slate-400">
                                {item.rows_imported.toLocaleString('he-IL')} שורות
                              </span>
                              <Badge
                                className={
                                  item.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }
                              >
                                {item.status === 'completed' ? 'הושלם' : 'חלקי'}
                              </Badge>
                              <span className="text-slate-500 text-xs">
                                {new Date(item.created_at).toLocaleDateString('he-IL')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Area */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
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
                        <p className="text-slate-300">מנתח את הקובץ...</p>
                        <p className="text-slate-500 text-sm">זיהוי סוגי עמודות וקטגוריות</p>
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
                        <p className="text-slate-600 text-xs mt-4">
                          תומך ב: XLSX, XLS, CSV • עד 200 עמודות
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analysis Step */}
          {step === 'analysis' && analysis && (
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                  <AnalysisSummary
                    fileName={analysis.fileName}
                    totalRows={analysis.totalRows}
                    totalColumns={analysis.totalColumns}
                    categorySummary={analysis.categorySummary}
                    keyFields={analysis.keyFields}
                  />
                </CardContent>
              </Card>

              {/* File Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-3xl font-bold text-white">{analysis.totalRows.toLocaleString('he-IL')}</p>
                    <p className="text-slate-400 text-sm">שורות</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-3xl font-bold text-white">{analysis.totalColumns.toLocaleString('he-IL')}</p>
                    <p className="text-slate-400 text-sm">עמודות</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-3xl font-bold text-white">{analysis.sheets.length}</p>
                    <p className="text-slate-400 text-sm">גיליונות</p>
                  </CardContent>
                </Card>
              </div>

              {/* Direct Import to Project Table */}
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="pt-6 pb-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <Database className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg">
                            ייבוא לטבלת {projectInfo?.table_name || 'master_data'}
                          </h3>
                          <p className="text-slate-400 text-sm">
                            {tableDescriptions[projectInfo?.table_name || 'master_data'] || 'נתונים'}
                          </p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">
                              {currentStats.totalRecords.toLocaleString('he-IL')} רשומות קיימות
                            </Badge>
                            <Badge className="bg-slate-600/50 text-slate-300 text-xs font-mono">
                              {projectInfo?.table_name || 'master_data'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={handleImportClick}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        disabled={isLoading}
                      >
                        <Upload className="h-4 w-4 ml-2" />
                        ייבוא נתונים
                      </Button>
                    </div>

                    {/* Import Period Selection */}
                    <div className="space-y-3">
                      <p className="text-slate-300 font-medium text-sm">בחר תקופת הייבוא:</p>

                      <div className="flex gap-3 items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <span className="text-slate-400 text-sm">חודש:</span>
                        <select
                          value={importMonth}
                          onChange={(e) => setImportMonth(Number(e.target.value))}
                          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          {hebrewMonths.map((month, i) => (
                            <option key={i + 1} value={i + 1}>{month}</option>
                          ))}
                        </select>
                        <span className="text-slate-400 text-sm">שנה:</span>
                        <select
                          value={importYear}
                          onChange={(e) => setImportYear(Number(e.target.value))}
                          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          {[2023, 2024, 2025, 2026, 2027].map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-emerald-400 text-sm flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          הנתונים יתווספו למאגר הקיים ויסומנו עם תקופת {hebrewMonths[importMonth - 1]} {importYear}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-sm">או</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

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
                  onClick={() => setStep('template')}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  מיפוי ידני מתקדם
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Template Selection Step */}
          {step === 'template' && analysis && !showCustomSelector && (
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                  <TemplateSuggestions
                    suggestions={analysis.templateSuggestions}
                    selectedIds={selectedTemplates.map(t => t.id)}
                    onToggle={handleTemplateToggle}
                    onCustomize={handleCustomize}
                    totalSelectedColumns={selectedColumns.length}
                  />
                </CardContent>
              </Card>

              {/* Selected templates info */}
              {selectedTemplates.length > 0 && !selectedTemplates.some(t => t.id === 'custom') && (
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-1">
                          {selectedTemplates.map(t => (
                            <span key={t.id} className="text-2xl">{t.icon}</span>
                          ))}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {selectedTemplates.length === 1
                              ? selectedTemplates[0].name
                              : `${selectedTemplates.length} תבניות נבחרו`}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {selectedColumns.length} עמודות יובאו (ללא כפילויות)
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400">
                        נבחר
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep('analysis')}
                  className="border-slate-600 text-slate-300"
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזור
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedTemplates.length === 0 || selectedColumns.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8"
                >
                  <FileSpreadsheet className="h-5 w-5 ml-2" />
                  ייבוא וצור דשבורד
                </Button>
              </div>

              {/* Warning if no selection */}
              {selectedTemplates.length === 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  בחר תבנית להמשך
                </div>
              )}
            </div>
          )}

          {/* Custom Column Selector */}
          {step === 'template' && showCustomSelector && analysis && (
            <CategoryColumnSelector
              columns={analysis.columns}
              categorySummary={analysis.categorySummary}
              selectedColumns={selectedColumns}
              onSelectionChange={setSelectedColumns}
              onConfirm={handleCustomConfirm}
              onCancel={() => setShowCustomSelector(false)}
            />
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                  <Loader2 className="h-16 w-16 text-emerald-500 animate-spin" />
                  <p className="text-xl text-white">
                    {importProgress?.status || 'מייבא נתונים...'}
                  </p>

                  {importProgress && (
                    <div className="w-full space-y-4">
                      <Progress
                        value={(importProgress.imported / importProgress.total) * 100}
                        className="h-3 bg-slate-700"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-400 font-medium">
                          {importProgress.imported.toLocaleString('he-IL')} שורות
                        </span>
                        <span className="text-slate-400">
                          מתוך {importProgress.total.toLocaleString('he-IL')}
                        </span>
                      </div>
                    </div>
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
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Check className="h-10 w-10 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">הייבוא הושלם בהצלחה!</p>

                  {importProgress && (
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{importProgress.imported.toLocaleString('he-IL')} שורות יובאו</span>
                      <span>•</span>
                      <span>{selectedColumns.length || 19} עמודות</span>
                    </div>
                  )}

                  {createdTemplateId && (
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 mt-2">
                      <p className="text-emerald-400 text-sm flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        דשבורד נוצר אוטומטית עם כרטיסים ופילטרים
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 mt-6">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="border-slate-600 text-slate-300"
                    >
                      ייבוא נוסף
                    </Button>
                    <Button
                      onClick={() => router.push(`/projects/${projectId}/data`)}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <Database className="h-4 w-4 ml-2" />
                      צפה בנתונים
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">אישור מחיקה</h3>
                <p className="text-slate-400 text-sm">פעולה זו בלתי הפיכה!</p>
              </div>
            </div>

            <p className="text-slate-300 mb-6">
              האם אתה בטוח שברצונך למחוק את כל {currentStats.totalRecords.toLocaleString('he-IL')} הרשומות מטבלת {projectInfo?.table_name || 'master_data'}?
            </p>

            <div className="flex gap-3">
              <Button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Trash2 className="h-4 w-4 ml-2" />
                )}
                כן, מחק הכל
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300"
              >
                ביטול
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Modal */}
      {showImportConfirm && analysis && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">אישור ייבוא</h3>
                <p className="text-slate-400 text-sm">סיכום פרטי הייבוא</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-400">קובץ</span>
                <span className="text-white font-medium">{file?.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-400">שורות לייבוא</span>
                <span className="text-emerald-400 font-bold">{analysis.totalRows.toLocaleString('he-IL')}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-400">טבלת יעד</span>
                <span className="text-white font-mono">{projectInfo?.table_name || 'master_data'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-slate-400">תקופת ייבוא</span>
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  {hebrewMonths[importMonth - 1]} {importYear}
                </Badge>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <p className="text-emerald-400 text-sm flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  הנתונים יתווספו למאגר הקיים ({currentStats.totalRecords.toLocaleString('he-IL')} רשומות)
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDirectImport}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Check className="h-4 w-4 ml-2" />
                אשר וייבא
              </Button>
              <Button
                onClick={() => setShowImportConfirm(false)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300"
              >
                ביטול
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Modal for manual table creation */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">יצירת טבלה ידנית נדרשת</h3>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-auto max-h-[60vh]">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-400 text-sm">
                  לא ניתן ליצור את הטבלה אוטומטית. יש להריץ את ה-SQL הבא בסופרבייס ידנית.
                </p>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <p className="text-slate-300 text-sm font-medium">שלבים:</p>
                <ol className="list-decimal list-inside text-slate-400 text-sm space-y-1 mr-2">
                  <li>לחץ על הכפתור למטה להעתקת ה-SQL</li>
                  <li>לך לפרויקט Supabase שלך</li>
                  <li>פתח את SQL Editor</li>
                  <li>הדבק את ה-SQL והרץ אותו</li>
                  <li>חזור כאן ולחץ &quot;המשך ייבוא&quot;</li>
                </ol>
              </div>

              {/* SQL Code */}
              <div className="relative">
                <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
                  {manualSql}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopySql}
                  className="border-slate-600 text-slate-300"
                >
                  <Copy className="h-4 w-4 ml-2" />
                  העתק SQL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  className="border-slate-600 text-slate-300"
                >
                  <ExternalLink className="h-4 w-4 ml-2" />
                  פתח Supabase
                </Button>
              </div>
              <Button
                onClick={handleContinueAfterSql}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                המשך ייבוא
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
