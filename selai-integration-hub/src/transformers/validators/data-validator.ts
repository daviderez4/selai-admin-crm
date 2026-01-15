/**
 * SELAI Insurance Integration Hub
 * Data Validator - Validate and sanitize incoming data
 */

import { z, ZodError, ZodSchema } from 'zod';
import { CustomerSchema, PolicySchema, ClaimSchema, PensionAccountSchema } from '../../models/canonical.js';

// ============================================
// TYPES
// ============================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationOptions {
  strict?: boolean;          // Fail on any error
  allowPartial?: boolean;    // Allow missing optional fields
  sanitize?: boolean;        // Clean data before validation
  enrichErrors?: boolean;    // Add detailed error context
}

// ============================================
// ISRAELI ID VALIDATOR
// ============================================

export function validateIsraeliId(id: string): boolean {
  // Must be 9 digits
  const normalized = id.replace(/\D/g, '').padStart(9, '0');
  if (normalized.length !== 9) return false;

  // Luhn-like algorithm for Israeli ID
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(normalized[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

// ============================================
// DATA VALIDATOR CLASS
// ============================================

export class DataValidator {
  /**
   * Validate customer data
   */
  validateCustomer(
    data: unknown,
    options: ValidationOptions = {}
  ): ValidationResult<z.infer<typeof CustomerSchema>> {
    return this.validate(data, CustomerSchema, options, (data, warnings) => {
      // Custom customer validations
      const obj = data as any;

      // Validate Israeli ID
      if (obj.id_number && !validateIsraeliId(obj.id_number)) {
        warnings.push({
          field: 'id_number',
          message: 'Israeli ID checksum validation failed',
          suggestion: 'Verify the ID number is correct'
        });
      }

      // Validate email format more strictly
      if (obj.email && !this.isValidEmail(obj.email)) {
        warnings.push({
          field: 'email',
          message: 'Email format may be invalid',
          suggestion: 'Verify email address'
        });
      }

      // Validate phone format
      if (obj.phone && !this.isValidIsraeliPhone(obj.phone)) {
        warnings.push({
          field: 'phone',
          message: 'Phone number may not be a valid Israeli number',
          suggestion: 'Use format +972-XX-XXX-XXXX'
        });
      }

      // Check for reasonable birth date
      if (obj.birth_date) {
        const birthDate = new Date(obj.birth_date);
        const age = this.calculateAge(birthDate);
        if (age && (age < 0 || age > 120)) {
          warnings.push({
            field: 'birth_date',
            message: `Calculated age (${age}) seems unreasonable`,
            suggestion: 'Verify birth date is correct'
          });
        }
      }
    });
  }

  /**
   * Validate policy data
   */
  validatePolicy(
    data: unknown,
    options: ValidationOptions = {}
  ): ValidationResult<z.infer<typeof PolicySchema>> {
    return this.validate(data, PolicySchema, options, (data, warnings) => {
      const obj = data as any;

      // Check date logic
      if (obj.start_date && obj.end_date) {
        const start = new Date(obj.start_date);
        const end = new Date(obj.end_date);
        if (end <= start) {
          warnings.push({
            field: 'end_date',
            message: 'End date should be after start date',
            suggestion: 'Verify policy dates'
          });
        }
      }

      // Check premium is reasonable
      if (obj.premium?.amount) {
        if (obj.premium.amount < 0) {
          warnings.push({
            field: 'premium.amount',
            message: 'Premium amount is negative'
          });
        }
        if (obj.premium.amount > 1000000) {
          warnings.push({
            field: 'premium.amount',
            message: 'Premium amount seems unusually high',
            suggestion: 'Verify premium amount'
          });
        }
      }

      // Check coverage amount
      if (obj.coverage?.primary_coverage && obj.coverage.primary_coverage < 0) {
        warnings.push({
          field: 'coverage.primary_coverage',
          message: 'Coverage amount is negative'
        });
      }

      // Validate beneficiary percentages
      if (obj.beneficiaries) {
        const totalPercentage = obj.beneficiaries.reduce(
          (sum: number, b: any) => sum + (b.percentage || 0),
          0
        );
        if (totalPercentage !== 100 && obj.beneficiaries.length > 0) {
          warnings.push({
            field: 'beneficiaries',
            message: `Beneficiary percentages sum to ${totalPercentage}%, should be 100%`,
            suggestion: 'Adjust beneficiary percentages'
          });
        }
      }
    });
  }

  /**
   * Validate claim data
   */
  validateClaim(
    data: unknown,
    options: ValidationOptions = {}
  ): ValidationResult<z.infer<typeof ClaimSchema>> {
    return this.validate(data, ClaimSchema, options, (data, warnings) => {
      const obj = data as any;

      // Check date logic
      if (obj.incident_date && obj.reported_date) {
        const incident = new Date(obj.incident_date);
        const reported = new Date(obj.reported_date);
        if (reported < incident) {
          warnings.push({
            field: 'reported_date',
            message: 'Reported date is before incident date'
          });
        }
      }

      // Check amounts
      if (obj.claimed_amount && obj.approved_amount) {
        if (obj.approved_amount > obj.claimed_amount) {
          warnings.push({
            field: 'approved_amount',
            message: 'Approved amount exceeds claimed amount'
          });
        }
      }

      if (obj.paid_amount && obj.approved_amount) {
        if (obj.paid_amount > obj.approved_amount) {
          warnings.push({
            field: 'paid_amount',
            message: 'Paid amount exceeds approved amount'
          });
        }
      }
    });
  }

  /**
   * Validate pension account data
   */
  validatePensionAccount(
    data: unknown,
    options: ValidationOptions = {}
  ): ValidationResult<z.infer<typeof PensionAccountSchema>> {
    return this.validate(data, PensionAccountSchema, options, (data, warnings) => {
      const obj = data as any;

      // Check management fees
      if (obj.management_fees) {
        if (obj.management_fees.savings_fee_percent > 2) {
          warnings.push({
            field: 'management_fees.savings_fee_percent',
            message: 'Savings management fee seems unusually high',
            suggestion: 'Typical range is 0.2-0.8%'
          });
        }
        if (obj.management_fees.contributions_fee_percent > 8) {
          warnings.push({
            field: 'management_fees.contributions_fee_percent',
            message: 'Contributions management fee seems unusually high',
            suggestion: 'Typical range is 0-4%'
          });
        }
      }

      // Check contribution rates
      if (obj.contributions) {
        const totalRate = (obj.contributions.employee_rate || 0) +
                          (obj.contributions.employer_rate || 0) +
                          (obj.contributions.severance_rate || 0);
        if (totalRate > 50) {
          warnings.push({
            field: 'contributions',
            message: 'Total contribution rate seems unusually high',
            suggestion: 'Typical total is around 18-20%'
          });
        }
      }

      // Check balance consistency
      if (obj.balance) {
        const components = (obj.balance.severance || 0) +
                          (obj.balance.employer_contributions || 0) +
                          (obj.balance.employee_contributions || 0) +
                          (obj.balance.returns || 0);
        if (components > 0 && Math.abs(components - obj.balance.total) > obj.balance.total * 0.1) {
          warnings.push({
            field: 'balance',
            message: 'Balance components do not sum to total',
            suggestion: 'Verify balance breakdown'
          });
        }
      }
    });
  }

  /**
   * Batch validate multiple records
   */
  validateBatch<T>(
    records: unknown[],
    schema: ZodSchema<T>,
    options: ValidationOptions = {}
  ): {
    valid: T[];
    invalid: Array<{ index: number; errors: ValidationError[] }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      successRate: number;
    };
  } {
    const valid: T[] = [];
    const invalid: Array<{ index: number; errors: ValidationError[] }> = [];

    for (let i = 0; i < records.length; i++) {
      const result = this.validate(records[i], schema, options);
      if (result.success && result.data) {
        valid.push(result.data);
      } else {
        invalid.push({ index: i, errors: result.errors || [] });
      }
    }

    return {
      valid,
      invalid,
      summary: {
        total: records.length,
        valid: valid.length,
        invalid: invalid.length,
        successRate: records.length > 0 ? (valid.length / records.length) * 100 : 0
      }
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private validate<T>(
    data: unknown,
    schema: ZodSchema<T>,
    options: ValidationOptions,
    customValidation?: (data: any, warnings: ValidationWarning[]) => void
  ): ValidationResult<T> {
    const warnings: ValidationWarning[] = [];

    // Sanitize if requested
    let sanitizedData = data;
    if (options.sanitize) {
      sanitizedData = this.sanitize(data);
    }

    try {
      const parsed = schema.parse(sanitizedData);

      // Run custom validation
      if (customValidation) {
        customValidation(parsed, warnings);
      }

      return {
        success: true,
        data: parsed,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationError[] = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
          value: options.enrichErrors ? this.getValueAtPath(data, e.path) : undefined
        }));

        return {
          success: false,
          errors,
          warnings: warnings.length > 0 ? warnings : undefined
        };
      }

      return {
        success: false,
        errors: [{
          field: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'unknown_error'
        }]
      };
    }
  }

  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      return data.trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.sanitize(value);
      }
      return result;
    }

    return data;
  }

  private getValueAtPath(obj: any, path: (string | number)[]): any {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidIsraeliPhone(phone: string): boolean {
    // Accept various formats: 05X-XXX-XXXX, +972-5X-XXX-XXXX, etc.
    const normalized = phone.replace(/[\s\-()]/g, '');
    return /^(\+972|972|0)?[23456789]\d{7,8}$/.test(normalized);
  }

  private calculateAge(birthDate: Date): number | null {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  }
}

// Export singleton
export const dataValidator = new DataValidator();
