/**
 * SELAI Insurance Integration Hub
 * Vehicle Adapter - Adapter for Har HaBitouach connector
 *
 * Implements IVehicleConnector interface wrapping the existing HarHabitouachConnector
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IVehicleConnector,
  ConnectorMetadata,
  ConnectorType,
  ConnectorStatus,
  AuthMethod,
  HealthStatus,
  OperationResult,
  VehiclePolicy,
  VehicleHistory,
  ConnectorConfig,
  BaseConnector
} from '../connector-interface.js';
import {
  HarHabitouachConnector,
  HarHabitouachMockConnector,
  HarHabitouachHistoryResponse
} from '../har-habitoach/connector.js';
import { Policy } from '../../models/canonical.js';
import { logger } from '../../utils/logger.js';
import { connectorsConfig } from '../../config/connectors.js';

// ============================================
// VEHICLE CONNECTOR ADAPTER
// ============================================

export class VehicleConnectorAdapter extends BaseConnector implements IVehicleConnector {
  readonly metadata: ConnectorMetadata = {
    name: 'Har HaBitouach',
    name_hebrew: 'הר הביטוח',
    code: 'HAR_HABITOUACH',
    type: ConnectorType.VEHICLE,
    version: '1.0.0',
    description: 'Israeli vehicle insurance data aggregator',
    supported_operations: [
      'getPoliciesByOwnerId',
      'getPoliciesByVehicle',
      'getVehicleHistory',
      'getOwnerHistory',
      'getRiskScore'
    ],
    auth_method: AuthMethod.OAUTH2,
    rate_limit: {
      requests_per_minute: 100,
      requests_per_day: 10000
    },
    documentation_url: 'https://api.harhabitouach.co.il/docs'
  };

  private harHabitouachConnector: HarHabitouachConnector;
  private useMocks: boolean;

  constructor(config: ConnectorConfig) {
    super(config);
    this.useMocks = config.useMocks || false;

    if (this.useMocks) {
      this.harHabitouachConnector = new HarHabitouachMockConnector();
    } else {
      this.harHabitouachConnector = new HarHabitouachConnector({
        apiUrl: config.apiUrl,
        clientId: config.clientId || '',
        clientSecret: config.clientSecret || '',
        apiKey: config.apiKey,
        timeout: config.timeout
      });
    }
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  protected async authenticate(): Promise<void> {
    try {
      await this.harHabitouachConnector.authenticate();
      logger.info('VehicleConnector: Authentication successful');
    } catch (error) {
      logger.error('VehicleConnector: Authentication failed', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.harHabitouachConnector.healthCheck();

      return {
        status: isHealthy ? ConnectorStatus.CONNECTED : ConnectorStatus.ERROR,
        message: isHealthy ? 'Connected and operational' : 'Health check failed',
        last_check: new Date(),
        response_time_ms: Date.now() - startTime,
        details: {
          api_available: isHealthy,
          auth_valid: this._isReady
        }
      };
    } catch (error) {
      return {
        status: ConnectorStatus.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        last_check: new Date(),
        response_time_ms: Date.now() - startTime,
        details: {
          api_available: false,
          auth_valid: false
        }
      };
    }
  }

  // ============================================
  // VEHICLE-SPECIFIC OPERATIONS
  // ============================================

  /**
   * Get vehicle policies by owner ID number
   */
  async getPoliciesByOwnerId(ownerId: string): Promise<OperationResult<VehiclePolicy[]>> {
    const startTime = Date.now();

    try {
      const policies = await this.harHabitouachConnector.getPoliciesByOwnerId(ownerId);

      return {
        success: true,
        data: policies.map(p => this.mapToVehiclePolicy(p)),
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('VehicleConnector: getPoliciesByOwnerId failed', { error, ownerId });

      return {
        success: false,
        error: {
          code: 'VEHICLE_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch policies',
          details: { ownerId }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Get policies by vehicle number (license plate)
   */
  async getPoliciesByVehicle(vehicleNumber: string): Promise<OperationResult<VehiclePolicy[]>> {
    const startTime = Date.now();

    try {
      const policies = await this.harHabitouachConnector.getPoliciesByVehicle(vehicleNumber);

      return {
        success: true,
        data: policies.map(p => this.mapToVehiclePolicy(p)),
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('VehicleConnector: getPoliciesByVehicle failed', { error, vehicleNumber });

      return {
        success: false,
        error: {
          code: 'VEHICLE_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch policies',
          details: { vehicleNumber }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Get vehicle insurance history
   */
  async getVehicleHistory(vehicleNumber: string): Promise<OperationResult<VehicleHistory>> {
    const startTime = Date.now();

    try {
      const history = await this.harHabitouachConnector.getVehicleHistory(vehicleNumber);

      return {
        success: true,
        data: this.mapToVehicleHistory(history),
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('VehicleConnector: getVehicleHistory failed', { error, vehicleNumber });

      return {
        success: false,
        error: {
          code: 'VEHICLE_HISTORY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch history',
          details: { vehicleNumber }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Get owner's full history across all vehicles
   */
  async getOwnerHistory(ownerId: string): Promise<OperationResult<VehicleHistory[]>> {
    const startTime = Date.now();

    try {
      const histories = await this.harHabitouachConnector.getOwnerHistory(ownerId);

      return {
        success: true,
        data: histories.map(h => this.mapToVehicleHistory(h)),
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('VehicleConnector: getOwnerHistory failed', { error, ownerId });

      return {
        success: false,
        error: {
          code: 'OWNER_HISTORY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch owner history',
          details: { ownerId }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Get risk score for a vehicle
   */
  async getRiskScore(vehicleNumber: string): Promise<OperationResult<number>> {
    const startTime = Date.now();

    try {
      const score = await this.harHabitouachConnector.getRiskScore(vehicleNumber);

      if (score === null) {
        return {
          success: false,
          error: {
            code: 'RISK_SCORE_NOT_AVAILABLE',
            message: 'Risk score not available for this vehicle',
            details: { vehicleNumber }
          },
          metadata: {
            duration_ms: Date.now() - startTime,
            source: this.metadata.code
          }
        };
      }

      return {
        success: true,
        data: score,
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('VehicleConnector: getRiskScore failed', { error, vehicleNumber });

      return {
        success: false,
        error: {
          code: 'RISK_SCORE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch risk score',
          details: { vehicleNumber }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  // ============================================
  // MAPPING
  // ============================================

  private mapToVehiclePolicy(policy: Policy): VehiclePolicy {
    return {
      ...policy,
      vehicle_number: policy.type_specific_data?.vehicle?.vehicle_number || '',
      vehicle_details: policy.type_specific_data?.vehicle,
      coverage_flags: policy.type_specific_data?.coverage_flags
    };
  }

  private mapToVehicleHistory(history: HarHabitouachHistoryResponse): VehicleHistory {
    return {
      vehicle_number: history.vehicle_number,
      policies: history.history.map(h => ({
        policy_id: uuidv4(),
        insurer: h.insurance_company,
        start_date: h.start_date,
        end_date: h.end_date,
        coverage_type: 'vehicle'
      })),
      claims: history.history
        .filter(h => h.claims_count > 0)
        .map(h => ({
          claim_id: uuidv4(),
          date: h.end_date,
          type: 'vehicle',
          amount: h.total_claims_amount
        })),
      risk_score: history.risk_score
    };
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create a vehicle connector instance
 */
export function createVehicleConnector(): VehicleConnectorAdapter {
  const config = connectorsConfig.harHabitouach;

  return new VehicleConnectorAdapter({
    apiUrl: config.apiUrl || 'https://api.harhabitouach.co.il',
    apiKey: config.apiKey,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    timeout: config.timeout,
    useMocks: config.useMocks
  });
}
