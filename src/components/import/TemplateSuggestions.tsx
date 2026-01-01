'use client';

import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

interface TemplateSuggestionsProps {
  suggestions: TemplateSuggestion[];
  selectedIds: string[];
  onToggle: (template: TemplateSuggestion) => void;
  onCustomize: () => void;
  totalSelectedColumns: number;
}

export function TemplateSuggestions({
  suggestions,
  selectedIds,
  onToggle,
  onCustomize,
  totalSelectedColumns,
}: TemplateSuggestionsProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2">בחר תבניות לדשבורד</h2>
        <p className="text-slate-400 text-sm">
          ניתן לבחור מספר תבניות - העמודות ישולבו יחד
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((template) => {
          const isSelected = selectedIds.includes(template.id);
          const isCustom = template.id === 'custom';

          return (
            <button
              key={template.id}
              onClick={() => isCustom ? onCustomize() : onToggle(template)}
              className={cn(
                'relative p-5 rounded-xl border-2 text-right transition-all',
                'hover:border-emerald-500/50 hover:bg-slate-700/50',
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/50',
                isCustom && 'border-dashed'
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 left-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{template.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{template.name}</h3>
                  <p className="text-sm text-slate-400">{template.description}</p>
                </div>
              </div>

              {/* Stats */}
              {!isCustom && template.columns.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {template.columns.length} עמודות
                  </Badge>
                  {template.cardColumns.length > 0 && (
                    <Badge variant="outline" className="border-blue-600 text-blue-400">
                      {template.cardColumns.length} כרטיסים
                    </Badge>
                  )}
                  {template.filterColumns.length > 0 && (
                    <Badge variant="outline" className="border-purple-600 text-purple-400">
                      {template.filterColumns.length} פילטרים
                    </Badge>
                  )}
                  {template.calculatedFields && template.calculatedFields.length > 0 && (
                    <Badge variant="outline" className="border-amber-600 text-amber-400">
                      {template.calculatedFields.length} חישוב
                    </Badge>
                  )}
                  {template.charts && template.charts.length > 0 && (
                    <Badge variant="outline" className="border-emerald-600 text-emerald-400">
                      {template.charts.length} גרפים
                    </Badge>
                  )}
                </div>
              )}

              {/* Column preview */}
              {!isCustom && template.columns.length > 0 && (
                <div className="text-xs text-slate-500 truncate">
                  {template.columns.slice(0, 5).join(', ')}
                  {template.columns.length > 5 && ` ועוד ${template.columns.length - 5}...`}
                </div>
              )}

              {/* Custom action hint */}
              {isCustom && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                  <span>בחר עמודות בעצמך</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Total selected columns */}
      {totalSelectedColumns > 0 && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-medium">סה&quot;כ עמודות נבחרו</span>
            <Badge className="bg-emerald-500 text-white text-lg px-3">
              {totalSelectedColumns}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
