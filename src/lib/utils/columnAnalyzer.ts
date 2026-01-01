/**
 * Universal Column Analyzer
 * Auto-detects column types and generates appropriate filter configurations
 */

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'id';

export type FilterType =
  | 'dropdown'      // For enum columns with <20 unique values
  | 'search'        // For text columns with >20 unique values
  | 'range'         // For number columns (min-max slider)
  | 'dateRange'     // For date columns
  | 'toggle'        // For boolean columns
  | 'none';         // For ID/non-filterable columns

export interface ColumnAnalysis {
  name: string;
  type: ColumnType;
  filterType: FilterType;
  uniqueValues: string[];
  uniqueCount: number;
  nullCount: number;
  sampleValues: unknown[];
  isStatusColumn: boolean;
  numericStats?: {
    min: number;
    max: number;
    avg: number;
    sum: number;
  };
  dateStats?: {
    min: Date;
    max: Date;
  };
  filterPriority: number; // Lower = more filterable, show first
}

export interface TableAnalysis {
  columns: ColumnAnalysis[];
  totalRows: number;
  topFilterableColumns: ColumnAnalysis[];
  statusColumns: ColumnAnalysis[];
  numericColumns: ColumnAnalysis[];
  dateColumns: ColumnAnalysis[];
}

// Hebrew status patterns for color coding
export const STATUS_PATTERNS = {
  negative: ['רג\'קט', 'ביטול', 'נכשל', 'נדחה', 'מבוטל', 'סגור', 'לא פעיל', 'נמחק'],
  positive: ['פעיל', 'הצלחה', 'אושר', 'הושלם', 'סיום', 'מאושר', 'תקין', 'פתוח'],
  warning: ['ממתין', 'בתהליך', 'טיפול', 'בבדיקה', 'בהמתנה', 'עיכוב', 'דחוי'],
  info: ['חדש', 'טיוטה', 'התחלה', 'ראשוני'],
};

export function getStatusColor(value: string): 'red' | 'green' | 'yellow' | 'blue' | 'gray' {
  const lowerValue = String(value).toLowerCase();

  for (const pattern of STATUS_PATTERNS.negative) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'red';
  }
  for (const pattern of STATUS_PATTERNS.positive) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'green';
  }
  for (const pattern of STATUS_PATTERNS.warning) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'yellow';
  }
  for (const pattern of STATUS_PATTERNS.info) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'blue';
  }

  return 'gray';
}

// Check if column name suggests it's a status column
const STATUS_COLUMN_NAMES = ['סטטוס', 'מצב', 'שלב', 'status', 'state', 'stage', 'phase'];

function isStatusColumnName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return STATUS_COLUMN_NAMES.some(s => lowerName.includes(s));
}

// Check if value looks like a date
function isDateValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;

  const str = String(value);

  // ISO date format
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return true;

  // Common date formats
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str)) return true;

  // Check if it parses as a valid date
  const date = new Date(str);
  if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
    return true;
  }

  return false;
}

// Check if value looks like a number
function isNumericValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return true;

  const str = String(value).replace(/[,₪$€%\s]/g, '').trim();
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}

// Check if value looks like a boolean
function isBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return true;

  const str = String(value).toLowerCase().trim();
  return ['true', 'false', 'כן', 'לא', 'yes', 'no', '1', '0', 'אמת', 'שקר'].includes(str);
}

// Check if column is likely an ID column
function isIdColumn(name: string, values: unknown[]): boolean {
  const lowerName = name.toLowerCase();

  // Name-based detection
  if (lowerName === 'id' || lowerName.endsWith('_id') || lowerName.endsWith('id')) {
    return true;
  }

  // Check if all values are unique and numeric/sequential
  const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined));
  if (uniqueValues.size === values.length && values.length > 10) {
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)));
    if (numericValues.length === values.length) {
      return true;
    }
  }

  return false;
}

/**
 * Analyze a single column
 */
