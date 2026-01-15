/**
 * SELAI Insurance Integration Hub
 * Canonical Models - Core Data Types
 * 
 * מודלים קנוניים למידע ביטוחי - סטנדרטיזציה של נתונים מכל הגופים
 */

import { z } from 'zod';

// ============================================
// ENUMS - קבועים
// ============================================

export const PolicyStatus = z.enum([
  'active',      // פעיל
  'pending',     // ממתין לאישור
  'expired',     // פג תוקף
  'cancelled',   // בוטל
  'suspended',   // מושעה
  'renewed'      // חודש
]);

export const InsuranceType = z.enum([
  // ביטוח כללי
  'car',                    // ביטוח רכב
  'home',                   // ביטוח דירה
  'health',                 // ביטוח בריאות
  'life',                   // ביטוח חיים
  'travel',                 // ביטוח נסיעות
  'business',               // ביטוח עסקי
  'liability',              // ביטוח אחריות
  'accident',               // ביטוח תאונות
  
  // מוצרים פנסיוניים
  'pension',                // פנסיה
  'provident_fund',         // קרן השתלמות
  'severance_fund',         // קופת פיצויים
  'education_fund',         // קרן חינוך
  'investment_gemel',       // גמל להשקעה
  
  // ביטוח מנהלים
  'managers_insurance',     // ביטוח מנהלים
  
  // אחר
  'other'
]);

export const ClaimStatus = z.enum([
  'submitted',              // הוגש
  'under_review',           // בבדיקה
  'approved',               // אושר
  'rejected',               // נדחה
  'partial_approved',       // אושר חלקית
  'paid',                   // שולם
  'closed'                  // סגור
]);

export const PaymentFrequency = z.enum([
  'monthly',                // חודשי
  'quarterly',              // רבעוני
  'semi_annual',            // חצי שנתי
  'annual',                 // שנתי
  'one_time'                // חד פעמי
]);

export const Gender = z.enum(['male', 'female', 'other']);

export const MaritalStatus = z.enum([
  'single',                 // רווק
  'married',                // נשוי
  'divorced',               // גרוש
  'widowed',                // אלמן
  'separated'               // פרוד
]);

// ============================================
// BASE SCHEMAS - סכמות בסיס
// ============================================

/**
 * כתובת
 */
export const AddressSchema = z.object({
  street: z.string().optional(),
  house_number: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string(),
  zip_code: z.string().optional(),
  country: z.string().default('IL'),
  full_address: z.string().optional()
});

/**
 * פרטי בנק
 */
export const BankDetailsSchema = z.object({
  bank_code: z.string(),
  branch_code: z.string(),
  account_number: z.string(),
  account_holder: z.string().optional(),
  iban: z.string().optional()
});

/**
 * מסמך
 */
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['policy', 'claim', 'id_card', 'medical', 'contract', 'other']),
  name: z.string(),
  url: z.string().url().optional(),
  file_path: z.string().optional(),
  mime_type: z.string().optional(),
  size_bytes: z.number().optional(),
  uploaded_at: z.string().datetime(),
  source: z.string().optional()
});

// ============================================
// CUSTOMER - לקוח
// ============================================

export const CustomerSchema = z.object({
  // מזהים
  id: z.string().uuid(),
  external_ids: z.record(z.string()).optional(), // מזהים ממערכות חיצוניות
  
  // פרטי זיהוי
  id_number: z.string().regex(/^\d{9}$/, 'תעודת זהות חייבת להכיל 9 ספרות'),
  id_type: z.enum(['id_card', 'passport', 'company_id']).default('id_card'),
  
  // פרטים אישיים
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string().optional(),
  birth_date: z.string().datetime().optional(),
  gender: Gender.optional(),
  marital_status: MaritalStatus.optional(),
  
  // פרטי קשר
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: AddressSchema.optional(),
  
  // פרטים מקצועיים
  occupation: z.string().optional(),
  employer: z.string().optional(),
  employment_type: z.enum(['employee', 'self_employed', 'business_owner', 'retired', 'other']).optional(),
  
  // פרטי בנק
  bank_details: BankDetailsSchema.optional(),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source_system: z.string().optional(),
  tenant_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional()
});

// ============================================
// POLICY - פוליסה
// ============================================

