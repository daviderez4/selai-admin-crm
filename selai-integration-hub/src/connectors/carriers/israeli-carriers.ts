/**
 * SELAI Insurance Integration Hub
 * Israeli Carriers Adapters - חברות הביטוח הישראליות
 * 
 * Adapters לכל חברות הביטוח הגדולות בישראל:
 * כלל, הראל, מגדל, הפניקס, מנורה, איילון, ביטוח ישיר, ליברה, AIG
 */

import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance } from 'axios';
import {
  Policy,
  Claim,
  Quote,
  Commission,
  PolicySchema,
  ClaimSchema,
} from '../../models/canonical.js';
import {
  BaseCarrierAdapter,
  CarrierAdapter,
  IssueRequest,
  IssueResponse,
  EndorsementRequest,
  ClaimRequest,
  ClaimResponse,
  ClaimStatusResponse,
  QuoteRequest,
  QuoteResponse,
  RenewalRequest,
  RenewalResponse,
  ISRAELI_CARRIERS,
} from '../carrier-adapter.js';
import { logger, createModuleLogger } from '../../utils/logger.js';

const log = createModuleLogger('IsraeliCarriers');

// ============================================
// BASE ISRAELI CARRIER ADAPTER
// ============================================

export abstract class BaseIsraeliCarrierAdapter extends BaseCarrierAdapter {
  protected httpClient: AxiosInstance;

