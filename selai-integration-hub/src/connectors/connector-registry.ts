/**
 * SELAI Insurance Integration Hub
 * Connector Registry - מרכז ניהול כל הקונקטורים
 *
 * Central registry for managing all insurance data source connectors.
 * Provides:
 * - Connector registration and lifecycle management
 * - Health monitoring across all connectors
 * - Type-safe connector retrieval
 * - Parallel initialization
 */

import { logger } from '../utils/logger.js';
import {
  IBaseConnector,
  IInsuranceConnector,
  IVehicleConnector,
  IPensionConnector,
  IAggregatorConnector,
  ConnectorType,
  ConnectorStatus,
  HealthStatus,
  AnyConnector,
  isVehicleConnector,
  isPensionConnector,
  isInsuranceConnector,
  isAggregatorConnector
} from './connector-interface.js';

// ============================================
// TYPES
// ============================================

/**
 * Registry entry with connector and metadata
 */
interface RegistryEntry {
  connector: AnyConnector;
  registeredAt: Date;
  lastHealthCheck?: HealthStatus;
  enabled: boolean;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  total: number;
  byType: Record<ConnectorType, number>;
  byStatus: Record<ConnectorStatus, number>;
  healthy: number;
  unhealthy: number;
}

/**
 * Health check result for all connectors
 */
export interface HealthCheckAllResult {
  timestamp: Date;
  duration_ms: number;
  results: Map<string, HealthStatus>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

// ============================================
// CONNECTOR REGISTRY
// ============================================

/**
 * Singleton registry for all connectors
 */
export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, RegistryEntry> = new Map();
  private initialized: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  // ============================================
  // REGISTRATION
  // ============================================

  /**
   * Register a new connector
   */
  register(connector: AnyConnector): void {
    const code = connector.metadata.code;

    if (this.connectors.has(code)) {
      logger.warn(`Connector ${code} is already registered, replacing...`);
    }

    this.connectors.set(code, {
      connector,
      registeredAt: new Date(),
      enabled: true
    });

    logger.info(`Registered connector: ${connector.metadata.name} (${code})`);
  }

  /**
   * Register multiple connectors
   */
  registerAll(connectors: AnyConnector[]): void {
    for (const connector of connectors) {
      this.register(connector);
    }
  }

  /**
   * Unregister a connector
   */
  async unregister(code: string): Promise<void> {
    const entry = this.connectors.get(code);

    if (!entry) {
      logger.warn(`Connector ${code} not found in registry`);
      return;
    }

    try {
      await entry.connector.shutdown();
    } catch (error) {
      logger.error(`Error shutting down connector ${code}:`, error);
    }

    this.connectors.delete(code);
    logger.info(`Unregistered connector: ${code}`);
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  /**
   * Initialize all registered connectors in parallel
   */
  async initializeAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const startTime = Date.now();

    logger.info(`Initializing ${this.connectors.size} connectors...`);

    const initPromises = Array.from(this.connectors.entries()).map(
      async ([code, entry]) => {
        try {
          await entry.connector.initialize();
          results.set(code, true);
          logger.info(`Initialized connector: ${code}`);
        } catch (error) {
          results.set(code, false);
          entry.enabled = false;
          logger.error(`Failed to initialize connector ${code}:`, error);
        }
      }
    );

    await Promise.all(initPromises);

    const duration = Date.now() - startTime;
    const successful = Array.from(results.values()).filter(v => v).length;

    logger.info(
      `Connector initialization complete: ${successful}/${this.connectors.size} successful (${duration}ms)`
    );

    this.initialized = true;
    return results;
  }

  /**
   * Shutdown all connectors
   */
  async shutdownAll(): Promise<void> {
    logger.info('Shutting down all connectors...');

    const shutdownPromises = Array.from(this.connectors.values()).map(
      async (entry) => {
        try {
          await entry.connector.shutdown();
        } catch (error) {
          logger.error(`Error shutting down ${entry.connector.metadata.code}:`, error);
        }
      }
    );

    await Promise.all(shutdownPromises);
    this.initialized = false;
    logger.info('All connectors shut down');
  }

  // ============================================
  // RETRIEVAL
  // ============================================

  /**
   * Get a connector by code
   */
  get(code: string): AnyConnector | undefined {
    const entry = this.connectors.get(code);
    return entry?.enabled ? entry.connector : undefined;
  }

  /**
   * Get a connector with type checking
   */
  getTyped<T extends AnyConnector>(code: string): T | undefined {
    return this.get(code) as T | undefined;
  }

  /**
   * Get all connectors
   */
  getAll(): AnyConnector[] {
    return Array.from(this.connectors.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.connector);
  }

  /**
   * Get connectors by type
   */
  getByType(type: ConnectorType): AnyConnector[] {
    return this.getAll().filter(c => c.metadata.type === type);
  }

  /**
   * Get all vehicle connectors
   */
  getVehicleConnectors(): IVehicleConnector[] {
    return this.getAll().filter(isVehicleConnector);
  }

  /**
   * Get all pension connectors
   */
  getPensionConnectors(): IPensionConnector[] {
    return this.getAll().filter(isPensionConnector);
  }

  /**
   * Get all insurance carrier connectors
   */
  getInsuranceConnectors(): IInsuranceConnector[] {
    return this.getAll().filter(isInsuranceConnector);
  }

  /**
   * Get all aggregator connectors
   */
  getAggregatorConnectors(): IAggregatorConnector[] {
    return this.getAll().filter(isAggregatorConnector);
  }

