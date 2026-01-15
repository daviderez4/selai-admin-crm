/**
 * Audit Logging System
 * Tracks all security-relevant events for compliance and monitoring
 */

import winston from 'winston'
import { createClient } from '@/lib/supabase/server'

// Audit action types
export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  TWO_FA_VERIFIED = 'TWO_FA_VERIFIED',
  TWO_FA_FAILED = 'TWO_FA_FAILED',

  // Data Access
  DATA_VIEW = 'DATA_VIEW',
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',

  // Sensitive Data
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  SENSITIVE_DATA_DECRYPT = 'SENSITIVE_DATA_DECRYPT',
  PII_ACCESS = 'PII_ACCESS',

  // AI Operations
  AI_QUERY = 'AI_QUERY',
  AI_PII_DETECTED = 'AI_PII_DETECTED',
  AI_ERROR = 'AI_ERROR',

  // Security Events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_BLOCKED = 'IP_BLOCKED',

  // Admin Actions
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',

  // System Events
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
}

export interface AuditLogEntry {
  action: AuditAction
  userId?: string
  resource?: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp?: Date
}

// Winston logger for file-based audit logs
const fileLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'selai-audit' },
  transports: [
    // Write all logs to audit.log
    new winston.transports.File({
      filename: 'logs/audit.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 30, // Keep 30 days of logs
    }),
    // Write error-level logs to audit-errors.log
    new winston.transports.File({
      filename: 'logs/audit-errors.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 30,
    }),
  ],
})

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  fileLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  )
}

/**
 * Main audit logging function
 */
export const auditLog = async (entry: AuditLogEntry): Promise<void> => {
  const timestamp = entry.timestamp || new Date()

  const logEntry = {
    ...entry,
    timestamp: timestamp.toISOString(),
    environment: process.env.NODE_ENV,
  }

  // Log to file system
  const logLevel = entry.severity === 'critical' || entry.severity === 'high'
    ? 'error'
    : entry.severity === 'medium'
    ? 'warn'
    : 'info'

  fileLogger.log(logLevel, entry.action, logEntry)

  // Log to database for queryable audit trail
  try {
    const supabase = await createClient()
    await supabase.from('audit_logs').insert({
      action: entry.action,
      user_id: entry.userId,
      resource: entry.resource,
      resource_id: entry.resourceId,
      details: entry.details,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      severity: entry.severity,
      created_at: timestamp.toISOString(),
    })
  } catch (error) {
    // Don't fail the operation if audit logging to DB fails
    // But do log the error
    fileLogger.error('Failed to write audit log to database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      originalEntry: logEntry,
    })
  }
}

/**
 * Log authentication events
 */
export const logAuth = async (
  action: 'success' | 'failed' | 'logout',
  userId: string | undefined,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const actionMap = {
    success: AuditAction.LOGIN_SUCCESS,
    failed: AuditAction.LOGIN_FAILED,
    logout: AuditAction.LOGOUT,
  }

  await auditLog({
    action: actionMap[action],
    userId,
    resource: 'auth',
    details,
    ipAddress,
    userAgent,
    severity: action === 'failed' ? 'medium' : 'low',
  })
}

/**
 * Log data access events
 */
export const logDataAccess = async (
  action: 'view' | 'create' | 'update' | 'delete' | 'export' | 'import',
  userId: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> => {
  const actionMap = {
    view: AuditAction.DATA_VIEW,
    create: AuditAction.DATA_CREATE,
    update: AuditAction.DATA_UPDATE,
    delete: AuditAction.DATA_DELETE,
    export: AuditAction.DATA_EXPORT,
    import: AuditAction.DATA_IMPORT,
  }

  const severityMap = {
    view: 'low' as const,
    create: 'low' as const,
    update: 'low' as const,
    delete: 'medium' as const,
    export: 'medium' as const,
    import: 'medium' as const,
  }

  await auditLog({
    action: actionMap[action],
    userId,
    resource,
    resourceId,
    details,
    severity: severityMap[action],
  })
}

/**
 * Log sensitive data access
 */
export const logSensitiveAccess = async (
  userId: string,
  resource: string,
  resourceId: string,
  dataType: string,
  reason?: string
): Promise<void> => {
  await auditLog({
    action: AuditAction.SENSITIVE_DATA_ACCESS,
    userId,
    resource,
    resourceId,
    details: {
      dataType,
      reason,
      accessTime: new Date().toISOString(),
    },
    severity: 'high',
  })
}

/**
 * Log security events
 */
export const logSecurityEvent = async (
  event: 'rate_limit' | 'unauthorized' | 'suspicious' | 'ip_blocked',
  details: Record<string, any>,
  ipAddress?: string,
  userId?: string
): Promise<void> => {
  const actionMap = {
    rate_limit: AuditAction.RATE_LIMIT_EXCEEDED,
    unauthorized: AuditAction.UNAUTHORIZED_ACCESS,
    suspicious: AuditAction.SUSPICIOUS_ACTIVITY,
    ip_blocked: AuditAction.IP_BLOCKED,
  }

  const severityMap = {
    rate_limit: 'medium' as const,
    unauthorized: 'high' as const,
    suspicious: 'high' as const,
    ip_blocked: 'critical' as const,
  }

  await auditLog({
    action: actionMap[event],
    userId,
    resource: 'security',
    details,
    ipAddress,
    severity: severityMap[event],
  })
}

/**
 * Query audit logs
 */
export const queryAuditLogs = async (
  filters: {
    userId?: string
    action?: AuditAction
    resource?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
    startDate?: Date
    endDate?: Date
  },
  limit: number = 100,
  offset: number = 0
): Promise<any[]> => {
  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters.action) {
    query = query.eq('action', filters.action)
  }
  if (filters.resource) {
    query = query.eq('resource', filters.resource)
  }
  if (filters.severity) {
    query = query.eq('severity', filters.severity)
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString())
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data || []
}

/**
 * Get security summary for dashboard
 */
export const getSecuritySummary = async (
  days: number = 7
): Promise<{
  totalEvents: number
  criticalEvents: number
  highEvents: number
  failedLogins: number
  suspiciousActivities: number
  topUsers: { userId: string; eventCount: number }[]
}> => {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', startDate.toISOString())

  if (error) {
    throw error
  }

  const logs = data || []

  return {
    totalEvents: logs.length,
    criticalEvents: logs.filter(l => l.severity === 'critical').length,
    highEvents: logs.filter(l => l.severity === 'high').length,
    failedLogins: logs.filter(l => l.action === AuditAction.LOGIN_FAILED).length,
    suspiciousActivities: logs.filter(l => l.action === AuditAction.SUSPICIOUS_ACTIVITY).length,
    topUsers: [], // Would aggregate by user
  }
}
