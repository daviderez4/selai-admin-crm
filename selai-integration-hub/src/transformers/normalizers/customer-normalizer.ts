/**
 * SELAI Insurance Integration Hub
 * Customer Normalizer - Transform carrier-specific customer data to canonical format
 */

import { z } from 'zod';
import { Customer, CustomerSchema, Gender, MaritalStatus } from '../../models/canonical.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// CARRIER-SPECIFIC SCHEMAS
// ============================================

const GenericCustomerSchema = z.object({
  id_number: z.string().optional(),
  tz: z.string().optional(),
  teudat_zehut: z.string().optional(),
  id: z.string().optional(),
  first_name: z.string().optional(),
  shem_prati: z.string().optional(),
  given_name: z.string().optional(),
  last_name: z.string().optional(),
  shem_mishpacha: z.string().optional(),
  family_name: z.string().optional(),
  surname: z.string().optional(),
  full_name: z.string().optional(),
  shem_male: z.string().optional(),
  email: z.string().optional(),
  doel: z.string().optional(),
  phone: z.string().optional(),
  telephone: z.string().optional(),
  tel: z.string().optional(),
  mobile: z.string().optional(),
  nayad: z.string().optional(),
  cellphone: z.string().optional(),
  birth_date: z.string().optional(),
  taarich_leida: z.string().optional(),
  date_of_birth: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  min: z.string().optional(),
  sex: z.string().optional(),
  marital_status: z.string().optional(),
  matsav_mishpachti: z.string().optional(),
  address: z.any().optional(),
  ktovet: z.any().optional(),
  city: z.string().optional(),
  ir: z.string().optional(),
  street: z.string().optional(),
  rechov: z.string().optional(),
  occupation: z.string().optional(),
  isuk: z.string().optional(),
  employer: z.string().optional(),
  maasik: z.string().optional()
}).passthrough();

// ============================================
// MAPPING TABLES
// ============================================

const GENDER_MAP: Record<string, z.infer<typeof Gender>> = {
  'male': 'male',
  'female': 'female',
  'other': 'other',
  'זכר': 'male',
  'נקבה': 'female',
  'אחר': 'other',
  'm': 'male',
  'f': 'female',
  'M': 'male',
  'F': 'female',
  '1': 'male',
  '2': 'female'
};

const MARITAL_STATUS_MAP: Record<string, z.infer<typeof MaritalStatus>> = {
  'single': 'single',
  'married': 'married',
  'divorced': 'divorced',
  'widowed': 'widowed',
  'separated': 'separated',
  'רווק': 'single',
  'רווקה': 'single',
  'נשוי': 'married',
  'נשואה': 'married',
  'גרוש': 'divorced',
  'גרושה': 'divorced',
  'אלמן': 'widowed',
  'אלמנה': 'widowed',
  'פרוד': 'separated',
  'פרודה': 'separated',
  'S': 'single',
  'M': 'married',
  'D': 'divorced',
  'W': 'widowed'
};

// ============================================
// NORMALIZER CLASS
// ============================================

export class CustomerNormalizer {
  /**
   * Normalize customer from any carrier format
   */
  normalize(
    data: unknown,
    source: string,
    options?: {
      tenant_id?: string;
      agent_id?: string;
    }
  ): Customer {
    const parsed = GenericCustomerSchema.parse(data);

    // Extract ID number
    const idNumber = this.extractIdNumber(parsed);
    if (!idNumber) {
      throw new Error('Customer ID number is required');
    }

    // Extract names
    const { firstName, lastName, fullName } = this.extractNames(parsed);

    // Extract contact info
    const email = parsed.email || parsed.doel;
    const phone = parsed.phone || parsed.telephone || parsed.tel;
    const mobile = parsed.mobile || parsed.nayad || parsed.cellphone;

    // Extract address
    const address = this.extractAddress(parsed);

    // Extract dates
    const birthDate = this.parseDate(
      parsed.birth_date || parsed.taarich_leida || parsed.date_of_birth || parsed.dob
    );

    // Extract demographics
    const gender = this.mapGender(parsed.gender || parsed.min || parsed.sex);
    const maritalStatus = this.mapMaritalStatus(
      parsed.marital_status || parsed.matsav_mishpachti
    );

    return {
      id: uuidv4(),
      id_number: idNumber,
      id_type: 'id_card',
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: email ? this.normalizeEmail(email) : undefined,
      phone: phone ? this.normalizePhone(phone) : undefined,
      mobile: mobile ? this.normalizePhone(mobile) : undefined,
      birth_date: birthDate,
      gender,
      marital_status: maritalStatus,
      address,
      occupation: parsed.occupation || parsed.isuk,
      employer: parsed.employer || parsed.maasik,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source_system: source,
      tenant_id: options?.tenant_id,
      agent_id: options?.agent_id
    };
  }

