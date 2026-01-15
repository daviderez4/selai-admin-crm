/**
 * Security Module - Main Export
 * Provides all security functionality for SELAI Admin Hub
 */

// Encryption
export {
  encrypt,
  decrypt,
  hash,
  generateToken,
  encryptSensitiveFields,
  decryptSensitiveFields,
  maskValue,
  encryptForStorage,
  decryptFromStorage,
  isSensitiveField,
  SENSITIVE_FIELDS,
} from './encryption'

// PII Redaction
export {
  redactPII,
  restorePII,
  containsPII,
  analyzePII,
  redactObjectPII,
  type PIIRedactionConfig,
  type RedactionResult,
} from './pii-redaction'

// Secure AI
export {
  secureAIQuery,
  generateInsuranceQuote,
  analyzeDocument,
  chatWithAssistant,
  type SecureAIRequest,
  type SecureAIResponse,
} from './secure-ai'

// Audit Logging
export {
  auditLog,
  logAuth,
  logDataAccess,
  logSensitiveAccess,
  logSecurityEvent,
  queryAuditLogs,
  getSecuritySummary,
  AuditAction,
  type AuditLogEntry,
} from './audit-logger'

// Security Middleware
export {
  getClientIP,
  isIPBlacklisted,
  blacklistIP,
  checkRateLimit,
  trackFailedLogin,
  resetFailedLogins,
  sanitizeInput,
  sanitizeRequestBody,
  validate,
  securityHeaders,
  addSecurityHeaders,
  rateLimitedResponse,
  generateCSRFToken,
  validateCSRFToken,
  validateRequest,
} from './middleware'
