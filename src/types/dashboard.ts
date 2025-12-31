// ============================================
// Smart Dashboard Builder Types
// ============================================

// Column Categories
export type ColumnCategory =
  | 'financial'    // 💰 כספי
  | 'dates'        // 📅 תאריכים
  | 'people'       // 👤 אנשים
  | 'status'       // 📋 סטטוס
  | 'companies'    // 🏢 חברות
  | 'contact'      // 📞 קשר
  | 'identifiers'  // 📄 מזהים
  | 'system'       // ⚙️ מערכת
  | 'other';       // 📁 אחר

export const CATEGORY_CONFIG: Record<ColumnCategory, {
  icon: string;
  label: string;
  color: string;
  patterns: RegExp[];
}> = {
  financial: {
    icon: '💰',
    label: 'כספי',
    color: 'emerald',
    patterns: [/סכום|פרמיה|עמלה|תשלום|מחיר|עלות|הכנסה|הוצאה|amount|price|cost|total|sum|fee|commission/i],
  },
  dates: {
    icon: '📅',
    label: 'תאריכים',
    color: 'blue',
    patterns: [/תאריך|מועד|יום|חודש|שנה|date|created|updated|time|timestamp|_at$/i],
  },
  people: {
    icon: '👤',
    label: 'אנשים',
    color: 'purple',
    patterns: [/שם|איש_קשר|מטפל|סוכן|לקוח|עובד|נציג|name|user|agent|employee|contact|customer/i],
  },
  status: {
    icon: '📋',
    label: 'סטטוס',
    color: 'amber',
    patterns: [/סטטוס|מצב|שלב|status|state|stage|phase|type$/i],
  },
  companies: {
    icon: '🏢',
    label: 'חברות',
    color: 'cyan',
    patterns: [/חברה|יצרן|ספק|company|vendor|supplier|organization|org/i],
  },
  contact: {
    icon: '📞',
    label: 'קשר',
    color: 'pink',
    patterns: [/טלפון|מייל|נייד|כתובת|phone|email|mobile|address|tel/i],
  },
  identifiers: {
    icon: '📄',
    label: 'מזהים',
    color: 'slate',
    patterns: [/מספר|מזהה|ת\.ז\.|תעודת_זהות|id$|_id$|number|code|uuid/i],
  },
  system: {
    icon: '⚙️',
    label: 'מערכת',
    color: 'gray',
    patterns: [/^id$|^uuid$|created_at|updated_at|deleted_at|_by$/i],
  },
  other: {
    icon: '📁',
    label: 'אחר',
    color: 'zinc',
    patterns: [],
  },
};

// Column Data Types
export type ColumnDataType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'json'
  | 'unknown';

// Column Statistics
export interface ColumnStats {
  count: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  // For numbers
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  // For enums
  uniqueValues?: string[];
  valueDistribution?: Record<string, number>;
  // For dates
  minDate?: string;
  maxDate?: string;
  // For text
  avgLength?: number;
  maxLength?: number;
}

// Analyzed Column
export interface AnalyzedColumn {
  name: string;
  displayName: string;
  dataType: ColumnDataType;
  category: ColumnCategory;
  stats: ColumnStats;
  sampleValues: unknown[];
  isRecommended: boolean;
  recommendationScore: number;
}

// Data Analysis Result
export interface DataAnalysis {
  tableName: string;
  totalRows: number;
  totalColumns: number;
  columns: AnalyzedColumn[];
  categories: Record<ColumnCategory, AnalyzedColumn[]>;
  recommendedFields: string[];
  analyzedAt: string;
}

// Field Selection
export interface FieldSelection {
  name: string;
  order: number;
  visible: boolean;
  width?: number;
  format?: string;
  customLabel?: string;
}

// Filter Configuration
export interface FilterConfig {
  column: string;
  type: 'text' | 'number' | 'date' | 'enum' | 'boolean';
  enabled: boolean;
  defaultValue?: unknown;
  options?: string[]; // For enum
  min?: number; // For number/date
  max?: number;
}

// Summary Card Configuration
export interface CardConfig {
  id: string;
  title: string;
  column: string;
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct';
  groupBy?: string;
  icon: string;
  color: string;
  format?: 'number' | 'currency' | 'percent';
  compareToField?: string; // For comparison
}

// Table Configuration
export interface TableConfig {
  columns: FieldSelection[];
  defaultSort?: { column: string; direction: 'asc' | 'desc' };
  groupBy?: string;
  pageSize: number;
  enableSearch: boolean;
  enableExport: boolean;
}

// Chart Configuration
export interface ChartConfig {
  id: string;
  type: 'pie' | 'bar' | 'line' | 'area' | 'donut';
  title: string;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation: 'sum' | 'count' | 'avg';
  colors?: string[];
  showLegend: boolean;
  showValues: boolean;
}

// Complete Dashboard Template
export interface SmartDashboardTemplate {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  tableName: string;

  // Analysis data
  dataAnalysis?: DataAnalysis;

  // Configuration
  fieldSelection: FieldSelection[];
  filtersConfig: FilterConfig[];
  cardsConfig: CardConfig[];
  tableConfig: TableConfig;
  chartsConfig: ChartConfig[];

  // Metadata
  isDefault: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// User Dashboard State
export interface UserDashboardState {
  userId: string;
  projectId: string;
  templateId: string;
  currentFilters: Record<string, unknown>;
  columnWidths: Record<string, number>;
  expandedGroups: string[];
  updatedAt: string;
}

// Quick Selection Presets
export interface QuickSelectionPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  categoryFilter?: ColumnCategory[];
  columnPatterns?: RegExp[];
}

export const QUICK_SELECTION_PRESETS: QuickSelectionPreset[] = [
  {
    id: 'basic',
    name: 'שדות בסיסיים',
    icon: '📋',
    description: 'מזהה, שם, תאריך, סטטוס',
    categoryFilter: ['identifiers', 'people', 'dates', 'status'],
  },
  {
    id: 'financial',
    name: 'שדות כספיים',
    icon: '💰',
    description: 'כל השדות הכספיים',
    categoryFilter: ['financial'],
  },
  {
    id: 'contacts',
    name: 'פרטי קשר',
    icon: '📞',
    description: 'טלפון, מייל, כתובת',
    categoryFilter: ['contact', 'people'],
  },
  {
    id: 'all',
    name: 'כל השדות',
    icon: '📁',
    description: 'בחר את כל השדות',
  },
];
