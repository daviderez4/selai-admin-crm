'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { InsuranceCategory } from '@/lib/insurance-patterns';
import type { CategoryAnalysis, ColumnCategoryMatch } from '@/lib/project-analyzer';

interface CategorySelectorProps {
  categoryAnalyses: CategoryAnalysis[];
  allColumns: ColumnCategoryMatch[];
  selectedCategories: string[];
  onSelectionChange: (categoryIds: string[]) => void;
  selectedColumns: Record<string, string[]>; // categoryId -> columnNames
  onColumnSelectionChange: (categoryId: string, columns: string[]) => void;
}

export function CategorySelector({
  categoryAnalyses,
  allColumns,
  selectedCategories,
  onSelectionChange,
  selectedColumns,
  onColumnSelectionChange,
}: CategorySelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onSelectionChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      onSelectionChange([...selectedCategories, categoryId]);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleColumn = (categoryId: string, columnName: string) => {
    const currentColumns = selectedColumns[categoryId] || [];
    const newColumns = currentColumns.includes(columnName)
      ? currentColumns.filter(c => c !== columnName)
      : [...currentColumns, columnName];
    onColumnSelectionChange(categoryId, newColumns);
  };

  const selectAllColumns = (categoryId: string) => {
    const analysis = categoryAnalyses.find(a => a.category.id === categoryId);
    if (analysis) {
      const allColumnNames = analysis.columns.map(c => c.columnName);
      onColumnSelectionChange(categoryId, allColumnNames);
    }
  };

  const deselectAllColumns = (categoryId: string) => {
    onColumnSelectionChange(categoryId, []);
  };

  // Sort categories by relevance (most columns first)
  const sortedCategories = useMemo(() => {
    return [...categoryAnalyses].sort((a, b) => b.columns.length - a.columns.length);
  }, [categoryAnalyses]);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">קטגוריות שזוהו</h3>
            <p className="text-sm text-slate-400">בחר את הקטגוריות לדשבורד</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange(categoryAnalyses.map(a => a.category.id))}
              className="border-slate-600 text-xs"
            >
              בחר הכל
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="border-slate-600 text-xs"
            >
              נקה הכל
            </Button>
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedCategories.map(analysis => {
            const { category, columns, metrics } = analysis;
            const isSelected = selectedCategories.includes(category.id);
            const isExpanded = expandedCategories.has(category.id);
            const selectedColumnCount = (selectedColumns[category.id] || []).length;
            const mainMetric = metrics[0];

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(category.id)}
              >
                <div
                  className={cn(
                    'rounded-lg border transition-all',
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  )}
                >
                  {/* Category Header */}
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(category.id)}
                        className="mt-1"
                      />

                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {category.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{category.name}</span>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: `${category.color}50`,
                              color: category.color,
                            }}
                          >
                            {columns.length} עמודות
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{category.description}</p>

                        {/* Main metric */}
                        {mainMetric && (
                          <div className="mt-2 text-sm">
                            <span className="text-slate-400">{mainMetric.metricName}: </span>
                            <span className="text-white font-medium">{mainMetric.formatted}</span>
                          </div>
                        )}
                      </div>

                      {/* Expand button */}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    {/* Selected columns badge */}
                    {isSelected && selectedColumnCount > 0 && (
                      <div className="mt-2 mr-12">
                        <Badge variant="secondary" className="text-xs bg-slate-700">
                          {selectedColumnCount} עמודות נבחרו
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Expanded Content - Column Selection */}
                  <CollapsibleContent>
                    <div className="px-3 pb-3 border-t border-slate-700/50 mt-1 pt-3">
                      {/* Column selection header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">עמודות בקטגוריה:</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => selectAllColumns(category.id)}
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            בחר הכל
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            onClick={() => deselectAllColumns(category.id)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            נקה
                          </button>
                        </div>
                      </div>

                      {/* Column list */}
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {columns.map(col => {
                          const isColumnSelected = (selectedColumns[category.id] || []).includes(col.columnName);

                          return (
                            <label
                              key={col.columnName}
                              className={cn(
                                'flex items-center gap-2 p-1.5 rounded cursor-pointer',
                                isColumnSelected
                                  ? 'bg-emerald-500/10'
                                  : 'hover:bg-slate-700/50'
                              )}
                            >
                              <Checkbox
                                checked={isColumnSelected}
                                onCheckedChange={() => toggleColumn(category.id, col.columnName)}
                              />
                              <span className="text-sm text-white flex-1 truncate">
                                {col.columnName}
                              </span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-[10px] border-slate-600">
                                    {col.uniqueCount} ערכים
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>סוג: {col.dataType}</p>
                                  <p>ערכים ייחודיים: {col.uniqueCount}</p>
                                  {col.sampleValues.length > 0 && (
                                    <p>דוגמאות: {col.sampleValues.slice(0, 3).join(', ')}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Uncategorized columns notice */}
        {allColumns.filter(c => !c.primaryCategory).length > 0 && (
          <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Info className="h-4 w-4" />
              <span>
                {allColumns.filter(c => !c.primaryCategory).length} עמודות לא סווגו לקטגוריה ספציפית
              </span>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-400" />
              <span className="text-white font-medium">
                נבחרו {selectedCategories.length} קטגוריות
              </span>
            </div>
            <span className="text-sm text-slate-400">
              סה"כ {Object.values(selectedColumns).flat().length} עמודות
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
