/**
 * SELAI Insurance Integration Hub
 * Audit Logger - Security audit trail and compliance logging
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { logger, createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('AuditLogger');

// ============================================
// TYPES
// ============================================

export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'token_refresh'
  | 'password_change'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'customer_view'
  | 'customer_create'
  | 'customer_update'
  | 'customer_delete'
  | 'policy_view'
  | 'policy_create'
  | 'policy_update'
  | 'policy_cancel'
  | 'claim_view'
  | 'claim_submit'
  | 'claim_update'
  | 'pension_data_access'
  | 'pension_consent_grant'
  | 'pension_consent_revoke'
  | 'quote_request'
  | 'quote_accept'
  | 'data_export'
  | 'report_generate'
  | 'admin_action'
  | 'permission_change'
  | 'settings_change';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  actor: {
    user_id?: string;
    email?: string;
    role?: string;
    ip_address?: string;
    user_agent?: string;
    api_key_id?: string;
  };
  resource?: {
    type: string;
    id: string;
    name?: string;
  };
  details?: Record<string, any>;
  request?: {
    method: string;
    path: string;
    query?: Record<string, any>;
  };
  result: 'success' | 'failure' | 'denied';
  tenant_id?: string;
  correlation_id?: string;
}

export interface AuditLoggerConfig {
  enabled?: boolean;
  persistToDatabase?: boolean;
  sensitiveFields?: string[];
  retentionDays?: number;
}

// ============================================
// AUDIT LOGGER CLASS
// ============================================

export class AuditLogger {
  private config: AuditLoggerConfig;
  private sensitiveFields: Set<string>;

  constructor(config: AuditLoggerConfig = {}) {
    this.config = {
      enabled: true,
      persistToDatabase: true,
      sensitiveFields: ['password', 'token', 'secret', 'api_key', 'credit_card'],
      retentionDays: 365,
      ...config
    };
    this.sensitiveFields = new Set(this.config.sensitiveFields);
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<string> {
    if (!this.config.enabled) return '';

    const auditEntry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...entry,
      details: entry.details ? this.sanitize(entry.details) : undefined
    };

    // Log to application logger
    const logLevel = entry.severity === 'critical' ? 'error' :
                     entry.severity === 'warning' ? 'warn' : 'info';
    log[logLevel]('Audit event', auditEntry);

    // Persist to database if configured
    if (this.config.persistToDatabase) {
      await this.persistEntry(auditEntry);
    }

    return auditEntry.id;
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: 'login' | 'logout' | 'login_failed' | 'token_refresh',
    request: FastifyRequest,
    userId?: string,
    result: 'success' | 'failure' = 'success',
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      action,
      severity: action === 'login_failed' ? 'warning' : 'info',
      actor: {
        user_id: userId,
        ip_address: request.ip,
        user_agent: request.headers['user-agent']
      },
      request: {
        method: request.method,
        path: request.url
      },
      result,
      details
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    action: AuditAction,
    request: FastifyRequest,
    resource: { type: string; id: string; name?: string },
    result: 'success' | 'failure' | 'denied' = 'success',
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      action,
      severity: result === 'denied' ? 'warning' : 'info',
      actor: {
        user_id: request.user?.id,
        email: request.user?.email,
        role: request.user?.role,
        ip_address: request.ip,
        user_agent: request.headers['user-agent']
      },
      resource,
      request: {
        method: request.method,
        path: request.url,
        query: request.query as Record<string, any>
      },
      result,
      details,
      tenant_id: request.user?.tenant_id
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(
    request: FastifyRequest,
    actionDescription: string,
    resource?: { type: string; id: string },
    result: 'success' | 'failure' = 'success',
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      action: 'admin_action',
      severity: 'warning',
      actor: {
        user_id: request.user?.id,
        email: request.user?.email,
        role: request.user?.role,
        ip_address: request.ip
      },
      resource,
      request: {
        method: request.method,
        path: request.url
      },
      result,
      details: {
        ...details,
        action_description: actionDescription
      },
      tenant_id: request.user?.tenant_id
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    event: string,
    severity: AuditSeverity,
    details: Record<string, any>,
    request?: FastifyRequest
  ): Promise<string> {
    return this.log({
      action: 'admin_action',
      severity,
      actor: request ? {
        user_id: request.user?.id,
        ip_address: request.ip,
        user_agent: request.headers['user-agent']
      } : {},
      result: 'success',
      details: {
        security_event: event,
        ...details
      }
    });
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private sanitize(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private async persistEntry(entry: AuditEntry): Promise<void> {
    // In production, this would insert into the audit_logs table
    // For now, we rely on the structured logging
    log.debug('Audit entry persisted', { auditId: entry.id });
  }
}

// ============================================
// SINGLETON & MIDDLEWARE
// ============================================

export const auditLogger = new AuditLogger();

/**
 * Fastify hook for automatic audit logging
 */
export function createAuditHook(actions: Map<string, AuditAction>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const routeKey = `${request.method}:${request.routeOptions?.url}`;
    const action = actions.get(routeKey);

    if (action && request.user) {
      // Log after response is sent
      reply.raw.on('finish', async () => {
        const result = reply.statusCode < 400 ? 'success' :
                       reply.statusCode === 403 ? 'denied' : 'failure';

        await auditLogger.log({
          action,
          severity: 'info',
          actor: {
            user_id: request.user?.id,
            email: request.user?.email,
            role: request.user?.role,
            ip_address: request.ip
          },
          request: {
            method: request.method,
            path: request.url
          },
          result,
          tenant_id: request.user?.tenant_id
        });
      });
    }
  };
}
