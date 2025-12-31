'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Filter,
  Table,
  BarChart3,
  Plus,
  Trash2,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Save,
  Eye,
  Settings,
  Palette,
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import type {
  DataAnalysis,
  FieldSelection,
  FilterConfig,
  CardConfig,
  TableConfig,
  ChartConfig,
  AnalyzedColumn,
} from '@/types/dashboard';
import { CATEGORY_CONFIG } from '@/types/dashboard';
import { SmartFieldSelector } from './SmartFieldSelector';

interface DashboardWizardProps {
  analysis: DataAnalysis;
  onSave: (config: WizardConfig) => void;
  onPreview?: (config: WizardConfig) => void;
  initialConfig?: Partial<WizardConfig>;
}

export interface WizardConfig {
  name: string;
  description?: string;
  fieldSelection: FieldSelection[];
  filtersConfig: FilterConfig[];
  cardsConfig: CardConfig[];
  tableConfig: TableConfig;
  chartsConfig: ChartConfig[];
}

type WizardStep = 'fields' | 'cards' | 'filters' | 'table' | 'charts';

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'fields', label: 'בחירת שדות', icon: LayoutDashboard },
  { id: 'cards', label: 'כרטיסי סיכום', icon: LayoutDashboard },
  { id: 'filters', label: 'פילטרים', icon: Filter },
  { id: 'table', label: 'טבלה', icon: Table },
  { id: 'charts', label: 'גרפים', icon: BarChart3 },
];

const AGGREGATION_OPTIONS = [
  { value: 'sum', label: 'סכום' },
  { value: 'count', label: 'ספירה' },
  { value: 'avg', label: 'ממוצע' },
  { value: 'min', label: 'מינימום' },
  { value: 'max', label: 'מקסימום' },
  { value: 'distinct', label: 'ערכים ייחודיים' },
];

const CHART_TYPES = [
  { value: 'pie', label: 'עוגה', icon: '🥧' },
  { value: 'bar', label: 'עמודות', icon: '📊' },
  { value: 'line', label: 'קו', icon: '📈' },
  { value: 'area', label: 'שטח', icon: '📉' },
  { value: 'donut', label: 'טבעת', icon: '🍩' },
];

const COLOR_OPTIONS = [
  'blue', 'green', 'purple', 'amber', 'red', 'cyan', 'pink', 'indigo'
];

