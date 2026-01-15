/**
 * SELAI Insurance Integration Hub
 * Pension Normalizer - Transform pension data from Mislaka and carriers
 */

import { z } from 'zod';
import { PensionAccount, PensionAccountSchema } from '../../models/canonical.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// MISLAKA SCHEMA
// ============================================

const MislakaPensionSchema = z.object({
  MISPAR_CHESHBON: z.string(),
  SUG_KUPA: z.string(),
  SHEM_CHEVRA: z.string(),
  KOD_CHEVRA: z.string().optional(),
  SHEM_MASLUL: z.string().optional(),
  MISPAR_MASLUL: z.string().optional(),
  YITRAT_CHISACHON: z.number(),
  YITRAT_PITZUIM: z.number().optional(),
  YITRAT_TAGMULIM: z.number().optional(),
  YITRAT_OVDIM: z.number().optional(),
  TAARICH_YITRA: z.string(),
  SACHAR_MEVUTACH: z.number().optional(),
  ACHUZ_HAFRASHAT_OVED: z.number().optional(),
  ACHUZ_HAFRASHAT_MAASIK: z.number().optional(),
  ACHUZ_PITZUIM: z.number().optional(),
  DMEI_NIHUL_TZEVIRA: z.number().optional(),
  DMEI_NIHUL_HAFKADA: z.number().optional(),
  KISUI_NECHUT: z.object({
    SCHUM_KISUI: z.number().optional(),
    KITZVA_CHODSHIT: z.number().optional()
  }).optional(),
  KISUI_MAVET: z.object({
    SCHUM_KISUI: z.number().optional(),
    MUTAVIM: z.array(z.object({
      SHEM: z.string(),
      TZ: z.string().optional(),
      ACHUZ: z.number()
    })).optional()
  }).optional(),
  STATUS: z.string().optional()
});

// ============================================
// MAPPING TABLES
// ============================================

const ACCOUNT_TYPE_MAP: Record<string, PensionAccount['account_type']> = {
  // Hebrew
  'פנסיה מקיפה': 'pension_comprehensive',
  'פנסיה כללית': 'pension_general',
  'קרן השתלמות': 'provident_fund',
  'קופת פיצויים': 'severance_fund',
  'גמל לחיסכון': 'gemel_savings',
  'גמל להשקעה': 'gemel_investment',
  // Codes
  '1': 'pension_comprehensive',
  '2': 'pension_general',
  '3': 'provident_fund',
  '4': 'severance_fund',
  '5': 'gemel_savings',
  '6': 'gemel_investment',
  // English
  'comprehensive_pension': 'pension_comprehensive',
  'general_pension': 'pension_general',
  'provident': 'provident_fund',
  'severance': 'severance_fund',
  'gemel_saving': 'gemel_savings',
  'gemel_invest': 'gemel_investment'
};

const STATUS_MAP: Record<string, PensionAccount['status']> = {
  'פעיל': 'active',
  'קפוא': 'frozen',
  'הועבר': 'transferred',
  'סגור': 'closed',
  'active': 'active',
  'frozen': 'frozen',
  'transferred': 'transferred',
  'closed': 'closed',
  'A': 'active',
  'F': 'frozen',
  'T': 'transferred',
  'C': 'closed',
  '1': 'active',
  '0': 'frozen'
};

const COMPANY_NAMES: Record<string, string> = {
  '512': 'מגדל',
  '515': 'הראל',
  '518': 'כלל',
  '520': 'מנורה',
  '522': 'הפניקס',
  '524': 'אלטשולר שחם',
  '526': 'מיטב דש',
  '528': 'פסגות',
  '530': 'אנליסט',
  '532': 'מור',
  '534': 'ילין לפידות'
};

// ============================================
// NORMALIZER CLASS
// ============================================

