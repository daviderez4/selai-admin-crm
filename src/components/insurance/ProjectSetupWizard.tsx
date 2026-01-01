'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Database,
  Loader2,
  Settings,
  LayoutDashboard,
  Sparkles,
  Save,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategorySelector } from './CategorySelector';
import { INSURANCE_CATEGORIES, DASHBOARD_TEMPLATES } from '@/lib/insurance-patterns';
import {
  analyzeProjectData,
  createDefaultConfiguration,
  type ProjectAnalysis,
  type ProjectConfiguration,
} from '@/lib/project-analyzer';

interface ProjectSetupWizardProps {
  projectId: string;
  onComplete: (config: ProjectConfiguration) => void;
  onCancel: () => void;
}

type WizardStep = 'loading' | 'categories' | 'dashboard' | 'preview' | 'complete';

const STEPS: { id: WizardStep; title: string; icon: React.ReactNode }[] = [
  { id: 'loading', title: 'ניתוח נתונים', icon: <Database className="h-4 w-4" /> },
  { id: 'categories', title: 'בחירת קטגוריות', icon: <Settings className="h-4 w-4" /> },
  { id: 'dashboard', title: 'הגדרת דשבורד', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'preview', title: 'תצוגה מקדימה', icon: <Eye className="h-4 w-4" /> },
];

