'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Search,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Star,
  Filter,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ColumnCategory,
  AnalyzedColumn,
  DataAnalysis,
  FieldSelection,
  QuickSelectionPreset,
} from '@/types/dashboard';
import { CATEGORY_CONFIG, QUICK_SELECTION_PRESETS } from '@/types/dashboard';

interface SmartFieldSelectorProps {
  analysis: DataAnalysis;
  selectedFields: FieldSelection[];
  onSelectionChange: (fields: FieldSelection[]) => void;
  maxFields?: number;
}

export function SmartFieldSelector({
  analysis,
  selectedFields,
  onSelectionChange,
  maxFields = 50,
}: SmartFieldSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<ColumnCategory[]>([
    'financial',
    'status',
    'people',
  ]);
  const [viewMode, setViewMode] = useState<'categories' | 'selected'>('categories');

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchQuery) return analysis.columns;
    const query = searchQuery.toLowerCase();
    return analysis.columns.filter(
      col =>
        col.name.toLowerCase().includes(query) ||
        col.displayName.toLowerCase().includes(query)
    );
  }, [analysis.columns, searchQuery]);

  // Group filtered columns by category
  const filteredCategories = useMemo(() => {
    const categories: Record<ColumnCategory, AnalyzedColumn[]> = {
      financial: [],
      dates: [],
      people: [],
      status: [],
      companies: [],
      contact: [],
      identifiers: [],
      system: [],
      other: [],
    };
    for (const col of filteredColumns) {
      categories[col.category].push(col);
    }
    return categories;
  }, [filteredColumns]);

  // Check if a field is selected
  const isSelected = (name: string) =>
    selectedFields.some(f => f.name === name && f.visible);

  // Toggle field selection
  const toggleField = (column: AnalyzedColumn) => {
    const existing = selectedFields.find(f => f.name === column.name);
    if (existing) {
      // Toggle visibility
      onSelectionChange(
        selectedFields.map(f =>
          f.name === column.name ? { ...f, visible: !f.visible } : f
        )
      );
    } else {
      // Add new field
      if (selectedFields.filter(f => f.visible).length >= maxFields) {
        return; // Max reached
      }
      onSelectionChange([
        ...selectedFields,
        {
          name: column.name,
          order: selectedFields.length,
          visible: true,
          customLabel: column.displayName,
        },
      ]);
    }
  };

  // Apply quick selection preset
  const applyPreset = (preset: QuickSelectionPreset) => {
    let fieldsToSelect: AnalyzedColumn[];

    if (preset.id === 'all') {
      fieldsToSelect = analysis.columns;
    } else if (preset.categoryFilter) {
      fieldsToSelect = analysis.columns.filter(col =>
        preset.categoryFilter!.includes(col.category)
      );
    } else {
      fieldsToSelect = analysis.columns.filter(col => col.isRecommended);
    }

    const newSelection: FieldSelection[] = fieldsToSelect
      .slice(0, maxFields)
      .map((col, index) => ({
        name: col.name,
        order: index,
        visible: true,
        customLabel: col.displayName,
      }));

    onSelectionChange(newSelection);
  };

  // Toggle category expansion
  const toggleCategory = (category: ColumnCategory) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Handle reorder of selected fields
  const handleReorder = (newOrder: FieldSelection[]) => {
    onSelectionChange(
      newOrder.map((field, index) => ({ ...field, order: index }))
    );
  };

  // Select all in category
  const selectAllInCategory = (category: ColumnCategory) => {
    const categoryColumns = analysis.categories[category];
    const existingNames = new Set(selectedFields.map(f => f.name));

    const newFields: FieldSelection[] = categoryColumns
      .filter(col => !existingNames.has(col.name))
      .map((col, index) => ({
        name: col.name,
        order: selectedFields.length + index,
        visible: true,
        customLabel: col.displayName,
      }));

    onSelectionChange([...selectedFields, ...newFields]);
  };

  // Clear all selections
  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedFields.filter(f => f.visible).length;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-lg">בחירת שדות חכמה</h3>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm">
            {selectedCount} / {analysis.totalColumns} נבחרו
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('categories')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              viewMode === 'categories'
                ? 'bg-blue-600 text-white'
                : 'bg-white border hover:bg-slate-50'
            )}
          >
            קטגוריות
          </button>
          <button
            onClick={() => setViewMode('selected')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              viewMode === 'selected'
                ? 'bg-blue-600 text-white'
                : 'bg-white border hover:bg-slate-50'
            )}
          >
            נבחרים ({selectedCount})
          </button>
        </div>
      </div>

      {/* Quick Selection Presets */}
      <div className="p-3 border-b bg-white flex flex-wrap gap-2">
        {QUICK_SELECTION_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:bg-slate-50 transition-colors text-sm"
            title={preset.description}
          >
            <span>{preset.icon}</span>
            <span>{preset.name}</span>
          </button>
        ))}
        <button
          onClick={clearAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm mr-auto"
        >
          <X className="w-4 h-4" />
          נקה הכל
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b bg-white">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש שדות..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {viewMode === 'categories' ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-3"
            >
              {(Object.entries(CATEGORY_CONFIG) as [ColumnCategory, typeof CATEGORY_CONFIG[ColumnCategory]][]).map(
                ([category, config]) => {
                  const columns = filteredCategories[category];
                  if (columns.length === 0) return null;

                  const isExpanded = expandedCategories.includes(category);
                  const selectedInCategory = columns.filter(col =>
                    isSelected(col.name)
                  ).length;

                  return (
                    <div
                      key={category}
                      className="border rounded-lg overflow-hidden bg-white"
                    >
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors',
                          `border-r-4 border-${config.color}-500`
                        )}
                        style={{
                          borderRightColor: getCategoryColor(config.color),
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{config.icon}</span>
                          <span className="font-medium">{config.label}</span>
                          <span className="text-sm text-slate-500">
                            ({columns.length} שדות)
                          </span>
                          {selectedInCategory > 0 && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                              {selectedInCategory} נבחרו
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              selectAllInCategory(category);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            בחר הכל
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Category Fields */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t"
                          >
                            <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {columns.map(column => (
                                <FieldCard
                                  key={column.name}
                                  column={column}
                                  isSelected={isSelected(column.name)}
                                  onToggle={() => toggleField(column)}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
              )}
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3"
            >
              {selectedFields.filter(f => f.visible).length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>לא נבחרו שדות</p>
                  <p className="text-sm">בחר שדות מהקטגוריות או השתמש בבחירה מהירה</p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={selectedFields.filter(f => f.visible)}
                  onReorder={handleReorder}
                  className="space-y-2"
                >
                  {selectedFields
                    .filter(f => f.visible)
                    .map(field => {
                      const column = analysis.columns.find(c => c.name === field.name);
                      if (!column) return null;

                      return (
                        <Reorder.Item
                          key={field.name}
                          value={field}
                          className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move hover:shadow-md transition-shadow"
                        >
                          <GripVertical className="w-5 h-5 text-slate-400" />
                          <span className="text-lg">
                            {CATEGORY_CONFIG[column.category].icon}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">{column.displayName}</div>
                            <div className="text-xs text-slate-500">
                              {column.name} • {column.dataType}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleField(column)}
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </Reorder.Item>
                      );
                    })}
                </Reorder.Group>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
        <span className="text-sm text-slate-600">
          {selectedCount} שדות נבחרו מתוך {analysis.totalColumns}
        </span>
        {selectedCount >= maxFields && (
          <span className="text-sm text-amber-600">
            הגעת למקסימום השדות ({maxFields})
          </span>
        )}
      </div>
    </div>
  );
}

// Field Card Component
interface FieldCardProps {
  column: AnalyzedColumn;
  isSelected: boolean;
  onToggle: () => void;
}

function FieldCard({ column, isSelected, onToggle }: FieldCardProps) {
  const config = CATEGORY_CONFIG[column.category];

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-right',
        isSelected
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
          : 'bg-white hover:bg-slate-50 hover:border-slate-300'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
        )}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{column.displayName}</span>
          {column.isRecommended && (
            <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded',
              `bg-${config.color}-100 text-${config.color}-700`
            )}
            style={{
              backgroundColor: getCategoryBgColor(config.color),
              color: getCategoryTextColor(config.color),
            }}
          >
            {column.dataType}
          </span>
          <span>
            {column.stats.nullPercentage}% ריק
          </span>
          {column.stats.uniqueCount && (
            <span>
              {column.stats.uniqueCount} ערכים
            </span>
          )}
        </div>
        {column.sampleValues.length > 0 && (
          <div className="mt-1 text-xs text-slate-400 truncate">
            דוגמה: {String(column.sampleValues[0])}
          </div>
        )}
      </div>
    </button>
  );
}

// Helper functions for colors
function getCategoryColor(color: string): string {
  const colors: Record<string, string> = {
    emerald: '#10b981',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    amber: '#f59e0b',
    cyan: '#06b6d4',
    pink: '#ec4899',
    slate: '#64748b',
    gray: '#6b7280',
    zinc: '#71717a',
  };
  return colors[color] || colors.slate;
}

function getCategoryBgColor(color: string): string {
  const colors: Record<string, string> = {
    emerald: '#d1fae5',
    blue: '#dbeafe',
    purple: '#ede9fe',
    amber: '#fef3c7',
    cyan: '#cffafe',
    pink: '#fce7f3',
    slate: '#f1f5f9',
    gray: '#f3f4f6',
    zinc: '#f4f4f5',
  };
  return colors[color] || colors.slate;
}

function getCategoryTextColor(color: string): string {
  const colors: Record<string, string> = {
    emerald: '#047857',
    blue: '#1d4ed8',
    purple: '#6d28d9',
    amber: '#b45309',
    cyan: '#0e7490',
    pink: '#be185d',
    slate: '#475569',
    gray: '#4b5563',
    zinc: '#52525b',
  };
  return colors[color] || colors.slate;
}
