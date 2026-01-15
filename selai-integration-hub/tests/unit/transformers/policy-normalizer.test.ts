/**
 * SELAI Insurance Integration Hub
 * Policy Normalizer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyNormalizer, policyNormalizer } from '../../../src/transformers/normalizers/policy-normalizer.js';
import { generateIsraeliId } from '../../utils/test-helpers.js';

describe('PolicyNormalizer', () => {
  let normalizer: PolicyNormalizer;
  const customerId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    normalizer = new PolicyNormalizer();
  });

  describe('normalize()', () => {
    it('should normalize Harel policy format', () => {
      const harelData = {
        mispar_polisa: '12345678',
        sug_bituach: 'רכב',
        status_polisa: 'פעיל',
        taarich_tchila: '01/01/2024',
        taarich_sium: '31/12/2024',
        premia_chodshit: 350,
        kisui_rashi: 500000,
        hashtatfut_atzmit: 1000
      };

      const result = normalizer.normalize(harelData, 'harel', customerId);

      expect(result.policy_number).toBe('12345678');
      expect(result.insurance_type).toBe('car');
      expect(result.status).toBe('active');
      expect(result.insurance_company_code).toBe('HAREL');
      expect(result.premium.amount).toBe(350);
      expect(result.premium.frequency).toBe('monthly');
      expect(result.coverage?.primary_coverage).toBe(500000);
      expect(result.coverage?.deductible).toBe(1000);
    });

    it('should normalize Migdal policy format', () => {
      const migdalData = {
        policy_num: 'MIG-2024-001',
        product_type: 'home',
        policy_status: 'active',
        effective_date: '2024-01-01',
        expiry_date: '2024-12-31',
        monthly_premium: 150,
        sum_insured: 1000000,
        deductible: 500
      };

      const result = normalizer.normalize(migdalData, 'migdal', customerId);

      expect(result.policy_number).toBe('MIG-2024-001');
      expect(result.insurance_type).toBe('home');
      expect(result.insurance_company_code).toBe('MIGDAL');
      expect(result.premium.amount).toBe(150);
      expect(result.coverage?.primary_coverage).toBe(1000000);
    });

    it('should normalize Clal policy format', () => {
      const clalData = {
        POLISA_NUM: 'CL123456',
        ANAF: 'בריאות',
        MATZAV: 'A',
        TCHILAT_BITUACH: '2024-01-01',
        TOM_BITUACH: '2024-12-31',
        PREMIA: 200,
        SCHUM_BITUACH: 500000
      };

      const result = normalizer.normalize(clalData, 'clal', customerId);

      expect(result.policy_number).toBe('CL123456');
      expect(result.insurance_type).toBe('health');
      expect(result.status).toBe('active');
      expect(result.insurance_company_code).toBe('CLAL');
    });

    it('should handle Har HaBitouach vehicle policy', () => {
      const harData = {
        policy_number: 'HB-2024-001',
        insurance_type: 'car',
        status: 'active',
        start_date: '2024-01-01T00:00:00.000Z',
        end_date: '2024-12-31T00:00:00.000Z',
        premium: {
          amount: 400,
          frequency: 'monthly'
        },
        vehicle: {
          vehicle_number: '12-345-67',
          make: 'Toyota',
          model: 'Corolla',
          year: 2022
        },
        coverage: {
          comprehensive: true,
          third_party: true,
          medical: true
        }
      };

      const result = normalizer.normalize(harData, 'har_habitouach', customerId);

      expect(result.policy_number).toBe('HB-2024-001');
      expect(result.insurance_type).toBe('car');
      expect(result.type_specific_data?.vehicle_number).toBe('12-345-67');
      expect(result.type_specific_data?.make).toBe('Toyota');
    });

    it('should handle unknown carrier with generic normalizer', () => {
      const genericData = {
        policy_number: 'UNKNOWN-001',
        insurance_type: 'life',
        status: 'active',
        start_date: '2024-01-01',
        end_date: '2034-01-01',
        premium_amount: 100,
        coverage_amount: 1000000
      };

      const result = normalizer.normalize(genericData, 'unknown_carrier', customerId);

      expect(result.policy_number).toBe('UNKNOWN-001');
      expect(result.insurance_type).toBe('life');
      expect(result.insurance_company).toBe('unknown_carrier');
      expect(result.raw_data).toBeDefined();
    });
  });

  describe('insurance type mapping', () => {
    it('should map Hebrew insurance types', () => {
      const types = [
        { input: 'רכב', expected: 'car' },
        { input: 'דירה', expected: 'home' },
        { input: 'בריאות', expected: 'health' },
        { input: 'חיים', expected: 'life' },
        { input: 'פנסיה', expected: 'pension' }
      ];

      for (const { input, expected } of types) {
        const data = {
          mispar_polisa: '123',
          sug_bituach: input,
          status_polisa: 'פעיל',
          taarich_tchila: '2024-01-01',
          taarich_sium: '2024-12-31',
          premia_chodshit: 100
        };

        const result = normalizer.normalize(data, 'harel', customerId);
        expect(result.insurance_type).toBe(expected);
      }
    });
  });

  describe('status mapping', () => {
    it('should map Hebrew status values', () => {
      const statuses = [
        { input: 'פעיל', expected: 'active' },
        { input: 'מבוטל', expected: 'cancelled' },
        { input: 'פג תוקף', expected: 'expired' },
        { input: 'ממתין', expected: 'pending' }
      ];

      for (const { input, expected } of statuses) {
        const data = {
          mispar_polisa: '123',
          sug_bituach: 'רכב',
          status_polisa: input,
          taarich_tchila: '2024-01-01',
          taarich_sium: '2024-12-31',
          premia_chodshit: 100
        };

        const result = normalizer.normalize(data, 'harel', customerId);
        expect(result.status).toBe(expected);
      }
    });
  });

  describe('date parsing', () => {
    it('should parse DD/MM/YYYY format', () => {
      const data = {
        mispar_polisa: '123',
        sug_bituach: 'רכב',
        status_polisa: 'פעיל',
        taarich_tchila: '15/06/2024',
        taarich_sium: '14/06/2025',
        premia_chodshit: 100
      };

      const result = normalizer.normalize(data, 'harel', customerId);

      const startDate = new Date(result.start_date);
      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(startDate.getDate()).toBe(15);
    });

    it('should parse YYYY-MM-DD format', () => {
      const data = {
        policy_num: '123',
        product_type: 'car',
        policy_status: 'active',
        effective_date: '2024-06-15',
        expiry_date: '2025-06-14',
        monthly_premium: 100
      };

      const result = normalizer.normalize(data, 'migdal', customerId);

      const startDate = new Date(result.start_date);
      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(5);
      expect(startDate.getDate()).toBe(15);
    });
  });

  describe('tenant and agent options', () => {
    it('should include tenant_id and agent_id when provided', () => {
      const data = {
        mispar_polisa: '123',
        sug_bituach: 'רכב',
        status_polisa: 'פעיל',
        taarich_tchila: '2024-01-01',
        taarich_sium: '2024-12-31',
        premia_chodshit: 100
      };

      const result = normalizer.normalize(data, 'harel', customerId, {
        tenant_id: 'tenant-123',
        agent_id: 'agent-456'
      });

      expect(result.tenant_id).toBe('tenant-123');
      expect(result.agent_id).toBe('agent-456');
    });
  });
});

describe('policyNormalizer singleton', () => {
  it('should be a PolicyNormalizer instance', () => {
    expect(policyNormalizer).toBeInstanceOf(PolicyNormalizer);
  });
});