  /**
   * Check if a connector is registered
   */
  has(code: string): boolean {
    return this.connectors.has(code);
  }

  /**
   * Get connector count
   */
  get size(): number {
    return this.connectors.size;
  }

  // ============================================
  // HEALTH CHECKS
  // ============================================

  /**
   * Check health of a single connector
   */
  async healthCheck(code: string): Promise<HealthStatus | null> {
    const entry = this.connectors.get(code);

    if (!entry) {
      return null;
    }

    try {
      const health = await entry.connector.healthCheck();
      entry.lastHealthCheck = health;
      return health;
    } catch (error) {
      const errorHealth: HealthStatus = {
        status: ConnectorStatus.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        last_check: new Date()
      };
      entry.lastHealthCheck = errorHealth;
      return errorHealth;
    }
  }

  /**
   * Check health of all connectors in parallel
   */
  async healthCheckAll(): Promise<HealthCheckAllResult> {
    const startTime = Date.now();
    const results = new Map<string, HealthStatus>();

    const healthPromises = Array.from(this.connectors.entries()).map(
      async ([code, entry]) => {
        const health = await this.healthCheck(code);
        if (health) {
          results.set(code, health);
        }
      }
    );

    await Promise.all(healthPromises);

    const duration = Date.now() - startTime;

    // Calculate summary
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const health of results.values()) {
      switch (health.status) {
        case ConnectorStatus.CONNECTED:
          healthy++;
          break;
        case ConnectorStatus.DEGRADED:
        case ConnectorStatus.MAINTENANCE:
          degraded++;
          break;
        default:
          unhealthy++;
      }
    }

    return {
      timestamp: new Date(),
      duration_ms: duration,
      results,
      summary: {
        total: results.size,
        healthy,
        degraded,
        unhealthy
      }
    };
  }

  /**
   * Get last health check for a connector
   */
  getLastHealthCheck(code: string): HealthStatus | undefined {
    return this.connectors.get(code)?.lastHealthCheck;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let healthy = 0;
    let unhealthy = 0;

    for (const [, entry] of this.connectors) {
      // Count by type
      const type = entry.connector.metadata.type;
      byType[type] = (byType[type] || 0) + 1;

      // Count by status
      const status = entry.lastHealthCheck?.status || ConnectorStatus.DISCONNECTED;
      byStatus[status] = (byStatus[status] || 0) + 1;

      // Count healthy/unhealthy
      if (status === ConnectorStatus.CONNECTED) {
        healthy++;
      } else {
        unhealthy++;
      }
    }

    return {
      total: this.connectors.size,
      byType: byType as Record<ConnectorType, number>,
      byStatus: byStatus as Record<ConnectorStatus, number>,
      healthy,
      unhealthy
    };
  }

  /**
   * Get detailed status of all connectors
   */
  getStatus(): Array<{
    code: string;
    name: string;
    type: ConnectorType;
    enabled: boolean;
    ready: boolean;
    status: ConnectorStatus;
    lastCheck?: Date;
  }> {
    return Array.from(this.connectors.entries()).map(([code, entry]) => ({
      code,
      name: entry.connector.metadata.name,
      type: entry.connector.metadata.type,
      enabled: entry.enabled,
      ready: entry.connector.isReady(),
      status: entry.lastHealthCheck?.status || ConnectorStatus.DISCONNECTED,
      lastCheck: entry.lastHealthCheck?.last_check
    }));
  }

  // ============================================
  // ENABLE/DISABLE
  // ============================================

  /**
   * Enable a connector
   */
  enable(code: string): boolean {
    const entry = this.connectors.get(code);
    if (entry) {
      entry.enabled = true;
      logger.info(`Enabled connector: ${code}`);
      return true;
    }
    return false;
  }

  /**
   * Disable a connector
   */
  disable(code: string): boolean {
    const entry = this.connectors.get(code);
    if (entry) {
      entry.enabled = false;
      logger.info(`Disabled connector: ${code}`);
      return true;
    }
    return false;
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear all connectors (for testing)
   */
  clear(): void {
    this.connectors.clear();
    this.initialized = false;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

/**
 * Get the connector registry instance
 */
export function getConnectorRegistry(): ConnectorRegistry {
  return ConnectorRegistry.getInstance();
}

// ============================================
// DECORATOR FOR AUTO-REGISTRATION
// ============================================

/**
 * Decorator to auto-register a connector class
 * Usage: @AutoRegister()
 */
export function AutoRegister() {
  return function <T extends new (...args: any[]) => AnyConnector>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        // Note: Registration happens after instantiation
        // The caller should register the instance
      }
    };
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create and register multiple connectors from config
 */
export async function initializeConnectors(
  connectorFactories: Array<() => AnyConnector>,
  initializeImmediately: boolean = true
): Promise<Map<string, boolean>> {
  const registry = getConnectorRegistry();

  // Create and register all connectors
  for (const factory of connectorFactories) {
    const connector = factory();
    registry.register(connector);
  }

  // Initialize if requested
  if (initializeImmediately) {
    return registry.initializeAll();
  }

  return new Map();
}

/**
 * Get all healthy connectors of a specific type
 */
export function getHealthyConnectors(type: ConnectorType): AnyConnector[] {
  const registry = getConnectorRegistry();

  return registry.getByType(type).filter(connector => {
    const health = registry.getLastHealthCheck(connector.metadata.code);
    return health?.status === ConnectorStatus.CONNECTED;
  });
}