export function analyzeColumn(name: string, values: unknown[]): ColumnAnalysis {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const nullCount = values.length - nonNullValues.length;

  // Get unique values (as strings for comparison)
  const uniqueSet = new Set<string>();
  nonNullValues.forEach(v => uniqueSet.add(String(v)));
  const uniqueValues = Array.from(uniqueSet).slice(0, 100); // Limit for performance
  const uniqueCount = uniqueSet.size;

  // Detect column type
  let type: ColumnType = 'text';
  let filterType: FilterType = 'search';
  let numericStats: ColumnAnalysis['numericStats'];
  let dateStats: ColumnAnalysis['dateStats'];

  // Sample first 100 non-null values for type detection
  const sampleValues = nonNullValues.slice(0, 100);

  // Check if ID column first
  if (isIdColumn(name, nonNullValues)) {
    type = 'id';
    filterType = 'none';
  }
  // Check for boolean
  else if (sampleValues.length > 0 && sampleValues.every(isBooleanValue)) {
    type = 'boolean';
    filterType = 'toggle';
  }
  // Check for date
  else if (sampleValues.length > 0 && sampleValues.filter(isDateValue).length > sampleValues.length * 0.8) {
    type = 'date';
    filterType = 'dateRange';

    // Calculate date stats
    const dates = nonNullValues
      .map(v => new Date(String(v)))
      .filter(d => !isNaN(d.getTime()));

    if (dates.length > 0) {
      dateStats = {
        min: new Date(Math.min(...dates.map(d => d.getTime()))),
        max: new Date(Math.max(...dates.map(d => d.getTime()))),
      };
    }
  }
  // Check for number
  else if (sampleValues.length > 0 && sampleValues.filter(isNumericValue).length > sampleValues.length * 0.8) {
    type = 'number';
    filterType = 'range';

    // Calculate numeric stats
    const numbers = nonNullValues
      .map(v => parseFloat(String(v).replace(/[,₪$€%\s]/g, '')))
      .filter(n => !isNaN(n));

    if (numbers.length > 0) {
      numericStats = {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        avg: numbers.reduce((a, b) => a + b, 0) / numbers.length,
        sum: numbers.reduce((a, b) => a + b, 0),
      };
    }
  }
  // Text column - check if enum-like
  else if (uniqueCount <= 20 && uniqueCount > 0) {
    type = 'enum';
    filterType = 'dropdown';
  }

  // Check if status column
  const isStatusColumn = isStatusColumnName(name) ||
    (type === 'enum' && uniqueValues.some(v => getStatusColor(v) !== 'gray'));

  // Calculate filter priority (lower = better for filtering)
  let filterPriority = 100;
  if (type === 'id') {
    filterPriority = 1000; // Don't show ID columns in filters
  } else if (isStatusColumn) {
    filterPriority = 1; // Status columns are most important
  } else if (type === 'enum') {
    filterPriority = 2 + uniqueCount; // Fewer options = higher priority
  } else if (type === 'boolean') {
    filterPriority = 5;
  } else if (type === 'date') {
    filterPriority = 30;
  } else if (type === 'number') {
    filterPriority = 40;
  } else {
    filterPriority = 50 + Math.min(uniqueCount, 50);
  }

  return {
    name,
    type,
    filterType,
    uniqueValues: uniqueValues.sort((a, b) => a.localeCompare(b, 'he')),
    uniqueCount,
    nullCount,
    sampleValues: sampleValues.slice(0, 5),
    isStatusColumn,
    numericStats,
    dateStats,
    filterPriority,
  };
}

/**
 * Analyze entire table
 */
export function analyzeTable(data: Record<string, unknown>[]): TableAnalysis {
  if (data.length === 0) {
    return {
      columns: [],
      totalRows: 0,
      topFilterableColumns: [],
      statusColumns: [],
      numericColumns: [],
      dateColumns: [],
    };
  }

  // Get all column names
  const columnNames = Object.keys(data[0]);

  // Analyze each column
  const columns = columnNames.map(name => {
    const values = data.map(row => row[name]);
    return analyzeColumn(name, values);
  });

  // Sort by filter priority
  const sortedColumns = [...columns].sort((a, b) => a.filterPriority - b.filterPriority);

  return {
    columns,
    totalRows: data.length,
    topFilterableColumns: sortedColumns.filter(c => c.filterType !== 'none').slice(0, 5),
    statusColumns: columns.filter(c => c.isStatusColumn),
    numericColumns: columns.filter(c => c.type === 'number'),
    dateColumns: columns.filter(c => c.type === 'date'),
  };
}

/**
 * Filter data based on active filters
 */
export interface ActiveFilter {
  column: string;
  type: FilterType;
  value: unknown; // string[] for dropdown, { min, max } for range, etc.
}

