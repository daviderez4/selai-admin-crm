/**
 * Insurance Project Analyzer
 * Analyzes project data and generates smart configurations
 */

import {
  INSURANCE_CATEGORIES,
  matchColumnToCategory,
  getMatchingCategories,
  suggestDashboardTemplate,
  getStatusPatternColor,
  type InsuranceCategory,
  type DashboardTemplate,
} from './insurance-patterns';

// Analysis results
export interface ColumnCategoryMatch {
  columnName: string;
  categories: InsuranceCategory[];
  primaryCategory: InsuranceCategory | null;
  sampleValues: unknown[];
  uniqueCount: number;
  nullCount: number;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isKey: boolean;
}

export interface CategoryAnalysis {
  category: InsuranceCategory;
  columns: ColumnCategoryMatch[];
  recordCount: number;
  uniqueValues: Map<string, unknown[]>;
  metrics: CategoryMetricValue[];
}

export interface CategoryMetricValue {
  metricId: string;
  metricName: string;
  value: number;
  formatted: string;
}

export interface ProjectAnalysis {
  projectId: string;
  tableName: string;
  totalRows: number;
  totalColumns: number;
  columnMatches: ColumnCategoryMatch[];
  categoryAnalyses: CategoryAnalysis[];
  detectedCategories: InsuranceCategory[];
  suggestedTemplate: DashboardTemplate;
  suggestedFilters: SuggestedFilter[];
  suggestedCards: SuggestedCard[];
  suggestedCharts: SuggestedChart[];
}

export interface SuggestedFilter {
  columnName: string;
  category: InsuranceCategory;
  filterType: 'dropdown' | 'search' | 'range' | 'dateRange';
  uniqueValues?: string[];
  priority: number;
}

export interface SuggestedCard {
  title: string;
  category: InsuranceCategory;
  metricType: 'count' | 'sum' | 'avg' | 'distinct';
  columnName?: string;
  value?: number;
  formatted?: string;
}

export interface SuggestedChart {
  title: string;
  category: InsuranceCategory;
  chartType: 'pie' | 'bar' | 'funnel' | 'leaderboard' | 'timeline' | 'gauge';
  columnName: string;
  data?: Array<{ name: string; value: number; color?: string }>;
}

// Data type detection
function detectDataType(values: unknown[]): 'text' | 'number' | 'date' | 'boolean' {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) return 'text';

  // Check for boolean
  const booleanValues = ['true', 'false', 'כן', 'לא', 'yes', 'no', '1', '0'];
  const allBoolean = nonNullValues.every(v =>
    booleanValues.includes(String(v).toLowerCase())
  );
  if (allBoolean) return 'boolean';

  // Check for date
  const dateCount = nonNullValues.filter(v => {
    const str = String(v);
    // ISO date or common formats
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return true;
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str)) return true;
    const date = new Date(str);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
  }).length;

  if (dateCount > nonNullValues.length * 0.8) return 'date';

  // Check for number
  const numberCount = nonNullValues.filter(v => {
    if (typeof v === 'number') return true;
    const str = String(v).replace(/[,₪$€%\s]/g, '');
    return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
  }).length;

  if (numberCount > nonNullValues.length * 0.8) return 'number';

  return 'text';
}

// Check if column is likely a key/identifier
function isKeyColumn(columnName: string, values: unknown[]): boolean {
  const lowerName = columnName.toLowerCase();

  // Name-based detection
  if (lowerName === 'id' || lowerName.endsWith('_id') || lowerName.includes('מזהה')) {
    return true;
  }

  // Check if all values are unique
  const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined));
  return uniqueValues.size === values.length && values.length > 10;
}

