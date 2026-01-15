/**
 * SELAI Insurance Integration Hub
 * הר הביטוח Connector - מידע ביטוחי לרכב
 * 
 * מספק גישה לנתוני ביטוח רכב בישראל:
 * - היסטוריית פוליסות
 * - כיסויים פעילים
 * - דוחות עבר ביטוחי
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  Policy,
  PolicySchema,
  Customer,
  type InsuranceType
} from '../../models/canonical.js';
import { logger } from '../../utils/logger.js';

// ============================================
// TYPES - הגדרות טיפוסים
// ============================================

export interface HarHabitouachConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  apiKey?: string;
  timeout?: number;
}

export interface HarHabitouachAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface HarHabitouachPolicyResponse {
  policy_id: string;
  policy_number: string;
  insurance_company: string;
  insurance_company_code: string;
  vehicle_number: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: string;
  coverage_type: string;
  premium_amount: number;
  coverage: {
    mandatory: boolean;
    comprehensive: boolean;
    third_party: boolean;
    theft: boolean;
    personal_accident: boolean;
    liability_amount?: number;
    property_damage_amount?: number;
  };
  vehicle_details: {
    make: string;
    model: string;
    year: number;
    color?: string;
    engine_cc?: number;
    value?: number;
  };
}

export interface HarHabitouachHistoryResponse {
  owner_id: string;
  vehicle_number: string;
  history: Array<{
    policy_number: string;
    insurance_company: string;
    start_date: string;
    end_date: string;
    claims_count: number;
    total_claims_amount: number;
  }>;
  risk_score?: number;
}

export interface VehicleSearchRequest {
  vehicle_number?: string;
  owner_id?: string;
  license_plate?: string;
}

// ============================================
// HAR HABITOUACH CONNECTOR
// ============================================

export class HarHabitouachConnector {
  private client: AxiosInstance;
  private config: HarHabitouachConfig;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: HarHabitouachConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey })
      }
    });

    // Interceptor for logging
    this.client.interceptors.request.use(
      (request) => {
        logger.debug('HarHabitouach Request', {
          url: request.url,
          method: request.method
        });
        return request;
      },
      (error) => {
        logger.error('HarHabitouach Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('HarHabitouach Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('HarHabitouach Response Error', {
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * אימות מול ה-API
   */
  async authenticate(): Promise<string> {
    try {
      const response = await this.client.post<HarHabitouachAuthResponse>(
        '/oauth/token',
        {
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'read:policies read:history'
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      
      logger.info('HarHabitouach: Authentication successful');
      return this.accessToken;
    } catch (error) {
      logger.error('HarHabitouach: Authentication failed', { error });
      throw new Error('Failed to authenticate with Har HaBitouach API');
    }
  }

  /**
   * קבלת טוקן תקף
   */
  private async getValidToken(): Promise<string> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      return this.authenticate();
    }
    return this.accessToken;
  }

  /**
   * הוספת Authorization header
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * בדיקת תקינות החיבור
   */
  async healthCheck(): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await this.client.get('/health', { headers });
      return response.status === 200;
    } catch (error) {
      logger.error('HarHabitouach: Health check failed', { error });
      return false;
    }
  }

  // ============================================
  // POLICIES - פוליסות
  // ============================================

  /**
   * חיפוש פוליסות לפי מספר רכב או ת"ז
   */
  async searchPolicies(search: VehicleSearchRequest): Promise<HarHabitouachPolicyResponse[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const params: Record<string, string> = {};
      if (search.vehicle_number) params.vehicle_number = search.vehicle_number;
      if (search.owner_id) params.owner_id = search.owner_id;
      if (search.license_plate) params.license_plate = search.license_plate;

      const response = await this.client.get<{ policies: HarHabitouachPolicyResponse[] }>(
        '/v1/policies/search',
        { headers, params }
      );

      return response.data.policies || [];
    } catch (error) {
      logger.error('HarHabitouach: Search policies failed', { error, search });
      throw error;
    }
  }

  /**
   * קבלת פוליסות לפי ת"ז בעלים
   */
  async getPoliciesByOwnerId(ownerId: string): Promise<Policy[]> {
    try {
      const rawPolicies = await this.searchPolicies({ owner_id: ownerId });
      return rawPolicies.map(p => this.mapToCanonicalPolicy(p));
    } catch (error) {
      logger.error('HarHabitouach: Get policies by owner failed', { error, ownerId });
      throw error;
    }
  }

  /**
   * קבלת פוליסות לפי מספר רכב
   */
  async getPoliciesByVehicle(vehicleNumber: string): Promise<Policy[]> {
    try {
      const rawPolicies = await this.searchPolicies({ vehicle_number: vehicleNumber });
      return rawPolicies.map(p => this.mapToCanonicalPolicy(p));
    } catch (error) {
      logger.error('HarHabitouach: Get policies by vehicle failed', { error, vehicleNumber });
      throw error;
    }
  }

  /**
   * קבלת פוליסה ספציפית
   */
  async getPolicy(policyId: string): Promise<Policy | null> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.client.get<HarHabitouachPolicyResponse>(
        `/v1/policies/${policyId}`,
        { headers }
      );

      return this.mapToCanonicalPolicy(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('HarHabitouach: Get policy failed', { error, policyId });
      throw error;
    }
  }

  // ============================================
  // HISTORY - היסטוריה ביטוחית
  // ============================================

  /**
   * קבלת היסטוריה ביטוחית של רכב
   */
  async getVehicleHistory(vehicleNumber: string): Promise<HarHabitouachHistoryResponse> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.client.get<HarHabitouachHistoryResponse>(
        `/v1/history/vehicle/${vehicleNumber}`,
        { headers }
      );

      return response.data;
    } catch (error) {
      logger.error('HarHabitouach: Get vehicle history failed', { error, vehicleNumber });
      throw error;
    }
  }

  /**
   * קבלת היסטוריה ביטוחית של בעלים
   */
  async getOwnerHistory(ownerId: string): Promise<HarHabitouachHistoryResponse[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await this.client.get<{ history: HarHabitouachHistoryResponse[] }>(
        `/v1/history/owner/${ownerId}`,
        { headers }
      );

      return response.data.history || [];
    } catch (error) {
      logger.error('HarHabitouach: Get owner history failed', { error, ownerId });
      throw error;
    }
  }

  /**
   * קבלת דירוג סיכון לרכב
   */
  async getRiskScore(vehicleNumber: string): Promise<number | null> {
    try {
      const history = await this.getVehicleHistory(vehicleNumber);
      return history.risk_score || null;
    } catch (error) {
      logger.error('HarHabitouach: Get risk score failed', { error, vehicleNumber });
      return null;
    }
  }

  // ============================================
  // MAPPING - המרה למודל קנוני
  // ============================================

  /**
   * המרת תשובת API למודל פוליסה קנוני
   */
  private mapToCanonicalPolicy(raw: HarHabitouachPolicyResponse): Policy {
    const now = new Date().toISOString();
    
    // קביעת סטטוס
    let status: 'active' | 'expired' | 'cancelled' | 'pending' | 'suspended' | 'renewed' = 'active';
    if (raw.status === 'EXPIRED' || new Date(raw.end_date) < new Date()) {
      status = 'expired';
    } else if (raw.status === 'CANCELLED') {
      status = 'cancelled';
    } else if (raw.status === 'PENDING') {
      status = 'pending';
    }

    // חישוב כיסוי ראשי
    let primaryCoverage = 0;
    if (raw.coverage.liability_amount) {
      primaryCoverage = raw.coverage.liability_amount;
    } else if (raw.vehicle_details.value) {
      primaryCoverage = raw.vehicle_details.value;
    }

    const policy: Policy = {
      id: uuidv4(),
      policy_number: raw.policy_number,
      external_id: raw.policy_id,
      customer_id: raw.owner_id, // Note: This should be mapped to actual customer UUID
      insurance_type: 'car' as const,
      insurance_company: raw.insurance_company,
      insurance_company_code: raw.insurance_company_code,
      start_date: raw.start_date,
      end_date: raw.end_date,
      status,
      coverage: {
        primary_coverage: primaryCoverage,
        secondary_coverage: {
          ...(raw.coverage.property_damage_amount && { property_damage: raw.coverage.property_damage_amount })
        },
        deductible: 0 // Not provided in response
      },
      premium: {
        amount: raw.premium_amount,
        currency: 'ILS',
        frequency: 'annual'
      },
      type_specific_data: {
        vehicle: {
          vehicle_number: raw.vehicle_number,
          make: raw.vehicle_details.make,
          model: raw.vehicle_details.model,
          year: raw.vehicle_details.year,
          color: raw.vehicle_details.color,
          engine_cc: raw.vehicle_details.engine_cc,
          value: raw.vehicle_details.value
        },
        coverage_flags: {
          mandatory: raw.coverage.mandatory,
          comprehensive: raw.coverage.comprehensive,
          third_party: raw.coverage.third_party,
          theft: raw.coverage.theft,
          personal_accident: raw.coverage.personal_accident
        }
      },
      created_at: now,
      updated_at: now,
      source_system: 'har_habitouach',
      raw_data: raw
    };

    // Validate against schema
    return PolicySchema.parse(policy);
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * יצירת instance של ה-connector
 */
export function createHarHabitouachConnector(config?: Partial<HarHabitouachConfig>): HarHabitouachConnector {
  const fullConfig: HarHabitouachConfig = {
    apiUrl: process.env.HAR_HABITOUACH_API_URL || 'https://api.harhabitouach.co.il',
    clientId: process.env.HAR_HABITOUACH_CLIENT_ID || '',
    clientSecret: process.env.HAR_HABITOUACH_CLIENT_SECRET || '',
    apiKey: process.env.HAR_HABITOUACH_API_KEY,
    timeout: 30000,
    ...config
  };

  return new HarHabitouachConnector(fullConfig);
}

// ============================================
// MOCK IMPLEMENTATION (לפיתוח)
// ============================================

export class HarHabitouachMockConnector extends HarHabitouachConnector {
  constructor() {
    super({
      apiUrl: 'http://localhost:3000/mock/har-habitouach',
      clientId: 'mock-client',
      clientSecret: 'mock-secret'
    });
  }

  async authenticate(): Promise<string> {
    return 'mock-token';
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async searchPolicies(search: VehicleSearchRequest): Promise<HarHabitouachPolicyResponse[]> {
    // נתונים מדומים לבדיקות
    return [{
      policy_id: 'POL-001',
      policy_number: '1234567890',
      insurance_company: 'כלל ביטוח',
      insurance_company_code: '01',
      vehicle_number: search.vehicle_number || '12345678',
      owner_id: search.owner_id || '123456789',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2025-01-01T00:00:00Z',
      status: 'ACTIVE',
      coverage_type: 'COMPREHENSIVE',
      premium_amount: 3500,
      coverage: {
        mandatory: true,
        comprehensive: true,
        third_party: true,
        theft: true,
        personal_accident: true,
        liability_amount: 5000000,
        property_damage_amount: 500000
      },
      vehicle_details: {
        make: 'Toyota',
        model: 'Corolla',
        year: 2022,
        color: 'White',
        engine_cc: 1800,
        value: 120000
      }
    }];
  }

  async getVehicleHistory(vehicleNumber: string): Promise<HarHabitouachHistoryResponse> {
    return {
      owner_id: '123456789',
      vehicle_number: vehicleNumber,
      history: [{
        policy_number: '1234567890',
        insurance_company: 'כלל ביטוח',
        start_date: '2023-01-01',
        end_date: '2024-01-01',
        claims_count: 1,
        total_claims_amount: 5000
      }],
      risk_score: 85
    };
  }
}