  /**
   * Merge customer data from multiple sources
   */
  merge(existing: Customer, incoming: Partial<Customer>): Customer {
    return {
      ...existing,
      // Prefer non-null values from incoming
      email: incoming.email || existing.email,
      phone: incoming.phone || existing.phone,
      mobile: incoming.mobile || existing.mobile,
      birth_date: incoming.birth_date || existing.birth_date,
      gender: incoming.gender || existing.gender,
      marital_status: incoming.marital_status || existing.marital_status,
      address: incoming.address || existing.address,
      occupation: incoming.occupation || existing.occupation,
      employer: incoming.employer || existing.employer,
      // Track external IDs
      external_ids: {
        ...existing.external_ids,
        ...incoming.external_ids
      },
      updated_at: new Date().toISOString()
    };
  }

  // ============================================
  // EXTRACTION HELPERS
  // ============================================

  private extractIdNumber(data: Record<string, any>): string | null {
    const candidates = [
      data.id_number,
      data.tz,
      data.teudat_zehut,
      data.id
    ];

    for (const candidate of candidates) {
      if (candidate) {
        const normalized = String(candidate).replace(/\D/g, '');
        if (normalized.length === 9) {
          return normalized;
        }
        // Pad with zeros if needed
        if (normalized.length > 0 && normalized.length < 9) {
          return normalized.padStart(9, '0');
        }
      }
    }

    return null;
  }

  private extractNames(data: Record<string, any>): {
    firstName: string;
    lastName: string;
    fullName: string;
  } {
    // Try to get first and last name directly
    let firstName = data.first_name || data.shem_prati || data.given_name || '';
    let lastName = data.last_name || data.shem_mishpacha || data.family_name || data.surname || '';

    // If we have full name, try to split it
    const fullName = data.full_name || data.shem_male || '';
    if ((!firstName || !lastName) && fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        firstName = firstName || parts[0];
        lastName = lastName || parts.slice(1).join(' ');
      } else if (parts.length === 1) {
        firstName = firstName || parts[0];
      }
    }

    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: fullName || `${firstName} ${lastName}`.trim()
    };
  }

  private extractAddress(data: Record<string, any>): Customer['address'] | undefined {
    const addressData = data.address || data.ktovet;

    if (typeof addressData === 'object' && addressData !== null) {
      return {
        street: addressData.street || addressData.rechov,
        house_number: addressData.house_number || addressData.mispar_bait,
        apartment: addressData.apartment || addressData.dira,
        city: addressData.city || addressData.ir,
        zip_code: addressData.zip_code || addressData.mikud,
        country: addressData.country || 'IL'
      };
    }

    // Try to extract from flat fields
    const city = data.city || data.ir;
    const street = data.street || data.rechov;

    if (city || street) {
      return {
        city: city || '',
        street,
        country: 'IL'
      };
    }

    return undefined;
  }

  // ============================================
  // MAPPING HELPERS
  // ============================================

  private mapGender(value: string | undefined): z.infer<typeof Gender> | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    return GENDER_MAP[value] || GENDER_MAP[normalized];
  }

  private mapMaritalStatus(value: string | undefined): z.infer<typeof MaritalStatus> | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    return MARITAL_STATUS_MAP[value] || MARITAL_STATUS_MAP[normalized];
  }

  private parseDate(value: string | undefined): string | undefined {
    if (!value) return undefined;

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
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone: string): string {
    // Remove non-digits except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Add Israel country code if missing
    if (normalized.startsWith('0')) {
      normalized = '+972' + normalized.slice(1);
    } else if (!normalized.startsWith('+')) {
      normalized = '+972' + normalized;
    }

    return normalized;
  }
}

// Export singleton
export const customerNormalizer = new CustomerNormalizer();
