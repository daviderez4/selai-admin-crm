// ============================================
// Database Types
// ============================================

export interface Project {
  id: string;
  name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
  service_key_encrypted?: string; // Legacy column
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface UserProjectAccess {
  id: string;
  user_id: string;
  project_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  project_id?: string;
  action: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Joined fields
  user_email?: string;
  project_name?: string;
}

export interface ImportHistory {
  id: string;
  user_id: string;
  project_id: string;
  table_name: string;
  file_name: string;
  rows_imported: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  theme: 'dark' | 'light' | 'system';
  language: 'he' | 'en';
  default_project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPreferences {
  project_id: string;
  visible_columns: string[];
  column_order: string[];
  filters: Record<string, unknown>;
  sort_column?: string;
  sort_direction?: 'asc' | 'desc';
  page_size: number;
  last_selected_table?: string;
}

export interface ImportedDataStats {
  total_records: number;
  last_import_date?: string;
  last_import_rows?: number;
  columns: {
    name: string;
    type: string;
    unique_values?: number;
    null_count?: number;
  }[];
  status_breakdown?: Record<string, number>;
  date_distribution?: { date: string; count: number }[];
}

// Dashboard Templates
export interface DashboardTemplate {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  config: TemplateConfig;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateConfig {
  table_name: string;
  columns: TemplateColumn[];
  filters: TemplateFilter[];
  charts: TemplateChart[];
  layout: 'default' | 'compact' | 'wide';
  page_size: number;
}

export interface TemplateColumn {
  name: string;
  label: string;
  visible: boolean;
  order: number;
  width?: number;
  format?: 'text' | 'number' | 'date' | 'currency' | 'percent' | 'boolean';
  calculated?: {
    formula: string;
    dependencies: string[];
  };
}

export interface TemplateFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
  active: boolean;
}

export interface TemplateChart {
  id: string;
  type: 'pie' | 'bar' | 'line' | 'area' | 'donut';
  title: string;
  column: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  groupBy?: string;
  colors?: string[];
}

// Multi-sheet Excel Import
export interface ExcelSheetInfo {
  name: string;
  index: number;
  rowCount: number;
  headers: string[];
  preview: Record<string, string>[];
}

export interface SheetImportConfig {
  sheetName: string;
  targetTable: string;
  columnMappings: {
    excelColumn: string;
    dbColumn: string;
    transform: 'string' | 'number' | 'boolean' | 'date' | 'json';
  }[];
  skipFirstRow: boolean;
}

// ============================================
// Auth Types
// ============================================

export interface User {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Table Types (for connected Supabase projects)
// ============================================

export interface TableInfo {
  name: string;
  schema: string;
  rowCount?: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: {
    table: string;
    column: string;
  };
}

export interface TableRow {
  [key: string]: unknown;
}

// ============================================
// Import Types
// ============================================

export interface ImportConfig {
  tableName: string;
  columnMappings: Record<string, string>;
  skipFirstRow: boolean;
  updateExisting: boolean;
  uniqueColumn?: string;
}

export interface ImportPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}
