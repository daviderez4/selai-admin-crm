/**
 * SELAI Insurance Integration Hub
 * Integration Service - מרכז האינטגרציות
 * 
 * שירות מרכזי שמתאם בין כל ה-connectors ומספק API אחיד
 */

import { v4 as uuidv4 } from 'uuid';
import { logger, createModuleLogger } from '../utils/logger.js';
import {
  Policy,
  PensionAccount,
  Claim,
  Customer,
  Quote
} from '../models/canonical.js';
import { HarHabitouachConnector, createHarHabitouachConnector, HarHabitouachMockConnector } from '../connectors/har-habitoach/connector.js';
import { MislakaConnector, createMislakaConnector, MislakaMockConnector } from '../connectors/mislaka/connector.js';
import type { CarrierAdapter, QuoteRequest, QuoteResponse } from '../connectors/carrier-adapter.js';

const log = createModuleLogger('IntegrationService');

// ============================================
// TYPES
// ============================================

export interface IntegrationServiceConfig {
  useMocks?: boolean;
  enabledConnectors?: string[];
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface CustomerDataSummary {
  customer_id: string;
  policies: Policy[];
  pension_accounts: PensionAccount[];
  claims: Claim[];
  total_coverage: number;
  total_premium_annual: number;
  total_pension_balance: number;
  gaps_identified: CoverageGap[];
  risk_score?: number;
}

export interface CoverageGap {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  recommended_coverage?: number;
  estimated_premium?: number;
}

export interface DataSyncResult {
  success: boolean;
  synced_at: string;
  policies_count: number;
  pension_accounts_count: number;
  claims_count: number;
  errors?: string[];
}

// ============================================
// INTEGRATION SERVICE
// ============================================

export class IntegrationService {
  private harHabitouach: HarHabitouachConnector;
  private mislaka: MislakaConnector;
  private carriers: Map<string, CarrierAdapter> = new Map();
  private config: IntegrationServiceConfig;

  constructor(config: IntegrationServiceConfig = {}) {
    this.config = config;
    
    // Initialize connectors
    if (config.useMocks) {
      log.info('Initializing with mock connectors');
      this.harHabitouach = new HarHabitouachMockConnector();
      this.mislaka = new MislakaMockConnector();
    } else {
      this.harHabitouach = createHarHabitouachConnector();
      this.mislaka = createMislakaConnector();
    }
    
    log.info('IntegrationService initialized');
  }

  /**
   * בדיקת תקינות כל החיבורים
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      results['har_habitouach'] = await this.harHabitouach.healthCheck();
    } catch (error) {
      results['har_habitouach'] = false;
      log.error('Har HaBitouach health check failed', { error });
    }

    try {
      results['mislaka'] = await this.mislaka.healthCheck();
    } catch (error) {
      results['mislaka'] = false;
      log.error('Mislaka health check failed', { error });
    }

    // Check registered carriers
    for (const [id, carrier] of this.carriers) {
      try {
        results[id] = await carrier.healthCheck();
      } catch (error) {
        results[id] = false;
        log.error(`Carrier ${id} health check failed`, { error });
      }
    }

    return results;
  }

  // ============================================
  // CUSTOMER 360 - תצוגה מלאה של לקוח
  // ============================================

  /**
   * קבלת כל הנתונים של לקוח מכל המקורות
   */
  async getCustomer360(customerId: string, idNumber: string): Promise<CustomerDataSummary> {
    log.info('Fetching Customer 360 data', { customerId, idNumber });
    
    const results: CustomerDataSummary = {
      customer_id: customerId,
      policies: [],
      pension_accounts: [],
      claims: [],
      total_coverage: 0,
      total_premium_annual: 0,
      total_pension_balance: 0,
      gaps_identified: []
    };

    // Fetch vehicle insurance from Har HaBitouach
    try {
      const vehiclePolicies = await this.harHabitouach.getPoliciesByOwnerId(idNumber);
      results.policies.push(...vehiclePolicies);
      log.info('Fetched vehicle policies', { count: vehiclePolicies.length });
    } catch (error) {
      log.error('Failed to fetch vehicle policies', { error, idNumber });
    }

    // Fetch pension data from Mislaka
    try {
      const pensionAccounts = await this.mislaka.getPensionAccounts(idNumber);
      results.pension_accounts.push(...pensionAccounts);
      log.info('Fetched pension accounts', { count: pensionAccounts.length });
    } catch (error) {
      log.error('Failed to fetch pension accounts', { error, idNumber });
    }

    // Calculate totals
    results.total_coverage = results.policies.reduce((sum, p) => {
      return sum + (p.coverage?.primary_coverage || 0);
    }, 0);

    results.total_premium_annual = results.policies.reduce((sum, p) => {
      let premium = p.premium.amount;
      // Convert to annual if needed
      if (p.premium.frequency === 'monthly') premium *= 12;
      else if (p.premium.frequency === 'quarterly') premium *= 4;
      else if (p.premium.frequency === 'semi_annual') premium *= 2;
      return sum + premium;
    }, 0);

    results.total_pension_balance = results.pension_accounts.reduce((sum, a) => {
      return sum + (a.balance.total || 0);
    }, 0);

    // Analyze coverage gaps
    results.gaps_identified = this.analyzeCoverageGaps(results);

    // Get risk score from Har HaBitouach if available
    try {
      const history = await this.harHabitouach.getOwnerHistory(idNumber);
      if (history.length > 0 && history[0].risk_score) {
        results.risk_score = history[0].risk_score;
      }
    } catch (error) {
      log.warn('Failed to get risk score', { error });
    }

    log.info('Customer 360 data complete', { 
      customerId,
      policiesCount: results.policies.length,
      pensionCount: results.pension_accounts.length
    });

    return results;
  }

