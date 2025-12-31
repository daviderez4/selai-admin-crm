'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { AnalyzedColumn, ColumnCategory } from '@/types/dashboard';

interface CategorySummary {
  category: ColumnCategory;
  icon: string;
  label: string;
  count: number;
  columns: string[];
}

interface CategoryColumnSelectorProps {
  columns: AnalyzedColumn[];
  categorySummary: CategorySummary[];
  selectedColumns: string[];
  onSelectionChange: (columns: string[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CategoryColumnSelector({
  columns,
  categorySummary,
  selectedColumns,
  onSelectionChange,
  onConfirm,
  onCancel,
}: CategoryColumnSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<ColumnCategory>>(
    new Set(['financial', 'status', 'dates', 'people'])
  );

  // Create column lookup map
  const columnMap = useMemo(() => {
    const map = new Map<string, AnalyzedColumn>();
    columns.forEach(col => map.set(col.name, col));
    return map;
  }, [columns]);

  // Filter columns by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categorySummary;

    const query = searchQuery.toLowerCase();
    return categorySummary
      .map(cat => ({
        ...cat,
        columns: cat.columns.filter(colName => {
          const col = columnMap.get(colName);
          return col && (
            col.name.toLowerCase().includes(query) ||
            col.displayName.toLowerCase().includes(query)
          );
        }),
      }))
      .filter(cat => cat.columns.length > 0);
  }, [categorySummary, searchQuery, columnMap]);

  // Toggle category expansion
  const toggleCategory = (category: ColumnCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle single column selection
  const toggleColumn = (columnName: string) => {
    const newSelection = selectedColumns.includes(columnName)
      ? selectedColumns.filter(c => c !== columnName)
      : [...selectedColumns, columnName];
    onSelectionChange(newSelection);
  };

  // Select all columns in a category
  const selectAllInCategory = (category: CategorySummary) => {
    const newSelection = new Set(selectedColumns);
    category.columns.forEach(col => newSelection.add(col));
    onSelectionChange(Array.from(newSelection));
  };

  // Deselect all columns in a category
  const deselectAllInCategory = (category: CategorySummary) => {
    const categorySet = new Set(category.columns);
    onSelectionChange(selectedColumns.filter(col => !categorySet.has(col)));
  };

  // Count selected in category
  const getSelectedCount = (category: CategorySummary) => {
    return category.columns.filter(col => selectedColumns.includes(col)).length;
  };

  // Quick actions
  const selectAll = () => {
    onSelectionChange(columns.map(c => c.name));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const selectRecommended = () => {
    onSelectionChange(columns.filter(c => c.isRecommended).map(c => c.name));
  };

  return (
    <div className="flex flex-col h-[70vh] bg-slate-800 rounded-xl border border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">בחירת עמודות</h3>
          <Badge className="bg-emerald-500/20 text-emerald-400">
            {selectedColumns.length} נבחרו
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="חיפוש עמודות..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-10 bg-slate-900 border-slate-600 text-white"
          />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectRecommended}
            className="border-emerald-600 text-emerald-400 hover:bg-emerald-500/10"
          >
            מומלצות
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="border-slate-600 text-slate-300"
          >
            בחר הכל
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deselectAll}
            className="border-slate-600 text-slate-300"
          >
            נקה הכל
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {filteredCategories.map(category => {
          const isExpanded = expandedCategories.has(category.category);
          const selectedCount = getSelectedCount(category);
          const allSelected = selectedCount === category.columns.length;

          return (
            <div
              key={category.category}
              className="border border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-xl">{category.icon}</span>
                  <span className="text-white font-medium">{category.label}</span>
                  <Badge variant="outline" className="border-slate-600 text-slate-400">
                    {category.count}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {selectedCount > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      {selectedCount} נבחרו
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      allSelected ? deselectAllInCategory(category) : selectAllInCategory(category);
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    {allSelected ? 'נקה' : 'בחר הכל'}
                  </Button>
                </div>
              </button>

              {/* Column list */}
              {isExpanded && (
                <div className="p-2 space-y-1 bg-slate-800/50">
                  {category.columns.map(colName => {
                    const column = columnMap.get(colName);
                    if (!column) return null;

                    const isSelected = selectedColumns.includes(colName);

                    return (
                      <label
                        key={colName}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                            : 'hover:bg-slate-700/50'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleColumn(colName)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white truncate">{column.name}</span>
                            {column.isRecommended && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                                מומלץ
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{column.dataType}</span>
                            {column.stats.nullPercentage > 0 && (
                              <span>• {column.stats.nullPercentage}% ריק</span>
                            )}
                            {column.sampleValues.length > 0 && (
                              <span className="truncate">
                                • {String(column.sampleValues[0]).slice(0, 20)}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-8 text-slate-400">
            לא נמצאו עמודות עבור &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 flex items-center justify-between">
        <Button variant="outline" onClick={onCancel} className="border-slate-600 text-slate-300">
          <X className="w-4 h-4 ml-2" />
          ביטול
        </Button>
        <Button
          onClick={onConfirm}
          disabled={selectedColumns.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Check className="w-4 h-4 ml-2" />
          אישור ({selectedColumns.length} עמודות)
        </Button>
      </div>
    </div>
  );
}