export function ProjectSetupWizard({
  projectId,
  onComplete,
  onCancel,
}: ProjectSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('loading');
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch and analyze data on mount
  useEffect(() => {
    analyzeData();
  }, [projectId]);

  const analyzeData = async () => {
    try {
      // Fetch tables
      const tablesRes = await fetch(`/api/projects/${projectId}/tables`);
      const tablesData = await tablesRes.json();

      if (!tablesData.tables || tablesData.tables.length === 0) {
        toast.error('לא נמצאו טבלאות בפרויקט');
        return;
      }

      const tableName = tablesData.tables[0].name;

      // Fetch data
      const dataRes = await fetch(`/api/projects/${projectId}/data?table=${tableName}&limit=5000`);
      const result = await dataRes.json();

      if (!result.data || result.data.length === 0) {
        toast.error('לא נמצאו נתונים בטבלה');
        return;
      }

      // Analyze
      const projectAnalysis = analyzeProjectData(projectId, tableName, result.data);
      setAnalysis(projectAnalysis);

      // Set defaults
      setSelectedCategories(projectAnalysis.detectedCategories.map(c => c.id));
      setSelectedTemplate(projectAnalysis.suggestedTemplate.id);

      // Initialize selected columns
      const defaultColumns: Record<string, string[]> = {};
      projectAnalysis.categoryAnalyses.forEach(ca => {
        defaultColumns[ca.category.id] = ca.columns.map(c => c.columnName);
      });
      setSelectedColumns(defaultColumns);

      setCurrentStep('categories');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('שגיאה בניתוח הנתונים');
    }
  };

  const handleColumnSelectionChange = (categoryId: string, columns: string[]) => {
    setSelectedColumns(prev => ({
      ...prev,
      [categoryId]: columns,
    }));
  };

  const handleNext = () => {
    const stepOrder: WizardStep[] = ['loading', 'categories', 'dashboard', 'preview', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['loading', 'categories', 'dashboard', 'preview', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 1) { // Don't go back to loading
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;

    setIsSaving(true);
    try {
      const template = DASHBOARD_TEMPLATES.find(t => t.id === selectedTemplate) || analysis.suggestedTemplate;

      const config: ProjectConfiguration = {
        projectId,
        tableName: analysis.tableName,
        selectedCategories,
        dashboardLayout: template,
        customMetrics: [],
        filterPresets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to localStorage for now (can be saved to DB later)
      localStorage.setItem(`project_config_${projectId}`, JSON.stringify(config));

      toast.success('ההגדרות נשמרו בהצלחה');
      setCurrentStep('complete');

      // Notify parent
      setTimeout(() => {
        onComplete(config);
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  const progress = useMemo(() => {
    const stepIndex = STEPS.findIndex(s => s.id === currentStep);
    return ((stepIndex + 1) / STEPS.length) * 100;
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-400" />
              הגדרת פרויקט חכם
            </h1>
            <Button variant="ghost" onClick={onCancel} className="text-slate-400">
              ביטול
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-4">
            {STEPS.filter(s => s.id !== 'loading').map((step, index) => {
              const stepIndex = STEPS.findIndex(s => s.id === step.id);
              const currentIndex = STEPS.findIndex(s => s.id === currentStep);
              const isActive = currentIndex >= stepIndex;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                      isCurrent && 'bg-emerald-500/20 ring-1 ring-emerald-500/50',
                      isActive && !isCurrent && 'text-emerald-400',
                      !isActive && 'text-slate-500'
                    )}
                  >
                    {step.icon}
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  {index < STEPS.length - 2 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-2',
                        isActive ? 'bg-emerald-500' : 'bg-slate-700'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Progress value={progress} className="h-1" />
        </div>

        {/* Step Content */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            {/* Loading Step */}
            {currentStep === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">מנתח את הנתונים...</h2>
                <p className="text-slate-400">מזהה קטגוריות ומבנה הנתונים</p>
              </div>
            )}

            {/* Categories Step */}
            {currentStep === 'categories' && analysis && (
              <div className="space-y-6">
                {/* Summary banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">ניתוח הושלם</h3>
                      <p className="text-sm text-slate-400">
                        נמצאו {analysis.totalRows.toLocaleString()} שורות,
                        {analysis.totalColumns} עמודות,
                        {analysis.detectedCategories.length} קטגוריות
                      </p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                      {analysis.tableName}
                    </Badge>
                  </div>
                </div>

                {/* Category selector */}
                <CategorySelector
                  categoryAnalyses={analysis.categoryAnalyses}
                  allColumns={analysis.columnMatches}
                  selectedCategories={selectedCategories}
                  onSelectionChange={setSelectedCategories}
                  selectedColumns={selectedColumns}
                  onColumnSelectionChange={handleColumnSelectionChange}
                />
              </div>
            )}

            {/* Dashboard Step */}
            {currentStep === 'dashboard' && analysis && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">בחר תבנית דשבורד</h3>
                  <p className="text-sm text-slate-400">
                    בחר את סוג הדשבורד המתאים ביותר לנתונים שלך
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DASHBOARD_TEMPLATES.map(template => {
                    const isSelected = selectedTemplate === template.id;
                    const isRecommended = template.id === analysis.suggestedTemplate.id;

                    return (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          'p-4 rounded-lg border cursor-pointer transition-all',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white">{template.name}</h4>
                          {isRecommended && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                              מומלץ
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{template.description}</p>

                        {template.requiredCategories.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.requiredCategories.map(catId => {
                              const cat = INSURANCE_CATEGORIES.find(c => c.id === catId);
                              return cat ? (
                                <Badge
                                  key={catId}
                                  variant="outline"
                                  className="text-xs"
                                  style={{ borderColor: `${cat.color}50`, color: cat.color }}
                                >
                                  {cat.icon} {cat.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}

                        {isSelected && (
                          <div className="mt-3 flex items-center gap-1 text-emerald-400 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            נבחר
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview Step */}
            {currentStep === 'preview' && analysis && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">סיכום ההגדרות</h3>
                  <p className="text-sm text-slate-400">
                    בדוק את ההגדרות לפני השמירה
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">{analysis.totalRows.toLocaleString()}</div>
                    <div className="text-sm text-slate-400">רשומות</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">{selectedCategories.length}</div>
                    <div className="text-sm text-slate-400">קטגוריות</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {Object.values(selectedColumns).flat().length}
                    </div>
                    <div className="text-sm text-slate-400">עמודות</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {DASHBOARD_TEMPLATES.find(t => t.id === selectedTemplate)?.layout.filter(l => l.type === 'chart').length || 0}
                    </div>
                    <div className="text-sm text-slate-400">גרפים</div>
                  </div>
                </div>

                {/* Selected categories */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">קטגוריות שנבחרו:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map(catId => {
                      const cat = INSURANCE_CATEGORIES.find(c => c.id === catId);
                      return cat ? (
                        <Badge
                          key={catId}
                          className="text-sm py-1 px-3"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.icon} {cat.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Selected template */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">תבנית דשבורד:</h4>
                  <p className="text-white font-medium">
                    {DASHBOARD_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                  </p>
                  <p className="text-sm text-slate-400">
                    {DASHBOARD_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                  </p>
                </div>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === 'complete' && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">ההגדרות נשמרו!</h2>
                <p className="text-slate-400 mb-4">מעביר לדשבורד...</p>
                <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        {currentStep !== 'loading' && currentStep !== 'complete' && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'categories'}
              className="border-slate-700"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              הקודם
            </Button>

            {currentStep === 'preview' ? (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                שמור והמשך
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={selectedCategories.length === 0}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                הבא
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
