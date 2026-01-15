/**
 * SELAI Insurance Integration Hub
 * Policy Normalizer - Transform carrier-specific policy data to canonical format
 */

import { z } from 'zod';
import { Policy, PolicySchema, InsuranceType, PolicyStatus, PaymentFrequency } from '../../models/canonical.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// CARRIER-SPECIFIC SCHEMAS
// ============================================

// Harel policy format
const HarelPolicySchema = z.object({
  mispar_polisa: z.string(),
  sug_bituach: z.string(),
  status_polisa: z.string(),
  taarich_tchila: z.string(),
  taarich_sium: z.string(),
  premia_chodshit: z.number(),
  kisui_rashi: z.number().optional(),
  hashtatfut_atzmit: z.number().optional(),
  mutzar_shem: z.string().optional()
});

// Migdal policy format
const MigdalPolicySchema = z.object({
  policy_num: z.string(),
  product_type: z.string(),
  policy_status: z.string(),
  effective_date: z.string(),
  expiry_date: z.string(),
  monthly_premium: z.number(),
  sum_insured: z.number().optional(),
  deductible: z.number().optional()
});

// Clal policy format
const ClalPolicySchema = z.object({
  POLISA_NUM: z.string(),
  ANAF: z.string(),
  MATZAV: z.string(),
  TCHILAT_BITUACH: z.string(),
  TOM_BITUACH: z.string(),
  PREMIA: z.number(),
  SCHUM_BITUACH: z.number().optional()
});

// Har HaBitouach (vehicle) format
const HarHabitouachPolicySchema = z.object({
  policy_number: z.string(),
  insurance_type: z.string(),
  status: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  premium: z.object({
    amount: z.number(),
    frequency: z.string()
  }),
  vehicle: z.object({
    vehicle_number: z.string(),
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional()
  }).optional(),
  coverage: z.object({
    comprehensive: z.boolean().optional(),
    third_party: z.boolean().optional(),
    medical: z.boolean().optional()
  }).optional()
});

// ============================================
// MAPPING TABLES
// ============================================

const INSURANCE_TYPE_MAP: Record<string, z.infer<typeof InsuranceType>> = {
  // Hebrew mappings
  'רכב': 'car',
  'רכב מקיף': 'car',
  'רכב חובה': 'car',
  'דירה': 'home',
  'בית': 'home',
  'מבנה ותכולה': 'home',
  'בריאות': 'health',
  'ביטוח בריאות': 'health',
  'חיים': 'life',
  'ביטוח חיים': 'life',
  'נסיעות': 'travel',
  'נסיעות לחול': 'travel',
  'עסק': 'business',
  'אחריות מקצועית': 'liability',
  'תאונות אישיות': 'accident',
  'פנסיה': 'pension',
  'קרן השתלמות': 'provident_fund',
  'פיצויים': 'severance_fund',
  'גמל': 'investment_gemel',
  'ביטוח מנהלים': 'managers_insurance',
  // English mappings
  'car': 'car',
  'vehicle': 'car',
  'auto': 'car',
  'home': 'home',
  'property': 'home',
  'health': 'health',
  'medical': 'health',
  'life': 'life',
  'travel': 'travel',
  'business': 'business',
  'liability': 'liability',
  'accident': 'accident',
  'pension': 'pension',
  // Code mappings
  '01': 'car',
  '02': 'home',
  '03': 'health',
  '04': 'life',
  '10': 'pension'
};

const STATUS_MAP: Record<string, z.infer<typeof PolicyStatus>> = {
  // Hebrew
  'פעיל': 'active',
  'פעילה': 'active',
  'ממתין': 'pending',
  'בהמתנה': 'pending',
  'פג תוקף': 'expired',
  'לא פעיל': 'expired',
  'מבוטל': 'cancelled',
  'בוטל': 'cancelled',
  'מושעה': 'suspended',
  'חודש': 'renewed',
  // English
  'active': 'active',
  'pending': 'pending',
  'expired': 'expired',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'suspended': 'suspended',
  'renewed': 'renewed',
  // Codes
  'A': 'active',
  'P': 'pending',
  'E': 'expired',
  'C': 'cancelled',
  'S': 'suspended',
  'R': 'renewed',
  '1': 'active',
  '0': 'expired'
};

const FREQUENCY_MAP: Record<string, z.infer<typeof PaymentFrequency>> = {
  'חודשי': 'monthly',
  'רבעוני': 'quarterly',
  'חצי שנתי': 'semi_annual',
  'שנתי': 'annual',
  'חד פעמי': 'one_time',
  'monthly': 'monthly',
  'quarterly': 'quarterly',
  'semi_annual': 'semi_annual',
  'semi-annual': 'semi_annual',
  'annual': 'annual',
  'yearly': 'annual',
  'one_time': 'one_time',
  'single': 'one_time',
  'M': 'monthly',
  'Q': 'quarterly',
  'S': 'semi_annual',
  'A': 'annual',
  'O': 'one_time'
};

