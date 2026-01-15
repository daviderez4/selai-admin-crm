/**
 * SELAI Insurance Integration Hub
 * Unified Connector Interface - ממשק אחיד לכל מקורות המידע
 *
 * This interface standardizes all insurance data source connections:
 * - Vehicle insurance (Har HaBitouach)
 * - Pension data (Mislaka)
 * - Insurance carriers (Clal, Harel, Migdal, etc.)
 * - Aggregators (Surense)
 * - Government sources (MOH, Vehicle Registry)
 */

import type {
  Policy,
  Claim,
  Quote,
  Payment,
  PensionAccount,
  Commission,
  Consent
} from '../models/canonical.js';

// ============================================
// ENUMS
// ============================================

/**
 * Connector types - סוגי קונקטורים
 */
export enum ConnectorType {
  VEHICLE = 'vehicle',           // ביטוח רכב (הר הביטוח)
  PENSION = 'pension',           // פנסיה (מסלקה)
  CARRIER = 'carrier',           // חברת ביטוח
  AGGREGATOR = 'aggregator',     // אגרגטור (Surense)
  GOVERNMENT = 'government',     // מקור ממשלתי
  BANK = 'bank',                 // בנק
  HEALTH = 'health'              // בריאות (משרד הבריאות)
}

/**
 * Connector status - סטטוס קונקטור
 */
export enum ConnectorStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

/**
 * Authentication method - שיטת אימות
 */
export enum AuthMethod {
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
  CERTIFICATE = 'certificate',
  BASIC = 'basic',
  NONE = 'none'
}

// ============================================
// COMMON TYPES
// ============================================

/**
 * Query options for data retrieval
 */
export interface QueryOptions {
  // Pagination
  page?: number;
  limit?: number;
  offset?: number;

  // Filtering
  status?: string[];
  insurance_type?: string[];
  from_date?: string;
  to_date?: string;

  // Sorting
  sort_by?: string;
  sort_order?: 'asc' | 'desc';

  // Include options
  include_raw?: boolean;
  include_documents?: boolean;
}

/**
 * Health status response
 */
export interface HealthStatus {
  status: ConnectorStatus;
  message?: string;
  last_check: Date;
  response_time_ms?: number;
  details?: {
    api_available: boolean;
    auth_valid: boolean;
    last_successful_request?: Date;
    error_count_24h?: number;
    rate_limit_remaining?: number;
  };
}

/**
 * Connector metadata
 */
export interface ConnectorMetadata {
  name: string;
  name_hebrew: string;
  code: string;
  type: ConnectorType;
  version: string;
  description?: string;
  supported_operations: string[];
  auth_method: AuthMethod;
  rate_limit?: {
    requests_per_minute: number;
    requests_per_day?: number;
  };
  documentation_url?: string;
}

/**
 * Operation result wrapper
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    request_id?: string;
    duration_ms?: number;
    cached?: boolean;
    source?: string;
  };
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
}

// ============================================
// DATA SOURCE SPECIFIC TYPES
// ============================================

/**
 * Vehicle-specific data (Har HaBitouach)
 */
export interface VehiclePolicy extends Policy {
  vehicle_number: string;
  vehicle_details?: {
    make: string;
    model: string;
    year: number;
    color?: string;
    engine_cc?: number;
    value?: number;
  };
  coverage_flags?: {
    mandatory: boolean;
    comprehensive: boolean;
    third_party: boolean;
    theft: boolean;
    personal_accident: boolean;
  };
}

export interface VehicleHistory {
  vehicle_number: string;
  policies: Array<{
    policy_id: string;
    insurer: string;
    start_date: string;
    end_date: string;
    coverage_type: string;
  }>;
  claims: Array<{
    claim_id: string;
    date: string;
    type: string;
    amount?: number;
  }>;
  risk_score?: number;
}

/**
 * Pension-specific data (Mislaka)
 */
export interface PensionAccountExtended extends PensionAccount {
  movements?: Array<{
    date: string;
    type: 'contribution' | 'withdrawal' | 'transfer' | 'fee' | 'return';
    amount: number;
    description?: string;
  }>;
  projections?: {
    retirement_age: number;
    projected_balance: number;
    projected_monthly_pension: number;
  };
}

export interface PensionConsentRequest {
  customer_id: string;
  id_number: string;
  consent_type: 'full_access' | 'balance_only' | 'specific_accounts';
  valid_until?: string;
  accounts?: string[];
}

export interface PensionConsentResponse {
  success: boolean;
  consent_id?: string;
  status?: 'active' | 'pending' | 'rejected';
  error?: string;
}

