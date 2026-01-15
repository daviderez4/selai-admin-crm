/**
 * SELAI Insurance Integration Hub
 * Cache Service - שירות מטמון Redis
 *
 * Provides Redis caching layer:
 * - Customer 360 data caching
 * - Quote caching
 * - Connector token caching
 * - Session management
 * - Cache invalidation strategies
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';
import { redisConfig, CacheKeys, getTTL } from '../config/redis.js';

// ============================================
// TYPES
// ============================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for grouped invalidation
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory_used_bytes?: number;
  connected: boolean;
}

// ============================================
// CACHE SERVICE
// ============================================

export class CacheService {
  private static instance: CacheService;
  private client: RedisClientType | null = null;
  private connected: boolean = false;
  private stats = {
    hits: 0,
    misses: 0
  };

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // ============================================
  // CONNECTION
  // ============================================

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.client = createClient({
        url: redisConfig.url,
        password: redisConfig.password || undefined,
        database: redisConfig.database,
        socket: {
          connectTimeout: redisConfig.timeouts.connect,
          reconnectStrategy: (retries) => {
            if (retries > redisConfig.retry.maxAttempts) {
              logger.error('CacheService: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(
              redisConfig.retry.delay * Math.pow(2, retries),
              redisConfig.retry.maxDelay
            );
            return delay;
          }
        }
      });

      // Event handlers
      this.client.on('error', (err) => {
        logger.error('CacheService: Redis error', { error: err.message });
      });

      this.client.on('connect', () => {
        logger.info('CacheService: Connected to Redis');
      });

      this.client.on('reconnecting', () => {
        logger.info('CacheService: Reconnecting to Redis');
      });

      await this.client.connect();
      this.connected = true;

      logger.info('CacheService: Redis connection established', {
        url: redisConfig.url.replace(/:[^:@]+@/, ':***@') // Hide password
      });
    } catch (error) {
      logger.error('CacheService: Failed to connect to Redis', { error });
      this.connected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
      logger.info('CacheService: Disconnected from Redis');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  // ============================================
  // BASIC OPERATIONS
  // ============================================

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client.get(fullKey);

      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('CacheService: Get failed', { key, error });
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const serialized = JSON.stringify(value);
      const expiry = ttl || redisConfig.ttl.default;

      await this.client.setEx(fullKey, expiry, serialized);
      return true;
    } catch (error) {
      logger.error('CacheService: Set failed', { key, error });
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      logger.error('CacheService: Delete failed', { key, error });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('CacheService: Exists failed', { key, error });
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    if (!this.client || !this.connected) {
      return -1;
    }

    try {
      const fullKey = this.getFullKey(key);
      return await this.client.ttl(fullKey);
    } catch (error) {
      logger.error('CacheService: TTL failed', { key, error });
      return -1;
    }
  }

  /**
   * Extend TTL for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      await this.client.expire(fullKey, ttl);
      return true;
    } catch (error) {
      logger.error('CacheService: Expire failed', { key, error });
      return false;
    }
  }

  // ============================================
  // CUSTOMER DATA CACHING
  // ============================================

  /**
   * Cache customer 360 data
   */
  async cacheCustomer360(customerId: string, data: any): Promise<boolean> {
    const key = CacheKeys.CUSTOMER_360(customerId);
    return this.set(key, data, redisConfig.ttl.customer360);
  }

  /**
   * Get cached customer 360 data
   */
  async getCustomer360(customerId: string): Promise<any | null> {
    const key = CacheKeys.CUSTOMER_360(customerId);
    return this.get(key);
  }

  /**
   * Cache customer policies
   */
  async cacheCustomerPolicies(customerId: string, policies: any[]): Promise<boolean> {
    const key = CacheKeys.CUSTOMER_POLICIES(customerId);
    return this.set(key, policies, redisConfig.ttl.policies);
  }

  /**
   * Get cached customer policies
   */
  async getCustomerPolicies(customerId: string): Promise<any[] | null> {
    const key = CacheKeys.CUSTOMER_POLICIES(customerId);
    return this.get(key);
  }

  /**
   * Cache customer pension data
   */
  async cacheCustomerPension(customerId: string, pension: any[]): Promise<boolean> {
    const key = CacheKeys.CUSTOMER_PENSION(customerId);
    return this.set(key, pension, redisConfig.ttl.pension);
  }

  /**
   * Get cached customer pension data
   */
  async getCustomerPension(customerId: string): Promise<any[] | null> {
    const key = CacheKeys.CUSTOMER_PENSION(customerId);
    return this.get(key);
  }

  // ============================================
  // QUOTE CACHING
  // ============================================

  /**
   * Cache quote comparison result
   */
  async cacheQuoteComparison(requestHash: string, quotes: any): Promise<boolean> {
    const key = CacheKeys.QUOTE_REQUEST(requestHash);
    return this.set(key, quotes, redisConfig.ttl.quotes);
  }

  /**
   * Get cached quote comparison
   */
  async getQuoteComparison(requestHash: string): Promise<any | null> {
    const key = CacheKeys.QUOTE_REQUEST(requestHash);
    return this.get(key);
  }

  // ============================================
  // CONNECTOR TOKEN CACHING
  // ============================================

  /**
   * Cache connector access token
   */
  async cacheConnectorToken(
    connectorCode: string,
    token: string,
    expiresIn: number
  ): Promise<boolean> {
    const key = CacheKeys.CONNECTOR_TOKEN(connectorCode);
    // Use slightly shorter TTL than actual expiry
    const ttl = Math.max(expiresIn - 60, 60);
    return this.set(key, { token, expires_at: Date.now() + expiresIn * 1000 }, ttl);
  }

  /**
   * Get cached connector token
   */
  async getConnectorToken(connectorCode: string): Promise<string | null> {
    const key = CacheKeys.CONNECTOR_TOKEN(connectorCode);
    const data = await this.get<{ token: string; expires_at: number }>(key);

    if (data && data.expires_at > Date.now()) {
      return data.token;
    }

    return null;
  }

  // ============================================
  // INVALIDATION
  // ============================================

  /**
   * Invalidate all customer-related cache
   */
  async invalidateCustomer(customerId: string): Promise<void> {
    const keysToDelete = [
      CacheKeys.CUSTOMER_360(customerId),
      CacheKeys.CUSTOMER_POLICIES(customerId),
      CacheKeys.CUSTOMER_PENSION(customerId),
      CacheKeys.CUSTOMER_CLAIMS(customerId),
      CacheKeys.CUSTOMER_GAPS(customerId)
    ];

    await Promise.all(keysToDelete.map(key => this.delete(key)));
    logger.info('CacheService: Invalidated customer cache', { customerId });
  }

  /**
   * Invalidate connector-related cache
   */
  async invalidateConnector(connectorCode: string): Promise<void> {
    const keysToDelete = [
      CacheKeys.CONNECTOR_TOKEN(connectorCode),
      CacheKeys.CONNECTOR_HEALTH(connectorCode)
    ];

    await Promise.all(keysToDelete.map(key => this.delete(key)));
    logger.info('CacheService: Invalidated connector cache', { connectorCode });
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.client || !this.connected) {
      return 0;
    }

    try {
      const fullPattern = this.getFullKey(pattern);
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      logger.info('CacheService: Invalidated by pattern', {
        pattern,
        keysDeleted: keys.length
      });

      return keys.length;
    } catch (error) {
      logger.error('CacheService: Invalidate by pattern failed', { pattern, error });
      return 0;
    }
  }

  /**
   * Flush all cache (use with caution!)
   */
  async flushAll(): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    try {
      // Only flush keys with our prefix
      const keys = await this.client.keys(`${redisConfig.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }

      logger.warn('CacheService: Flushed all cache', { keysDeleted: keys.length });
    } catch (error) {
      logger.error('CacheService: Flush all failed', { error });
    }
  }

  // ============================================
  // DISTRIBUTED LOCKING
  // ============================================

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    resource: string,
    ttl: number = 30
  ): Promise<string | null> {
    if (!this.client || !this.connected) {
      return null;
    }

    try {
      const lockKey = CacheKeys.LOCK(resource);
      const fullKey = this.getFullKey(lockKey);
      const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Try to set with NX (only if not exists)
      const result = await this.client.set(fullKey, lockValue, {
        NX: true,
        EX: ttl
      });

      if (result === 'OK') {
        return lockValue;
      }

      return null;
    } catch (error) {
      logger.error('CacheService: Acquire lock failed', { resource, error });
      return null;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      const lockKey = CacheKeys.LOCK(resource);
      const fullKey = this.getFullKey(lockKey);

      // Only delete if value matches (to prevent releasing someone else's lock)
      const currentValue = await this.client.get(fullKey);
      if (currentValue === lockValue) {
        await this.client.del(fullKey);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('CacheService: Release lock failed', { resource, error });
      return false;
    }
  }

  // ============================================
  // RATE LIMITING
  // ============================================

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    if (!this.client || !this.connected) {
      return 0;
    }

    try {
      const fullKey = this.getFullKey(CacheKeys.RATE_LIMIT(key));

      const multi = this.client.multi();
      multi.incr(fullKey);
      multi.expire(fullKey, windowSeconds);

      const results = await multi.exec();
      return (results?.[0] as number) || 0;
    } catch (error) {
      logger.error('CacheService: Rate limit increment failed', { key, error });
      return 0;
    }
  }

  /**
   * Get current rate limit count
   */
  async getRateLimitCount(key: string): Promise<number> {
    if (!this.client || !this.connected) {
      return 0;
    }

    try {
      const fullKey = this.getFullKey(CacheKeys.RATE_LIMIT(key));
      const value = await this.client.get(fullKey);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      logger.error('CacheService: Rate limit get failed', { key, error });
      return 0;
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    let keys = 0;
    let memoryUsed: number | undefined;

    if (this.client && this.connected) {
      try {
        const keysList = await this.client.keys(`${redisConfig.keyPrefix}*`);
        keys = keysList.length;

        const info = await this.client.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) {
          memoryUsed = parseInt(match[1], 10);
        }
      } catch (error) {
        logger.error('CacheService: Get stats failed', { error });
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys,
      memory_used_bytes: memoryUsed,
      connected: this.connected
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    if (key.startsWith(redisConfig.keyPrefix)) {
      return key;
    }
    return `${redisConfig.keyPrefix}${key}`;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// SINGLETON ACCESSOR
// ============================================

let _cacheService: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!_cacheService) {
    _cacheService = CacheService.getInstance();
  }
  return _cacheService;
}

/**
 * Initialize cache service (call at startup)
 */
export async function initializeCacheService(): Promise<CacheService> {
  const service = getCacheService();
  await service.connect();
  return service;
}
