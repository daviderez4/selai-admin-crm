/**
 * SELAI Insurance Integration Hub
 * Pension Adapter - Adapter for Mislaka connector
 *
 * Implements IPensionConnector interface wrapping the existing MislakaConnector
 */

import {
  IPensionConnector,
  ConnectorMetadata,
  ConnectorType,
  ConnectorStatus,
  AuthMethod,
  HealthStatus,
  OperationResult,
  PensionAccountExtended,
  PensionConsentRequest,
  PensionConsentResponse,
  ConnectorConfig,
  BaseConnector
} from '../connector-interface.js';
import {
  MislakaConnector,
  MislakaMockConnector,
  MislakaMovement
} from '../mislaka/connector.js';
import { PensionAccount, Consent } from '../../models/canonical.js';
import { logger } from '../../utils/logger.js';
import { connectorsConfig } from '../../config/connectors.js';

// ============================================
// PENSION CONNECTOR ADAPTER
// ============================================

export class PensionConnectorAdapter extends BaseConnector implements IPensionConnector {
  readonly metadata: ConnectorMetadata = {
    name: 'Mislaka Pensionit',
    name_hebrew: 'המסלקה הפנסיונית',
    code: 'MISLAKA',
    type: ConnectorType.PENSION,
    version: '1.0.0',
    description: 'Israeli pension clearing house - pension and provident fund data',
    supported_operations: [
      'createConsent',
      'checkConsent',
      'getPensionAccounts',
      'getPensionAccount',
      'getAccountMovements',
      'getManagementFees'
    ],
    auth_method: AuthMethod.CERTIFICATE,
    rate_limit: {
      requests_per_minute: 60,
      requests_per_day: 5000
    },
    documentation_url: 'https://api.mislaka-api.co.il/docs'
  };

  private mislakaConnector: MislakaConnector;
  private useMocks: boolean;

