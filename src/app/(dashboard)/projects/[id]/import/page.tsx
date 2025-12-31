'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AnalysisSummary, TemplateSuggestions, CategoryColumnSelector } from '@/components/import';
import type { AnalyzedColumn, ColumnCategory } from '@/types/dashboard';

interface CategorySummary {
  category: ColumnCategory;
  icon: string;
  label: string;
  count: number;
  columns: string[];
}

interface TemplateSuggestion {
  id: string;
  name: string;
  icon: string;
  description: string;
  columns: string[];
  cardColumns: string[];
  filterColumns: string[];
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

type ImportStep = 'upload' | 'analysis' | 'template' | 'importing' | 'complete';

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSuggestion | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showCustomSelector, setShowCustomSelector] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');

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

  // Handle template selection
  const handleTemplateSelect = (template: TemplateSuggestion) => {
    setSelectedTemplate(template);
    setSelectedColumns(template.columns);
  };

  // Handle custom selection
  const handleCustomize = () => {
    setShowCustomSelector(true);
    setSelectedColumns(analysis?.recommendedFields || []);
  };

  // Confirm custom selection
  const handleCustomConfirm = () => {
    setShowCustomSelector(false);
    setSelectedTemplate({
      id: 'custom',
      name: 'מותאם אישית',
      icon: '⚙️',
      description: `${selectedColumns.length} עמודות נבחרו`,
      columns: selectedColumns,
      cardColumns: [],
      filterColumns: [],
    });
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

      // Get column mappings for selected columns
      const columnMappings = analysis.columns
        .filter(col => selectedColumns.includes(col.name))
        .map(col => ({
          excelColumn: col.name,
          dbColumn: sanitizeTableName(col.name),
          transform: col.dataType === 'number' ? 'number' :
                     col.dataType === 'date' ? 'date' :
                     col.dataType === 'boolean' ? 'boolean' : 'string',
        }));

      // Create table first
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

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create table');
      }

      // Import data
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

      setImportProgress({
        imported: importResult.imported,
        total: importResult.total,
        status: 'ייבוא הושלם!',
      });

      // Create dashboard template
      setImportProgress(prev => prev ? { ...prev, status: 'יוצר דשבורד...' } : null);

      const templateResponse = await fetch(`/api/projects/${projectId}/templates/from-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          name: `דשבורד - ${tableName}`,
          columnMappings: columnMappings.map(m => ({ ...m, enabled: true })),
          sampleData: [], // Will be fetched from table
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

  // Reset and start over
  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setAnalysis(null);
    setSelectedTemplate(null);
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
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  המשך לבחירת תבנית
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
                    selectedId={selectedTemplate?.id || null}
                    onSelect={handleTemplateSelect}
                    onCustomize={handleCustomize}
                  />
                </CardContent>
              </Card>

              {/* Selected template info */}
              {selectedTemplate && selectedTemplate.id !== 'custom' && (
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedTemplate.icon}</span>
                        <div>
                          <p className="text-white font-medium">{selectedTemplate.name}</p>
                          <p className="text-slate-400 text-sm">
                            {selectedTemplate.columns.length} עמודות יובאו
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
                  disabled={!selectedTemplate || selectedColumns.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-lg px-8"
                >
                  <FileSpreadsheet className="h-5 w-5 ml-2" />
                  ייבוא וצור דשבורד
                </Button>
              </div>

              {/* Warning if no selection */}
              {!selectedTemplate && (
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
                      <span>{selectedColumns.length} עמודות</span>
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