  /**
   * ניתוח פערי כיסוי
   */
  private analyzeCoverageGaps(data: CustomerDataSummary): CoverageGap[] {
    const gaps: CoverageGap[] = [];
    
    // Check for missing insurance types
    const existingTypes = new Set(data.policies.map(p => p.insurance_type));
    
    // Home insurance check
    if (!existingTypes.has('home')) {
      gaps.push({
        type: 'home_insurance',
        description: 'לא נמצא ביטוח דירה - מומלץ לבדוק',
        priority: 'medium',
        estimated_premium: 1500
      });
    }

    // Life insurance check
    if (!existingTypes.has('life')) {
      gaps.push({
        type: 'life_insurance',
        description: 'לא נמצא ביטוח חיים עצמאי',
        priority: 'high',
        recommended_coverage: 1000000,
        estimated_premium: 200
      });
    }

    // Health insurance check
    if (!existingTypes.has('health')) {
      gaps.push({
        type: 'health_insurance',
        description: 'לא נמצא ביטוח בריאות פרטי',
        priority: 'high',
        estimated_premium: 350
      });
    }

    // Pension coverage adequacy
    if (data.pension_accounts.length > 0) {
      // Check management fees
      for (const account of data.pension_accounts) {
        if (account.management_fees?.savings_fee_percent && 
            account.management_fees.savings_fee_percent > 0.5) {
          gaps.push({
            type: 'high_management_fees',
            description: `דמי ניהול גבוהים בקרן ${account.fund_name} - ${account.management_fees.savings_fee_percent}%`,
            priority: 'medium'
          });
        }
      }

      // Check disability coverage
      const hasDisabilityCoverage = data.pension_accounts.some(
        a => a.insurance_coverage?.disability?.coverage_amount
      );
      if (!hasDisabilityCoverage) {
        gaps.push({
          type: 'disability_coverage',
          description: 'לא נמצא כיסוי נכות בפנסיה',
          priority: 'high'
        });
      }
    }

    // Check vehicle insurance comprehensiveness
    for (const policy of data.policies) {
      if (policy.insurance_type === 'car') {
        const coverageFlags = policy.type_specific_data?.coverage_flags;
        if (coverageFlags && !coverageFlags.comprehensive) {
          gaps.push({
            type: 'comprehensive_vehicle',
            description: 'ביטוח רכב ללא מקיף - מומלץ לשקול שדרוג',
            priority: 'low'
          });
        }
      }
    }

    return gaps;
  }

  // ============================================
  // POLICIES - פוליסות
  // ============================================

  /**
   * קבלת כל הפוליסות של לקוח מכל המקורות
   */
  async getAllPolicies(customerId: string, idNumber: string): Promise<Policy[]> {
    const policies: Policy[] = [];

    // Har HaBitouach
    try {
      const vehiclePolicies = await this.harHabitouach.getPoliciesByOwnerId(idNumber);
      policies.push(...vehiclePolicies);
    } catch (error) {
      log.error('Failed to fetch from Har HaBitouach', { error });
    }

    // Registered carriers
    for (const [id, carrier] of this.carriers) {
      try {
        const carrierPolicies = await carrier.getPolicies(customerId);
        policies.push(...carrierPolicies);
      } catch (error) {
        log.error(`Failed to fetch from carrier ${id}`, { error });
      }
    }

    return policies;
  }

