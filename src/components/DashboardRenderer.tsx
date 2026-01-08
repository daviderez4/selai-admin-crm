'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Filter,
  X,
  Download,
  Search,
  RefreshCw,
  Settings,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SummaryCards } from './SummaryCards';
import { DashboardCharts } from './DashboardCharts';
import { DataTable } from './DataTable';
import type {
  SmartDashboardTemplate,
  FilterConfig,
  FieldSelection,
} from '@/types/dashboard';

interface DashboardRendererProps {
  template: SmartDashboardTemplate;
  data: Record<string, unknown>[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onEditTemplate?: () => void;
  onExport?: (format: 'csv' | 'xlsx') => void;
  isPublicView?: boolean;
}

export function DashboardRenderer({
  template,
  data,
  isLoading,
  onRefresh,
  onEditTemplate,
  onExport,
  isPublicView = false,
}: DashboardRendererProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Get active filter configs
  const activeFilterConfigs = useMemo(
    () => template.filtersConfig.filter(f => f.enabled),
    [template.filtersConfig]
  );

  // Apply filters to data
  const filteredData = useMemo(() => {
    let result = data;

    // Apply field filters
    for (const [key, value] of Object.entries(activeFilters)) {
      if (value === undefined || value === null || value === '' || value === '__all__') {
        continue;
      }
      result = result.filter(row => {
        const rowValue = row[key];
        if (typeof value === 'object' && value !== null) {
          // Range filter
          const { min, max } = value as { min?: number; max?: number };
          const numValue = typeof rowValue === 'number'
            ? rowValue
            : parseFloat(String(rowValue).replace(/[,₪$€%]/g, ''));
          if (min !== undefined && numValue < min) return false;
          if (max !== undefined && numValue > max) return false;
          return true;
        }
        return String(rowValue) === String(value);
      });
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(query)
        )
      );
    }

    return result;
  }, [data, activeFilters, searchQuery]);

  // Update a filter value
  const updateFilter = useCallback((column: string, value: unknown) => {
    setActiveFilters(prev => ({
      ...prev,
      [column]: value,
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setActiveFilters({});
    setSearchQuery('');
  }, []);

  // Get table columns from field selection - convert to ColumnDef format
  const tableColumns = useMemo(() => {
    return template.fieldSelection
      .filter(f => f.visible)
      .sort((a, b) => a.order - b.order)
      .map(field => ({
        id: field.name,
        accessorKey: field.name,
        header: field.customLabel || field.name,
        size: field.width,
      }));
  }, [template.fieldSelection]);

  // Check if any filters are active
  const hasActiveFilters = Object.values(activeFilters).some(
    v => v !== undefined && v !== null && v !== '' && v !== '__all__'
  ) || searchQuery !== '';

  return (
    <div className="flex flex-col h-full bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">{template.name}</h1>
              {template.description && (
                <p className="text-sm text-slate-500">{template.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
                showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-slate-50'
              )}
            >
              <Filter className="w-4 h-4" />
              פילטרים
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-600 rounded-full" />
              )}
            </button>

            {/* Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="רענן נתונים"
              >
                <RefreshCw
                  className={cn('w-4 h-4', isLoading && 'animate-spin')}
                />
              </button>
            )}

            {/* Export */}
            {onExport && template.tableConfig.enableExport && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-slate-50 transition-colors">
                  <Download className="w-4 h-4" />
                  ייצוא
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => onExport('csv')}
                    className="block w-full px-4 py-2 text-right hover:bg-slate-50 text-sm"
                  >
                    ייצוא ל-CSV
                  </button>
                  <button
                    onClick={() => onExport('xlsx')}
                    className="block w-full px-4 py-2 text-right hover:bg-slate-50 text-sm"
                  >
                    ייצוא ל-Excel
                  </button>
                </div>
              </div>
            )}

            {/* Edit template */}
            {onEditTemplate && (
              <button
                onClick={onEditTemplate}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="ערוך תבנית"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
          <span>
            <strong>{filteredData.length.toLocaleString('he-IL')}</strong> רשומות
            {hasActiveFilters && ` (מתוך ${data.length.toLocaleString('he-IL')})`}
          </span>
          <span>•</span>
          <span>{tableColumns.length} עמודות</span>
          {hasActiveFilters && (
            <>
              <span>•</span>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                נקה פילטרים
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && activeFilterConfigs.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-white border-b px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            {template.tableConfig.enableSearch && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-10 pl-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Filters */}
            {activeFilterConfigs.map(filter => (
              <FilterControl
                key={filter.column}
                filter={filter}
                value={activeFilters[filter.column]}
                onChange={value => updateFilter(filter.column, value)}
                data={data}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Summary Cards */}
        {template.cardsConfig.length > 0 && (
          <SummaryCards
            cards={template.cardsConfig}
            data={filteredData}
            filters={activeFilters}
          />
        )}

        {/* Charts */}
        {template.chartsConfig.length > 0 && (
          <DashboardCharts
            charts={template.chartsConfig}
            data={filteredData}
            filters={activeFilters}
          />
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <DataTable
            data={filteredData}
            columns={tableColumns}
          />
        </div>
      </div>
    </div>
  );
}

// Filter Control Component
interface FilterControlProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  data: Record<string, unknown>[];
}

function FilterControl({ filter, value, onChange, data }: FilterControlProps) {
  // Get unique values for enum/text filters
  const uniqueValues = useMemo(() => {
    if (filter.options) return filter.options;
    if (filter.type === 'enum' || filter.type === 'text') {
      const values = new Set<string>();
      for (const row of data) {
        const val = row[filter.column];
        if (val !== null && val !== undefined && val !== '') {
          values.add(String(val));
        }
      }
      return Array.from(values).sort();
    }
    return [];
  }, [filter, data]);

  switch (filter.type) {
    case 'enum':
    case 'text':
      return (
        <select
          value={String(value || '__all__')}
          onChange={e => onChange(e.target.value === '__all__' ? undefined : e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm min-w-32"
        >
          <option value="__all__">הכל - {filter.column}</option>
          {uniqueValues.map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );

    case 'boolean':
      return (
        <select
          value={String(value || '__all__')}
          onChange={e => {
            const v = e.target.value;
            onChange(v === '__all__' ? undefined : v === 'true');
          }}
          className="px-3 py-2 border rounded-lg text-sm min-w-32"
        >
          <option value="__all__">הכל - {filter.column}</option>
          <option value="true">כן</option>
          <option value="false">לא</option>
        </select>
      );

    case 'number':
      const rangeValue = (value as { min?: number; max?: number }) || {};
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">{filter.column}:</span>
          <input
            type="number"
            placeholder="מ-"
            value={rangeValue.min ?? ''}
            onChange={e =>
              onChange({
                ...rangeValue,
                min: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            className="w-20 px-2 py-1 border rounded text-sm"
          />
          <span>-</span>
          <input
            type="number"
            placeholder="עד"
            value={rangeValue.max ?? ''}
            onChange={e =>
              onChange({
                ...rangeValue,
                max: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            className="w-20 px-2 py-1 border rounded text-sm"
          />
        </div>
      );

    case 'date':
      const dateValue = (value as { min?: string; max?: string }) || {};
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">{filter.column}:</span>
          <input
            type="date"
            value={dateValue.min ?? ''}
            onChange={e =>
              onChange({
                ...dateValue,
                min: e.target.value || undefined,
              })
            }
            className="px-2 py-1 border rounded text-sm"
          />
          <span>-</span>
          <input
            type="date"
            value={dateValue.max ?? ''}
            onChange={e =>
              onChange({
                ...dateValue,
                max: e.target.value || undefined,
              })
            }
            className="px-2 py-1 border rounded text-sm"
          />
        </div>
      );

    default:
      return null;
  }
}