const CARRIER_CODES: Record<string, string> = {
  'harel': 'HAREL',
  'migdal': 'MIGDAL',
  'clal': 'CLAL',
  'phoenix': 'PHOENIX',
  'menora': 'MENORA',
  'ayalon': 'AYALON',
  'shirbit': 'SHIRBIT',
  'shlomo': 'SHLOMO',
  'dikla': 'DIKLA',
  'hashomer': 'HASHOMER',
  'har_habitouach': 'HAR_HABITOUACH'
};

// ============================================
// NORMALIZER CLASS
// ============================================

export class PolicyNormalizer {
  /**
   * Normalize policy from any carrier format
   */
  normalize(
    data: unknown,
    carrier: string,
    customerId: string,
    options?: {
      tenant_id?: string;
      agent_id?: string;
    }
  ): Policy {
    const carrierLower = carrier.toLowerCase();

    switch (carrierLower) {
      case 'harel':
        return this.normalizeHarel(data, customerId, options);
      case 'migdal':
        return this.normalizeMigdal(data, customerId, options);
      case 'clal':
        return this.normalizeClal(data, customerId, options);
      case 'har_habitouach':
        return this.normalizeHarHabitouach(data, customerId, options);
      default:
        return this.normalizeGeneric(data, carrier, customerId, options);
    }
  }