export const PolicySchema = z.object({
  // מזהים
  id: z.string().uuid(),
  policy_number: z.string(),
  external_id: z.string().optional(),
  
  // קשרים
  customer_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  
  // פרטי הפוליסה
  insurance_type: InsuranceType,
  insurance_company: z.string(),
  insurance_company_code: z.string().optional(),
  
  // תאריכים
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  issue_date: z.string().datetime().optional(),
  
  // סטטוס
  status: PolicyStatus,
  
  // כיסויים ופרמיה
  coverage: z.object({
    primary_coverage: z.number().optional(),
    secondary_coverage: z.record(z.number()).optional(),
    deductible: z.number().optional(),
    limits: z.record(z.number()).optional()
  }).optional(),
  
  premium: z.object({
    amount: z.number(),
    currency: z.string().default('ILS'),
    frequency: PaymentFrequency,
    payment_method: z.enum(['bank_transfer', 'credit_card', 'direct_debit']).optional(),
    next_payment_date: z.string().datetime().optional()
  }),
  
  // מוטבים
  beneficiaries: z.array(z.object({
    name: z.string(),
    id_number: z.string().optional(),
    relationship: z.string().optional(),
    percentage: z.number().min(0).max(100)
  })).optional(),
  
  // מסמכים
  documents: z.array(DocumentSchema).optional(),
  
  // נתונים נוספים ספציפיים לסוג הביטוח
  type_specific_data: z.record(z.any()).optional(),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source_system: z.string(),
  raw_data: z.record(z.any()).optional(),
  tenant_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional()
});

// ============================================
// PRODUCT - מוצר ביטוחי
// ============================================

export const ProductSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  name_hebrew: z.string().optional(),
  description: z.string().optional(),
  
  insurance_type: InsuranceType,
  insurance_company: z.string(),
  insurance_company_code: z.string().optional(),
  
  // פרטי המוצר
  min_age: z.number().optional(),
  max_age: z.number().optional(),
  min_coverage: z.number().optional(),
  max_coverage: z.number().optional(),
  
  // תנאים
  terms: z.record(z.any()).optional(),
  exclusions: z.array(z.string()).optional(),
  
  // עמלות
  commission_rate: z.number().min(0).max(100).optional(),
  commission_type: z.enum(['percentage', 'fixed']).optional(),
  
  // סטטוס
  is_active: z.boolean().default(true),
  
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================
// CLAIM - תביעה
// ============================================

export const ClaimSchema = z.object({
  // מזהים
  id: z.string().uuid(),
  claim_number: z.string(),
  external_id: z.string().optional(),
  
  // קשרים
  policy_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  
  // פרטי התביעה
  type: z.string(),
  description: z.string().optional(),
  incident_date: z.string().datetime(),
  reported_date: z.string().datetime(),
  
  // סכומים
  claimed_amount: z.number(),
  approved_amount: z.number().optional(),
  paid_amount: z.number().optional(),
  currency: z.string().default('ILS'),
  
  // סטטוס
  status: ClaimStatus,
  status_history: z.array(z.object({
    status: ClaimStatus,
    date: z.string().datetime(),
    notes: z.string().optional()
  })).optional(),
  
  // מסמכים
  documents: z.array(DocumentSchema).optional(),
  
  // החלטה
  decision: z.object({
    decision_date: z.string().datetime().optional(),
    decision_reason: z.string().optional(),
    reviewer: z.string().optional()
  }).optional(),
  
  // תשלום
  payment: z.object({
    payment_date: z.string().datetime().optional(),
    payment_method: z.string().optional(),
    bank_details: BankDetailsSchema.optional()
  }).optional(),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source_system: z.string(),
  raw_data: z.record(z.any()).optional(),
  tenant_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional()
});

// ============================================
// PAYMENT - תשלום
// ============================================

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  external_id: z.string().optional(),
  
  // קשרים
  policy_id: z.string().uuid().optional(),
  claim_id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  
  // פרטי התשלום
  type: z.enum(['premium', 'claim_payout', 'refund', 'commission', 'other']),
  amount: z.number(),
  currency: z.string().default('ILS'),
  
  // תאריכים
  due_date: z.string().datetime().optional(),
  payment_date: z.string().datetime().optional(),
  
  // סטטוס
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
  
  // פרטי אמצעי תשלום
  payment_method: z.enum(['bank_transfer', 'credit_card', 'direct_debit', 'check', 'cash']).optional(),
  bank_details: BankDetailsSchema.optional(),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source_system: z.string().optional()
});

// ============================================
// COMMISSION - עמלה
// ============================================

export const CommissionSchema = z.object({
  id: z.string().uuid(),
  external_id: z.string().optional(),
  
  // קשרים
  policy_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  
  // פרטי העמלה
  type: z.enum(['initial', 'renewal', 'override', 'bonus', 'clawback']),
  amount: z.number(),
  currency: z.string().default('ILS'),
  rate: z.number().optional(), // אחוז עמלה
  
  // חישוב
  base_premium: z.number().optional(),
  calculation_details: z.record(z.any()).optional(),
  
  // תקופה
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  
  // סטטוס
  status: z.enum(['calculated', 'approved', 'paid', 'cancelled']),
  payment_date: z.string().datetime().optional(),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source_system: z.string().optional()
});

// ============================================
// QUOTE - הצעת מחיר
// ============================================

