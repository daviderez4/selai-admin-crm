'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Database,
  LayoutDashboard,
  Save,
  Eye,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmartDashboardStore, createTemplateFromAnalysis } from '@/lib/stores/smartDashboardStore';
import { DashboardWizard, type WizardConfig } from '@/components/DashboardWizard';
import { DashboardRenderer } from '@/components/DashboardRenderer';
import type { SmartDashboardTemplate, DataAnalysis } from '@/types/dashboard';

type ViewMode = 'select-table' | 'analyzing' | 'wizard' | 'preview' | 'view';

export default function DashboardBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [viewMode, setViewMode] = useState<ViewMode>('select-table');
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewConfig, setPreviewConfig] = useState<WizardConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    currentAnalysis,
    isAnalyzing,
    analysisError,
    templates,
    activeTemplate,
    isLoadingTemplates,
    analyzeTable,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    setActiveTemplate,
  } = useSmartDashboardStore();

  // Fetch tables on mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/tables`);
        if (!response.ok) throw new Error('Failed to fetch tables');
        const data = await response.json();
        setTables(data.tables?.map((t: { name: string }) => t.name) || []);
      } catch (err) {
        setError('שגיאה בטעינת הטבלאות');
      } finally {
        setIsLoadingTables(false);
      }
    };

    fetchTables();
    fetchTemplates(projectId);
  }, [projectId, fetchTemplates]);

  // Handle table selection and analysis
  const handleAnalyzeTable = useCallback(async (tableName: string) => {
    setSelectedTable(tableName);
    setViewMode('analyzing');
    setError(null);

    const analysis = await analyzeTable(projectId, tableName);
    if (analysis) {
      setViewMode('wizard');
    } else {
      setError(analysisError || 'שגיאה בניתוח הטבלה');
      setViewMode('select-table');
    }
  }, [projectId, analyzeTable, analysisError]);

  // Handle wizard save
  const handleSaveTemplate = useCallback(async (config: WizardConfig) => {
    if (!currentAnalysis) return;

    const templateData: Omit<SmartDashboardTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId,
      name: config.name,
      description: config.description,
      tableName: currentAnalysis.tableName,
      dataAnalysis: currentAnalysis,
      fieldSelection: config.fieldSelection,
      filtersConfig: config.filtersConfig,
      cardsConfig: config.cardsConfig,
      tableConfig: config.tableConfig,
      chartsConfig: config.chartsConfig,
      isDefault: templates.length === 0, // First template is default
    };

    const template = await createTemplate(projectId, templateData);
    if (template) {
      setActiveTemplate(template);
      setViewMode('view');
      // Fetch data for the dashboard
      fetchTableData(currentAnalysis.tableName);
    }
  }, [currentAnalysis, projectId, templates, createTemplate, setActiveTemplate]);

  // Handle wizard preview
  const handlePreview = useCallback(async (config: WizardConfig) => {
    setPreviewConfig(config);
    if (currentAnalysis) {
      await fetchTableData(currentAnalysis.tableName);
    }
    setViewMode('preview');
  }, [currentAnalysis]);

  // Fetch table data for preview/view
  const fetchTableData = async (tableName: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/data?table=${encodeURIComponent(tableName)}&limit=1000`
      );
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setPreviewData(data.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // Handle template selection
  const handleSelectTemplate = useCallback(async (template: SmartDashboardTemplate) => {
    setActiveTemplate(template);
    await fetchTableData(template.tableName);
    setViewMode('view');
  }, [setActiveTemplate]);

  // Handle delete template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את התבנית?')) {
      await deleteTemplate(projectId, templateId);
    }
  }, [projectId, deleteTemplate]);

  // Render content based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'select-table':
        return (
          <TableSelectionView
            tables={tables}
            templates={templates}
            isLoading={isLoadingTables || isLoadingTemplates}
            error={error}
            onSelectTable={handleAnalyzeTable}
            onSelectTemplate={handleSelectTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        );

      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center h-full" dir="rtl">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">מנתח את הטבלה...</h2>
            <p className="text-slate-600">
              מזהה סוגי נתונים, מחשב סטטיסטיקות ומקטגר עמודות
            </p>
          </div>
        );

      case 'wizard':
        if (!currentAnalysis) return null;
        return (
          <DashboardWizard
            analysis={currentAnalysis}
            onSave={handleSaveTemplate}
            onPreview={handlePreview}
          />
        );

      case 'preview':
        if (!previewConfig || !currentAnalysis) return null;
        const previewTemplate: SmartDashboardTemplate = {
          id: 'preview',
          projectId,
          name: previewConfig.name,
          description: previewConfig.description,
          tableName: currentAnalysis.tableName,
          dataAnalysis: currentAnalysis,
          fieldSelection: previewConfig.fieldSelection,
          filtersConfig: previewConfig.filtersConfig,
          cardsConfig: previewConfig.cardsConfig,
          tableConfig: previewConfig.tableConfig,
          chartsConfig: previewConfig.chartsConfig,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return (
          <div className="h-full flex flex-col">
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
              <span className="text-amber-800 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                מצב תצוגה מקדימה - השינויים לא נשמרו
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('wizard')}
                  className="px-3 py-1 text-sm bg-white border rounded hover:bg-slate-50"
                >
                  חזרה לעריכה
                </button>
                <button
                  onClick={() => handleSaveTemplate(previewConfig)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  שמור תבנית
                </button>
              </div>
            </div>
            <div className="flex-1">
              <DashboardRenderer
                template={previewTemplate}
                data={previewData}
                onEditTemplate={() => setViewMode('wizard')}
              />
            </div>
          </div>
        );

      case 'view':
        if (!activeTemplate) return null;
        return (
          <DashboardRenderer
            template={activeTemplate}
            data={previewData}
            onRefresh={() => fetchTableData(activeTemplate.tableName)}
            onEditTemplate={() => {
              if (activeTemplate.dataAnalysis) {
                setViewMode('wizard');
              }
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">בונה דשבורד חכם</h1>
            <p className="text-sm text-slate-600">
              בחר טבלה, הגדר שדות, פילטרים וגרפים
            </p>
          </div>
        </div>

        {viewMode !== 'select-table' && viewMode !== 'analyzing' && (
          <button
            onClick={() => {
              setViewMode('select-table');
              setActiveTemplate(null);
            }}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לבחירת טבלה
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Table Selection View Component
interface TableSelectionViewProps {
  tables: string[];
  templates: SmartDashboardTemplate[];
  isLoading: boolean;
  error: string | null;
  onSelectTable: (table: string) => void;
  onSelectTemplate: (template: SmartDashboardTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

function TableSelectionView({
  tables,
  templates,
  isLoading,
  error,
  onSelectTable,
  onSelectTemplate,
  onDeleteTemplate,
}: TableSelectionViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Existing templates */}
      {templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            תבניות קיימות
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{template.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTemplate(template.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {template.description && (
                  <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Database className="w-3 h-3" />
                  {template.tableName}
                  {template.isDefault && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      ברירת מחדל
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create new */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          צור דשבורד חדש
        </h2>
        <p className="text-slate-600 mb-4">
          בחר טבלה ליצירת דשבורד חכם עם ניתוח אוטומטי של הנתונים
        </p>

        {tables.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-lg">
            <Database className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-600">לא נמצאו טבלאות בפרויקט</p>
            <p className="text-sm text-slate-500">ייבא נתונים כדי להתחיל</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(table => (
              <button
                key={table}
                onClick={() => onSelectTable(table)}
                className="flex items-center gap-3 p-4 border rounded-lg bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors text-right"
              >
                <Database className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div>
                  <span className="font-medium block">{table}</span>
                  <span className="text-xs text-slate-500">לחץ לניתוח הטבלה</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
