/**
 * SELAI Insurance Integration Hub
 * Carrier Adapter Interface - ממשק סטנדרטי לכל חברות הביטוח
 */

import type { Policy, Claim, Quote, Customer, Product, Commission, Payment } from '../models/canonical.js';

// ============================================
// TYPES - Request/Response Types
// ============================================

export interface IssueRequest {
  customer_id: string;
  product_id: string;
  quote_id?: string;
  coverage: {
    primary_amount: number;
    additional_coverage?: Record<string, number>;
    deductible?: number;
  };
  start_date: string;
  end_date: string;
  payment_method: 'bank_transfer' | 'credit_card' | 'direct_debit';
  bank_details?: {
    bank_code: string;
    branch_code: string;
    account_number: string;
  };
  additional_data?: Record<string, any>;
}

export interface IssueResponse {
  success: boolean;
  policy_number?: string;
  policy_id?: string;
  error?: string;
  error_code?: string;
  raw_response?: any;
}

export interface EndorsementRequest {
  policy_id: string;
  policy_number: string;
  change_type: 'coverage_increase' | 'coverage_decrease' | 'beneficiary_change' | 'address_change' | 'other';
  effective_date: string;
  changes: Record<string, any>;
  reason?: string;
}

export interface ClaimRequest {
  policy_id: string;
  policy_number: string;
  incident_date: string;
  incident_description: string;
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
  additional_data?: Record<string, any>;
}

export interface ClaimResponse {
  success: boolean;
  claim_number?: string;
  claim_id?: string;
  status?: string;
  error?: string;
  error_code?: string;
  raw_response?: any;
}

export interface ClaimStatusResponse {
  claim_id: string;
  claim_number: string;
  status: string;
  status_date: string;
  approved_amount?: number;
  paid_amount?: number;
  decision_reason?: string;
  next_steps?: string[];
  raw_response?: any;
}

export interface QuoteRequest {
  product_id?: string;
  insurance_type: string;
  customer_data: {
    id_number: string;
    birth_date?: string;
    gender?: string;
    occupation?: string;
  };
  coverage: {
    amount: number;
    deductible?: number;
  };
  start_date: string;
  additional_data?: Record<string, any>;
}

export interface QuoteResponse {
  success: boolean;
  quote_id?: string;
  premium?: {
    amount: number;
    frequency: string;
    breakdown?: Record<string, number>;
  };
  coverage?: {
    primary: number;
    additional?: Record<string, number>;
  };
  valid_until?: string;
  error?: string;
  error_code?: string;
  raw_response?: any;
}

export interface RenewalRequest {
  policy_id: string;
  policy_number: string;
  changes?: Record<string, any>;
  new_end_date?: string;
}

export interface RenewalResponse {
  success: boolean;
  new_policy_number?: string;
  new_premium?: number;
  error?: string;
  raw_response?: any;
}

// ============================================
// CARRIER ADAPTER INTERFACE
// ============================================

/**
 * ממשק סטנדרטי לכל חברות הביטוח
 * כל connector חייב לממש את הממשק הזה
 */
export interface CarrierAdapter {
  // מזהה הגוף
  readonly carrierId: string;
  readonly carrierName: string;
  readonly carrierNameHebrew: string;
  
  // בדיקת חיבור
  healthCheck(): Promise<boolean>;
  
  // ============================================
  // POLICIES - פוליסות
  // ============================================
  
  /**
   * קבלת כל הפוליסות של לקוח
   */
  getPolicies(customerId: string, options?: {
    status?: string[];
    insurance_type?: string[];
    from_date?: string;
    to_date?: string;
  }): Promise<Policy[]>;
  
  /**
   * קבלת פוליסה בודדת
   */
  getPolicy(policyId: string): Promise<Policy | null>;
  
  /**
   * קבלת פוליסה לפי מספר פוליסה
   */
  getPolicyByNumber(policyNumber: string): Promise<Policy | null>;
  
