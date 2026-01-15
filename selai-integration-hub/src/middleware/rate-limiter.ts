/**
 * SELAI Insurance Integration Hub
 * Rate Limiter Middleware - API rate limiting and throttling
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getCacheService } from '../services/cache-service.js';
import { logger, createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('RateLimiter');

// ============================================
// TYPES
// ============================================

export interface RateLimitConfig {
  windowMs: number;           // Time window in milliseconds
  maxRequests: number;        // Max requests per window
  keyGenerator?: (req: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (req: FastifyRequest, reply: FastifyReply) => void;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitTier {
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// ============================================
// RATE LIMIT TIERS
// ============================================

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'free',
    requestsPerMinute: 20,
    requestsPerHour: 200,
    requestsPerDay: 1000
  },
  basic: {
    name: 'basic',
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000
  },
  professional: {
    name: 'professional',
    requestsPerMinute: 200,
    requestsPerHour: 5000,
    requestsPerDay: 50000
  },
  enterprise: {
    name: 'enterprise',
    requestsPerMinute: 1000,
    requestsPerHour: 30000,
    requestsPerDay: 500000
  }
};

// ============================================
// RATE LIMITER CLASS
// ============================================

export class RateLimiter {
  private cacheService = getCacheService();

  /**
   * Create rate limit middleware with config
   */
  createMiddleware(config: RateLimitConfig) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const key = config.keyGenerator
        ? config.keyGenerator(request)
        : this.getDefaultKey(request);

      const rateLimitKey = `ratelimit:${key}`;

      try {
        const current = await this.increment(rateLimitKey, config.windowMs);

        // Set rate limit headers
        reply.header('X-RateLimit-Limit', config.maxRequests);
        reply.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - current));
        reply.header('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

        if (current > config.maxRequests) {
          log.warn('Rate limit exceeded', {
            key,
            current,
            limit: config.maxRequests
          });

          if (config.handler) {
            return config.handler(request, reply);
          }

          return reply.code(429).send({
            success: false,
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(config.windowMs / 1000)
          });
        }
      } catch (error) {
        log.error('Rate limiter error', { error, key });
        // Allow request through on error
      }
    };
  }

  /**
   * Check rate limit without incrementing
   */
  async checkLimit(
    identifier: string,
    tier: RateLimitTier
  ): Promise<{
    allowed: boolean;
    info: {
      minute: RateLimitInfo;
      hour: RateLimitInfo;
      day: RateLimitInfo;
    };
  }> {
    const now = Date.now();
    const minuteKey = `ratelimit:${identifier}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${identifier}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `ratelimit:${identifier}:day:${Math.floor(now / 86400000)}`;

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      this.getCount(minuteKey),
      this.getCount(hourKey),
      this.getCount(dayKey)
    ]);

    const info = {
      minute: {
        limit: tier.requestsPerMinute,
        current: minuteCount,
        remaining: Math.max(0, tier.requestsPerMinute - minuteCount),
        resetTime: new Date(Math.ceil(now / 60000) * 60000)
      },
      hour: {
        limit: tier.requestsPerHour,
        current: hourCount,
        remaining: Math.max(0, tier.requestsPerHour - hourCount),
        resetTime: new Date(Math.ceil(now / 3600000) * 3600000)
      },
      day: {
        limit: tier.requestsPerDay,
        current: dayCount,
        remaining: Math.max(0, tier.requestsPerDay - dayCount),
        resetTime: new Date(Math.ceil(now / 86400000) * 86400000)
      }
    };

    const allowed =
      minuteCount < tier.requestsPerMinute &&
      hourCount < tier.requestsPerHour &&
      dayCount < tier.requestsPerDay;

    return { allowed, info };
  }

  /**
   * Apply tiered rate limiting
   */
  createTieredMiddleware(getTier: (req: FastifyRequest) => RateLimitTier) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const tier = getTier(request);
      const identifier = this.getDefaultKey(request);

      const { allowed, info } = await this.checkLimit(identifier, tier);

      // Set headers
      reply.header('X-RateLimit-Tier', tier.name);
      reply.header('X-RateLimit-Limit-Minute', tier.requestsPerMinute);
      reply.header('X-RateLimit-Remaining-Minute', info.minute.remaining);
      reply.header('X-RateLimit-Limit-Hour', tier.requestsPerHour);
      reply.header('X-RateLimit-Remaining-Hour', info.hour.remaining);

      if (!allowed) {
        // Determine which limit was hit
        let retryAfter = 60;
        if (info.minute.remaining === 0) {
          retryAfter = Math.ceil((info.minute.resetTime.getTime() - Date.now()) / 1000);
        } else if (info.hour.remaining === 0) {
          retryAfter = Math.ceil((info.hour.resetTime.getTime() - Date.now()) / 1000);
        } else {
          retryAfter = Math.ceil((info.day.resetTime.getTime() - Date.now()) / 1000);
        }

        return reply.code(429).send({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          tier: tier.name,
          limits: {
            minute: { limit: tier.requestsPerMinute, remaining: info.minute.remaining },
            hour: { limit: tier.requestsPerHour, remaining: info.hour.remaining },
            day: { limit: tier.requestsPerDay, remaining: info.day.remaining }
          },
          retryAfter
        });
      }

      // Increment counters
      await this.incrementTiered(identifier);
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private getDefaultKey(request: FastifyRequest): string {
    // Use API key if available, otherwise use IP
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      return `apikey:${apiKey.substring(0, 16)}`;
    }

    // Use user ID if authenticated
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }

    // Fall back to IP
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    return `ip:${ip}`;
  }

  private async increment(key: string, windowMs: number): Promise<number> {
    // Using cache service for distributed rate limiting
    const result = await this.cacheService.increment(key);
    if (result === 1) {
      // Set expiry only when first created
      await this.cacheService.setExpiry(key, Math.ceil(windowMs / 1000));
    }
    return result;
  }

  private async getCount(key: string): Promise<number> {
    const value = await this.cacheService.get(key);
    return parseInt(value || '0', 10);
  }

  private async incrementTiered(identifier: string): Promise<void> {
    const now = Date.now();
    const minuteKey = `ratelimit:${identifier}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${identifier}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `ratelimit:${identifier}:day:${Math.floor(now / 86400000)}`;

    await Promise.all([
      this.increment(minuteKey, 60000),
      this.increment(hourKey, 3600000),
      this.increment(dayKey, 86400000)
    ]);
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export const rateLimiter = new RateLimiter();

/**
 * Create a basic rate limiter middleware
 */
export function createRateLimiter(options: Partial<RateLimitConfig> = {}) {
  const config: RateLimitConfig = {
    windowMs: options.windowMs || 60000,
    maxRequests: options.maxRequests || 100,
    keyGenerator: options.keyGenerator,
    handler: options.handler
  };

  return rateLimiter.createMiddleware(config);
}

/**
 * Create API-specific rate limiters
 */
export const apiRateLimiters = {
  // General API rate limit
  general: createRateLimiter({ windowMs: 60000, maxRequests: 100 }),

  // Quote endpoint (more restrictive)
  quotes: createRateLimiter({ windowMs: 60000, maxRequests: 20 }),

  // Search endpoint
  search: createRateLimiter({ windowMs: 60000, maxRequests: 50 }),

  // Auth endpoint (strict)
  auth: createRateLimiter({ windowMs: 60000, maxRequests: 10 })
};
