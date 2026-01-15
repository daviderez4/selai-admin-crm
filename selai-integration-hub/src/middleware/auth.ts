/**
 * SELAI Insurance Integration Hub
 * Authentication Middleware - JWT & API Key Authentication
 *
 * Provides:
 * - JWT token verification
 * - API key validation
 * - Role-based access control
 * - Permission checking
 */

import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import * as jose from 'jose';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';

// ============================================
// TYPES
// ============================================

export interface JWTPayload {
  sub: string;            // User ID
  email?: string;
  name?: string;
  role: UserRole;
  tenant_id?: string;     // Multi-tenant support
  permissions: string[];
  agent_id?: string;      // For agents
  iat: number;            // Issued at
  exp: number;            // Expiration
}

export type UserRole = 'admin' | 'supervisor' | 'agent' | 'viewer' | 'api_client';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  role: UserRole;
  tenant_id?: string;
  permissions: string[];
  agent_id?: string;
  token_type: 'jwt' | 'api_key';
}

export interface APIKey {
  id: string;
  key_hash: string;
  name: string;
  permissions: string[];
  tenant_id?: string;
  created_at: Date;
  expires_at?: Date;
  last_used_at?: Date;
  is_active: boolean;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

// ============================================
// JWT UTILITIES
// ============================================

/**
 * Create a JWT secret key from string
 */
function getSecretKey(): Uint8Array {
  const config = getConfig();
  const secret = config.security.jwtSecret || 'default-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

/**
 * Generate a new JWT token
 */
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const config = getConfig();
  const secret = getSecretKey();

  const token = await new jose.SignJWT({
    ...payload,
    iat: Math.floor(Date.now() / 1000)
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(config.security.jwtExpiry)
    .sign(secret);

  return token;
}

/**
 * Generate a refresh token
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const config = getConfig();
  const secret = getSecretKey();

  const token = await new jose.SignJWT({ sub: userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(config.security.jwtRefreshExpiry)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  const secret = getSecretKey();

  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new AuthError('TOKEN_EXPIRED', 'Token has expired');
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new AuthError('INVALID_TOKEN', 'Invalid token');
    }
    throw new AuthError('TOKEN_VERIFICATION_FAILED', 'Token verification failed');
  }
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const secret = getSecretKey();

  try {
    const { payload } = await jose.jwtVerify(refreshToken, secret);

    if (payload.type !== 'refresh') {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Not a refresh token');
    }

    // In a real implementation, we would:
    // 1. Look up the user from the database
    // 2. Check if the refresh token is still valid (not revoked)
    // 3. Generate new tokens with current user data

    // For now, generate new tokens with minimal info
    const newAccessToken = await generateToken({
      sub: payload.sub as string,
      role: 'agent', // Would come from database
      permissions: []
    });

    const newRefreshToken = await generateRefreshToken(payload.sub as string);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('REFRESH_FAILED', 'Failed to refresh token');
  }
}

// ============================================
// API KEY UTILITIES
// ============================================

/**
 * Hash an API key for storage
 */
export async function hashAPIKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new API key
 */
export function generateAPIKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'selai_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Validate an API key
 * In production, this would check against a database
 */
async function validateAPIKey(key: string): Promise<AuthenticatedUser | null> {
  // For demo purposes, accept a test key
  if (key === 'selai_test_key_for_development') {
    return {
      id: 'api-client-1',
      role: 'api_client',
      permissions: ['read:policies', 'read:customers', 'read:quotes'],
      token_type: 'api_key'
    };
  }

  // In production, look up the key hash in the database
  // const keyHash = await hashAPIKey(key);
  // const apiKeyRecord = await db.apiKeys.findByHash(keyHash);
  // if (apiKeyRecord && apiKeyRecord.is_active) {
  //   return { ... };
  // }

  return null;
}

// ============================================
// AUTH ERROR
// ============================================

export class AuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Authentication middleware - JWT or API Key
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();

  // Check for Authorization header
  const authHeader = request.headers.authorization;
  const apiKeyHeader = request.headers[config.security.apiKeyHeader.toLowerCase()] as string;

  try {
    // Try JWT authentication first
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenant_id: payload.tenant_id,
        permissions: payload.permissions || [],
        agent_id: payload.agent_id,
        token_type: 'jwt'
      };

      return;
    }

    // Try API key authentication
    if (apiKeyHeader) {
      const user = await validateAPIKey(apiKeyHeader);
      if (user) {
        request.user = user;
        return;
      }
    }

    // No valid authentication
    throw new AuthError('NO_AUTH', 'Authentication required');
  } catch (error) {
    if (error instanceof AuthError) {
      logger.warn('Authentication failed', { code: error.code, message: error.message });

      return reply.code(401).send({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    logger.error('Authentication error', { error });
    return reply.code(401).send({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Optional authentication - doesn't fail if not authenticated
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();
  const authHeader = request.headers.authorization;
  const apiKeyHeader = request.headers[config.security.apiKeyHeader.toLowerCase()] as string;

  try {
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        tenant_id: payload.tenant_id,
        permissions: payload.permissions || [],
        agent_id: payload.agent_id,
        token_type: 'jwt'
      };
    } else if (apiKeyHeader) {
      const user = await validateAPIKey(apiKeyHeader);
      if (user) {
        request.user = user;
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    if (!roles.includes(request.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: request.user.id,
        userRole: request.user.role,
        requiredRoles: roles
      });

      return reply.code(403).send({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }
  };
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(...permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    // Admins have all permissions
    if (request.user.role === 'admin') {
      return;
    }

    const hasPermission = permissions.every(
      p => request.user!.permissions.includes(p)
    );

    if (!hasPermission) {
      logger.warn('Access denied - missing permission', {
        userId: request.user.id,
        userPermissions: request.user.permissions,
        requiredPermissions: permissions
      });

      return reply.code(403).send({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }
  };
}

/**
 * Tenant isolation middleware
 * Ensures users can only access their own tenant's data
 */
export function requireTenant() {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    // Admins can access all tenants
    if (request.user.role === 'admin') {
      return;
    }

    // Get tenant_id from request (query, params, or body)
    const requestTenantId =
      (request.query as any)?.tenant_id ||
      (request.params as any)?.tenant_id ||
      (request.body as any)?.tenant_id;

    if (requestTenantId && requestTenantId !== request.user.tenant_id) {
      logger.warn('Tenant access denied', {
        userId: request.user.id,
        userTenant: request.user.tenant_id,
        requestedTenant: requestTenantId
      });

      return reply.code(403).send({
        success: false,
        error: 'Cannot access other tenant data',
        code: 'TENANT_FORBIDDEN'
      });
    }
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current user from request
 */
export function getCurrentUser(request: FastifyRequest): AuthenticatedUser | null {
  return request.user || null;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthenticatedUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(user: AuthenticatedUser | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// ============================================
// PERMISSION DEFINITIONS
// ============================================

export const Permissions = {
  // Policies
  READ_POLICIES: 'read:policies',
  WRITE_POLICIES: 'write:policies',
  DELETE_POLICIES: 'delete:policies',

  // Customers
  READ_CUSTOMERS: 'read:customers',
  WRITE_CUSTOMERS: 'write:customers',
  DELETE_CUSTOMERS: 'delete:customers',

  // Quotes
  READ_QUOTES: 'read:quotes',
  CREATE_QUOTES: 'create:quotes',

  // Claims
  READ_CLAIMS: 'read:claims',
  SUBMIT_CLAIMS: 'submit:claims',
  MANAGE_CLAIMS: 'manage:claims',

  // Analytics
  VIEW_ANALYTICS: 'view:analytics',

  // Admin
  MANAGE_USERS: 'manage:users',
  MANAGE_CONNECTORS: 'manage:connectors',
  VIEW_AUDIT_LOG: 'view:audit_log'
} as const;

/**
 * Default permissions per role
 */
export const RolePermissions: Record<UserRole, string[]> = {
  admin: Object.values(Permissions),
  supervisor: [
    Permissions.READ_POLICIES,
    Permissions.WRITE_POLICIES,
    Permissions.READ_CUSTOMERS,
    Permissions.WRITE_CUSTOMERS,
    Permissions.READ_QUOTES,
    Permissions.CREATE_QUOTES,
    Permissions.READ_CLAIMS,
    Permissions.SUBMIT_CLAIMS,
    Permissions.VIEW_ANALYTICS
  ],
  agent: [
    Permissions.READ_POLICIES,
    Permissions.READ_CUSTOMERS,
    Permissions.READ_QUOTES,
    Permissions.CREATE_QUOTES,
    Permissions.READ_CLAIMS,
    Permissions.SUBMIT_CLAIMS
  ],
  viewer: [
    Permissions.READ_POLICIES,
    Permissions.READ_CUSTOMERS,
    Permissions.READ_QUOTES
  ],
  api_client: [
    Permissions.READ_POLICIES,
    Permissions.READ_CUSTOMERS,
    Permissions.READ_QUOTES
  ]
};
