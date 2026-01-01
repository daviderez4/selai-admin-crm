'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Filter,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Dynamic filter values - key is column name, value is selected value
export type DynamicFilterValues = Record<string, string | number | null>;

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, unknown>[]; // Raw data to extract filters from
  filters: DynamicFilterValues;
  onApply: (filters: DynamicFilterValues) => void;
}

// Meta columns to exclude from filtering
const META_COLUMNS = [
  'id', 'created_at', 'updated_at', 'import_batch', 'import_date',
  'project_id', 'raw_data', 'total_expected_accumulation'
];

// Hebrew month names
const HEBREW_MONTHS: Record<string, string> = {
  '1': 'ינואר',
  '2': 'פברואר',
  '3': 'מרץ',
  '4': 'אפריל',
  '5': 'מאי',
  '6': 'יוני',
  '7': 'יולי',
  '8': 'אוגוסט',
  '9': 'ספטמבר',
  '10': 'אוקטובר',
  '11': 'נובמבר',
  '12': 'דצמבר',
};

export function FilterSidebar({
  isOpen,
  onClose,
  data,
  filters,
  onApply,
}: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<DynamicFilterValues>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Extract all column names from data
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];

    // Get column keys, excluding meta columns
    return Object.keys(firstRow).filter(key => !META_COLUMNS.includes(key));
  }, [data]);

  // Get unique values for a column
  const getUniqueValues = (columnName: string): string[] => {
    const values = data.map(row => {
      const value = row[columnName];
      return value;
    });

    return [...new Set(values)]
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => String(v))
      .sort((a, b) => a.localeCompare(b, 'he'))
      .slice(0, 50); // Limit to 50 values
  };

  // Determine which columns are suitable for filtering (2-30 unique values)
  const filterableColumns = useMemo(() => {
    return columns.filter(col => {
      // Skip import_month and import_year - they're handled separately
      if (col === 'import_month' || col === 'import_year') return false;

      const uniqueValues = getUniqueValues(col);
      return uniqueValues.length >= 2 && uniqueValues.length <= 30;
    });
  }, [columns, data]);

  // Check if import period columns exist
  const hasImportPeriod = columns.includes('import_month') || columns.includes('import_year');

  // Get available years from data
  const availableYears = useMemo(() => {
    if (!columns.includes('import_year')) return [];
    const years = [...new Set(data.map(row => row.import_year))]
      .filter(y => y !== null && y !== undefined)
      .map(y => Number(y))
      .sort((a, b) => b - a); // Descending
    return years;
  }, [data, columns]);

  const handleClear = () => {
    setLocalFilters({});
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleFilterChange = (column: string, value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [column]: value === '' ? null : value,
    }));
  };

  const activeFiltersCount = Object.values(localFilters).filter(v => v !== null && v !== '').length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-700 z-50 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">פילטרים</h2>
            {activeFiltersCount > 0 && (
              <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-slate-400" />
          </Button>
        </div>

        {/* Filters Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Dynamic Column Filters */}
          {filterableColumns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-slate-300 font-medium text-sm">פילטרים לפי עמודות</h3>

              {filterableColumns.map(column => {
                const uniqueValues = getUniqueValues(column);
                // Create a nice label - replace underscores with spaces
                const label = column.replace(/_/g, ' ');

                return (
                  <div key={column} className="space-y-2">
                    <Label className="text-slate-400 text-sm">{label}</Label>
                    <Select
                      value={String(localFilters[column] || '__all__')}
                      onValueChange={value => handleFilterChange(column, value === '__all__' ? '' : value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="הכל" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                        <SelectItem value="__all__" className="text-slate-300">הכל</SelectItem>
                        {uniqueValues.map(val => (
                          <SelectItem key={val} value={val} className="text-slate-300">
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          {/* Import Period Filters - Always show if data has these columns */}
          {hasImportPeriod && (
            <>
              <div className="border-t border-slate-700 pt-4 mt-4" />

              <div className="space-y-4">
                <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                  <span>📆</span> תקופת ייבוא
                </h3>

                {/* Month Filter */}
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">חודש</Label>
                  <Select
                    value={String(localFilters.import_month || '__all__')}
                    onValueChange={value => handleFilterChange('import_month', value === '__all__' ? '' : value)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="כל החודשים" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="__all__" className="text-slate-300">כל החודשים</SelectItem>
                      {Object.entries(HEBREW_MONTHS).map(([num, name]) => (
                        <SelectItem key={num} value={num} className="text-slate-300">
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Filter */}
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">שנה</Label>
                  <Select
                    value={String(localFilters.import_year || '__all__')}
                    onValueChange={value => handleFilterChange('import_year', value === '__all__' ? '' : value)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="כל השנים" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="__all__" className="text-slate-300">כל השנים</SelectItem>
                      {(availableYears.length > 0 ? availableYears : [2024, 2025, 2026]).map(year => (
                        <SelectItem key={year} value={String(year)} className="text-slate-300">
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {filterableColumns.length === 0 && !hasImportPeriod && (
            <div className="text-center text-slate-500 py-8">
              <p>אין פילטרים זמינים</p>
              <p className="text-sm mt-2">נטען נתונים כדי לזהות פילטרים אפשריים</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
              onClick={handleClear}
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              נקה הכל
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleApply}
            >
              <Check className="h-4 w-4 ml-2" />
              החל
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