// Format number for display
function formatNumber(value: number, format: 'number' | 'currency' | 'percent'): string {
  if (format === 'currency') {
    return `₪${value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
  }
  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toLocaleString('he-IL', { maximumFractionDigits: 2 });
}

// Analyze a single column
function analyzeColumn(
  columnName: string,
  values: unknown[]
): ColumnCategoryMatch {
  const categories = getMatchingCategories(columnName);
  const primaryCategory = matchColumnToCategory(columnName);

  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const uniqueSet = new Set(nonNullValues.map(v => String(v)));

  return {
    columnName,
    categories,
    primaryCategory,
    sampleValues: nonNullValues.slice(0, 5),
    uniqueCount: uniqueSet.size,
    nullCount: values.length - nonNullValues.length,
    dataType: detectDataType(nonNullValues),
    isKey: isKeyColumn(columnName, nonNullValues),
  };
}

// Analyze category with data
function analyzeCategoryData(
  category: InsuranceCategory,
  columns: ColumnCategoryMatch[],
  data: Record<string, unknown>[]
): CategoryAnalysis {
  const uniqueValues = new Map<string, unknown[]>();

  // Get unique values for each column in this category
  columns.forEach(col => {
    const values = data.map(row => row[col.columnName]).filter(v => v !== null && v !== undefined);
    const uniqueSet = [...new Set(values.map(v => String(v)))];
    uniqueValues.set(col.columnName, uniqueSet);
  });

  // Calculate metrics
  const metrics: CategoryMetricValue[] = [];

  // Get first relevant column for each metric
  const financialColumns = columns.filter(c => c.dataType === 'number');
  const textColumns = columns.filter(c => c.dataType === 'text');

  category.metrics.forEach(metric => {
    let value = 0;

    switch (metric.type) {
      case 'count':
        value = data.length;
        break;

      case 'distinct':
        if (textColumns.length > 0) {
          const col = textColumns[0];
          const uniqueSet = new Set(data.map(row => row[col.columnName]).filter(Boolean));
          value = uniqueSet.size;
        }
        break;

      case 'sum':
        if (financialColumns.length > 0) {
          const col = financialColumns[0];
          value = data.reduce((sum, row) => {
            const val = parseFloat(String(row[col.columnName] || 0).replace(/[,₪$€%\s]/g, ''));
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
        }
        break;

      case 'avg':
        if (financialColumns.length > 0) {
          const col = financialColumns[0];
          const values = data
            .map(row => parseFloat(String(row[col.columnName] || 0).replace(/[,₪$€%\s]/g, '')))
            .filter(v => !isNaN(v));
          value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        }
        break;

      case 'min':
      case 'max':
        if (financialColumns.length > 0) {
          const col = financialColumns[0];
          const values = data
            .map(row => parseFloat(String(row[col.columnName] || 0).replace(/[,₪$€%\s]/g, '')))
            .filter(v => !isNaN(v));
          value = values.length > 0 ? (metric.type === 'min' ? Math.min(...values) : Math.max(...values)) : 0;
        }
        break;
    }

    metrics.push({
      metricId: metric.id,
      metricName: metric.name,
      value,
      formatted: formatNumber(value, metric.format),
    });
  });

  return {
    category,
    columns,
    recordCount: data.length,
    uniqueValues,
    metrics,
  };
}

// Generate suggested filters
function generateSuggestedFilters(
  columnMatches: ColumnCategoryMatch[],
  data: Record<string, unknown>[]
): SuggestedFilter[] {
  const filters: SuggestedFilter[] = [];

  // Priority order: status/process, then manufacturers, then agents, then others
  const priorityOrder = ['processes', 'manufacturers', 'agents', 'products', 'clients', 'dates', 'financial'];

  columnMatches
    .filter(col => col.primaryCategory && !col.isKey)
    .forEach(col => {
      const category = col.primaryCategory!;

      let filterType: SuggestedFilter['filterType'] = 'search';
      let uniqueValues: string[] | undefined;

      if (col.dataType === 'date') {
        filterType = 'dateRange';
      } else if (col.dataType === 'number') {
        filterType = 'range';
      } else if (col.uniqueCount <= 20) {
        filterType = 'dropdown';
        uniqueValues = data
          .map(row => String(row[col.columnName] || ''))
          .filter(Boolean);
        uniqueValues = [...new Set(uniqueValues)].sort((a, b) => a.localeCompare(b, 'he'));
      }

      const priorityIndex = priorityOrder.indexOf(category.id);
      const priority = priorityIndex === -1 ? 100 : priorityIndex * 10 + (col.uniqueCount < 10 ? 0 : 5);

      filters.push({
        columnName: col.columnName,
        category,
        filterType,
        uniqueValues,
        priority,
      });
    });

  return filters.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

// Generate suggested cards
function generateSuggestedCards(
  categoryAnalyses: CategoryAnalysis[]
): SuggestedCard[] {
  const cards: SuggestedCard[] = [];

  // Add cards for each detected category (up to 4)
  categoryAnalyses.slice(0, 4).forEach(analysis => {
    const mainMetric = analysis.metrics[0];
    if (mainMetric) {
      cards.push({
        title: analysis.category.name,
        category: analysis.category,
        metricType: 'distinct',
        value: mainMetric.value,
        formatted: mainMetric.formatted,
      });
    }
  });

  // Fill remaining slots with total records if needed
  while (cards.length < 4) {
    cards.push({
      title: 'סה"כ רשומות',
      category: INSURANCE_CATEGORIES.find(c => c.id === 'identifiers')!,
      metricType: 'count',
    });
  }

  return cards;
}

// Generate suggested charts
function generateSuggestedCharts(
  categoryAnalyses: CategoryAnalysis[],
  data: Record<string, unknown>[]
): SuggestedChart[] {
  const charts: SuggestedChart[] = [];

  categoryAnalyses.forEach(analysis => {
    // Find best column for chart (prefer enum-like columns)
    const enumColumn = analysis.columns.find(
      c => c.dataType === 'text' && c.uniqueCount > 1 && c.uniqueCount <= 20
    );

    if (enumColumn) {
      // Generate chart data
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const value = String(row[enumColumn.columnName] || 'לא ידוע');
        counts[value] = (counts[value] || 0) + 1;
      });

      const colorMap: Record<string, string | undefined> = {
        green: '#10b981',
        red: '#ef4444',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        gray: undefined,
      };

      const chartData = Object.entries(counts)
        .map(([name, value]) => ({
          name,
          value,
          color: colorMap[getStatusPatternColor(name)],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      charts.push({
        title: `${analysis.category.name} - ${enumColumn.columnName}`,
        category: analysis.category,
        chartType: analysis.category.chartType,
        columnName: enumColumn.columnName,
        data: chartData,
      });
    }
  });

  return charts.slice(0, 4);
}

/**
 * Main analysis function - analyzes project data and generates configuration
 */
export function analyzeProjectData(
  projectId: string,
  tableName: string,
  data: Record<string, unknown>[]
): ProjectAnalysis {
  if (data.length === 0) {
    return {
      projectId,
      tableName,
      totalRows: 0,
      totalColumns: 0,
      columnMatches: [],
      categoryAnalyses: [],
      detectedCategories: [],
      suggestedTemplate: suggestDashboardTemplate([]),
      suggestedFilters: [],
      suggestedCards: [],
      suggestedCharts: [],
    };
  }

  // Get all column names
  const columnNames = Object.keys(data[0]);

  // Analyze each column
  const columnMatches = columnNames.map(name => {
    const values = data.map(row => row[name]);
    return analyzeColumn(name, values);
  });

  // Group columns by category
  const categoryColumnsMap = new Map<string, ColumnCategoryMatch[]>();

  columnMatches.forEach(col => {
    if (col.primaryCategory) {
      const existing = categoryColumnsMap.get(col.primaryCategory.id) || [];
      existing.push(col);
      categoryColumnsMap.set(col.primaryCategory.id, existing);
    }
  });

  // Analyze each category with data
  const categoryAnalyses: CategoryAnalysis[] = [];

  for (const [categoryId, columns] of categoryColumnsMap) {
    const category = INSURANCE_CATEGORIES.find(c => c.id === categoryId);
    if (category) {
      categoryAnalyses.push(analyzeCategoryData(category, columns, data));
    }
  }

  // Sort by number of columns (most columns first)
  categoryAnalyses.sort((a, b) => b.columns.length - a.columns.length);

  // Get detected category IDs
  const detectedCategoryIds = categoryAnalyses.map(a => a.category.id);
  const detectedCategories = categoryAnalyses.map(a => a.category);

  // Suggest dashboard template
  const suggestedTemplate = suggestDashboardTemplate(detectedCategoryIds);

  // Generate suggestions
  const suggestedFilters = generateSuggestedFilters(columnMatches, data);
  const suggestedCards = generateSuggestedCards(categoryAnalyses);
  const suggestedCharts = generateSuggestedCharts(categoryAnalyses, data);

  return {
    projectId,
    tableName,
    totalRows: data.length,
    totalColumns: columnNames.length,
    columnMatches,
    categoryAnalyses,
    detectedCategories,
    suggestedTemplate,
    suggestedFilters,
    suggestedCards,
    suggestedCharts,
  };
}

/**
 * Save project configuration to database
 */
export interface ProjectConfiguration {
  projectId: string;
  tableName: string;
  selectedCategories: string[];
  dashboardLayout: DashboardTemplate;
  customMetrics: Array<{
    name: string;
    type: 'sum' | 'avg' | 'count' | 'distinct';
    columnName: string;
  }>;
  filterPresets: Array<{
    name: string;
    filters: Record<string, unknown>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export function createDefaultConfiguration(
  analysis: ProjectAnalysis
): ProjectConfiguration {
  return {
    projectId: analysis.projectId,
    tableName: analysis.tableName,
    selectedCategories: analysis.detectedCategories.map(c => c.id),
    dashboardLayout: analysis.suggestedTemplate,
    customMetrics: [],
    filterPresets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