export const QuoteSchema = z.object({
  id: z.string().uuid(),
  quote_number: z.string().optional(),
  
  // קשרים
  customer_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  
  // פרטי ההצעה
  insurance_type: InsuranceType,
  insurance_company: z.string(),
  
  // פרמיה מוצעת
  premium: z.object({
    amount: z.number(),
    currency: z.string().default('ILS'),
    frequency: PaymentFrequency,
    breakdown: z.record(z.number()).optional()
  }),
  
  // כיסוי מוצע
  coverage: z.object({
    primary_coverage: z.number(),
    additional_coverage: z.record(z.number()).optional(),
    deductible: z.number().optional()
  }),
  
  // תוקף
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
  
  // סטטוס
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
  
  // נתונים ספציפיים (לפי סוג ביטוח)
  request_data: z.record(z.any()).optional(),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  agent_id: z.string().uuid().optional()
});

// ============================================
// PENSION ACCOUNT - חשבון פנסיוני
// ============================================

export const PensionAccountSchema = z.object({
  id: z.string().uuid(),
  account_number: z.string(),
  
  // קשרים
  customer_id: z.string().uuid(),
  
  // סוג החשבון
  account_type: z.enum([
    'pension_comprehensive',      // פנסיה מקיפה
    'pension_general',           // פנסיה כללית
    'provident_fund',            // קרן השתלמות
    'severance_fund',            // קופת פיצויים
    'gemel_savings',             // גמל לחיסכון
    'gemel_investment'           // גמל להשקעה
  ]),
  
  // גוף מנהל
  managing_company: z.string(),
  managing_company_code: z.string().optional(),
  fund_name: z.string().optional(),
  fund_number: z.string().optional(),
  
  // יתרות
  balance: z.object({
    total: z.number(),
    severance: z.number().optional(),       // פיצויים
    employer_contributions: z.number().optional(),  // הפרשות מעסיק
    employee_contributions: z.number().optional(),  // הפרשות עובד
    returns: z.number().optional(),         // תשואות
    as_of_date: z.string().datetime()
  }),
  
  // הפקדות שוטפות
  contributions: z.object({
    monthly_salary: z.number().optional(),
    employee_rate: z.number().optional(),   // אחוז הפרשת עובד
    employer_rate: z.number().optional(),   // אחוז הפרשת מעסיק
    severance_rate: z.number().optional(),  // אחוז פיצויים
    last_contribution_date: z.string().datetime().optional()
  }).optional(),
  
  // דמי ניהול
  management_fees: z.object({
    savings_fee_percent: z.number().optional(),    // דמי ניהול מצבירה
    contributions_fee_percent: z.number().optional() // דמי ניהול מהפקדות
  }).optional(),
  
  // כיסויים ביטוחיים (לפנסיה)
  insurance_coverage: z.object({
    disability: z.object({
      coverage_amount: z.number().optional(),
      monthly_benefit: z.number().optional()
    }).optional(),
    death: z.object({
      coverage_amount: z.number().optional(),
      beneficiaries: z.array(z.object({
        name: z.string(),
        id_number: z.string().optional(),
        percentage: z.number()
      })).optional()
    }).optional()
  }).optional(),
  
  // סטטוס
  status: z.enum(['active', 'frozen', 'transferred', 'closed']),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  source_system: z.string(),
  raw_data: z.record(z.any()).optional()
});

// ============================================
// CONSENT - הסכמה
// ============================================

export const ConsentSchema = z.object({
  id: z.string().uuid(),
  
  customer_id: z.string().uuid(),
  
  // סוג ההסכמה
  consent_type: z.enum([
    'data_access',           // גישה לנתונים
    'marketing',             // שיווק
    'third_party_sharing',   // שיתוף עם צד שלישי
    'mislaka_access',        // גישה למסלקה
    'insurance_data'         // נתוני ביטוח
  ]),
  
  // פרטי ההסכמה
  scope: z.string().optional(),
  description: z.string().optional(),
  
  // תוקף
  granted_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  revoked_at: z.string().datetime().optional(),
  
  // סטטוס
  status: z.enum(['active', 'expired', 'revoked']),
  
  // מסמך הסכמה
  document_id: z.string().uuid().optional(),
  signature: z.string().optional(),
  
  // מטא-דאטה
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// ============================================
// TYPES EXPORT
// ============================================

export type Customer = z.infer<typeof CustomerSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Commission = z.infer<typeof CommissionSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type PensionAccount = z.infer<typeof PensionAccountSchema>;
export type Consent = z.infer<typeof ConsentSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type BankDetails = z.infer<typeof BankDetailsSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateCustomer(data: unknown): Customer {
  return CustomerSchema.parse(data);
}

export function validatePolicy(data: unknown): Policy {
  return PolicySchema.parse(data);
}

export function validateClaim(data: unknown): Claim {
  return ClaimSchema.parse(data);
}

export function validatePensionAccount(data: unknown): PensionAccount {
  return PensionAccountSchema.parse(data);
}

/**
 * וולידציה חלקית - מחזיר את השדות התקפים בלבד
 */
export function safeParseCustomer(data: unknown) {
  return CustomerSchema.safeParse(data);
}

export function safeParsePolicy(data: unknown) {
  return PolicySchema.safeParse(data);
}
