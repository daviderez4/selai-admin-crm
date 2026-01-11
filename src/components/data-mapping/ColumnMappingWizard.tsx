'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  SourceColumn,
  ColumnMapping,
  StandardField,
  MappingSuggestion,
  MappingConfiguration,
  ImportSettings,
  ColumnDataType,
} from '@/types/column-mapping';
import {
  STANDARD_FIELDS,
  findMatchingFields,
  getStandardFieldsByCategory,
} from '@/types/column-mapping';
import { DataPreview } from './DataPreview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  X,
  Wand2,
  FileCheck,
  Settings,
  Link2,
  Link2Off,
  RefreshCw,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ColumnMappingWizardProps {
  projectId: string;
  fileName: string;
  sheetName?: string;
  sourceColumns: SourceColumn[];
  previewData: Record<string, unknown>[];
  totalRows: number;
  onComplete: (config: MappingConfiguration) => void;
  onCancel: () => void;
  existingConfig?: MappingConfiguration;
}

type WizardStep = 'preview' | 'mapping' | 'review' | 'settings';

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'זיהוי',
  contact: 'יצירת קשר',
  financial: 'כספי',
  product: 'מוצר',
  dates: 'תאריכים',
  status: 'סטטוס',
  agent: 'סוכן',
  custom: 'מותאם אישית',
};

