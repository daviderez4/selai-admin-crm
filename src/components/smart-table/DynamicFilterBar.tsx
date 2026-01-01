'use client';

import { useState, useMemo } from 'react';
import {
  Filter,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Hash,
  ToggleLeft,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { ColumnAnalysis, ActiveFilter, FilterType } from '@/lib/utils/columnAnalyzer';

interface DynamicFilterBarProps {
  columns: ColumnAnalysis[];
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  globalSearch: string;
  onGlobalSearchChange: (search: string) => void;
  totalRows: number;
  filteredRows: number;
  className?: string;
}

export function DynamicFilterBar({
  columns,
  activeFilters,
  onFiltersChange,
  globalSearch,
  onGlobalSearchChange,
  totalRows,
  filteredRows,
  className,
}: DynamicFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [addFilterOpen, setAddFilterOpen] = useState(false);

  // Get columns that can be filtered
  const filterableColumns = useMemo(() => {
    return columns
      .filter(c => c.filterType !== 'none')
      .sort((a, b) => a.filterPriority - b.filterPriority);
  }, [columns]);

  // Get columns not yet added to filters
  const availableColumns = useMemo(() => {
    const activeColumnNames = new Set(activeFilters.map(f => f.column));
    return filterableColumns.filter(c => !activeColumnNames.has(c.name));
  }, [filterableColumns, activeFilters]);

  // Get top suggested filters (first 5 not already active)
  const suggestedFilters = useMemo(() => {
    return availableColumns.slice(0, 5);
  }, [availableColumns]);

  const handleAddFilter = (column: ColumnAnalysis) => {
    const newFilter: ActiveFilter = {
      column: column.name,
      type: column.filterType,
      value: column.filterType === 'dropdown' ? [] : undefined,
    };
    onFiltersChange([...activeFilters, newFilter]);
    setAddFilterOpen(false);
  };

  const handleRemoveFilter = (columnName: string) => {
    onFiltersChange(activeFilters.filter(f => f.column !== columnName));
  };

  const handleFilterChange = (columnName: string, value: unknown) => {
    onFiltersChange(
      activeFilters.map(f =>
        f.column === columnName ? { ...f, value } : f
      )
    );
  };

  const handleClearAll = () => {
    onFiltersChange([]);
    onGlobalSearchChange('');
  };

  const getFilterIcon = (type: FilterType) => {
    switch (type) {
      case 'dropdown': return <List className="h-3 w-3" />;
      case 'search': return <Search className="h-3 w-3" />;
      case 'range': return <Hash className="h-3 w-3" />;
      case 'dateRange': return <Calendar className="h-3 w-3" />;
      case 'toggle': return <ToggleLeft className="h-3 w-3" />;
      default: return <Filter className="h-3 w-3" />;
    }
  };

  const hasActiveFilters = activeFilters.length > 0 || globalSearch.trim().length > 0;

  return (
    <div className={cn('bg-slate-800/50 border border-slate-700 rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          <Filter className="h-4 w-4" />
          <span className="font-medium">פילטרים</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 text-xs">
              {activeFilters.length + (globalSearch ? 1 : 0)} פעילים
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {filteredRows === totalRows ? (
              `${totalRows.toLocaleString()} רשומות`
            ) : (
              <span>
                נמצאו <span className="text-emerald-400 font-medium">{filteredRows.toLocaleString()}</span>
                {' '}מתוך {totalRows.toLocaleString()}
              </span>
            )}
          </span>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-slate-400 hover:text-red-400 h-7"
            >
              <X className="h-3 w-3 ml-1" />
              נקה הכל
            </Button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="חיפוש בכל העמודות..."
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              className="pr-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
            />
            {globalSearch && (
              <button
                onClick={() => onGlobalSearchChange('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map(filter => {
                const column = columns.find(c => c.name === filter.column);
                if (!column) return null;

                return (
                  <FilterChip
                    key={filter.column}
                    column={column}
                    filter={filter}
                    onChange={(value) => handleFilterChange(filter.column, value)}
                    onRemove={() => handleRemoveFilter(filter.column)}
                    icon={getFilterIcon(filter.type)}
                  />
                );
              })}
            </div>
          )}

          {/* Add Filter Button + Suggestions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Popover open={addFilterOpen} onOpenChange={setAddFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-emerald-500"
                >
                  <Plus className="h-3 w-3 ml-1" />
                  הוסף פילטר
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-0 bg-slate-800 border-slate-700"
                align="start"
              >
                <Command className="bg-transparent">
                  <CommandInput placeholder="חפש עמודה..." className="border-slate-700" />
                  <CommandList>
                    <CommandEmpty>לא נמצאו עמודות</CommandEmpty>
                    <CommandGroup>
                      {availableColumns.map(column => (
                        <CommandItem
                          key={column.name}
                          onSelect={() => handleAddFilter(column)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {getFilterIcon(column.filterType)}
                          <span>{column.name}</span>
                          <span className="text-xs text-slate-500 mr-auto">
                            {column.uniqueCount} ערכים
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Quick add suggestions */}
            {activeFilters.length === 0 && suggestedFilters.length > 0 && (
              <>
                <span className="text-xs text-slate-500">מומלץ:</span>
                {suggestedFilters.slice(0, 3).map(column => (
                  <Button
                    key={column.name}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddFilter(column)}
                    className="text-xs text-slate-400 hover:text-emerald-400 h-6 px-2"
                  >
                    {getFilterIcon(column.filterType)}
                    <span className="mr-1">{column.name}</span>
                  </Button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Filter Chip Component
interface FilterChipProps {
  column: ColumnAnalysis;
  filter: ActiveFilter;
  onChange: (value: unknown) => void;
  onRemove: () => void;
  icon: React.ReactNode;
}

function FilterChip({ column, filter, onChange, onRemove, icon }: FilterChipProps) {
  const [open, setOpen] = useState(false);

  const getValueDisplay = () => {
    switch (filter.type) {
      case 'dropdown': {
        const values = filter.value as string[];
        if (!values || values.length === 0) return 'הכל';
        if (values.length === 1) return values[0];
        return `${values.length} נבחרו`;
      }
      case 'search': {
        return filter.value ? `"${filter.value}"` : 'הכל';
      }
      case 'range': {
        const range = filter.value as { min?: number; max?: number };
        if (!range) return 'הכל';
        if (range.min !== undefined && range.max !== undefined) {
          return `${range.min.toLocaleString()} - ${range.max.toLocaleString()}`;
        }
        if (range.min !== undefined) return `מ-${range.min.toLocaleString()}`;
        if (range.max !== undefined) return `עד ${range.max.toLocaleString()}`;
        return 'הכל';
      }
      case 'dateRange': {
        const dates = filter.value as { start?: string; end?: string };
        if (!dates) return 'הכל';
        if (dates.start && dates.end) {
          return `${new Date(dates.start).toLocaleDateString('he-IL')} - ${new Date(dates.end).toLocaleDateString('he-IL')}`;
        }
        if (dates.start) return `מ-${new Date(dates.start).toLocaleDateString('he-IL')}`;
        if (dates.end) return `עד ${new Date(dates.end).toLocaleDateString('he-IL')}`;
        return 'הכל';
      }
      case 'toggle': {
        if (filter.value === true) return 'כן';
        if (filter.value === false) return 'לא';
        return 'הכל';
      }
      default:
        return 'הכל';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1 text-sm cursor-pointer hover:bg-slate-600 transition-colors group">
          {icon}
          <span className="text-slate-400">{column.name}:</span>
          <span className="text-white">{getValueDisplay()}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity mr-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 bg-slate-800 border-slate-700"
        align="start"
      >
        <FilterEditor
          column={column}
          filter={filter}
          onChange={onChange}
        />
      </PopoverContent>
    </Popover>
  );
}

// Filter Editor for each type
interface FilterEditorProps {
  column: ColumnAnalysis;
  filter: ActiveFilter;
  onChange: (value: unknown) => void;
}

function FilterEditor({ column, filter, onChange }: FilterEditorProps) {
  switch (filter.type) {
    case 'dropdown':
      return (
        <DropdownFilterEditor
          column={column}
          value={filter.value as string[] || []}
          onChange={onChange}
        />
      );

    case 'search':
      return (
        <div className="space-y-2">
          <label className="text-sm text-slate-400">חפש ב-{column.name}</label>
          <Input
            value={filter.value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="הקלד לחיפוש..."
            className="bg-slate-900 border-slate-600"
          />
        </div>
      );

    case 'range':
      return (
        <RangeFilterEditor
          column={column}
          value={filter.value as { min?: number; max?: number }}
          onChange={onChange}
        />
      );

    case 'dateRange':
      return (
        <DateRangeFilterEditor
          column={column}
          value={filter.value as { start?: string; end?: string }}
          onChange={onChange}
        />
      );

    case 'toggle':
      return (
        <ToggleFilterEditor
          value={filter.value as boolean | null}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

// Dropdown Filter Editor
function DropdownFilterEditor({
  column,
  value,
  onChange,
}: {
  column: ColumnAnalysis;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filteredValues = useMemo(() => {
    if (!search) return column.uniqueValues;
    return column.uniqueValues.filter(v =>
      v.toLowerCase().includes(search.toLowerCase())
    );
  }, [column.uniqueValues, search]);

  const handleToggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === column.uniqueValues.length) {
      onChange([]);
    } else {
      onChange([...column.uniqueValues]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-400">{column.name}</label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="text-xs h-6"
        >
          {value.length === column.uniqueValues.length ? 'נקה הכל' : 'בחר הכל'}
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="חפש..."
        className="bg-slate-900 border-slate-600 h-8 text-sm"
      />

      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredValues.map(val => (
          <label
            key={val}
            className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-700 cursor-pointer"
          >
            <Checkbox
              checked={value.includes(val)}
              onCheckedChange={() => handleToggle(val)}
            />
            <span className="text-sm text-white truncate">{val || '(ריק)'}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Range Filter Editor
function RangeFilterEditor({
  column,
  value,
  onChange,
}: {
  column: ColumnAnalysis;
  value: { min?: number; max?: number } | undefined;
  onChange: (value: { min?: number; max?: number }) => void;
}) {
  const stats = column.numericStats;
  if (!stats) return null;

  const currentMin = value?.min ?? stats.min;
  const currentMax = value?.max ?? stats.max;

  return (
    <div className="space-y-4">
      <label className="text-sm text-slate-400">{column.name}</label>

      <div className="px-2">
        <Slider
          value={[currentMin, currentMax]}
          min={stats.min}
          max={stats.max}
          step={(stats.max - stats.min) / 100}
          onValueChange={([min, max]) => onChange({ min, max })}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-500">מינימום</label>
          <Input
            type="number"
            value={currentMin}
            onChange={(e) => onChange({ ...value, min: parseFloat(e.target.value) })}
            className="bg-slate-900 border-slate-600 h-8 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-slate-500">מקסימום</label>
          <Input
            type="number"
            value={currentMax}
            onChange={(e) => onChange({ ...value, max: parseFloat(e.target.value) })}
            className="bg-slate-900 border-slate-600 h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// Date Range Filter Editor
function DateRangeFilterEditor({
  column,
  value,
  onChange,
}: {
  column: ColumnAnalysis;
  value: { start?: string; end?: string } | undefined;
  onChange: (value: { start?: string; end?: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-slate-400">{column.name}</label>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-slate-500">מתאריך</label>
          <Input
            type="date"
            value={value?.start || ''}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="bg-slate-900 border-slate-600 h-8 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">עד תאריך</label>
          <Input
            type="date"
            value={value?.end || ''}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="bg-slate-900 border-slate-600 h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// Toggle Filter Editor
function ToggleFilterEditor({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-400">בחר ערך</label>
      <div className="flex gap-2">
        <Button
          variant={value === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(null)}
          className={value === null ? 'bg-emerald-500' : ''}
        >
          הכל
        </Button>
        <Button
          variant={value === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(true)}
          className={value === true ? 'bg-emerald-500' : ''}
        >
          כן
        </Button>
        <Button
          variant={value === false ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(false)}
          className={value === false ? 'bg-emerald-500' : ''}
        >
          לא
        </Button>
      </div>
    </div>
  );
}