  /**
   * קבלת פוליסות רכב
   */
  async getVehiclePolicies(idNumber: string): Promise<Policy[]> {
    return this.harHabitouach.getPoliciesByOwnerId(idNumber);
  }

  /**
   * קבלת פוליסה לפי מספר רכב
   */
  async getVehiclePoliciesByPlate(vehicleNumber: string): Promise<Policy[]> {
    return this.harHabitouach.getPoliciesByVehicle(vehicleNumber);
  }

  // ============================================
  // PENSION - פנסיה
  // ============================================

  /**
   * קבלת כל החשבונות הפנסיוניים
   */
  async getPensionAccounts(idNumber: string): Promise<PensionAccount[]> {
    return this.mislaka.getPensionAccounts(idNumber);
  }

  /**
   * קבלת חשבון פנסיוני ספציפי
   */
  async getPensionAccount(accountNumber: string): Promise<PensionAccount | null> {
    return this.mislaka.getPensionAccount(accountNumber);
  }

  /**
   * יצירת הסכמה לגישה למסלקה
   */
  async createMislakaConsent(customerId: string, validUntil: string) {
    return this.mislaka.createConsent({
      customer_id: customerId,
      scope: 'all',
      valid_until: validUntil
    });
  }

  // ============================================
  // QUOTES - הצעות מחיר
  // ============================================

  /**
   * קבלת הצעות מחיר מכל הגופים
   */
  async getMultiCarrierQuotes(request: QuoteRequest): Promise<Map<string, QuoteResponse>> {
    const quotes = new Map<string, QuoteResponse>();

    for (const [id, carrier] of this.carriers) {
      try {
        const quote = await carrier.getQuote(request);
        quotes.set(id, quote);
      } catch (error) {
        log.error(`Failed to get quote from ${id}`, { error });
        quotes.set(id, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return quotes;
  }

  // ============================================
  // CARRIERS MANAGEMENT
  // ============================================

  /**
   * רישום carrier adapter
   */
  registerCarrier(carrier: CarrierAdapter): void {
    this.carriers.set(carrier.carrierId, carrier);
    log.info('Carrier registered', { 
      carrierId: carrier.carrierId, 
      carrierName: carrier.carrierName 
    });
  }

  /**
   * הסרת carrier adapter
   */
  unregisterCarrier(carrierId: string): void {
    this.carriers.delete(carrierId);
    log.info('Carrier unregistered', { carrierId });
  }

  /**
   * קבלת רשימת carriers רשומים
   */
  getRegisteredCarriers(): string[] {
    return Array.from(this.carriers.keys());
  }

  // ============================================
  // DATA SYNC - סנכרון נתונים
  // ============================================

  /**
   * סנכרון מלא של נתוני לקוח ל-SELAI
   */
  async syncCustomerData(customerId: string, idNumber: string): Promise<DataSyncResult> {
    const syncStartTime = new Date();
    const errors: string[] = [];
    
    let policiesCount = 0;
    let pensionCount = 0;
    let claimsCount = 0;

    try {
      // Fetch all data
      const data = await this.getCustomer360(customerId, idNumber);
      
      policiesCount = data.policies.length;
      pensionCount = data.pension_accounts.length;
      claimsCount = data.claims.length;

      // TODO: Sync to Supabase
      // This is where you would insert/update the data in your Supabase tables
      // For now, we'll just log the counts

      log.info('Data sync completed', {
        customerId,
        policiesCount,
        pensionCount,
        claimsCount,
        duration: Date.now() - syncStartTime.getTime()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      log.error('Data sync failed', { error, customerId });
    }

    return {
      success: errors.length === 0,
      synced_at: new Date().toISOString(),
      policies_count: policiesCount,
      pension_accounts_count: pensionCount,
      claims_count: claimsCount,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

let instance: IntegrationService | null = null;

export function getIntegrationService(config?: IntegrationServiceConfig): IntegrationService {
  if (!instance) {
    instance = new IntegrationService(config);
  }
  return instance;
}

export function resetIntegrationService(): void {
  instance = null;
}