export function applyFilters(
  data: Record<string, unknown>[],
  filters: ActiveFilter[],
  globalSearch?: string
): Record<string, unknown>[] {
  let filtered = [...data];

  // Apply global search first
  if (globalSearch && globalSearch.trim()) {
    const searchLower = globalSearch.toLowerCase().trim();
    filtered = filtered.filter(row => {
      return Object.values(row).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }

  // Apply each filter
  for (const filter of filters) {
    if (!filter.value || (Array.isArray(filter.value) && filter.value.length === 0)) {
      continue;
    }

    filtered = filtered.filter(row => {
      const cellValue = row[filter.column];

      switch (filter.type) {
        case 'dropdown': {
          const selectedValues = filter.value as string[];
          if (selectedValues.length === 0) return true;
          return selectedValues.includes(String(cellValue ?? ''));
        }

        case 'search': {
          const searchValue = filter.value as string;
          if (!searchValue.trim()) return true;
          return String(cellValue ?? '').toLowerCase().includes(searchValue.toLowerCase());
        }

        case 'range': {
          const { min, max } = filter.value as { min?: number; max?: number };
          const numValue = parseFloat(String(cellValue ?? '').replace(/[,₪$€%\s]/g, ''));
          if (isNaN(numValue)) return false;
          if (min !== undefined && numValue < min) return false;
          if (max !== undefined && numValue > max) return false;
          return true;
        }

        case 'dateRange': {
          const { start, end } = filter.value as { start?: string; end?: string };
          if (!cellValue) return false;
          const dateValue = new Date(String(cellValue));
          if (isNaN(dateValue.getTime())) return false;
          if (start && dateValue < new Date(start)) return false;
          if (end && dateValue > new Date(end)) return false;
          return true;
        }

        case 'toggle': {
          const boolValue = filter.value as boolean | null;
          if (boolValue === null) return true;
          const cellBool = String(cellValue).toLowerCase();
          const isTrue = ['true', 'כן', 'yes', '1', 'אמת'].includes(cellBool);
          return boolValue === isTrue;
        }

        default:
          return true;
      }
    });
  }

  return filtered;
}

/**
 * Sort data by column
 */
export type SortDirection = 'asc' | 'desc' | null;

export function sortData(
  data: Record<string, unknown>[],
  column: string,
  direction: SortDirection
): Record<string, unknown>[] {
  if (!direction) return data;

  return [...data].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];

    // Handle nulls
    if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;

    // Numeric comparison
    const aNum = parseFloat(String(aVal).replace(/[,₪$€%\s]/g, ''));
    const bNum = parseFloat(String(bVal).replace(/[,₪$€%\s]/g, ''));

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' ? aNum - bNum : bNum - aNum;
    }

    // Date comparison
    const aDate = new Date(String(aVal));
    const bDate = new Date(String(bVal));

    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      return direction === 'asc'
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }

    // String comparison (Hebrew-aware)
    const aStr = String(aVal);
    const bStr = String(bVal);
    const comparison = aStr.localeCompare(bStr, 'he');
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Calculate summary statistics for filtered data
 */
export interface ColumnSummary {
  column: string;
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export function calculateSummary(
  data: Record<string, unknown>[],
  numericColumns: string[]
): ColumnSummary[] {
  return numericColumns.map(column => {
    const values = data
      .map(row => parseFloat(String(row[column] ?? '').replace(/[,₪$€%\s]/g, '')))
      .filter(n => !isNaN(n));

    if (values.length === 0) {
      return { column, sum: 0, avg: 0, min: 0, max: 0, count: 0 };
    }

    return {
      column,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  });
}

/**
 * Serialize filters to URL params
 */
export function filtersToUrlParams(filters: ActiveFilter[], globalSearch?: string): string {
  const params = new URLSearchParams();

  if (globalSearch) {
    params.set('q', globalSearch);
  }

  filters.forEach((filter, index) => {
    params.set(`f${index}_col`, filter.column);
    params.set(`f${index}_type`, filter.type);
    params.set(`f${index}_val`, JSON.stringify(filter.value));
  });

  params.set('fc', String(filters.length));

  return params.toString();
}

/**
 * Parse filters from URL params
 */
export function urlParamsToFilters(params: URLSearchParams): { filters: ActiveFilter[]; globalSearch?: string } {
  const globalSearch = params.get('q') || undefined;
  const filterCount = parseInt(params.get('fc') || '0', 10);

  const filters: ActiveFilter[] = [];

  for (let i = 0; i < filterCount; i++) {
    const column = params.get(`f${i}_col`);
    const type = params.get(`f${i}_type`) as FilterType;
    const valueStr = params.get(`f${i}_val`);

    if (column && type && valueStr) {
      try {
        filters.push({
          column,
          type,
          value: JSON.parse(valueStr),
        });
      } catch {
        // Skip invalid filter
      }
    }
  }

  return { filters, globalSearch };
}