export class PensionNormalizer {
  /**
   * Normalize pension account from Mislaka format
   */
  normalizeMislaka(
    data: unknown,
    customerId: string
  ): PensionAccount {
    const parsed = MislakaPensionSchema.parse(data);

    const companyName = COMPANY_NAMES[parsed.KOD_CHEVRA || ''] || parsed.SHEM_CHEVRA;

    return {
      id: uuidv4(),
      account_number: parsed.MISPAR_CHESHBON,
      customer_id: customerId,
      account_type: this.mapAccountType(parsed.SUG_KUPA),
      managing_company: companyName,
      managing_company_code: parsed.KOD_CHEVRA,
      fund_name: parsed.SHEM_MASLUL,
      fund_number: parsed.MISPAR_MASLUL,
      balance: {
        total: parsed.YITRAT_CHISACHON,
        severance: parsed.YITRAT_PITZUIM,
        employer_contributions: parsed.YITRAT_TAGMULIM,
        employee_contributions: parsed.YITRAT_OVDIM,
        as_of_date: this.parseDate(parsed.TAARICH_YITRA)
      },
      contributions: parsed.SACHAR_MEVUTACH ? {
        monthly_salary: parsed.SACHAR_MEVUTACH,
        employee_rate: parsed.ACHUZ_HAFRASHAT_OVED,
        employer_rate: parsed.ACHUZ_HAFRASHAT_MAASIK,
        severance_rate: parsed.ACHUZ_PITZUIM
      } : undefined,
      management_fees: {
        savings_fee_percent: parsed.DMEI_NIHUL_TZEVIRA,
        contributions_fee_percent: parsed.DMEI_NIHUL_HAFKADA
      },
      insurance_coverage: {
        disability: parsed.KISUI_NECHUT ? {
          coverage_amount: parsed.KISUI_NECHUT.SCHUM_KISUI,
          monthly_benefit: parsed.KISUI_NECHUT.KITZVA_CHODSHIT
        } : undefined,
        death: parsed.KISUI_MAVET ? {
          coverage_amount: parsed.KISUI_MAVET.SCHUM_KISUI,
          beneficiaries: parsed.KISUI_MAVET.MUTAVIM?.map(m => ({
            name: m.SHEM,
            id_number: m.TZ,
            percentage: m.ACHUZ
          }))
        } : undefined
      },
      status: this.mapStatus(parsed.STATUS || 'active'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: 'mislaka'
    };
  }

  /**
   * Normalize pension from generic format
   */
  normalizeGeneric(
    data: unknown,
    customerId: string,
    source: string
  ): PensionAccount {
    const obj = data as Record<string, any>;

    return {
      id: uuidv4(),
      account_number: obj.account_number || obj.MISPAR_CHESHBON || '',
      customer_id: customerId,
      account_type: this.mapAccountType(obj.account_type || obj.SUG_KUPA || 'pension_comprehensive'),
      managing_company: obj.managing_company || obj.SHEM_CHEVRA || '',
      managing_company_code: obj.managing_company_code || obj.KOD_CHEVRA,
      fund_name: obj.fund_name || obj.SHEM_MASLUL,
      fund_number: obj.fund_number || obj.MISPAR_MASLUL,
      balance: {
        total: obj.balance?.total || obj.YITRAT_CHISACHON || 0,
        severance: obj.balance?.severance || obj.YITRAT_PITZUIM,
        employer_contributions: obj.balance?.employer_contributions || obj.YITRAT_TAGMULIM,
        employee_contributions: obj.balance?.employee_contributions || obj.YITRAT_OVDIM,
        as_of_date: this.parseDate(obj.balance?.as_of_date || obj.TAARICH_YITRA || new Date().toISOString())
      },
      status: this.mapStatus(obj.status || obj.STATUS || 'active'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: source,
      raw_data: obj
    };
  }

  /**
   * Calculate high fee alert threshold
   */
  hasHighFees(account: PensionAccount): boolean {
    const savingsFee = account.management_fees?.savings_fee_percent || 0;
    const contributionsFee = account.management_fees?.contributions_fee_percent || 0;

    // Alert thresholds
    const HIGH_SAVINGS_FEE = 0.5; // 0.5%
    const HIGH_CONTRIBUTIONS_FEE = 4; // 4%

    return savingsFee > HIGH_SAVINGS_FEE || contributionsFee > HIGH_CONTRIBUTIONS_FEE;
  }

  /**
   * Check if pension has death coverage
   */
  hasDeathCoverage(account: PensionAccount): boolean {
    return !!(account.insurance_coverage?.death?.coverage_amount &&
              account.insurance_coverage.death.coverage_amount > 0);
  }

  // ============================================
  // MAPPING HELPERS
  // ============================================

  private mapAccountType(value: string): PensionAccount['account_type'] {
    const normalized = value.trim().toLowerCase();
    return ACCOUNT_TYPE_MAP[value] || ACCOUNT_TYPE_MAP[normalized] || 'pension_comprehensive';
  }

  private mapStatus(value: string): PensionAccount['status'] {
    const normalized = value.trim().toLowerCase();
    return STATUS_MAP[value] || STATUS_MAP[normalized] || 'active';
  }

  private parseDate(value: string): string {
    if (!value) return new Date().toISOString();
    if (value.includes('T')) return value;

    // DD/MM/YYYY
    const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      return new Date(
        parseInt(ddmmyyyy[3]),
        parseInt(ddmmyyyy[2]) - 1,
        parseInt(ddmmyyyy[1])
      ).toISOString();
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }
}

// Export singleton
export const pensionNormalizer = new PensionNormalizer();