// ============================================
// BASE CONNECTOR INTERFACE
// ============================================

/**
 * Base interface that all connectors must implement
 */
export interface IBaseConnector {
  /**
   * Connector metadata
   */
  readonly metadata: ConnectorMetadata;

  /**
   * Initialize the connector (authenticate, load config, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Check connector health status
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * Gracefully shutdown the connector
   */
  shutdown(): Promise<void>;

  /**
   * Check if the connector is ready to accept requests
   */
  isReady(): boolean;
}

// ============================================
// INSURANCE CONNECTOR INTERFACE
// ============================================

/**
 * Full insurance connector interface
 * Extends base with insurance-specific operations
 */
export interface IInsuranceConnector extends IBaseConnector {
  // ============================================
  // POLICIES - פוליסות
  // ============================================

  /**
   * Get all policies for a customer
   */
  getPolicies(customerId: string, options?: QueryOptions): Promise<OperationResult<Policy[]>>;

  /**
   * Get a specific policy by ID
   */
  getPolicy?(policyId: string): Promise<OperationResult<Policy>>;

  /**
   * Get policy by policy number
   */
  getPolicyByNumber?(policyNumber: string): Promise<OperationResult<Policy>>;

  // ============================================
  // CLAIMS - תביעות
  // ============================================

  /**
   * Get claims for a customer
   */
  getClaims?(customerId: string, options?: QueryOptions): Promise<OperationResult<Claim[]>>;

  /**
   * Get a specific claim
   */
  getClaim?(claimId: string): Promise<OperationResult<Claim>>;

  /**
   * Submit a new claim
   */
  submitClaim?(request: ClaimSubmissionRequest): Promise<OperationResult<ClaimSubmissionResponse>>;

  // ============================================
  // QUOTES - הצעות מחיר
  // ============================================

  /**
   * Get a quote
   */
  getQuote?(request: QuoteRequest): Promise<OperationResult<Quote>>;

  /**
   * Get multiple quotes (comparison)
   */
  getQuotes?(request: QuoteRequest): Promise<OperationResult<Quote[]>>;

  // ============================================
  // PAYMENTS - תשלומים
  // ============================================

  /**
   * Get payment history
   */
  getPayments?(customerId: string, options?: QueryOptions): Promise<OperationResult<Payment[]>>;

  // ============================================
  // COMMISSIONS - עמלות
  // ============================================

  /**
   * Get commissions for an agent
   */
  getCommissions?(agentId: string, options?: QueryOptions): Promise<OperationResult<Commission[]>>;
}

// ============================================
// VEHICLE CONNECTOR INTERFACE
// ============================================

/**
 * Vehicle-specific connector (e.g., Har HaBitouach)
 */
export interface IVehicleConnector extends IBaseConnector {
  /**
   * Get vehicle policies by owner ID
   */
  getPoliciesByOwnerId(ownerId: string): Promise<OperationResult<VehiclePolicy[]>>;

  /**
   * Get policies by vehicle number
   */
  getPoliciesByVehicle(vehicleNumber: string): Promise<OperationResult<VehiclePolicy[]>>;

  /**
   * Get vehicle insurance history
   */
  getVehicleHistory(vehicleNumber: string): Promise<OperationResult<VehicleHistory>>;

  /**
   * Get owner's full history
   */
  getOwnerHistory?(ownerId: string): Promise<OperationResult<VehicleHistory[]>>;

  /**
   * Get risk score for a vehicle
   */
  getRiskScore?(vehicleNumber: string): Promise<OperationResult<number>>;
}

// ============================================
// PENSION CONNECTOR INTERFACE
// ============================================

/**
 * Pension-specific connector (e.g., Mislaka)
 */
export interface IPensionConnector extends IBaseConnector {
  /**
   * Create data access consent
   */
  createConsent(request: PensionConsentRequest): Promise<OperationResult<PensionConsentResponse>>;

  /**
   * Check if consent is active
   */
  checkConsent(customerId: string): Promise<OperationResult<Consent>>;

  /**
   * Get all pension accounts for a customer
   */
  getPensionAccounts(customerId: string): Promise<OperationResult<PensionAccount[]>>;

  /**
   * Get a specific pension account
   */
  getPensionAccount(accountNumber: string): Promise<OperationResult<PensionAccountExtended>>;

  /**
   * Get account movements/transactions
   */
  getAccountMovements?(accountNumber: string, fromDate?: string, toDate?: string): Promise<OperationResult<any[]>>;

  /**
   * Get management fees
   */
  getManagementFees?(accountNumber: string): Promise<OperationResult<any>>;
}