  /**
   * Normalize Harel policy
   */
  private normalizeHarel(
    data: unknown,
    customerId: string,
    options?: { tenant_id?: string; agent_id?: string }
  ): Policy {
    const parsed = HarelPolicySchema.parse(data);

    return {
      id: uuidv4(),
      policy_number: parsed.mispar_polisa,
      customer_id: customerId,
      insurance_type: this.mapInsuranceType(parsed.sug_bituach),
      insurance_company: 'הראל',
      insurance_company_code: 'HAREL',
      start_date: this.parseDate(parsed.taarich_tchila),
      end_date: this.parseDate(parsed.taarich_sium),
      status: this.mapStatus(parsed.status_polisa),
      coverage: {
        primary_coverage: parsed.kisui_rashi,
        deductible: parsed.hashtatfut_atzmit
      },
      premium: {
        amount: parsed.premia_chodshit,
        currency: 'ILS',
        frequency: 'monthly'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: 'harel',
      tenant_id: options?.tenant_id,
      agent_id: options?.agent_id
    };
  }

  /**
   * Normalize Migdal policy
   */
  private normalizeMigdal(
    data: unknown,
    customerId: string,
    options?: { tenant_id?: string; agent_id?: string }
  ): Policy {
    const parsed = MigdalPolicySchema.parse(data);

    return {
      id: uuidv4(),
      policy_number: parsed.policy_num,
      customer_id: customerId,
      insurance_type: this.mapInsuranceType(parsed.product_type),
      insurance_company: 'מגדל',
      insurance_company_code: 'MIGDAL',
      start_date: this.parseDate(parsed.effective_date),
      end_date: this.parseDate(parsed.expiry_date),
      status: this.mapStatus(parsed.policy_status),
      coverage: {
        primary_coverage: parsed.sum_insured,
        deductible: parsed.deductible
      },
      premium: {
        amount: parsed.monthly_premium,
        currency: 'ILS',
        frequency: 'monthly'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: 'migdal',
      tenant_id: options?.tenant_id,
      agent_id: options?.agent_id
    };
  }

  /**
   * Normalize Clal policy
   */
  private normalizeClal(
    data: unknown,
    customerId: string,
    options?: { tenant_id?: string; agent_id?: string }
  ): Policy {
    const parsed = ClalPolicySchema.parse(data);

    return {
      id: uuidv4(),
      policy_number: parsed.POLISA_NUM,
      customer_id: customerId,
      insurance_type: this.mapInsuranceType(parsed.ANAF),
      insurance_company: 'כלל',
      insurance_company_code: 'CLAL',
      start_date: this.parseDate(parsed.TCHILAT_BITUACH),
      end_date: this.parseDate(parsed.TOM_BITUACH),
      status: this.mapStatus(parsed.MATZAV),
      coverage: {
        primary_coverage: parsed.SCHUM_BITUACH
      },
      premium: {
        amount: parsed.PREMIA,
        currency: 'ILS',
        frequency: 'monthly'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: 'clal',
      tenant_id: options?.tenant_id,
      agent_id: options?.agent_id
    };
  }

  /**
   * Normalize Har HaBitouach policy
   */
  private normalizeHarHabitouach(
    data: unknown,
    customerId: string,
    options?: { tenant_id?: string; agent_id?: string }
  ): Policy {
    const parsed = HarHabitouachPolicySchema.parse(data);

    return {
      id: uuidv4(),
      policy_number: parsed.policy_number,
      customer_id: customerId,
      insurance_type: this.mapInsuranceType(parsed.insurance_type),
      insurance_company: 'הר הביטוח',
      insurance_company_code: 'HAR_HABITOUACH',
      start_date: this.parseDate(parsed.start_date),
      end_date: this.parseDate(parsed.end_date),
      status: this.mapStatus(parsed.status),
      coverage: {
        secondary_coverage: parsed.coverage ? {
          comprehensive: parsed.coverage.comprehensive ? 1 : 0,
          third_party: parsed.coverage.third_party ? 1 : 0,
          medical: parsed.coverage.medical ? 1 : 0
        } : undefined
      },
      premium: {
        amount: parsed.premium.amount,
        currency: 'ILS',
        frequency: this.mapFrequency(parsed.premium.frequency)
      },
      type_specific_data: parsed.vehicle ? {
        vehicle_number: parsed.vehicle.vehicle_number,
        make: parsed.vehicle.make,
        model: parsed.vehicle.model,
        year: parsed.vehicle.year
      } : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: 'har_habitouach',
      tenant_id: options?.tenant_id,
      agent_id: options?.agent_id
    };
  }

  /**
   * Generic normalizer for unknown formats
   */
  private normalizeGeneric(
    data: unknown,
    carrier: string,
    customerId: string,
    options?: { tenant_id?: string; agent_id?: string }
  ): Policy {
    const obj = data as Record<string, any>;

    // Try to find common field names
    const policyNumber = obj.policy_number || obj.policyNumber || obj.polisa ||
                         obj.mispar_polisa || obj.policy_num || obj.POLISA_NUM || '';

    const insuranceType = obj.insurance_type || obj.insuranceType || obj.type ||
                          obj.sug_bituach || obj.product_type || obj.ANAF || 'other';

    const status = obj.status || obj.policy_status || obj.MATZAV || 'active';

    const startDate = obj.start_date || obj.startDate || obj.effective_date ||
                      obj.taarich_tchila || obj.TCHILAT_BITUACH || new Date().toISOString();

    const endDate = obj.end_date || obj.endDate || obj.expiry_date ||
                    obj.taarich_sium || obj.TOM_BITUACH;

    const premiumAmount = obj.premium?.amount || obj.premium_amount || obj.monthly_premium ||
                          obj.premia_chodshit || obj.PREMIA || 0;

    const coverageAmount = obj.coverage?.primary_coverage || obj.coverage_amount ||
                           obj.sum_insured || obj.kisui_rashi || obj.SCHUM_BITUACH;

    return {
      id: uuidv4(),
      policy_number: String(policyNumber),
      customer_id: customerId,
      insurance_type: this.mapInsuranceType(insuranceType),
      insurance_company: carrier,
      insurance_company_code: CARRIER_CODES[carrier.toLowerCase()] || carrier.toUpperCase(),
      start_date: this.parseDate(startDate),
      end_date: endDate ? this.parseDate(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: this.mapStatus(status),
      coverage: coverageAmount ? { primary_coverage: coverageAmount } : undefined,
      premium: {
        amount: premiumAmount,
        currency: 'ILS',
        frequency: 'monthly'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: carrier.toLowerCase(),
      raw_data: obj,
      tenant_id: options?.tenant_id,
      agent_id: options?.agent_id
    };
  }

  // ============================================
  // MAPPING HELPERS
  // ============================================

  private mapInsuranceType(value: string): z.infer<typeof InsuranceType> {
    const normalized = value.trim().toLowerCase();
    return INSURANCE_TYPE_MAP[value] || INSURANCE_TYPE_MAP[normalized] || 'other';
  }

  private mapStatus(value: string): z.infer<typeof PolicyStatus> {
    const normalized = value.trim().toLowerCase();
    return STATUS_MAP[value] || STATUS_MAP[normalized] || 'active';
  }

  private mapFrequency(value: string): z.infer<typeof PaymentFrequency> {
    const normalized = value.trim().toLowerCase();
    return FREQUENCY_MAP[value] || FREQUENCY_MAP[normalized] || 'monthly';
  }

  private parseDate(value: string): string {
    // Handle various date formats
    if (!value) return new Date().toISOString();

    // Already ISO format
    if (value.includes('T')) return value;

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      return new Date(
        parseInt(ddmmyyyy[3]),
        parseInt(ddmmyyyy[2]) - 1,
        parseInt(ddmmyyyy[1])
      ).toISOString();
    }

    // YYYY-MM-DD
    const yyyymmdd = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      return new Date(
        parseInt(yyyymmdd[1]),
        parseInt(yyyymmdd[2]) - 1,
        parseInt(yyyymmdd[3])
      ).toISOString();
    }

    // Try native parsing
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }
}

// Export singleton
export const policyNormalizer = new PolicyNormalizer();
