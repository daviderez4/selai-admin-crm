// ============================================
// Database Types
// ============================================

export interface Project {
  id: string;
  name: string;
  // Supabase credentials (nullable for local mode)
  supabase_url?: string | null;
  supabase_anon_key?: string | null;
  supabase_service_key?: string | null;
  service_key_encrypted?: string; // Legacy column
  description?: string;
  // Storage and data configuration
  storage_mode: 'local' | 'external';
  table_name: string;
  data_type?: 'accumulation' | 'insurance' | 'processes' | 'commissions' | 'custom';
  icon?: string;
  color?: string;
  region?: string;
  is_active?: boolean;
  settings?: Record<string, unknown>;
  // Project isolation tracking
  is_configured: boolean;
  connection_last_tested?: string;
  connection_error?: string;
  // Update frequency settings
  update_frequency?: 'manual' | 'daily' | 'weekly' | 'monthly';
  auto_import_email?: string;
  auto_import_enabled?: boolean;
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

export interface ProjectGuest {
  id: string;
  project_id: string;
  email: string;
  name?: string;
  access_token: string;
  role: 'viewer';
  invited_by: string;
  expires_at: string;
  is_active: boolean;
  last_accessed_at?: string;
  access_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  project_name?: string;
  inviter_name?: string;
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

// ============================================
// SELAI Hierarchy Types (from main SELAI Supabase)
// ============================================

export type UserRole = 'admin' | 'supervisor' | 'agent' | 'client';

// Hub user profile with role and SELAI connection
export interface HubUserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  // Connection to SELAI entities
  selai_user_id?: string;           // Link to users table in SELAI
  external_agent_id?: string;        // Link to external_agents table (for agents)
  supervisor_id?: string;            // Link to supervisors table (for supervisors)
  // Permissions
  can_manage_users: boolean;
  can_import_data: boolean;
  can_export_data: boolean;
  can_view_all_agents: boolean;
  // Settings
  two_factor_enabled: boolean;
  theme: 'dark' | 'light' | 'system';
  language: 'he' | 'en';
  // Metadata
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Supervisor from SELAI
export interface Supervisor {
  id: string;
  name: string;
  selai_user_id?: string;
  external_agent_id?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// External Agent from SELAI (the 398 agents)
export interface ExternalAgent {
  id: string;
  id_number: string;            // Israeli ID
  license_number: string;       // Insurance license
  full_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_phone?: string;
  office_phone?: string;
  supervisor_id: string;        // Reference to supervisors table
  business_unit_id: string;     // Reference to business_units table
  matal?: string;
  is_active_in_sela: boolean;
  selai_user_id?: string;       // If registered in app
  surense_agent_id?: string;
  base44_user_id?: string;
  onboarded_to_app: boolean;
  onboarded_at?: string;
  notes?: string;
  source_file?: string;
  imported_at: string;
  created_at: string;
  updated_at: string;
}

// Agent Producer Numbers (agent numbers at each insurance company)
export interface AgentProducerNumber {
  id: string;
  external_agent_id: string;
  producer_id: string;          // Reference to producers (insurance companies)
  agent_number: string;         // The agent's number at this producer
  agent_number_description: string;
  parent_agent_number_1?: string;
  parent_agent_number_2?: string;
  is_active: boolean;
  notes?: string;
  created_by: string;
  original_created_at?: string;
  last_updated_by?: string;
  original_updated_at?: string;
  created_at: string;
  updated_at: string;
}

// Producer (Insurance Company)
export interface Producer {
  id: string;
  name: string;
  parent_company_id?: string;
  producer_type?: string;
  surense_producer_id?: string;
  surense_producer_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Business Unit
export interface BusinessUnit {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// Client from SELAI
export interface Client {
  id: string;
  agent_id: string;             // Which agent owns this client
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  id_number?: string;
  date_of_birth?: string;
  address?: string;
  is_active: boolean;
  has_portal_access: boolean;
  last_login_at?: string;
  notes?: string;
  tags?: string[];
  created_date: string;
  updated_date: string;
  created_by: string;
}

// Contact from SELAI
export interface Contact {
  id: string;
  agent_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  id_number?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  company_name?: string;
  company?: string;
  occupation?: string;
  source?: string;
  status: 'new' | 'active' | 'inactive';
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}
