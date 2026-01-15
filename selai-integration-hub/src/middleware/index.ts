/**
 * SELAI Insurance Integration Hub
 * Middleware Index - Export all middleware
 */

// Authentication
export {
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  requireTenant,
  generateToken,
  generateRefreshToken,
  verifyToken,
  refreshAccessToken,
  hashAPIKey,
  generateAPIKey,
  getCurrentUser,
  hasPermission,
  hasRole,
  AuthError,
  Permissions,
  RolePermissions,
  type JWTPayload,
  type UserRole,
  type AuthenticatedUser,
  type APIKey
} from './auth.js';

// Rate Limiting
export {
  RateLimiter,
  rateLimiter,
  createRateLimiter,
  apiRateLimiters,
  RATE_LIMIT_TIERS,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimitTier
} from './rate-limiter.js';
