// ============================================================================
// SELAI Data Health Services
// שירותים וhooks לניהול בריאות נתונים
// ============================================================================
// File: src/services/dataHealthService.ts
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface SyncStatus {
  id: string;
  projectId: string;
  tableName: string;
  supabaseCount: number;
  base44Count: number;
  discrepancy: number;
  lastSyncAt: string | null;
  lastSuccessfulSync: string | null;
  pendingSyncs: number;
  failedSyncs: number;
  lastError: string | null;
  lastErrorAt: string | null;
  errorCount24h: number;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  updatedAt: string;
}

export interface DataQualityIssue {
  id: string;
  projectId: string;
  tableName: string;
  recordId: string;
  issueType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  fieldName: string;
  currentValue: string;
  expectedFormat: string;
  errorMessage: string;
  suggestedFix: string | null;
  autoFixable: boolean;
  status: 'open' | 'acknowledged' | 'fixing' | 'resolved' | 'ignored';
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  detectedAt: string;
  updatedAt: string;
}

export interface SyncHistory {
  id: string;
  projectId: string;
  syncType: 'full' | 'incremental' | 'manual' | 'scheduled';
  sourceSystem: string;
  targetSystem: string;
  tablesSynced: string[];
  status: 'running' | 'completed' | 'failed' | 'partial';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  errors: any[];
  warnings: any[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  triggeredBy: string | null;
  triggerSource: string;
}

export interface DataSchema {
  id: string;
  projectId: string;
  schemaName: string;
  schemaNameEn: string | null;
  description: string | null;
  sourceType: 'excel' | 'csv' | 'api' | 'manual';
  columnMappings: Record<string, string>;
  normalizationRules: Record<string, string> | null;
  sampleHeaders: string[] | null;
  headerPatterns: any[] | null;
  useCount: number;
  lastUsedAt: string | null;
  autoDetectedCount: number;
  successRate: number;
  category: string | null;
  insuranceCompany: string | null;
  createdBy: string | null;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaUsageLog {
  id: string;
  schemaId: string | null;
  projectId: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  rowCount: number | null;
  detectionMethod: 'auto' | 'manual' | 'suggested';
  confidenceScore: number | null;
  wasSuccessful: boolean;
  errorDetails: any | null;
  validRows: number | null;
  invalidRows: number | null;
  skippedRows: number | null;
  validationErrors: any[];
  userId: string | null;
  processingTimeMs: number | null;
  createdAt: string;
}

export interface SystemHealthSummary {
  overallScore: number;
  totalRecords: number;
  totalTables: number;
  healthyTables: number;
  warningTables: number;
  criticalTables: number;
  openIssues: number;
  criticalIssues: number;
  lastSyncTime: string | null;
  pendingSyncs: number;
}

export interface ScanResult {
  issuesFound: number;
  tablesScanned: string[];
  duration: number;
}

// ============================================================================
// Data Health Service Class
// ============================================================================

export class DataHealthService {
  private supabase: SupabaseClient;
  private projectId: string;

  constructor(supabaseUrl: string, supabaseKey: string, projectId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.projectId = projectId;
  }

  // --------------------------------------------------------------------------
  // Sync Status Methods
  // --------------------------------------------------------------------------

  async getSyncStatus(): Promise<SyncStatus[]> {
    const { data, error } = await this.supabase
      .from('sync_status')
      .select('*')
      .eq('project_id', this.projectId)
      .order('health_score', { ascending: true });

    if (error) throw error;
    return this.transformSyncStatus(data || []);
  }

  async updateSyncStatus(tableName: string, updates: Partial<SyncStatus>): Promise<void> {
    const { error } = await this.supabase
      .from('sync_status')
      .upsert({
        project_id: this.projectId,
        table_name: tableName,
        ...this.toSnakeCase(updates),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id,table_name'
      });

    if (error) throw error;
  }

  async refreshTableCounts(): Promise<void> {
    // Call RPC function to refresh counts from actual tables
    const { error } = await this.supabase.rpc('refresh_sync_counts', {
      p_project_id: this.projectId
    });

    if (error) throw error;
  }

  // --------------------------------------------------------------------------
  // Data Quality Issues Methods
  // --------------------------------------------------------------------------