// ============================================
// AGGREGATOR CONNECTOR INTERFACE
// ============================================

/**
 * Aggregator connector (e.g., Surense)
 */
export interface IAggregatorConnector extends IBaseConnector {
  /**
   * Get quotes from multiple carriers
   */
  getMultiCarrierQuotes(request: QuoteRequest): Promise<OperationResult<Quote[]>>;

  /**
   * Get customer policies from multiple sources
   */
  getAggregatedPolicies(customerId: string): Promise<OperationResult<Policy[]>>;

  /**
   * Submit application through aggregator
   */
  submitApplication?(application: any): Promise<OperationResult<any>>;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface QuoteRequest {
  insurance_type: string;
  customer_data: {
    id_number: string;
    birth_date?: string;
    gender?: string;
    occupation?: string;
    address?: {
      city: string;
      street?: string;
    };
  };
  coverage: {
    amount: number;
    deductible?: number;
    additional?: Record<string, any>;
  };
  start_date: string;
  additional_data?: Record<string, any>;
}

export interface ClaimSubmissionRequest {
  policy_id: string;
  policy_number: string;
  incident_date: string;
  description: string;
  claimed_amount?: number;
  claim_type: string;
  documents?: Array<{
    type: string;
    name: string;
    content: string; // base64
  }>;
  contact_info?: {
    phone: string;
    email?: string;
  };
}

export interface ClaimSubmissionResponse {
  claim_id: string;
  claim_number: string;
  status: string;
  message?: string;
}

// ============================================
// CONNECTOR TYPE GUARDS
// ============================================

export function isVehicleConnector(connector: IBaseConnector): connector is IVehicleConnector {
  return connector.metadata.type === ConnectorType.VEHICLE;
}

export function isPensionConnector(connector: IBaseConnector): connector is IPensionConnector {
  return connector.metadata.type === ConnectorType.PENSION;
}

export function isInsuranceConnector(connector: IBaseConnector): connector is IInsuranceConnector {
  return connector.metadata.type === ConnectorType.CARRIER;
}

export function isAggregatorConnector(connector: IBaseConnector): connector is IAggregatorConnector {
  return connector.metadata.type === ConnectorType.AGGREGATOR;
}

// ============================================
// ABSTRACT BASE IMPLEMENTATION
// ============================================

/**
 * Abstract base class with common functionality
 */
export abstract class BaseConnector implements IBaseConnector {
  abstract readonly metadata: ConnectorMetadata;

  protected _isReady: boolean = false;
  protected _lastHealthCheck?: HealthStatus;

  // Authentication
  protected accessToken?: string;
  protected tokenExpiry?: Date;

  // Configuration
  protected config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  /**
   * Initialize the connector
   */
  async initialize(): Promise<void> {
    try {
      await this.authenticate();
      this._isReady = true;
    } catch (error) {
      this._isReady = false;
      throw error;
    }
  }

  /**
   * Authenticate with the data source
   */
  protected abstract authenticate(): Promise<void>;

  /**
   * Check health status
   */
  abstract healthCheck(): Promise<HealthStatus>;

  /**
   * Shutdown the connector
   */
  async shutdown(): Promise<void> {
    this._isReady = false;
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }

  /**
   * Check if connector is ready
   */
  isReady(): boolean {
    return this._isReady;
  }

  /**
   * Check if token is valid
   */
  protected isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiry) return false;
    return this.tokenExpiry > new Date();
  }

  /**
   * Get access token (cached or fresh)
   */
  protected async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.accessToken!;
    }
    await this.authenticate();
    return this.accessToken!;
  }

  /**
   * Create a standardized operation result
   */
  protected createResult<T>(data: T, cached: boolean = false): OperationResult<T> {
    return {
      success: true,
      data,
      metadata: {
        cached,
        source: this.metadata.code
      }
    };
  }

  /**
   * Create an error result
   */
  protected createError<T>(code: string, message: string, details?: Record<string, any>): OperationResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: {
        source: this.metadata.code
      }
    };
  }
}

/**
 * Connector configuration
 */
export interface ConnectorConfig {
  apiUrl: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  timeout?: number;
  retries?: number;
  useMocks?: boolean;
  // Certificate auth (for Mislaka)
  certPath?: string;
  certPassword?: string;
  // SFTP config
  sftpHost?: string;
  sftpUser?: string;
  sftpPassword?: string;
  sftpPath?: string;
}

// ============================================
// EXPORTS
// ============================================

export type AnyConnector = IInsuranceConnector | IVehicleConnector | IPensionConnector | IAggregatorConnector;
