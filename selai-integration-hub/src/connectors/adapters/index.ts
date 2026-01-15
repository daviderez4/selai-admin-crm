/**
 * SELAI Insurance Integration Hub
 * Connector Adapters Index
 *
 * Central export point for all connector adapters
 */

// Vehicle adapter (Har HaBitouach)
export {
  VehicleConnectorAdapter,
  createVehicleConnector
} from './vehicle-adapter.js';

// Pension adapter (Mislaka)
export {
  PensionConnectorAdapter,
  createPensionConnector
} from './pension-adapter.js';

// Re-export types
export type {
  IVehicleConnector,
  IPensionConnector,
  IInsuranceConnector,
  IAggregatorConnector,
  IBaseConnector,
  ConnectorMetadata,
  HealthStatus,
  OperationResult,
  QueryOptions,
  VehiclePolicy,
  VehicleHistory,
  PensionAccountExtended,
  PensionConsentRequest,
  PensionConsentResponse,
  ConnectorConfig
} from '../connector-interface.js';

export {
  ConnectorType,
  ConnectorStatus,
  AuthMethod
} from '../connector-interface.js';

import { AnyConnector } from '../connector-interface.js';
import { getConnectorRegistry } from '../connector-registry.js';
import { createVehicleConnector } from './vehicle-adapter.js';
import { createPensionConnector } from './pension-adapter.js';
import { logger } from '../../utils/logger.js';

// ============================================
// CONNECTOR FACTORY
// ============================================

/**
 * Create all default connectors
 */
export function createAllConnectors(): AnyConnector[] {
  const connectors: AnyConnector[] = [];

  try {
    connectors.push(createVehicleConnector());
    logger.info('Created Vehicle connector (Har HaBitouach)');
  } catch (error) {
    logger.error('Failed to create Vehicle connector', { error });
  }

  try {
    connectors.push(createPensionConnector());
    logger.info('Created Pension connector (Mislaka)');
  } catch (error) {
    logger.error('Failed to create Pension connector', { error });
  }

  // TODO: Add carrier connectors
  // TODO: Add aggregator connectors (Surense)

  return connectors;
}

/**
 * Initialize the connector registry with all default connectors
 */
export async function initializeAllConnectors(): Promise<Map<string, boolean>> {
  const registry = getConnectorRegistry();
  const connectors = createAllConnectors();

  // Register all connectors
  registry.registerAll(connectors);

  // Initialize all connectors
  return registry.initializeAll();
}

/**
 * Get a summary of all available connectors
 */
export function getConnectorSummary(): Array<{
  code: string;
  name: string;
  type: string;
  status: string;
}> {
  const registry = getConnectorRegistry();

  return registry.getStatus().map(status => ({
    code: status.code,
    name: status.name,
    type: status.type,
    status: status.ready ? 'ready' : 'not_ready'
  }));
}