  /**
   * יצירת פוליסה חדשה
   */
  createPolicy(issueRequest: IssueRequest): Promise<IssueResponse>;
  
  /**
   * עדכון פוליסה (endorsement)
   */
  updatePolicy(endorsement: EndorsementRequest): Promise<{ success: boolean; error?: string }>;
  
  /**
   * ביטול פוליסה
   */
  cancelPolicy(policyId: string, reason: string, effectiveDate?: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * חידוש פוליסה
   */
  renewPolicy(renewal: RenewalRequest): Promise<RenewalResponse>;
  
  // ============================================
  // CLAIMS - תביעות
  // ============================================
  
  /**
   * קבלת תביעות של לקוח
   */
  getClaims(customerId: string, options?: {
    status?: string[];
    from_date?: string;
    to_date?: string;
  }): Promise<Claim[]>;
  
  /**
   * קבלת תביעה בודדת
   */
  getClaim(claimId: string): Promise<Claim | null>;
  
  /**
   * הגשת תביעה חדשה (FNOL)
   */
  submitClaim(claimRequest: ClaimRequest): Promise<ClaimResponse>;
  
  /**
   * קבלת סטטוס תביעה
   */
  getClaimStatus(claimId: string): Promise<ClaimStatusResponse>;
  
  /**
   * עדכון תביעה (הוספת מסמכים וכו')
   */
  updateClaim(claimId: string, updates: Partial<ClaimRequest>): Promise<{ success: boolean; error?: string }>;
  
  // ============================================
  // QUOTES - הצעות מחיר
  // ============================================
  
  /**
   * קבלת הצעת מחיר
   */
  getQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse>;
  
  /**
   * קבלת הצעות מחיר מרובות (לכמה מוצרים)
   */
  getQuotes?(quoteRequest: QuoteRequest): Promise<QuoteResponse[]>;
  
  // ============================================
  // PRODUCTS - מוצרים
  // ============================================
  
  /**
   * קבלת רשימת מוצרים זמינים
   */
  getProducts?(options?: {
    insurance_type?: string[];
    is_active?: boolean;
  }): Promise<Product[]>;
  
  /**
   * קבלת פרטי מוצר
   */
  getProduct?(productId: string): Promise<Product | null>;
  
  // ============================================
  // COMMISSIONS - עמלות
  // ============================================
  
  /**
   * קבלת עמלות לפי סוכן
   */
  getCommissions?(agentId: string, options?: {
    from_date?: string;
    to_date?: string;
    policy_id?: string;
  }): Promise<Commission[]>;
  
  // ============================================
  // PAYMENTS - תשלומים
  // ============================================
  
  /**
   * קבלת היסטוריית תשלומים
   */
  getPayments?(customerId: string, options?: {
    policy_id?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<Payment[]>;
  
  // ============================================
  // DOCUMENTS - מסמכים
  // ============================================
  
  /**
   * הורדת מסמך
   */
  downloadDocument?(documentId: string): Promise<{
    content: Buffer;
    mime_type: string;
    filename: string;
  } | null>;
  
  /**
   * העלאת מסמך
   */
  uploadDocument?(data: {
    policy_id?: string;
    claim_id?: string;
    type: string;
    name: string;
    content: Buffer;
    mime_type: string;
  }): Promise<{ document_id?: string; success: boolean; error?: string }>;
}

// ============================================
// ABSTRACT BASE ADAPTER
// ============================================

/**
 * מחלקת בסיס אבסטרקטית לכל ה-adapters
 * מספקת פונקציונליות משותפת
 */
export abstract class BaseCarrierAdapter implements CarrierAdapter {
  abstract readonly carrierId: string;
  abstract readonly carrierName: string;
  abstract readonly carrierNameHebrew: string;
  
  protected apiUrl: string;
  protected apiKey?: string;
  protected clientId?: string;
  protected clientSecret?: string;
  protected accessToken?: string;
  protected tokenExpiry?: Date;
  
  constructor(config: {
    apiUrl: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }
  
  /**
   * אימות והשגת טוקן גישה
   */
  protected abstract authenticate(): Promise<string>;
  
  /**
   * בדיקה אם הטוקן בתוקף
   */
  protected isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiry) return false;
    return this.tokenExpiry > new Date();
  }
  
  /**
   * קבלת טוקן (מה-cache או חדש)
   */
  protected async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.accessToken!;
    }
    this.accessToken = await this.authenticate();
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes
    return this.accessToken;
  }
  
