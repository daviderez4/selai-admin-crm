/**
 * SELAI Insurance Integration Hub
 * Health Checks - System health monitoring
 */

import { FastifyInstance } from 'fastify';
import { logger, createModuleLogger } from '../utils/logger.js';

const log = createModuleLogger('HealthCheck');

// ============================================
// TYPES
// ============================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latency_ms?: number;
  message?: string;
  last_check: string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime_seconds: number;
  timestamp: string;
  components: ComponentHealth[];
  checks_passed: number;
  checks_failed: number;
}

export interface HealthCheckFunction {
  name: string;
  check: () => Promise<ComponentHealth>;
  critical?: boolean; // If true, failure marks system as unhealthy
  timeout_ms?: number;
}

// ============================================
// HEALTH CHECK REGISTRY
// ============================================

export class HealthCheckRegistry {
  private checks: HealthCheckFunction[] = [];
  private startTime = Date.now();
  private version: string;

  constructor(version: string = '1.0.0') {
    this.version = version;
  }

  /**
   * Register a health check
   */
  register(check: HealthCheckFunction): void {
    this.checks.push(check);
    log.debug('Health check registered', { name: check.name });
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<SystemHealth> {
    const results: ComponentHealth[] = [];
    let overallStatus: HealthStatus = 'healthy';

    for (const check of this.checks) {
      const result = await this.runCheck(check);
      results.push(result);

      // Update overall status
      if (result.status === 'unhealthy') {
        if (check.critical) {
          overallStatus = 'unhealthy';
        } else if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } else if (result.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }

    const checksPassed = results.filter(r => r.status === 'healthy').length;
    const checksFailed = results.filter(r => r.status === 'unhealthy').length;

    return {
      status: overallStatus,
      version: this.version,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      components: results,
      checks_passed: checksPassed,
      checks_failed: checksFailed
    };
  }

  /**
   * Run a single health check with timeout
   */
  private async runCheck(check: HealthCheckFunction): Promise<ComponentHealth> {
    const timeout = check.timeout_ms || 5000;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        check.check(),
        new Promise<ComponentHealth>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      return {
        ...result,
        latency_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: check.name,
        status: 'unhealthy',
        latency_ms: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        last_check: new Date().toISOString()
      };
    }
  }

  /**
   * Quick liveness check
   */
  isAlive(): boolean {
    return true; // Basic check - process is running
  }

  /**
   * Get readiness status
   */
  async isReady(): Promise<boolean> {
    const health = await this.runAll();
    return health.status !== 'unhealthy';
  }
}

// ============================================
// BUILT-IN HEALTH CHECKS
// ============================================

/**
 * Database health check
 */
export function createDatabaseCheck(
  checkFn: () => Promise<boolean>
): HealthCheckFunction {
  return {
    name: 'database',
    critical: true,
    timeout_ms: 5000,
    check: async () => {
      const healthy = await checkFn();
      return {
        name: 'database',
        status: healthy ? 'healthy' : 'unhealthy',
        message: healthy ? 'Database connection OK' : 'Database connection failed',
        last_check: new Date().toISOString()
      };
    }
  };
}

/**
 * Redis/Cache health check
 */
export function createCacheCheck(
  pingFn: () => Promise<boolean>
): HealthCheckFunction {
  return {
    name: 'cache',
    critical: false,
    timeout_ms: 3000,
    check: async () => {
      const healthy = await pingFn();
      return {
        name: 'cache',
        status: healthy ? 'healthy' : 'degraded',
        message: healthy ? 'Cache connection OK' : 'Cache connection failed',
        last_check: new Date().toISOString()
      };
    }
  };
}

/**
 * Kafka/Event bus health check
 */
export function createEventBusCheck(
  checkFn: () => Promise<boolean>
): HealthCheckFunction {
  return {
    name: 'event_bus',
    critical: false,
    timeout_ms: 5000,
    check: async () => {
      const healthy = await checkFn();
      return {
        name: 'event_bus',
        status: healthy ? 'healthy' : 'degraded',
        message: healthy ? 'Event bus connection OK' : 'Event bus connection failed',
        last_check: new Date().toISOString()
      };
    }
  };
}

/**
 * External connector health check
 */
export function createConnectorCheck(
  name: string,
  checkFn: () => Promise<{ healthy: boolean; latency?: number }>
): HealthCheckFunction {
  return {
    name: `connector_${name}`,
    critical: false,
    timeout_ms: 10000,
    check: async () => {
      const result = await checkFn();
      return {
        name: `connector_${name}`,
        status: result.healthy ? 'healthy' : 'degraded',
        message: result.healthy ? `${name} connector OK` : `${name} connector unavailable`,
        last_check: new Date().toISOString(),
        details: {
          latency_ms: result.latency
        }
      };
    }
  };
}

/**
 * Memory health check
 */
export function createMemoryCheck(thresholdPercent: number = 90): HealthCheckFunction {
  return {
    name: 'memory',
    critical: false,
    check: async () => {
      const usage = process.memoryUsage();
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
      const healthy = heapUsedPercent < thresholdPercent;

      return {
        name: 'memory',
        status: healthy ? 'healthy' : 'degraded',
        message: `Heap usage: ${heapUsedPercent.toFixed(1)}%`,
        last_check: new Date().toISOString(),
        details: {
          heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
          rss_mb: Math.round(usage.rss / 1024 / 1024)
        }
      };
    }
  };
}

/**
 * Disk space health check
 */
export function createDiskCheck(
  checkFn: () => Promise<{ usedPercent: number }>
): HealthCheckFunction {
  return {
    name: 'disk',
    critical: false,
    check: async () => {
      const result = await checkFn();
      const healthy = result.usedPercent < 90;

      return {
        name: 'disk',
        status: healthy ? 'healthy' : (result.usedPercent < 95 ? 'degraded' : 'unhealthy'),
        message: `Disk usage: ${result.usedPercent.toFixed(1)}%`,
        last_check: new Date().toISOString(),
        details: {
          used_percent: result.usedPercent
        }
      };
    }
  };
}

// ============================================
// SINGLETON & FASTIFY PLUGIN
// ============================================

export const healthRegistry = new HealthCheckRegistry('2.0.0');

// Register default checks
healthRegistry.register(createMemoryCheck());

/**
 * Fastify plugin for health endpoints
 */
export async function healthPlugin(fastify: FastifyInstance): Promise<void> {
  // Liveness probe - is the process running?
  fastify.get('/health/live', async () => {
    return { status: 'ok' };
  });

  // Readiness probe - is the service ready to accept traffic?
  fastify.get('/health/ready', async (request, reply) => {
    const isReady = await healthRegistry.isReady();

    if (isReady) {
      return { status: 'ok', ready: true };
    } else {
      reply.code(503);
      return { status: 'error', ready: false };
    }
  });

  // Detailed health check
  fastify.get('/health', async (request, reply) => {
    const health = await healthRegistry.runAll();

    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    reply.code(statusCode);
    return health;
  });

  // Component-specific health
  fastify.get('/health/:component', async (request, reply) => {
    const { component } = request.params as { component: string };
    const health = await healthRegistry.runAll();
    const componentHealth = health.components.find(c => c.name === component);

    if (!componentHealth) {
      reply.code(404);
      return { error: 'Component not found' };
    }

    const statusCode = componentHealth.status === 'healthy' ? 200 :
                       componentHealth.status === 'degraded' ? 200 : 503;

    reply.code(statusCode);
    return componentHealth;
  });
}