  async getIssues(filters?: {
    tableName?: string;
    severity?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ issues: DataQualityIssue[]; total: number }> {
    let query = this.supabase
      .from('data_quality_issues')
      .select('*', { count: 'exact' })
      .eq('project_id', this.projectId);

    if (filters?.tableName) {
      query = query.eq('table_name', filters.tableName);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    } else {
      query = query.eq('status', 'open');
    }

    query = query
      .order('detected_at', { ascending: false })
      .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return {
      issues: this.transformIssues(data || []),
      total: count || 0
    };
  }

  async resolveIssue(issueId: string, resolution: {
    status: 'resolved' | 'ignored';
    notes?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('data_quality_issues')
      .update({
        status: resolution.status,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolution.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', issueId);

    if (error) throw error;
  }

  async autoFixIssue(issue: DataQualityIssue): Promise<boolean> {
    if (!issue.autoFixable || !issue.suggestedFix) {
      return false;
    }

    // Apply the fix based on issue type
    try {
      const { error } = await this.supabase
        .from(issue.tableName)
        .update({ [issue.fieldName]: issue.suggestedFix })
        .eq('id', issue.recordId);

      if (error) throw error;

      // Mark issue as resolved
      await this.resolveIssue(issue.id, {
        status: 'resolved',
        notes: `תוקן אוטומטית: ${issue.currentValue} → ${issue.suggestedFix}`
      });

      return true;
    } catch (err) {
      console.error('Auto-fix failed:', err);
      return false;
    }
  }

  async bulkResolveIssues(issueIds: string[], status: 'resolved' | 'ignored'): Promise<number> {
    const { data, error } = await this.supabase
      .from('data_quality_issues')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', issueIds)
      .select();

    if (error) throw error;
    return data?.length || 0;
  }

  // --------------------------------------------------------------------------
  // Scanning Methods
  // --------------------------------------------------------------------------

  async scanDataQuality(tableName?: string): Promise<ScanResult> {
    const startTime = Date.now();

    const { data, error } = await this.supabase.rpc('scan_data_quality', {
      p_project_id: this.projectId,
      p_table_name: tableName || null
    });

    if (error) throw error;

    return {
      issuesFound: data || 0,
      tablesScanned: tableName ? [tableName] : ['contacts', 'leads', 'clients', 'policies', 'deals'],
      duration: Date.now() - startTime
    };
  }

  async detectDuplicates(tableName: string, fields: string[]): Promise<number> {
    const { data, error } = await this.supabase.rpc('detect_duplicates', {
      p_project_id: this.projectId,
      p_table_name: tableName,
      p_fields: fields
    });

    if (error) throw error;
    return data || 0;
  }

  // --------------------------------------------------------------------------
  // Sync History Methods
  // --------------------------------------------------------------------------

  async getSyncHistory(limit: number = 20): Promise<SyncHistory[]> {
    const { data, error } = await this.supabase
      .from('sync_history')
      .select('*')
      .eq('project_id', this.projectId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return this.transformSyncHistory(data || []);
  }

  async createSyncRecord(sync: Partial<SyncHistory>): Promise<string> {
    const { data, error } = await this.supabase
      .from('sync_history')
      .insert({
        project_id: this.projectId,
        ...this.toSnakeCase(sync),
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateSyncRecord(syncId: string, updates: Partial<SyncHistory>): Promise<void> {
    const { error } = await this.supabase
      .from('sync_history')
      .update(this.toSnakeCase(updates))
      .eq('id', syncId);

    if (error) throw error;
  }

  // --------------------------------------------------------------------------
  // Summary Methods
  // --------------------------------------------------------------------------

  async getSystemHealthSummary(): Promise<SystemHealthSummary> {
    const [syncStatus, issues] = await Promise.all([
      this.getSyncStatus(),
      this.getIssues({ status: 'open', limit: 1000 })
    ]);

    const totalRecords = syncStatus.reduce((acc, s) => acc + s.supabaseCount, 0);
    const avgScore = syncStatus.length > 0
      ? syncStatus.reduce((acc, s) => acc + s.healthScore, 0) / syncStatus.length
      : 100;

    return {
      overallScore: avgScore,
      totalRecords,
      totalTables: syncStatus.length,
      healthyTables: syncStatus.filter(s => s.healthStatus === 'healthy').length,
      warningTables: syncStatus.filter(s => s.healthStatus === 'warning').length,
      criticalTables: syncStatus.filter(s => s.healthStatus === 'critical').length,
      openIssues: issues.total,
      criticalIssues: issues.issues.filter(i => i.severity === 'critical').length,
      lastSyncTime: syncStatus.reduce((latest, s) => {
        if (!s.lastSyncAt) return latest;
        if (!latest) return s.lastSyncAt;
        return new Date(s.lastSyncAt) > new Date(latest) ? s.lastSyncAt : latest;
      }, null as string | null),
      pendingSyncs: syncStatus.reduce((acc, s) => acc + s.pendingSyncs, 0)
    };
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private transformSyncStatus(data: any[]): SyncStatus[] {
    return data.map(item => ({
      id: item.id,
      projectId: item.project_id,
      tableName: item.table_name,
      supabaseCount: item.supabase_count,
      base44Count: item.base44_count,
      discrepancy: item.discrepancy,
      lastSyncAt: item.last_sync_at,
      lastSuccessfulSync: item.last_successful_sync,
      pendingSyncs: item.pending_syncs,
      failedSyncs: item.failed_syncs,
      lastError: item.last_error,
      lastErrorAt: item.last_error_at,
      errorCount24h: item.error_count_24h,
      healthScore: item.health_score,
      healthStatus: item.health_status,
      updatedAt: item.updated_at
    }));
  }

  private transformIssues(data: any[]): DataQualityIssue[] {
    return data.map(item => ({
      id: item.id,
      projectId: item.project_id,
      tableName: item.table_name,
      recordId: item.record_id,
      issueType: item.issue_type,
      severity: item.severity,
      fieldName: item.field_name,
      currentValue: item.current_value,
      expectedFormat: item.expected_format,
      errorMessage: item.error_message,
      suggestedFix: item.suggested_fix,
      autoFixable: item.auto_fixable,
      status: item.status,
      resolvedAt: item.resolved_at,
      resolvedBy: item.resolved_by,
      resolutionNotes: item.resolution_notes,
      detectedAt: item.detected_at,
      updatedAt: item.updated_at
    }));
  }

  private transformSyncHistory(data: any[]): SyncHistory[] {
    return data.map(item => ({
      id: item.id,
      projectId: item.project_id,
      syncType: item.sync_type,
      sourceSystem: item.source_system,
      targetSystem: item.target_system,
      tablesSynced: item.tables_synced,
      status: item.status,
      recordsProcessed: item.records_processed,
      recordsCreated: item.records_created,
      recordsUpdated: item.records_updated,
      recordsDeleted: item.records_deleted,
      recordsFailed: item.records_failed,
      errors: item.errors,
      warnings: item.warnings,
      startedAt: item.started_at,
      completedAt: item.completed_at,
      durationMs: item.duration_ms,
      triggeredBy: item.triggered_by,
      triggerSource: item.trigger_source
    }));
  }

  private toSnakeCase(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = value;
    }
    return result;
  }
}

// ============================================================================
// Schema Registry Service Class
// ============================================================================

export class SchemaRegistryService {
  private supabase: SupabaseClient;
  private projectId: string;

  constructor(supabaseUrl: string, supabaseKey: string, projectId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.projectId = projectId;
  }

  // --------------------------------------------------------------------------
  // Schema CRUD Methods
  // --------------------------------------------------------------------------

  async getSchemas(filters?: {
    category?: string;
    insuranceCompany?: string;
    isActive?: boolean;
    searchQuery?: string;
  }): Promise<DataSchema[]> {
    let query = this.supabase
      .from('data_schemas')
      .select('*')
      .or(`project_id.eq.${this.projectId},is_public.eq.true`);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.insuranceCompany) {
      query = query.eq('insurance_company', filters.insuranceCompany);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.searchQuery) {
      query = query.or(`schema_name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
    }

    query = query.order('use_count', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return this.transformSchemas(data || []);
  }

  async getSchema(schemaId: string): Promise<DataSchema | null> {
    const { data, error } = await this.supabase
      .from('data_schemas')
      .select('*')
      .eq('id', schemaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.transformSchema(data);
  }

  async createSchema(schema: Partial<DataSchema>): Promise<DataSchema> {
    const { data, error } = await this.supabase
      .from('data_schemas')
      .insert({
        project_id: this.projectId,
        schema_name: schema.schemaName,
        schema_name_en: schema.schemaNameEn,
        description: schema.description,
        source_type: schema.sourceType || 'excel',
        column_mappings: schema.columnMappings || {},
        normalization_rules: schema.normalizationRules,
        sample_headers: schema.sampleHeaders,
        category: schema.category,
        insurance_company: schema.insuranceCompany,
        is_active: true,
        is_public: schema.isPublic || false
      })
      .select()
      .single();

    if (error) throw error;
    return this.transformSchema(data);
  }

  async updateSchema(schemaId: string, updates: Partial<DataSchema>): Promise<DataSchema> {
    const { data, error } = await this.supabase
      .from('data_schemas')
      .update({
        schema_name: updates.schemaName,
        schema_name_en: updates.schemaNameEn,
        description: updates.description,
        column_mappings: updates.columnMappings,
        normalization_rules: updates.normalizationRules,
        sample_headers: updates.sampleHeaders,
        category: updates.category,
        insurance_company: updates.insuranceCompany,
        is_active: updates.isActive,
        is_public: updates.isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('id', schemaId)
      .select()
      .single();

    if (error) throw error;
    return this.transformSchema(data);
  }

  async deleteSchema(schemaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('data_schemas')
      .delete()
      .eq('id', schemaId)
      .eq('project_id', this.projectId);

    if (error) throw error;
  }

  async duplicateSchema(schemaId: string, newName: string): Promise<DataSchema> {
    const original = await this.getSchema(schemaId);
    if (!original) throw new Error('Schema not found');

    return this.createSchema({
      ...original,
      schemaName: newName,
      useCount: 0,
      lastUsedAt: undefined
    });
  }

  // --------------------------------------------------------------------------
  // Schema Detection Methods
  // --------------------------------------------------------------------------

  async detectSchema(headers: string[]): Promise<Array<{
    schema: DataSchema;
    confidence: number;
    matchedColumns: number;
    totalColumns: number;
  }>> {
    const { data, error } = await this.supabase.rpc('detect_schema', {
      p_project_id: this.projectId,
      p_headers: headers
    });

    if (error) throw error;

    // Get full schema objects for matches
    const matches = await Promise.all(
      (data || []).map(async (match: any) => {
        const schema = await this.getSchema(match.schema_id);
        return {
          schema: schema!,
          confidence: match.confidence,
          matchedColumns: match.matched_columns,
          totalColumns: match.total_columns
        };
      })
    );

    return matches.filter(m => m.schema !== null);
  }

  async suggestMappings(headers: string[]): Promise<Record<string, string>> {
    // AI-powered mapping suggestions
    const suggestions: Record<string, string> = {};
    
    const knownMappings: Record<string, string[]> = {
      first_name: ['שם פרטי', 'first name', 'fname', 'פרטי'],
      last_name: ['שם משפחה', 'last name', 'lname', 'משפחה'],
      full_name: ['שם מלא', 'full name', 'name', 'שם'],
      phone: ['טלפון', 'נייד', 'phone', 'mobile', 'tel', 'פלאפון'],
      email: ['אימייל', 'מייל', 'email', 'דוא"ל'],
      id_number: ['ת.ז.', 'תעודת זהות', 'id', 'מזהה', 'ת.ז'],
      address: ['כתובת', 'address', 'רחוב'],
      city: ['עיר', 'city', 'ישוב'],
      balance: ['יתרה', 'סכום', 'balance', 'amount'],
      status: ['סטטוס', 'status', 'מצב']
    };

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [field, patterns] of Object.entries(knownMappings)) {
        for (const pattern of patterns) {
          if (normalizedHeader.includes(pattern.toLowerCase())) {
            suggestions[header] = field;
            break;
          }
        }
        if (suggestions[header]) break;
      }
    }

    return suggestions;
  }

  // --------------------------------------------------------------------------
  // Usage Logging Methods
  // --------------------------------------------------------------------------

  async logUsage(usage: Partial<SchemaUsageLog>): Promise<void> {
    const { error } = await this.supabase
      .from('schema_usage_log')
      .insert({
        schema_id: usage.schemaId,
        project_id: this.projectId,
        file_name: usage.fileName,
        file_size_bytes: usage.fileSizeBytes,
        row_count: usage.rowCount,
        detection_method: usage.detectionMethod,
        confidence_score: usage.confidenceScore,
        was_successful: usage.wasSuccessful ?? true,
        error_details: usage.errorDetails,
        valid_rows: usage.validRows,
        invalid_rows: usage.invalidRows,
        skipped_rows: usage.skippedRows,
        validation_errors: usage.validationErrors || [],
        processing_time_ms: usage.processingTimeMs
      });

    if (error) throw error;
  }

  async getUsageStats(schemaId: string): Promise<{
    totalUses: number;
    successRate: number;
    avgProcessingTime: number;
    lastUsed: string | null;
  }> {
    const { data, error } = await this.supabase
      .from('schema_usage_log')
      .select('*')
      .eq('schema_id', schemaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const logs = data || [];
    const successful = logs.filter(l => l.was_successful);
    const avgTime = logs.reduce((acc, l) => acc + (l.processing_time_ms || 0), 0) / logs.length;

    return {
      totalUses: logs.length,
      successRate: logs.length > 0 ? (successful.length / logs.length) * 100 : 100,
      avgProcessingTime: avgTime || 0,
      lastUsed: logs[0]?.created_at || null
    };
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private transformSchemas(data: any[]): DataSchema[] {
    return data.map(item => this.transformSchema(item));
  }

  private transformSchema(item: any): DataSchema {
    return {
      id: item.id,
      projectId: item.project_id,
      schemaName: item.schema_name,
      schemaNameEn: item.schema_name_en,
      description: item.description,
      sourceType: item.source_type,
      columnMappings: item.column_mappings,
      normalizationRules: item.normalization_rules,
      sampleHeaders: item.sample_headers,
      headerPatterns: item.header_patterns,
      useCount: item.use_count,
      lastUsedAt: item.last_used_at,
      autoDetectedCount: item.auto_detected_count,
      successRate: item.success_rate,
      category: item.category,
      insuranceCompany: item.insurance_company,
      createdBy: item.created_by,
      isActive: item.is_active,
      isPublic: item.is_public,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    };
  }
}

// ============================================================================
// React Hooks
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useDataHealth(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string
) {
  const [service] = useState(() => new DataHealthService(supabaseUrl, supabaseKey, projectId));
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [issuesTotal, setIssuesTotal] = useState(0);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [summary, setSummary] = useState<SystemHealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [status, issuesData, history, summaryData] = await Promise.all([
        service.getSyncStatus(),
        service.getIssues({ status: 'open', limit: 100 }),
        service.getSyncHistory(20),
        service.getSystemHealthSummary()
      ]);
      setSyncStatus(status);
      setIssues(issuesData.issues);
      setIssuesTotal(issuesData.total);
      setSyncHistory(history);
      setSummary(summaryData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const scanQuality = useCallback(async (tableName?: string) => {
    try {
      const result = await service.scanDataQuality(tableName);
      await refresh();
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service, refresh]);

  const fixIssue = useCallback(async (issue: DataQualityIssue) => {
    try {
      const success = await service.autoFixIssue(issue);
      if (success) {
        await refresh();
      }
      return success;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service, refresh]);

  const resolveIssue = useCallback(async (issueId: string, status: 'resolved' | 'ignored', notes?: string) => {
    try {
      await service.resolveIssue(issueId, { status, notes });
      await refresh();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service, refresh]);

  return {
    syncStatus,
    issues,
    issuesTotal,
    syncHistory,
    summary,
    isLoading,
    error,
    refresh,
    scanQuality,
    fixIssue,
    resolveIssue
  };
}

export function useSchemaRegistry(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string
) {
  const [service] = useState(() => new SchemaRegistryService(supabaseUrl, supabaseKey, projectId));
  const [schemas, setSchemas] = useState<DataSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (filters?: {
    category?: string;
    insuranceCompany?: string;
    isActive?: boolean;
    searchQuery?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await service.getSchemas(filters);
      setSchemas(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSchema = useCallback(async (schema: Partial<DataSchema>) => {
    try {
      const newSchema = await service.createSchema(schema);
      await refresh();
      return newSchema;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service, refresh]);

  const updateSchema = useCallback(async (schemaId: string, updates: Partial<DataSchema>) => {
    try {
      const updated = await service.updateSchema(schemaId, updates);
      await refresh();
      return updated;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service, refresh]);

  const deleteSchema = useCallback(async (schemaId: string) => {
    try {
      await service.deleteSchema(schemaId);
      await refresh();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service, refresh]);

  const detectSchema = useCallback(async (headers: string[]) => {
    try {
      return await service.detectSchema(headers);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service]);

  const suggestMappings = useCallback(async (headers: string[]) => {
    try {
      return await service.suggestMappings(headers);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [service]);

  return {
    schemas,
    isLoading,
    error,
    refresh,
    createSchema,
    updateSchema,
    deleteSchema,
    detectSchema,
    suggestMappings
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  DataHealthService,
  SchemaRegistryService,
  useDataHealth,
  useSchemaRegistry
};