  constructor(config: ConnectorConfig) {
    super(config);
    this.useMocks = config.useMocks || false;

    if (this.useMocks) {
      this.mislakaConnector = new MislakaMockConnector();
    } else {
      this.mislakaConnector = new MislakaConnector({
        apiUrl: config.apiUrl,
        clientId: config.clientId || '',
        clientSecret: config.clientSecret || '',
        certificatePath: config.certPath,
        certificatePassword: config.certPassword,
        sftpHost: config.sftpHost,
        sftpUser: config.sftpUser,
        sftpPassword: config.sftpPassword,
        sftpPath: config.sftpPath,
        timeout: config.timeout
      });
    }
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  protected async authenticate(): Promise<void> {
    try {
      await this.mislakaConnector.authenticate();
      logger.info('PensionConnector: Authentication successful');
    } catch (error) {
      logger.error('PensionConnector: Authentication failed', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.mislakaConnector.healthCheck();

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
  // CONSENT OPERATIONS
  // ============================================

  /**
   * Create data access consent
   */
  async createConsent(request: PensionConsentRequest): Promise<OperationResult<PensionConsentResponse>> {
    const startTime = Date.now();

    try {
      const consent = await this.mislakaConnector.createConsent({
        customer_id: request.customer_id,
        scope: this.mapConsentType(request.consent_type),
        valid_until: request.valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });

      return {
        success: true,
        data: {
          success: true,
          consent_id: consent.id,
          status: consent.status === 'active' ? 'active' : 'pending'
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('PensionConnector: createConsent failed', { error, request });

      return {
        success: false,
        error: {
          code: 'CONSENT_CREATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create consent',
          details: { customerId: request.customer_id }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Check if consent is active
   */
  async checkConsent(customerId: string): Promise<OperationResult<Consent>> {
    const startTime = Date.now();

    try {
      const hasConsent = await this.mislakaConnector.checkConsent(customerId);

      if (!hasConsent) {
        return {
          success: false,
          error: {
            code: 'NO_ACTIVE_CONSENT',
            message: 'No active consent found for this customer',
            details: { customerId }
          },
          metadata: {
            duration_ms: Date.now() - startTime,
            source: this.metadata.code
          }
        };
      }

      // Create a consent object representing active consent
      const consent: Consent = {
        id: customerId, // Using customerId as placeholder
        customer_id: customerId,
        consent_type: 'mislaka_access',
        status: 'active',
        granted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return {
        success: true,
        data: consent,
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('PensionConnector: checkConsent failed', { error, customerId });

      return {
        success: false,
        error: {
          code: 'CONSENT_CHECK_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check consent',
          details: { customerId }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  // ============================================
  // PENSION DATA OPERATIONS
  // ============================================

  /**
   * Get all pension accounts for a customer
   */
  async getPensionAccounts(customerId: string): Promise<OperationResult<PensionAccount[]>> {
    const startTime = Date.now();

    try {
      const accounts = await this.mislakaConnector.getPensionAccounts(customerId);

      return {
        success: true,
        data: accounts,
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('PensionConnector: getPensionAccounts failed', { error, customerId });

      return {
        success: false,
        error: {
          code: 'PENSION_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch pension accounts',
          details: { customerId }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Get a specific pension account with extended data
   */
  async getPensionAccount(accountNumber: string): Promise<OperationResult<PensionAccountExtended>> {
    const startTime = Date.now();

    try {
      const account = await this.mislakaConnector.getPensionAccount(accountNumber);

      if (!account) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Pension account not found',
            details: { accountNumber }
          },
          metadata: {
            duration_ms: Date.now() - startTime,
            source: this.metadata.code
          }
        };
      }

      // Get movements if available
      let movements: MislakaMovement[] = [];
      try {
        movements = await this.mislakaConnector.getAccountMovements(accountNumber);
      } catch {
        // Movements are optional
      }

      const extendedAccount: PensionAccountExtended = {
        ...account,
        movements: movements.map(m => ({
          date: m.date,
          type: m.type as 'contribution' | 'withdrawal' | 'transfer' | 'fee' | 'return',
          amount: m.amount,
          description: m.description
        }))
      };

      return {
        success: true,
        data: extendedAccount,
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('PensionConnector: getPensionAccount failed', { error, accountNumber });

      return {
        success: false,
        error: {
          code: 'PENSION_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch pension account',
          details: { accountNumber }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Get account movements/transactions
   */
  async getAccountMovements(
    accountNumber: string,
    fromDate?: string,
    toDate?: string
  ): Promise<OperationResult<any[]>> {
    const startTime = Date.now();

    try {
      const movements = await this.mislakaConnector.getAccountMovements(
        accountNumber,
        fromDate,
        toDate
      );

      return {
        success: true,
        data: movements,
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('PensionConnector: getAccountMovements failed', { error, accountNumber });

      return {
        success: false,
        error: {
          code: 'MOVEMENTS_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch movements',
          details: { accountNumber, fromDate, toDate }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  /**
   * Get management fees for an account
   */
  async getManagementFees(accountNumber: string): Promise<OperationResult<any>> {
    const startTime = Date.now();

    try {
      const fees = await this.mislakaConnector.getManagementFees(accountNumber);

      if (!fees) {
        return {
          success: false,
          error: {
            code: 'FEES_NOT_AVAILABLE',
            message: 'Management fees not available for this account',
            details: { accountNumber }
          },
          metadata: {
            duration_ms: Date.now() - startTime,
            source: this.metadata.code
          }
        };
      }

      return {
        success: true,
        data: fees,
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    } catch (error) {
      logger.error('PensionConnector: getManagementFees failed', { error, accountNumber });

      return {
        success: false,
        error: {
          code: 'FEES_FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch fees',
          details: { accountNumber }
        },
        metadata: {
          duration_ms: Date.now() - startTime,
          source: this.metadata.code
        }
      };
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private mapConsentType(type: string): 'all' | 'pension' | 'provident' | 'severance' {
    const mapping: Record<string, 'all' | 'pension' | 'provident' | 'severance'> = {
      full_access: 'all',
      balance_only: 'pension',
      specific_accounts: 'pension'
    };
    return mapping[type] || 'all';
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create a pension connector instance
 */
export function createPensionConnector(): PensionConnectorAdapter {
  const config = connectorsConfig.mislaka;

  return new PensionConnectorAdapter({
    apiUrl: config.apiUrl || 'https://api.mislaka-api.co.il',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    timeout: config.timeout,
    useMocks: config.useMocks,
    certPath: config.certPath,
    certPassword: config.certPassword,
    sftpHost: config.sftp?.host,
    sftpUser: config.sftp?.user,
    sftpPassword: config.sftp?.password,
    sftpPath: config.sftp?.path
  });
}
