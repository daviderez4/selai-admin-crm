/**
 * SELAI Insurance Integration Hub
 * Redis Configuration - הגדרות Redis
 *
 * Configuration for Redis caching layer
 */

import { z } from 'zod';

// ============================================
// REDIS CONFIG SCHEMA
// ============================================

const RedisConfigSchema = z.object({
  // Connection
  url: z.string().default('redis://localhost:6379'),
  host: z.string().default('localhost'),
  port: z.number().default(6379),
  password: z.string().optional(),
  database: z.number().default(0),

  // TLS/SSL
  tls: z.object({
    enabled: z.boolean().default(false),
    rejectUnauthorized: z.boolean().default(true)
  }).default({}),

  // Connection pool
  pool: z.object({
    maxConnections: z.number().default(10),
    minConnections: z.number().default(2)
  }).default({}),

  // Timeouts
  timeouts: z.object({
    connect: z.number().default(10000),
    command: z.number().default(5000)
  }).default({}),

  // Retry settings
  retry: z.object({
    maxAttempts: z.number().default(3),
    delay: z.number().default(1000),
    maxDelay: z.number().default(5000)
  }).default({}),

  // Key prefix
  keyPrefix: z.string().default('selai:'),

  // Default TTLs (in seconds)
  ttl: z.object({
    default: z.number().default(300),           // 5 minutes
    customer360: z.number().default(300),       // 5 minutes
    policies: z.number().default(300),          // 5 minutes
    pension: z.number().default(300),           // 5 minutes
    quotes: z.number().default(1800),           // 30 minutes
    connectorToken: z.number().default(3300),   // 55 minutes
    connectorHealth: z.number().default(60),    // 1 minute
    products: z.number().default(3600),         // 1 hour
    session: z.number().default(86400)          // 24 hours
  }).default({})
});

export type RedisConfig = z.infer<typeof RedisConfigSchema>;

// ============================================
// CACHE KEY PATTERNS
// ============================================

/**
 * Cache key patterns used throughout the application
 */
export const CacheKeys = {
  // Customer data
  CUSTOMER_360: (customerId: string) => `customer:360:${customerId}`,
  CUSTOMER_POLICIES: (customerId: string) => `customer:policies:${customerId}`,
  CUSTOMER_PENSION: (customerId: string) => `customer:pension:${customerId}`,
  CUSTOMER_CLAIMS: (customerId: string) => `customer:claims:${customerId}`,
  CUSTOMER_GAPS: (customerId: string) => `customer:gaps:${customerId}`,

  // Quotes
  QUOTE: (quoteId: string) => `quote:${quoteId}`,
  QUOTE_REQUEST: (requestHash: string) => `quote:request:${requestHash}`,

  // Connector tokens
  CONNECTOR_TOKEN: (connectorCode: string) => `connector:token:${connectorCode}`,
  CONNECTOR_HEALTH: (connectorCode: string) => `connector:health:${connectorCode}`,

  // Products
  PRODUCT: (productId: string) => `product:${productId}`,
  PRODUCTS_LIST: (carrierId: string) => `products:list:${carrierId}`,

  // Session
  SESSION: (sessionId: string) => `session:${sessionId}`,
  USER_SESSIONS: (userId: string) => `user:sessions:${userId}`,

  // Rate limiting
  RATE_LIMIT: (key: string) => `ratelimit:${key}`,

  // Locks
  LOCK: (resource: string) => `lock:${resource}`,

  // Sync status
  SYNC_STATUS: (customerId: string) => `sync:status:${customerId}`,
  SYNC_LOCK: (customerId: string) => `sync:lock:${customerId}`
} as const;

// ============================================
// LOAD REDIS CONFIG
// ============================================

function loadRedisConfig(): RedisConfig {
  // Parse URL if provided
  let host = process.env.REDIS_HOST || 'localhost';
  let port = parseInt(process.env.REDIS_PORT || '6379', 10);
  let password = process.env.REDIS_PASSWORD;
  let database = parseInt(process.env.REDIS_DATABASE || '0', 10);

  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const parsedUrl = new URL(url);
      host = parsedUrl.hostname;
      port = parseInt(parsedUrl.port || '6379', 10);
      password = parsedUrl.password || undefined;
      if (parsedUrl.pathname) {
        database = parseInt(parsedUrl.pathname.slice(1) || '0', 10);
      }
    } catch {
      // Use defaults if URL parsing fails
    }
  }

  return RedisConfigSchema.parse({
    url: url || `redis://${host}:${port}`,
    host,
    port,
    password,
    database,

    tls: {
      enabled: process.env.REDIS_TLS === 'true',
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
    },

    pool: {
      maxConnections: parseInt(process.env.REDIS_POOL_MAX || '10', 10),
      minConnections: parseInt(process.env.REDIS_POOL_MIN || '2', 10)
    },

    timeouts: {
      connect: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
      command: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10)
    },

    retry: {
      maxAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3', 10),
      delay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
      maxDelay: parseInt(process.env.REDIS_RETRY_MAX_DELAY || '5000', 10)
    },

    keyPrefix: process.env.REDIS_KEY_PREFIX || 'selai:',

    ttl: {
      default: parseInt(process.env.REDIS_TTL_DEFAULT || '300', 10),
      customer360: parseInt(process.env.REDIS_TTL_CUSTOMER360 || '300', 10),
      policies: parseInt(process.env.REDIS_TTL_POLICIES || '300', 10),
      pension: parseInt(process.env.REDIS_TTL_PENSION || '300', 10),
      quotes: parseInt(process.env.REDIS_TTL_QUOTES || '1800', 10),
      connectorToken: parseInt(process.env.REDIS_TTL_CONNECTOR_TOKEN || '3300', 10),
      connectorHealth: parseInt(process.env.REDIS_TTL_CONNECTOR_HEALTH || '60', 10),
      products: parseInt(process.env.REDIS_TTL_PRODUCTS || '3600', 10),
      session: parseInt(process.env.REDIS_TTL_SESSION || '86400', 10)
    }
  });
}

// ============================================
// EXPORT
// ============================================

export const redisConfig = loadRedisConfig();

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!redisConfig.url && redisConfig.url !== 'redis://localhost:6379';
}

/**
 * Get full cache key with prefix
 */
export function getCacheKey(key: string): string {
  return `${redisConfig.keyPrefix}${key}`;
}

/**
 * Get TTL for a specific cache type
 */
export function getTTL(type: keyof typeof redisConfig.ttl): number {
  return redisConfig.ttl[type];
}