export function ColumnMappingWizard({
  projectId,
  fileName,
  sheetName,
  sourceColumns,
  previewData,
  totalRows,
  onComplete,
  onCancel,
  existingConfig,
}: ColumnMappingWizardProps) {
  const [step, setStep] = useState<WizardStep>('preview');
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([]);
  const [selectedSourceColumn, setSelectedSourceColumn] = useState<SourceColumn | null>(null);
  const [settings, setSettings] = useState<ImportSettings>({
    skipRows: 1,
    duplicateHandling: 'skip',
    uniqueColumns: [],
    validateBeforeImport: true,
    createBackup: true,
  });

  // Natural language mapping state
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);

  // Mapping dialog state
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');

  // Auto-suggest on load
  useEffect(() => {
    if (existingConfig) {
      setMappings(existingConfig.mappings);
      setIgnoredColumns(existingConfig.ignoredColumns);
      setSettings(existingConfig.settings);
    } else {
      // Auto-suggest mappings based on column names
      autoSuggestMappings();
    }
  }, [existingConfig, sourceColumns]);

  const autoSuggestMappings = useCallback(() => {
    const autoMappings: ColumnMapping[] = [];

    sourceColumns.forEach((col) => {
      const matches = findMatchingFields(col.name);
      if (matches.length > 0) {
        const bestMatch = matches[0];
        // Calculate confidence based on match quality
        const exactMatch =
          bestMatch.label.toLowerCase() === col.name.toLowerCase() ||
          bestMatch.keywords.some((kw) => kw.toLowerCase() === col.name.toLowerCase());

        autoMappings.push({
          sourceColumn: col.name,
          targetField: bestMatch.id,
          confirmed: false,
          confidence: exactMatch ? 95 : 70,
        });
      }
    });

    setMappings(autoMappings);
  }, [sourceColumns]);

  const handleColumnSelect = (column: SourceColumn) => {
    setSelectedSourceColumn(column);
    setMappingDialogOpen(true);
  };

  const handleToggleIgnore = (columnName: string) => {
    setIgnoredColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((c) => c !== columnName)
        : [...prev, columnName]
    );
    // Remove any mapping for this column
    setMappings((prev) => prev.filter((m) => m.sourceColumn !== columnName));
  };

  const handleMapColumn = (sourceColumn: string, targetField: string, displayLabel?: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.sourceColumn === sourceColumn);
      if (existing) {
        return prev.map((m) =>
          m.sourceColumn === sourceColumn
            ? { ...m, targetField, confirmed: true, displayLabel }
            : m
        );
      }
      return [...prev, { sourceColumn, targetField, confirmed: true, displayLabel }];
    });
    setMappingDialogOpen(false);
    setCustomFieldName('');
  };

  const handleRemoveMapping = (sourceColumn: string) => {
    setMappings((prev) => prev.filter((m) => m.sourceColumn !== sourceColumn));
  };

  const handleConfirmMapping = (sourceColumn: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn ? { ...m, confirmed: true } : m
      )
    );
  };

  const handleNaturalLanguageQuery = async () => {
    if (!nlQuery.trim()) return;

    setNlLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/column-mapping/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nlQuery,
          sourceColumns,
          currentMappings: mappings,
        }),
      });

      if (!response.ok) throw new Error('Failed to get suggestions');

      const data = await response.json();
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
        // Apply high-confidence suggestions automatically
        const highConfidence = data.suggestions.filter(
          (s: MappingSuggestion) => s.confidence >= 80
        );
        if (highConfidence.length > 0) {
          setMappings((prev) => {
            const updated = [...prev];
            highConfidence.forEach((s: MappingSuggestion) => {
              const idx = updated.findIndex(
                (m) => m.sourceColumn === s.mapping.sourceColumn
              );
              if (idx >= 0) {
                updated[idx] = { ...s.mapping, confirmed: false };
              } else {
                updated.push({ ...s.mapping, confirmed: false });
              }
            });
            return updated;
          });
          toast.success(`נמצאו ${highConfidence.length} התאמות בביטחון גבוה`);
        }
      }
      if (data.message) {
        toast.info(data.message);
      }
    } catch (error) {
      console.error('NL query error:', error);
      toast.error('שגיאה בעיבוד הבקשה');
    } finally {
      setNlLoading(false);
      setNlQuery('');
    }
  };

  const handleAutoMapAll = async () => {
    setNlLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/column-mapping/auto-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceColumns }),
      });

      if (!response.ok) throw new Error('Failed to auto-map');

      const data = await response.json();
      if (data.mappings?.length > 0) {
        setMappings(data.mappings);
        toast.success(`בוצע מיפוי אוטומטי ל-${data.mappings.length} עמודות`);
      }
    } catch (error) {
      console.error('Auto-map error:', error);
      // Fallback to local auto-suggest
      autoSuggestMappings();
      toast.info('בוצע מיפוי מקומי');
    } finally {
      setNlLoading(false);
    }
  };

  const getMappedField = (sourceColumn: string): ColumnMapping | undefined => {
    return mappings.find((m) => m.sourceColumn === sourceColumn);
  };

  const getFieldLabel = (fieldId: string): string => {
    if (fieldId.startsWith('custom:')) {
      return fieldId.substring(7);
    }
    const field = STANDARD_FIELDS.find((f) => f.id === fieldId);
    return field?.label || fieldId;
  };

  const handleComplete = () => {
    const config: MappingConfiguration = {
      id: existingConfig?.id || crypto.randomUUID(),
      projectId,
      name: `${fileName} - מיפוי`,
      sourceFile: {
        name: fileName,
        type: fileName.endsWith('.csv') ? 'csv' : 'xlsx',
        sheetName,
        totalRows,
        totalColumns: sourceColumns.length,
        uploadedAt: new Date().toISOString(),
      },
      sourceColumns,
      mappings: mappings.filter((m) => m.confirmed),
      ignoredColumns,
      settings,
      approved: true,
      approvedAt: new Date().toISOString(),
      createdAt: existingConfig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onComplete(config);
  };

  const steps: { id: WizardStep; label: string; description: string }[] = [
    { id: 'preview', label: 'סקירת הקובץ', description: 'הצגת מבנה הנתונים' },
    { id: 'mapping', label: 'מיפוי עמודות', description: 'התאמת עמודות לשדות' },
    { id: 'settings', label: 'הגדרות', description: 'אפשרויות ייבוא' },
    { id: 'review', label: 'אישור', description: 'סקירה ואישור סופי' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);
  const confirmedCount = mappings.filter((m) => m.confirmed).length;
  const pendingCount = mappings.filter((m) => !m.confirmed).length;
  const unmappedCount = sourceColumns.length - mappings.length - ignoredColumns.length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => idx <= currentStepIndex && setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === s.id
                  ? 'bg-primary text-primary-foreground'
                  : idx < currentStepIndex
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-muted text-muted-foreground'
              }`}
              disabled={idx > currentStepIndex}
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-background/20 text-sm font-bold">
                {idx < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </span>
              <span className="hidden md:inline">{s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <ArrowLeft className="h-4 w-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'preview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                סקירת מבנה הקובץ
              </CardTitle>
              <CardDescription>
                סקור את העמודות והנתונים בקובץ. לחץ על עמודה כדי להתחיל במיפוי.
              </CardDescription>
            </CardHeader>
          </Card>

          <DataPreview
            fileName={fileName}
            sheetName={sheetName}
            columns={sourceColumns}
            previewData={previewData}
            totalRows={totalRows}
            onColumnSelect={handleColumnSelect}
            selectedColumns={mappings.map((m) => m.sourceColumn)}
            ignoredColumns={ignoredColumns}
            onToggleIgnore={handleToggleIgnore}
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button onClick={() => setStep('mapping')}>
              המשך למיפוי
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-6">
          {/* Natural Language Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                מיפוי בשפה חופשית
              </CardTitle>
              <CardDescription>
                תאר בשפה חופשית אילו עמודות רוצים למפות. לדוגמה: &ldquo;העמודה שם_לקוח היא שם הלקוח, והעמודה טל היא הטלפון&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Textarea
                  placeholder='לדוגמה: "אני רוצה שהעמודה מזהה תהיה תעודת זהות, והעמודה שם יהיה שם הלקוח..."'
                  value={nlQuery}
                  onChange={(e) => setNlQuery(e.target.value)}
                  className="flex-1 min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleNaturalLanguageQuery();
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleNaturalLanguageQuery}
                    disabled={nlLoading || !nlQuery.trim()}
                  >
                    {nlLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleAutoMapAll}
                    disabled={nlLoading}
                    title="מיפוי אוטומטי"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mapping Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
                <p className="text-sm text-muted-foreground">מאושרים</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">ממתינים לאישור</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{unmappedCount}</p>
                <p className="text-sm text-muted-foreground">לא ממופים</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{ignoredColumns.length}</p>
                <p className="text-sm text-muted-foreground">מוסתרים</p>
              </CardContent>
            </Card>
          </div>

          {/* Mapping Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                מיפוי עמודות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sourceColumns
                  .filter((col) => !ignoredColumns.includes(col.name))
                  .map((col) => {
                    const mapping = getMappedField(col.name);
                    return (
                      <div
                        key={col.name}
                        className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                          mapping?.confirmed
                            ? 'bg-green-50 border-green-200'
                            : mapping
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {/* Source Column */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{col.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {col.detectedType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {col.uniqueCount} ייחודיים
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ArrowLeft className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                        {/* Target Field */}
                        <div className="flex-1 min-w-0">
                          {mapping ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={mapping.confirmed ? 'default' : 'secondary'}
                                className={mapping.confirmed ? 'bg-green-600' : ''}
                              >
                                {getFieldLabel(mapping.targetField)}
                              </Badge>
                              {mapping.confidence && (
                                <span className="text-xs text-muted-foreground">
                                  {mapping.confidence}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">לא ממופה</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {mapping && !mapping.confirmed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmMapping(col.name)}
                              className="text-green-600"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleColumnSelect(col)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          {mapping && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMapping(col.name)}
                              className="text-red-600"
                            >
                              <Link2Off className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('preview')}>
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה
            </Button>
            <Button onClick={() => setStep('settings')}>
              המשך להגדרות
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                הגדרות ייבוא
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>דילוג על שורות ראשונות</Label>
                  <Input
                    type="number"
                    value={settings.skipRows}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        skipRows: parseInt(e.target.value) || 0,
                      }))
                    }
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    בדרך כלל 1 לדילוג על שורת הכותרות
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>טיפול בכפילויות</Label>
                  <Select
                    value={settings.duplicateHandling}
                    onValueChange={(v: 'skip' | 'update' | 'append') =>
                      setSettings((s) => ({ ...s, duplicateHandling: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">דלג על כפילויות</SelectItem>
                      <SelectItem value="update">עדכן קיימים</SelectItem>
                      <SelectItem value="append">הוסף בכל מקרה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>בדיקת תקינות לפני ייבוא</Label>
                    <p className="text-xs text-muted-foreground">
                      בודק שהנתונים תקינים לפני הייבוא
                    </p>
                  </div>
                  <Switch
                    checked={settings.validateBeforeImport}
                    onCheckedChange={(v) =>
                      setSettings((s) => ({ ...s, validateBeforeImport: v }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>יצירת גיבוי</Label>
                    <p className="text-xs text-muted-foreground">
                      שומר עותק של הנתונים הקיימים לפני הייבוא
                    </p>
                  </div>
                  <Switch
                    checked={settings.createBackup}
                    onCheckedChange={(v) =>
                      setSettings((s) => ({ ...s, createBackup: v }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה
            </Button>
            <Button onClick={() => setStep('review')}>
              המשך לסקירה
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                סקירה ואישור
              </CardTitle>
              <CardDescription>
                סקור את המיפוי ואשר לפני הייבוא
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">קובץ</p>
                  <p className="font-medium">{fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">שורות</p>
                  <p className="font-medium">{totalRows.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">עמודות ממופות</p>
                  <p className="font-medium">{confirmedCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">עמודות מוסתרות</p>
                  <p className="font-medium">{ignoredColumns.length}</p>
                </div>
              </div>

              {/* Warnings */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-yellow-700">
                    יש {pendingCount} עמודות שלא אושרו. הן לא יוכללו בייבוא.
                  </p>
                </div>
              )}

              {/* Confirmed Mappings */}
              <div>
                <h4 className="font-medium mb-3">מיפויים מאושרים</h4>
                <div className="space-y-2">
                  {mappings
                    .filter((m) => m.confirmed)
                    .map((m) => (
                      <div
                        key={m.sourceColumn}
                        className="flex items-center gap-4 p-2 bg-green-50 rounded"
                      >
                        <Badge variant="outline">{m.sourceColumn}</Badge>
                        <ArrowLeft className="h-4 w-4" />
                        <Badge className="bg-green-600">
                          {getFieldLabel(m.targetField)}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('settings')}>
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה
            </Button>
            <Button
              onClick={handleComplete}
              disabled={confirmedCount === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 ml-2" />
              אשר והתחל ייבוא
            </Button>
          </div>
        </div>
      )}

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>מיפוי עמודה: {selectedSourceColumn?.name}</DialogTitle>
            <DialogDescription>
              בחר את השדה המתאים או צור שדה מותאם אישית
            </DialogDescription>
          </DialogHeader>

          {selectedSourceColumn && (
            <div className="space-y-4">
              {/* Column Info */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{selectedSourceColumn.detectedType}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedSourceColumn.uniqueCount} ערכים ייחודיים
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedSourceColumn.sampleValues.map((val, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {val || '(ריק)'}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Standard Fields by Category */}
              <div className="space-y-2">
                {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                  const fields = getStandardFieldsByCategory(
                    category as StandardField['category']
                  );
                  if (fields.length === 0) return null;

                  return (
                    <Collapsible key={category}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between font-medium">
                          {label}
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          {fields.map((field) => (
                            <Button
                              key={field.id}
                              variant="outline"
                              className="justify-start"
                              onClick={() =>
                                handleMapColumn(selectedSourceColumn.name, field.id)
                              }
                            >
                              {field.label}
                            </Button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>

              {/* Custom Field */}
              <div className="space-y-2">
                <Label>שדה מותאם אישית</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="שם השדה..."
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (customFieldName.trim()) {
                        handleMapColumn(
                          selectedSourceColumn.name,
                          `custom:${customFieldName.trim()}`,
                          customFieldName.trim()
                        );
                      }
                    }}
                    disabled={!customFieldName.trim()}
                  >
                    צור
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
