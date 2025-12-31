'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CardConfig } from '@/types/dashboard';

interface SummaryCardsProps {
  cards: CardConfig[];
  data: Record<string, unknown>[];
  filters?: Record<string, unknown>;
  className?: string;
}

export function SummaryCards({ cards, data, filters, className }: SummaryCardsProps) {
  // Filter data if filters are provided
  const filteredData = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) return data;

    return data.filter(row => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        if (row[key] !== value) return false;
      }
      return true;
    });
  }, [data, filters]);

  // Calculate values for each card
  const cardValues = useMemo(() => {
    return cards.map(card => {
      const values = filteredData.map(row => row[card.column]);
      let result: number | string = 0;

      switch (card.aggregation) {
        case 'count':
          result = values.filter(v => v !== null && v !== undefined && v !== '').length;
          break;

        case 'sum':
          result = values
            .filter(v => v !== null && v !== undefined)
            .reduce((sum: number, v) => {
              const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₪$€%]/g, ''));
              return sum + (isNaN(num) ? 0 : num);
            }, 0);
          break;

        case 'avg':
          const validNumbers = values
            .filter(v => v !== null && v !== undefined)
            .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₪$€%]/g, '')))
            .filter((n): n is number => !isNaN(n));
          result = validNumbers.length > 0
            ? validNumbers.reduce((sum: number, n) => sum + n, 0) / validNumbers.length
            : 0;
          break;

        case 'min':
          const minNumbers = values
            .filter(v => v !== null && v !== undefined)
            .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₪$€%]/g, '')))
            .filter((n): n is number => !isNaN(n));
          result = minNumbers.length > 0 ? Math.min(...minNumbers) : 0;
          break;

        case 'max':
          const maxNumbers = values
            .filter(v => v !== null && v !== undefined)
            .map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₪$€%]/g, '')))
            .filter((n): n is number => !isNaN(n));
          result = maxNumbers.length > 0 ? Math.max(...maxNumbers) : 0;
          break;

        case 'distinct':
          result = new Set(values.filter(v => v !== null && v !== undefined && v !== '')).size;
          break;
      }

      // Calculate comparison if compareToField is set
      let comparison: { value: number; trend: 'up' | 'down' | 'neutral' } | undefined;
      if (card.compareToField && typeof result === 'number') {
        const compareValues = filteredData.map(row => row[card.compareToField!]);
        const compareSum = compareValues
          .filter(v => v !== null && v !== undefined)
          .reduce((sum: number, v) => {
            const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₪$€%]/g, ''));
            return sum + (isNaN(num) ? 0 : num);
          }, 0);

        if (compareSum > 0) {
          const diff = ((result - compareSum) / compareSum) * 100;
          comparison = {
            value: Math.abs(diff),
            trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
          };
        }
      }

      return {
        card,
        value: result,
        comparison,
      };
    });
  }, [cards, filteredData]);

  if (cards.length === 0) return null;

  return (
    <div className={cn('grid gap-4', className)} dir="rtl" style={{
      gridTemplateColumns: `repeat(${Math.min(cards.length, 4)}, 1fr)`,
    }}>
      {cardValues.map(({ card, value, comparison }, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            'rounded-xl p-5 shadow-sm border transition-shadow hover:shadow-md',
            getCardBackground(card.color)
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                getIconBackground(card.color)
              )}
            >
              {card.icon}
            </div>
            {comparison && (
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  comparison.trend === 'up'
                    ? 'bg-green-100 text-green-700'
                    : comparison.trend === 'down'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-600'
                )}
              >
                {comparison.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {comparison.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {comparison.trend === 'neutral' && <Minus className="w-3 h-3" />}
                {comparison.value.toFixed(1)}%
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm text-slate-600 font-medium">{card.title}</h3>
            <p className={cn('text-2xl font-bold', getTextColor(card.color))}>
              {formatValue(value, card.format)}
            </p>
          </div>

          {card.groupBy && (
            <div className="mt-3 pt-3 border-t border-slate-200/50 text-xs text-slate-500">
              מקובץ לפי: {card.groupBy}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Format value based on format type
function formatValue(value: number | string, format?: 'number' | 'currency' | 'percent'): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        maximumFractionDigits: 0,
      }).format(value);

    case 'percent':
      return `${value.toFixed(1)}%`;

    case 'number':
    default:
      return new Intl.NumberFormat('he-IL', {
        maximumFractionDigits: 2,
      }).format(value);
  }
}

// Helper functions for colors
function getCardBackground(color: string): string {
  const backgrounds: Record<string, string> = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200',
    green: 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200',
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200',
    red: 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200',
    cyan: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200',
    pink: 'bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200',
    indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200',
  };
  return backgrounds[color] || backgrounds.blue;
}

function getIconBackground(color: string): string {
  const backgrounds: Record<string, string> = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
    cyan: 'bg-cyan-100',
    pink: 'bg-pink-100',
    indigo: 'bg-indigo-100',
  };
  return backgrounds[color] || backgrounds.blue;
}

function getTextColor(color: string): string {
  const colors: Record<string, string> = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    cyan: 'text-cyan-700',
    pink: 'text-pink-700',
    indigo: 'text-indigo-700',
  };
  return colors[color] || colors.blue;
}