  constructor(config: {
    apiUrl: string;
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    timeout?: number;
  }) {
    super(config);
    
    this.httpClient = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
      },
    });
  }

  protected async authenticate(): Promise<string> {
    // Default OAuth2 implementation
    const response = await this.httpClient.post('/oauth/token', {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    return response.data.access_token;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.get('/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// ============================================
// CLAL INSURANCE - כלל ביטוח
// ============================================

export class ClalInsuranceAdapter extends BaseIsraeliCarrierAdapter {
  readonly carrierId = 'clal';
  readonly carrierName = 'Clal Insurance';
  readonly carrierNameHebrew = 'כלל ביטוח';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.CLAL_API_URL || 'https://api.clalbit.co.il',
      clientId: config?.clientId || process.env.CLAL_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.CLAL_CLIENT_SECRET,
    });
  }

  async getPolicies(customerId: string, options?: any): Promise<Policy[]> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.get(`/v1/customers/${customerId}/policies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: options,
      });
      
      return (response.data.policies || []).map((p: any) => this.mapToPolicy(p, customerId));
    } catch (error) {
      log.error('Clal: Failed to get policies', { error, customerId });
      throw error;
    }
  }

  async getPolicy(policyId: string): Promise<Policy | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.get(`/v1/policies/${policyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return this.mapToPolicy(response.data, '');
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getPolicyByNumber(policyNumber: string): Promise<Policy | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.get(`/v1/policies/by-number/${policyNumber}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return this.mapToPolicy(response.data, '');
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async createPolicy(issueRequest: IssueRequest): Promise<IssueResponse> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.post('/v1/policies', issueRequest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      return {
        success: true,
        policy_number: response.data.policy_number,
        policy_id: response.data.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        error_code: error.response?.data?.code,
      };
    }
  }

  async updatePolicy(endorsement: EndorsementRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      await this.httpClient.patch(`/v1/policies/${endorsement.policy_id}`, endorsement, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async cancelPolicy(policyId: string, reason: string, effectiveDate?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      await this.httpClient.post(`/v1/policies/${policyId}/cancel`, {
        reason,
        effective_date: effectiveDate || new Date().toISOString(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async renewPolicy(renewal: RenewalRequest): Promise<RenewalResponse> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.post(`/v1/policies/${renewal.policy_id}/renew`, renewal, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        success: true,
        new_policy_number: response.data.new_policy_number,
        new_premium: response.data.premium,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getClaims(customerId: string, options?: any): Promise<Claim[]> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.get(`/v1/customers/${customerId}/claims`, {
        headers: { Authorization: `Bearer ${token}` },
        params: options,
      });
      return (response.data.claims || []).map((c: any) => this.mapToClaim(c));
    } catch (error) {
      log.error('Clal: Failed to get claims', { error, customerId });
      throw error;
    }
  }

  async getClaim(claimId: string): Promise<Claim | null> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.get(`/v1/claims/${claimId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return this.mapToClaim(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async submitClaim(claimRequest: ClaimRequest): Promise<ClaimResponse> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.post('/v1/claims', claimRequest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        success: true,
        claim_number: response.data.claim_number,
        claim_id: response.data.id,
        status: response.data.status,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getClaimStatus(claimId: string): Promise<ClaimStatusResponse> {
    const claim = await this.getClaim(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }
    return {
      claim_id: claim.id,
      claim_number: claim.claim_number,
      status: claim.status,
      status_date: claim.updated_at,
      approved_amount: claim.approved_amount,
      paid_amount: claim.paid_amount,
    };
  }

  async updateClaim(claimId: string, updates: Partial<ClaimRequest>): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      await this.httpClient.patch(`/v1/claims/${claimId}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
    try {
      const token = await this.getAccessToken();
      const response = await this.httpClient.post('/v1/quotes', quoteRequest, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        success: true,
        quote_id: response.data.id,
        premium: {
          amount: response.data.premium,
          frequency: 'monthly',
        },
        coverage: {
          primary: response.data.coverage_amount,
        },
        valid_until: response.data.valid_until,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Mapping functions
  private mapToPolicy(raw: any, customerId: string): Policy {
    const now = new Date().toISOString();
    return PolicySchema.parse({
      id: raw.id || uuidv4(),
      policy_number: raw.policy_number || raw.policyNumber,
      external_id: raw.external_id,
      customer_id: customerId || raw.customer_id,
      insurance_type: this.mapInsuranceType(raw.product_type || raw.type),
      insurance_company: this.carrierNameHebrew,
      insurance_company_code: ISRAELI_CARRIERS.CLAL.code,
      start_date: raw.start_date || raw.startDate,
      end_date: raw.end_date || raw.endDate,
      status: this.mapStatus(raw.status),
      coverage: {
        primary_coverage: raw.coverage_amount || raw.coverageAmount || 0,
      },
      premium: {
        amount: raw.premium || raw.premiumAmount || 0,
        currency: 'ILS',
        frequency: raw.payment_frequency || 'monthly',
      },
      created_at: raw.created_at || now,
      updated_at: raw.updated_at || now,
      source_system: 'clal',
      raw_data: raw,
    });
  }

  private mapToClaim(raw: any): Claim {
    const now = new Date().toISOString();
    return ClaimSchema.parse({
      id: raw.id || uuidv4(),
      claim_number: raw.claim_number || raw.claimNumber,
      external_id: raw.external_id,
      policy_id: raw.policy_id || raw.policyId,
      customer_id: raw.customer_id || raw.customerId,
      type: raw.type || raw.claim_type,
      description: raw.description,
      incident_date: raw.incident_date || raw.incidentDate,
      reported_date: raw.reported_date || raw.reportedDate || now,
      claimed_amount: raw.claimed_amount || raw.claimedAmount || 0,
      approved_amount: raw.approved_amount,
      paid_amount: raw.paid_amount,
      currency: 'ILS',
      status: this.mapClaimStatus(raw.status),
      created_at: raw.created_at || now,
      updated_at: raw.updated_at || now,
      source_system: 'clal',
      raw_data: raw,
    });
  }

  private mapInsuranceType(type: string): string {
    const typeMap: Record<string, string> = {
      'CAR': 'car',
      'HOME': 'home',
      'HEALTH': 'health',
      'LIFE': 'life',
      'TRAVEL': 'travel',
      'BUSINESS': 'business',
      'PENSION': 'pension',
    };
    return typeMap[type?.toUpperCase()] || 'other';
  }

  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'ACTIVE': 'active',
      'PENDING': 'pending',
      'EXPIRED': 'expired',
      'CANCELLED': 'cancelled',
    };
    return statusMap[status?.toUpperCase()] || 'active';
  }

  private mapClaimStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'OPEN': 'submitted',
      'IN_PROGRESS': 'under_review',
      'APPROVED': 'approved',
      'REJECTED': 'rejected',
      'PAID': 'paid',
      'CLOSED': 'closed',
    };
    return statusMap[status?.toUpperCase()] || 'submitted';
  }
}

// ============================================
// HAREL INSURANCE - הראל ביטוח
// ============================================

export class HarelInsuranceAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'harel';
  readonly carrierName = 'Harel Insurance';
  readonly carrierNameHebrew = 'הראל ביטוח';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.HAREL_API_URL || 'https://api.harel-ins.co.il',
      clientId: config?.clientId || process.env.HAREL_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.HAREL_CLIENT_SECRET,
    });
  }
}

// ============================================
// MIGDAL INSURANCE - מגדל ביטוח
// ============================================

export class MigdalInsuranceAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'migdal';
  readonly carrierName = 'Migdal Insurance';
  readonly carrierNameHebrew = 'מגדל ביטוח';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.MIGDAL_API_URL || 'https://api.migdal.co.il',
      clientId: config?.clientId || process.env.MIGDAL_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.MIGDAL_CLIENT_SECRET,
    });
  }
}

// ============================================
// PHOENIX INSURANCE - הפניקס
// ============================================

export class PhoenixInsuranceAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'phoenix';
  readonly carrierName = 'The Phoenix';
  readonly carrierNameHebrew = 'הפניקס';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.PHOENIX_API_URL || 'https://api.fnx.co.il',
      clientId: config?.clientId || process.env.PHOENIX_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.PHOENIX_CLIENT_SECRET,
    });
  }
}

// ============================================
// MENORA INSURANCE - מנורה מבטחים
// ============================================

export class MenoraInsuranceAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'menora';
  readonly carrierName = 'Menora Mivtachim';
  readonly carrierNameHebrew = 'מנורה מבטחים';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.MENORA_API_URL || 'https://api.menoramivt.co.il',
      clientId: config?.clientId || process.env.MENORA_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.MENORA_CLIENT_SECRET,
    });
  }
}

// ============================================
// AYALON INSURANCE - איילון ביטוח
// ============================================

export class AyalonInsuranceAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'ayalon';
  readonly carrierName = 'Ayalon Insurance';
  readonly carrierNameHebrew = 'איילון ביטוח';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.AYALON_API_URL || 'https://api.ayalon-ins.co.il',
      clientId: config?.clientId || process.env.AYALON_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.AYALON_CLIENT_SECRET,
    });
  }
}

// ============================================
// BITUACH YASHIR - ביטוח ישיר
// ============================================

export class BituachYashirAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'bituach_yashir';
  readonly carrierName = 'Bituach Yashir';
  readonly carrierNameHebrew = 'ביטוח ישיר';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.BITUACH_YASHIR_API_URL || 'https://api.bituachyashir.co.il',
      clientId: config?.clientId || process.env.BITUACH_YASHIR_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.BITUACH_YASHIR_CLIENT_SECRET,
    });
  }
}

// ============================================
// LIBRA INSURANCE - ליברה
// ============================================

export class LibraInsuranceAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'libra';
  readonly carrierName = 'Libra Insurance';
  readonly carrierNameHebrew = 'ליברה';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.LIBRA_API_URL || 'https://api.libra.co.il',
      clientId: config?.clientId || process.env.LIBRA_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.LIBRA_CLIENT_SECRET,
    });
  }
}

// ============================================
// AIG ISRAEL
// ============================================

export class AIGIsraelAdapter extends ClalInsuranceAdapter {
  readonly carrierId = 'aig';
  readonly carrierName = 'AIG Israel';
  readonly carrierNameHebrew = 'AIG ישראל';

  constructor(config?: Partial<{ apiUrl: string; clientId: string; clientSecret: string }>) {
    super({
      apiUrl: config?.apiUrl || process.env.AIG_API_URL || 'https://api.aig.co.il',
      clientId: config?.clientId || process.env.AIG_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.AIG_CLIENT_SECRET,
    });
  }
}

// ============================================
// MOCK CARRIER ADAPTER (for testing)
// ============================================

export class MockCarrierAdapter implements CarrierAdapter {
  readonly carrierId: string;
  readonly carrierName: string;
  readonly carrierNameHebrew: string;

  private mockPolicies: Map<string, Policy[]> = new Map();
  private mockClaims: Map<string, Claim[]> = new Map();

  constructor(carrierInfo: { id: string; name: string; nameHebrew: string }) {
    this.carrierId = carrierInfo.id;
    this.carrierName = carrierInfo.name;
    this.carrierNameHebrew = carrierInfo.nameHebrew;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async getPolicies(customerId: string): Promise<Policy[]> {
    // Return mock data
    return this.mockPolicies.get(customerId) || this.generateMockPolicies(customerId);
  }

  async getPolicy(policyId: string): Promise<Policy | null> {
    for (const policies of this.mockPolicies.values()) {
      const found = policies.find(p => p.id === policyId);
      if (found) return found;
    }
    return null;
  }

  async getPolicyByNumber(policyNumber: string): Promise<Policy | null> {
    for (const policies of this.mockPolicies.values()) {
      const found = policies.find(p => p.policy_number === policyNumber);
      if (found) return found;
    }
    return null;
  }

  async createPolicy(issueRequest: IssueRequest): Promise<IssueResponse> {
    const policyNumber = `POL-${this.carrierId.toUpperCase()}-${Date.now()}`;
    return {
      success: true,
      policy_number: policyNumber,
      policy_id: uuidv4(),
    };
  }

  async updatePolicy(endorsement: EndorsementRequest): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async cancelPolicy(policyId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async renewPolicy(renewal: RenewalRequest): Promise<RenewalResponse> {
    return {
      success: true,
      new_policy_number: `POL-${this.carrierId.toUpperCase()}-${Date.now()}`,
      new_premium: 3500,
    };
  }

  async getClaims(customerId: string): Promise<Claim[]> {
    return this.mockClaims.get(customerId) || [];
  }

  async getClaim(claimId: string): Promise<Claim | null> {
    for (const claims of this.mockClaims.values()) {
      const found = claims.find(c => c.id === claimId);
      if (found) return found;
    }
    return null;
  }

  async submitClaim(claimRequest: ClaimRequest): Promise<ClaimResponse> {
    return {
      success: true,
      claim_number: `CLM-${Date.now()}`,
      claim_id: uuidv4(),
      status: 'submitted',
    };
  }

  async getClaimStatus(claimId: string): Promise<ClaimStatusResponse> {
    return {
      claim_id: claimId,
      claim_number: `CLM-${claimId.slice(0, 8)}`,
      status: 'under_review',
      status_date: new Date().toISOString(),
    };
  }

  async updateClaim(claimId: string, updates: Partial<ClaimRequest>): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async getQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse> {
    // Generate random premium based on coverage
    const basePremium = Math.floor(Math.random() * 500) + 200;
    return {
      success: true,
      quote_id: uuidv4(),
      premium: {
        amount: basePremium,
        frequency: 'monthly',
      },
      coverage: {
        primary: quoteRequest.coverage.amount,
      },
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private generateMockPolicies(customerId: string): Policy[] {
    const now = new Date().toISOString();
    const policies: Policy[] = [
      {
        id: uuidv4(),
        policy_number: `${this.carrierId.toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        customer_id: customerId,
        insurance_type: 'car',
        insurance_company: this.carrierNameHebrew,
        insurance_company_code: '01',
        start_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        premium: {
          amount: 2800,
          currency: 'ILS',
          frequency: 'annual',
        },
        created_at: now,
        updated_at: now,
        source_system: this.carrierId,
      },
    ];
    
    this.mockPolicies.set(customerId, policies);
    return policies;
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createCarrierAdapter(carrierId: string): CarrierAdapter {
  switch (carrierId.toLowerCase()) {
    case 'clal':
      return new ClalInsuranceAdapter();
    case 'harel':
      return new HarelInsuranceAdapter();
    case 'migdal':
      return new MigdalInsuranceAdapter();
    case 'phoenix':
      return new PhoenixInsuranceAdapter();
    case 'menora':
      return new MenoraInsuranceAdapter();
    case 'ayalon':
      return new AyalonInsuranceAdapter();
    case 'bituach_yashir':
      return new BituachYashirAdapter();
    case 'libra':
      return new LibraInsuranceAdapter();
    case 'aig':
      return new AIGIsraelAdapter();
    default:
      throw new Error(`Unknown carrier: ${carrierId}`);
  }
}

export function createMockCarrierAdapter(carrierId: string): CarrierAdapter {
  const carrierInfo = Object.values(ISRAELI_CARRIERS).find(c => c.id === carrierId);
  if (!carrierInfo) {
    throw new Error(`Unknown carrier: ${carrierId}`);
  }
  return new MockCarrierAdapter({
    id: carrierInfo.id,
    name: carrierInfo.name,
    nameHebrew: carrierInfo.nameHebrew,
  });
}

export function createAllMockCarriers(): Map<string, CarrierAdapter> {
  const carriers = new Map<string, CarrierAdapter>();
  for (const carrier of Object.values(ISRAELI_CARRIERS)) {
    carriers.set(carrier.id, new MockCarrierAdapter({
      id: carrier.id,
      name: carrier.name,
      nameHebrew: carrier.nameHebrew,
    }));
  }
  return carriers;
}