  // מתודות אבסטרקטיות שכל adapter חייב לממש
  abstract healthCheck(): Promise<boolean>;
  abstract getPolicies(customerId: string, options?: any): Promise<Policy[]>;
  abstract getPolicy(policyId: string): Promise<Policy | null>;
  abstract getPolicyByNumber(policyNumber: string): Promise<Policy | null>;
  abstract createPolicy(issueRequest: IssueRequest): Promise<IssueResponse>;
  abstract updatePolicy(endorsement: EndorsementRequest): Promise<{ success: boolean; error?: string }>;
  abstract cancelPolicy(policyId: string, reason: string, effectiveDate?: string): Promise<{ success: boolean; error?: string }>;
  abstract renewPolicy(renewal: RenewalRequest): Promise<RenewalResponse>;
  abstract getClaims(customerId: string, options?: any): Promise<Claim[]>;
  abstract getClaim(claimId: string): Promise<Claim | null>;
  abstract submitClaim(claimRequest: ClaimRequest): Promise<ClaimResponse>;
  abstract getClaimStatus(claimId: string): Promise<ClaimStatusResponse>;
  abstract updateClaim(claimId: string, updates: Partial<ClaimRequest>): Promise<{ success: boolean; error?: string }>;
  abstract getQuote(quoteRequest: QuoteRequest): Promise<QuoteResponse>;
}

// ============================================
// CARRIER REGISTRY
// ============================================

/**
 * רשימת חברות הביטוח בישראל עם קודים
 */
export const ISRAELI_CARRIERS = {
  CLAL: { id: 'clal', name: 'Clal Insurance', nameHebrew: 'כלל ביטוח', code: '01' },
  HAREL: { id: 'harel', name: 'Harel Insurance', nameHebrew: 'הראל ביטוח', code: '02' },
  MIGDAL: { id: 'migdal', name: 'Migdal Insurance', nameHebrew: 'מגדל ביטוח', code: '03' },
  PHOENIX: { id: 'phoenix', name: 'The Phoenix', nameHebrew: 'הפניקס', code: '04' },
  MENORA: { id: 'menora', name: 'Menora Mivtachim', nameHebrew: 'מנורה מבטחים', code: '05' },
  AYALON: { id: 'ayalon', name: 'Ayalon Insurance', nameHebrew: 'איילון ביטוח', code: '06' },
  BITUACH_YASHIR: { id: 'bituach_yashir', name: 'Bituach Yashir', nameHebrew: 'ביטוח ישיר', code: '07' },
  LIBRA: { id: 'libra', name: 'Libra Insurance', nameHebrew: 'ליברה', code: '08' },
  AIG: { id: 'aig', name: 'AIG Israel', nameHebrew: 'AIG ישראל', code: '09' },
  SHLOMO: { id: 'shlomo', name: 'Shlomo Insurance', nameHebrew: 'שלמה ביטוח', code: '10' },
  DIKLA: { id: 'dikla', name: 'Dikla Insurance', nameHebrew: 'דיקלה ביטוח', code: '11' },
  PASSPORTCARD: { id: 'passportcard', name: 'PassportCard', nameHebrew: 'פספורטכארד', code: '12' },
  ALTSHULER: { id: 'altshuler', name: 'Altshuler Shaham', nameHebrew: 'אלטשולר שחם', code: '13' },
  MORE: { id: 'more', name: 'More Investment House', nameHebrew: 'מור בית השקעות', code: '14' }
} as const;

export type CarrierId = keyof typeof ISRAELI_CARRIERS;
