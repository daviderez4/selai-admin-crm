'use client';

import { FileSpreadsheet, Rows, Columns, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CategorySummary {
  category: string;
  icon: string;
  label: string;
  count: number;
}

interface AnalysisSummaryProps {
  fileName: string;
  totalRows: number;
  totalColumns: number;
  categorySummary: CategorySummary[];
  keyFields: string[];
}

export function AnalysisSummary({
  fileName,
  totalRows,
  totalColumns,
  categorySummary,
  keyFields,
}: AnalysisSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">ניתוח הקובץ הושלם</h2>
        <p className="text-slate-400 text-sm truncate max-w-md mx-auto">{fileName}</p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
            <Rows className="w-4 h-4" />
            <span className="text-sm">שורות</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalRows.toLocaleString('he-IL')}
          </p>
        </div>
        <div className="w-px bg-slate-700" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-slate-400 mb-1">
            <Columns className="w-4 h-4" />
            <span className="text-sm">עמודות</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalColumns.toLocaleString('he-IL')}
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 mb-3">קטגוריות שזוהו</h3>
        <div className="flex flex-wrap gap-2">
          {categorySummary.slice(0, 8).map((cat) => (
            <div
              key={cat.category}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg"
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-white text-sm">{cat.label}</span>
              <Badge variant="outline" className="border-slate-600 text-slate-400">
                {cat.count}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Key Fields */}
      {keyFields.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">שדות מפתח שזוהו</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {keyFields.map((field) => (
              <Badge
                key={field}
                className="bg-amber-500/20 text-amber-400 border-amber-500/30"
              >
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