export function DashboardWizard({
  analysis,
  onSave,
  onPreview,
  initialConfig,
}: DashboardWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('fields');
  const [config, setConfig] = useState<WizardConfig>({
    name: initialConfig?.name || 'תבנית חדשה',
    description: initialConfig?.description,
    fieldSelection: initialConfig?.fieldSelection || [],
    filtersConfig: initialConfig?.filtersConfig || [],
    cardsConfig: initialConfig?.cardsConfig || [],
    tableConfig: initialConfig?.tableConfig || {
      columns: [],
      pageSize: 50,
      enableSearch: true,
      enableExport: true,
    },
    chartsConfig: initialConfig?.chartsConfig || [],
  });

  // Get numeric columns for aggregations
  const numericColumns = analysis.columns.filter(col => col.dataType === 'number');
  const enumColumns = analysis.columns.filter(
    col => col.dataType === 'enum' || (col.stats.uniqueValues && col.stats.uniqueValues.length <= 20)
  );
  const dateColumns = analysis.columns.filter(col => col.dataType === 'date');

  // Update config helper
  const updateConfig = useCallback(<K extends keyof WizardConfig>(
    key: K,
    value: WizardConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // Navigation
  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < WIZARD_STEPS.length - 1;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  const goBack = () => {
    if (canGoBack) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id);
    }
  };

  // Add card
  const addCard = () => {
    const newCard: CardConfig = {
      id: crypto.randomUUID(),
      title: 'כרטיס חדש',
      column: numericColumns[0]?.name || analysis.columns[0]?.name || '',
      aggregation: 'sum',
      icon: '📊',
      color: COLOR_OPTIONS[config.cardsConfig.length % COLOR_OPTIONS.length],
    };
    updateConfig('cardsConfig', [...config.cardsConfig, newCard]);
  };

  // Remove card
  const removeCard = (id: string) => {
    updateConfig('cardsConfig', config.cardsConfig.filter(c => c.id !== id));
  };

  // Update card
  const updateCard = (id: string, updates: Partial<CardConfig>) => {
    updateConfig(
      'cardsConfig',
      config.cardsConfig.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Add filter
  const addFilter = () => {
    const newFilter: FilterConfig = {
      column: enumColumns[0]?.name || analysis.columns[0]?.name || '',
      type: 'text',
      enabled: true,
    };
    updateConfig('filtersConfig', [...config.filtersConfig, newFilter]);
  };

  // Remove filter
  const removeFilter = (index: number) => {
    updateConfig('filtersConfig', config.filtersConfig.filter((_, i) => i !== index));
  };

  // Update filter
  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    updateConfig(
      'filtersConfig',
      config.filtersConfig.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  // Add chart
  const addChart = () => {
    const newChart: ChartConfig = {
      id: crypto.randomUUID(),
      type: 'pie',
      title: 'גרף חדש',
      groupBy: enumColumns[0]?.name || '',
      aggregation: 'count',
      showLegend: true,
      showValues: true,
    };
    updateConfig('chartsConfig', [...config.chartsConfig, newChart]);
  };

  // Remove chart
  const removeChart = (id: string) => {
    updateConfig('chartsConfig', config.chartsConfig.filter(c => c.id !== id));
  };

  // Update chart
  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    updateConfig(
      'chartsConfig',
      config.chartsConfig.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Handle field selection change - also update table config
  const handleFieldSelectionChange = (fields: FieldSelection[]) => {
    updateConfig('fieldSelection', fields);
    // Update table columns
    updateConfig('tableConfig', {
      ...config.tableConfig,
      columns: fields,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg" dir="rtl">
      {/* Header with template name */}
      <div className="p-4 border-b bg-gradient-to-l from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <input
              type="text"
              value={config.name}
              onChange={e => updateConfig('name', e.target.value)}
              className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
              placeholder="שם התבנית"
            />
          </div>
          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                onClick={() => onPreview(config)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                תצוגה מקדימה
              </button>
            )}
            <button
              onClick={() => onSave(config)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              שמור תבנית
            </button>
          </div>
        </div>
        <input
          type="text"
          value={config.description || ''}
          onChange={e => updateConfig('description', e.target.value)}
          className="mt-2 text-sm text-slate-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 w-full"
          placeholder="תיאור התבנית (אופציונלי)"
        />
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center justify-center gap-2 p-4 border-b bg-slate-50">
        {WIZARD_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isPast = index < currentStepIndex;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : isPast
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white border hover:bg-slate-50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{step.label}</span>
              {isPast && <span className="text-green-600">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full"
          >
            {currentStep === 'fields' && (
              <SmartFieldSelector
                analysis={analysis}
                selectedFields={config.fieldSelection}
                onSelectionChange={handleFieldSelectionChange}
              />
            )}

            {currentStep === 'cards' && (
              <CardsConfigStep
                config={config.cardsConfig}
                columns={analysis.columns}
                numericColumns={numericColumns}
                enumColumns={enumColumns}
                onAdd={addCard}
                onRemove={removeCard}
                onUpdate={updateCard}
              />
            )}

            {currentStep === 'filters' && (
              <FiltersConfigStep
                config={config.filtersConfig}
                columns={analysis.columns}
                enumColumns={enumColumns}
                dateColumns={dateColumns}
                numericColumns={numericColumns}
                onAdd={addFilter}
                onRemove={removeFilter}
                onUpdate={updateFilter}
              />
            )}

            {currentStep === 'table' && (
              <TableConfigStep
                config={config.tableConfig}
                fieldSelection={config.fieldSelection}
                columns={analysis.columns}
                onUpdate={updates =>
                  updateConfig('tableConfig', { ...config.tableConfig, ...updates })
                }
              />
            )}

            {currentStep === 'charts' && (
              <ChartsConfigStep
                config={config.chartsConfig}
                columns={analysis.columns}
                numericColumns={numericColumns}
                enumColumns={enumColumns}
                dateColumns={dateColumns}
                onAdd={addChart}
                onRemove={removeChart}
                onUpdate={updateChart}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="p-4 border-t bg-slate-50 flex justify-between">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            canGoBack
              ? 'bg-white border hover:bg-slate-100'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          <ChevronRight className="w-4 h-4" />
          הקודם
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            שלב {currentStepIndex + 1} מתוך {WIZARD_STEPS.length}
          </span>
        </div>

        {isLastStep ? (
          <button
            onClick={() => onSave(config)}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            סיום ושמירה
          </button>
        ) : (
          <button
            onClick={goForward}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            הבא
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Cards Config Step
interface CardsConfigStepProps {
  config: CardConfig[];
  columns: AnalyzedColumn[];
  numericColumns: AnalyzedColumn[];
  enumColumns: AnalyzedColumn[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CardConfig>) => void;
}

function CardsConfigStep({
  config,
  columns,
  numericColumns,
  enumColumns,
  onAdd,
  onRemove,
  onUpdate,
}: CardsConfigStepProps) {
  return (
    <div className="h-full flex flex-col p-4" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5" />
          כרטיסי סיכום
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף כרטיס
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {config.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>אין כרטיסי סיכום</p>
            <p className="text-sm">הוסף כרטיסים להצגת סטטיסטיקות מרכזיות</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.map(card => (
              <div
                key={card.id}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="text"
                    value={card.title}
                    onChange={e => onUpdate(card.id, { title: e.target.value })}
                    className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    placeholder="כותרת הכרטיס"
                  />
                  <button
                    onClick={() => onRemove(card.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Column selection */}
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">שדה</label>
                    <select
                      value={card.column}
                      onChange={e => onUpdate(card.id, { column: e.target.value })}
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      {columns.map(col => (
                        <option key={col.name} value={col.name}>
                          {col.displayName} ({col.dataType})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Aggregation */}
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">חישוב</label>
                    <select
                      value={card.aggregation}
                      onChange={e =>
                        onUpdate(card.id, {
                          aggregation: e.target.value as CardConfig['aggregation'],
                        })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      {AGGREGATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Group by (optional) */}
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">קיבוץ לפי (אופציונלי)</label>
                    <select
                      value={card.groupBy || ''}
                      onChange={e =>
                        onUpdate(card.id, {
                          groupBy: e.target.value || undefined,
                        })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      <option value="">ללא קיבוץ</option>
                      {enumColumns.map(col => (
                        <option key={col.name} value={col.name}>
                          {col.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color and Icon */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-sm text-slate-600 mb-1 block">צבע</label>
                      <div className="flex gap-1 flex-wrap">
                        {COLOR_OPTIONS.map(color => (
                          <button
                            key={color}
                            onClick={() => onUpdate(card.id, { color })}
                            className={cn(
                              'w-6 h-6 rounded-full border-2 transition-transform',
                              card.color === color ? 'scale-125 border-slate-800' : 'border-transparent'
                            )}
                            style={{ backgroundColor: getColorValue(color) }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 mb-1 block">אייקון</label>
                      <input
                        type="text"
                        value={card.icon}
                        onChange={e => onUpdate(card.id, { icon: e.target.value })}
                        className="w-16 p-2 border rounded-lg text-center text-lg"
                        placeholder="📊"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Filters Config Step
interface FiltersConfigStepProps {
  config: FilterConfig[];
  columns: AnalyzedColumn[];
  enumColumns: AnalyzedColumn[];
  dateColumns: AnalyzedColumn[];
  numericColumns: AnalyzedColumn[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, updates: Partial<FilterConfig>) => void;
}

function FiltersConfigStep({
  config,
  columns,
  enumColumns,
  dateColumns,
  numericColumns,
  onAdd,
  onRemove,
  onUpdate,
}: FiltersConfigStepProps) {
  return (
    <div className="h-full flex flex-col p-4" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="w-5 h-5" />
          פילטרים
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף פילטר
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {config.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>אין פילטרים</p>
            <p className="text-sm">הוסף פילטרים לאפשר למשתמשים לסנן את הנתונים</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.map((filter, index) => {
              const column = columns.find(c => c.name === filter.column);

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-white"
                >
                  {/* Column */}
                  <div className="flex-1">
                    <select
                      value={filter.column}
                      onChange={e => {
                        const col = columns.find(c => c.name === e.target.value);
                        const type = col?.dataType === 'number' ? 'number' :
                                     col?.dataType === 'date' ? 'date' :
                                     col?.dataType === 'enum' ? 'enum' :
                                     col?.dataType === 'boolean' ? 'boolean' : 'text';
                        onUpdate(index, {
                          column: e.target.value,
                          type,
                          options: col?.stats.uniqueValues,
                        });
                      }}
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      {columns.map(col => (
                        <option key={col.name} value={col.name}>
                          {col.displayName} ({col.dataType})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type badge */}
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                    {filter.type}
                  </span>

                  {/* Enabled toggle */}
                  <button
                    onClick={() => onUpdate(index, { enabled: !filter.enabled })}
                    className={cn(
                      'px-3 py-1 rounded text-sm',
                      filter.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {filter.enabled ? 'פעיל' : 'כבוי'}
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 hover:bg-red-50 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Table Config Step
interface TableConfigStepProps {
  config: TableConfig;
  fieldSelection: FieldSelection[];
  columns: AnalyzedColumn[];
  onUpdate: (updates: Partial<TableConfig>) => void;
}

function TableConfigStep({
  config,
  fieldSelection,
  columns,
  onUpdate,
}: TableConfigStepProps) {
  const handleReorder = (newOrder: FieldSelection[]) => {
    onUpdate({
      columns: newOrder.map((field, index) => ({ ...field, order: index })),
    });
  };

  return (
    <div className="h-full flex flex-col p-4" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Table className="w-5 h-5" />
          הגדרות טבלה
        </h3>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Table options */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-medium mb-3">אפשרויות כלליות</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-slate-600 mb-1 block">שורות בעמוד</label>
              <select
                value={config.pageSize}
                onChange={e => onUpdate({ pageSize: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableSearch"
                checked={config.enableSearch}
                onChange={e => onUpdate({ enableSearch: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="enableSearch" className="text-sm">אפשר חיפוש</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableExport"
                checked={config.enableExport}
                onChange={e => onUpdate({ enableExport: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="enableExport" className="text-sm">אפשר ייצוא</label>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-1 block">קיבוץ לפי</label>
              <select
                value={config.groupBy || ''}
                onChange={e => onUpdate({ groupBy: e.target.value || undefined })}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="">ללא קיבוץ</option>
                {columns
                  .filter(c => c.dataType === 'enum' || (c.stats.uniqueValues && c.stats.uniqueValues.length <= 20))
                  .map(col => (
                    <option key={col.name} value={col.name}>
                      {col.displayName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Column order */}
        <div>
          <h4 className="font-medium mb-3">סדר עמודות (גרור לשינוי סדר)</h4>
          {config.columns.length === 0 ? (
            <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
              <p>בחר שדות בשלב הראשון</p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={config.columns}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {config.columns.map(field => {
                const column = columns.find(c => c.name === field.name);

                return (
                  <Reorder.Item
                    key={field.name}
                    value={field}
                    className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow"
                  >
                    <GripVertical className="w-5 h-5 text-slate-400" />
                    <span className="flex-1">
                      {field.customLabel || column?.displayName || field.name}
                    </span>
                    <input
                      type="text"
                      value={field.customLabel || ''}
                      onChange={e => {
                        const newColumns = config.columns.map(c =>
                          c.name === field.name
                            ? { ...c, customLabel: e.target.value }
                            : c
                        );
                        onUpdate({ columns: newColumns });
                      }}
                      placeholder="תווית מותאמת"
                      className="w-32 p-1.5 border rounded text-sm"
                    />
                    <input
                      type="number"
                      value={field.width || ''}
                      onChange={e => {
                        const newColumns = config.columns.map(c =>
                          c.name === field.name
                            ? { ...c, width: parseInt(e.target.value) || undefined }
                            : c
                        );
                        onUpdate({ columns: newColumns });
                      }}
                      placeholder="רוחב"
                      className="w-20 p-1.5 border rounded text-sm"
                    />
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </div>
      </div>
    </div>
  );
}

// Charts Config Step
interface ChartsConfigStepProps {
  config: ChartConfig[];
  columns: AnalyzedColumn[];
  numericColumns: AnalyzedColumn[];
  enumColumns: AnalyzedColumn[];
  dateColumns: AnalyzedColumn[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ChartConfig>) => void;
}

function ChartsConfigStep({
  config,
  columns,
  numericColumns,
  enumColumns,
  dateColumns,
  onAdd,
  onRemove,
  onUpdate,
}: ChartsConfigStepProps) {
  return (
    <div className="h-full flex flex-col p-4" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          גרפים
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף גרף
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {config.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>אין גרפים</p>
            <p className="text-sm">הוסף גרפים לויזואליזציה של הנתונים</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.map(chart => (
              <div
                key={chart.id}
                className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="text"
                    value={chart.title}
                    onChange={e => onUpdate(chart.id, { title: e.target.value })}
                    className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    placeholder="כותרת הגרף"
                  />
                  <button
                    onClick={() => onRemove(chart.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Chart type */}
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">סוג גרף</label>
                    <div className="flex gap-2 flex-wrap">
                      {CHART_TYPES.map(type => (
                        <button
                          key={type.value}
                          onClick={() =>
                            onUpdate(chart.id, { type: type.value as ChartConfig['type'] })
                          }
                          className={cn(
                            'flex items-center gap-1 px-3 py-1.5 rounded border transition-colors text-sm',
                            chart.type === type.value
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'hover:bg-slate-50'
                          )}
                        >
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Group by */}
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">קיבוץ לפי</label>
                    <select
                      value={chart.groupBy || ''}
                      onChange={e =>
                        onUpdate(chart.id, { groupBy: e.target.value || undefined })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      <option value="">בחר שדה</option>
                      {enumColumns.map(col => (
                        <option key={col.name} value={col.name}>
                          {col.displayName}
                        </option>
                      ))}
                      {dateColumns.map(col => (
                        <option key={col.name} value={col.name}>
                          {col.displayName} (תאריך)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Y axis (for bar/line charts) */}
                  {['bar', 'line', 'area'].includes(chart.type) && (
                    <div>
                      <label className="text-sm text-slate-600 mb-1 block">ציר Y</label>
                      <select
                        value={chart.yAxis || ''}
                        onChange={e =>
                          onUpdate(chart.id, { yAxis: e.target.value || undefined })
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                        <option value="">ספירה</option>
                        {numericColumns.map(col => (
                          <option key={col.name} value={col.name}>
                            {col.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Aggregation */}
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">חישוב</label>
                    <select
                      value={chart.aggregation}
                      onChange={e =>
                        onUpdate(chart.id, {
                          aggregation: e.target.value as ChartConfig['aggregation'],
                        })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      <option value="count">ספירה</option>
                      <option value="sum">סכום</option>
                      <option value="avg">ממוצע</option>
                    </select>
                  </div>

                  {/* Options */}
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={chart.showLegend}
                        onChange={e =>
                          onUpdate(chart.id, { showLegend: e.target.checked })
                        }
                        className="w-4 h-4 rounded"
                      />
                      הצג מקרא
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={chart.showValues}
                        onChange={e =>
                          onUpdate(chart.id, { showValues: e.target.checked })
                        }
                        className="w-4 h-4 rounded"
                      />
                      הצג ערכים
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function getColorValue(color: string): string {
  const colors: Record<string, string> = {
    blue: '#3b82f6',
    green: '#22c55e',
    purple: '#8b5cf6',
    amber: '#f59e0b',
    red: '#ef4444',
    cyan: '#06b6d4',
    pink: '#ec4899',
    indigo: '#6366f1',
  };
  return colors[color] || colors.blue;
}
