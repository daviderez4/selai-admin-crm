'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { calculateSummary } from '@/lib/utils/columnAnalyzer';

interface SummaryRowProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  summaryType: 'sum' | 'avg' | 'min' | 'max';
  onSummaryTypeChange: (type: 'sum' | 'avg' | 'min' | 'max') => void;
}

export function SummaryRow({
  data,
  columns,
  numericColumns,
  summaryType,
  onSummaryTypeChange,
}: SummaryRowProps) {
  const summary = useMemo(() => {
    return calculateSummary(data, numericColumns);
  }, [data, numericColumns]);

  const summaryMap = useMemo(() => {
    const map: Record<string, { sum: number; avg: number; min: number; max: number }> = {};
    summary.forEach(s => {
      map[s.column] = s;
    });
    return map;
  }, [summary]);

  const getLabel = () => {
    switch (summaryType) {
      case 'sum': return 'סה"כ';
      case 'avg': return 'ממוצע';
      case 'min': return 'מינימום';
      case 'max': return 'מקסימום';
    }
  };

  const getValue = (column: string) => {
    const stats = summaryMap[column];
    if (!stats) return null;

    const value = stats[summaryType];
    return value.toLocaleString('he-IL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <tr className="bg-slate-800/80 border-t-2 border-emerald-500/30">
      {/* Checkbox column placeholder */}
      <td className="p-3 text-center sticky right-0 bg-slate-800/80 z-10">
        <div className="flex gap-1 justify-center">
          {(['sum', 'avg', 'min', 'max'] as const).map(type => (
            <button
              key={type}
              onClick={() => onSummaryTypeChange(type)}
              className={cn(
                'px-1.5 py-0.5 text-[10px] rounded transition-colors',
                summaryType === type
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              )}
              title={type === 'sum' ? 'סכום' : type === 'avg' ? 'ממוצע' : type === 'min' ? 'מינימום' : 'מקסימום'}
            >
              {type === 'sum' ? 'Σ' : type === 'avg' ? 'μ' : type === 'min' ? '↓' : '↑'}
            </button>
          ))}
        </div>
      </td>

      {/* Column summaries */}
      {columns.map((col, index) => {
        const isNumeric = numericColumns.includes(col);
        const value = getValue(col);

        return (
          <td
            key={col}
            className="p-3 text-slate-300 font-medium"
          >
            {index === 0 && !isNumeric ? (
              <span className="text-emerald-400">{getLabel()}</span>
            ) : isNumeric && value ? (
              <span className="tabular-nums text-emerald-400">{value}</span>
            ) : null}
          </td>
        );
      })}

      {/* Actions column placeholder */}
      <td className="p-3" />
    </tr>
  );
}
