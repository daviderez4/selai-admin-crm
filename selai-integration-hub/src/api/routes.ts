/**
 * SELAI Insurance Integration Hub
 * API Routes - נתיבי ה-API
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getIntegrationService } from '../services/integration-service.js';
import { getSupabaseSyncService } from '../services/supabase-sync.js';
import { logger } from '../utils/logger.js';

// ============================================
// REQUEST SCHEMAS
// ============================================

const GetCustomer360Schema = z.object({
  params: z.object({
    customerId: z.string().uuid(),
  }),
  query: z.object({
    idNumber: z.string().length(9),
    sync: z.enum(['true', 'false']).optional().default('false'),
  }),
});

const GetVehiclePoliciesSchema = z.object({
  query: z.object({
    idNumber: z.string().length(9).optional(),
    vehicleNumber: z.string().optional(),
  }),
});

const GetPensionAccountsSchema = z.object({
  query: z.object({
    idNumber: z.string().length(9),
  }),
});

const SyncCustomerSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    idNumber: z.string().length(9),
    agentId: z.string().uuid().optional(),
  }),
});

const CreateConsentSchema = z.object({
  body: z.object({
    customerId: z.string(),
    idNumber: z.string().length(9),
    scope: z.enum(['all', 'pension', 'provident', 'severance']).optional().default('all'),
    validDays: z.number().min(1).max(365).optional().default(365),
  }),
});

// ============================================
// ROUTES
// ============================================

export async function registerRoutes(app: FastifyInstance) {
  const integrationService = getIntegrationService();

  // ============================================
  // HEALTH & STATUS
  // ============================================

  /**
   * בדיקת תקינות
   */
  app.get('/health', async (request, reply) => {
    const status = await integrationService.healthCheckAll();
    const allHealthy = Object.values(status).every(v => v);
    
    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'degraded',
      services: status,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * רשימת connectors רשומים
   */
  app.get('/connectors', async (request, reply) => {
    return {
      connectors: [
        'har_habitouach',
        'mislaka',
        ...integrationService.getRegisteredCarriers()
      ]
    };
  });

  // ============================================
  // CUSTOMER 360
  // ============================================

  /**
   * קבלת נתונים מלאים על לקוח
   * GET /api/v1/customers/:customerId/360?idNumber=123456789
   */
  app.get('/api/v1/customers/:customerId/360', async (request, reply) => {
    try {
      const parsed = GetCustomer360Schema.parse({
        params: request.params,
        query: request.query,
      });

      const data = await integrationService.getCustomer360(
        parsed.params.customerId,
        parsed.query.idNumber
      );

      // Optionally sync to database
      if (parsed.query.sync === 'true') {
        try {
          const syncService = getSupabaseSyncService();
          await syncService.fullCustomerSync(
            parsed.params.customerId,
            {
              policies: data.policies,
              pensionAccounts: data.pension_accounts,
              gaps: data.gaps_identified,
              totals: {
                total_coverage: data.total_coverage,
                total_premium_annual: data.total_premium_annual,
                total_pension_balance: data.total_pension_balance,
                risk_score: data.risk_score,
              },
            }
          );
        } catch (syncError) {
          logger.error('Failed to sync data', { error: syncError });
          // Continue - don't fail the request
        }
      }

      return data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      logger.error('Customer 360 request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================
  // VEHICLE INSURANCE
  // ============================================

  /**
   * קבלת פוליסות רכב
   * GET /api/v1/vehicle/policies?idNumber=123456789
   * GET /api/v1/vehicle/policies?vehicleNumber=12345678
   */
  app.get('/api/v1/vehicle/policies', async (request, reply) => {
    try {
      const parsed = GetVehiclePoliciesSchema.parse({
        query: request.query,
      });

      if (!parsed.query.idNumber && !parsed.query.vehicleNumber) {
        return reply.status(400).send({ error: 'Either idNumber or vehicleNumber is required' });
      }

      let policies;
      if (parsed.query.idNumber) {
        policies = await integrationService.getVehiclePolicies(parsed.query.idNumber);
      } else {
        policies = await integrationService.getVehiclePoliciesByPlate(parsed.query.vehicleNumber!);
      }

      return { policies, count: policies.length };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      logger.error('Vehicle policies request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * קבלת היסטוריה ביטוחית של רכב
   * GET /api/v1/vehicle/:vehicleNumber/history
   */
  app.get('/api/v1/vehicle/:vehicleNumber/history', async (request, reply) => {
    try {
      const { vehicleNumber } = request.params as { vehicleNumber: string };
      
      const { harHabitouach } = integrationService as any;
      const history = await harHabitouach.getVehicleHistory(vehicleNumber);
      
      return history;
    } catch (error) {
      logger.error('Vehicle history request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================
  // PENSION
  // ============================================

  /**
   * קבלת חשבונות פנסיוניים
   * GET /api/v1/pension/accounts?idNumber=123456789
   */
  app.get('/api/v1/pension/accounts', async (request, reply) => {
    try {
      const parsed = GetPensionAccountsSchema.parse({
        query: request.query,
      });

      const accounts = await integrationService.getPensionAccounts(parsed.query.idNumber);
      
      return { 
        accounts, 
        count: accounts.length,
        total_balance: accounts.reduce((sum, a) => sum + (a.balance.total || 0), 0)
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      logger.error('Pension accounts request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * קבלת חשבון פנסיוני ספציפי
   * GET /api/v1/pension/accounts/:accountNumber
   */
  app.get('/api/v1/pension/accounts/:accountNumber', async (request, reply) => {
    try {
      const { accountNumber } = request.params as { accountNumber: string };
      
      const account = await integrationService.getPensionAccount(accountNumber);
      
      if (!account) {
        return reply.status(404).send({ error: 'Account not found' });
      }
      
      return account;
    } catch (error) {
      logger.error('Pension account request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * יצירת הסכמה לגישה למסלקה
   * POST /api/v1/pension/consent
   */
  app.post('/api/v1/pension/consent', async (request, reply) => {
    try {
      const parsed = CreateConsentSchema.parse({
        body: request.body,
      });

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parsed.body.validDays);

      const consent = await integrationService.createMislakaConsent(
        parsed.body.idNumber,
        validUntil.toISOString()
      );

      return { success: true, consent };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      logger.error('Create consent request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================
  // DATA SYNC
  // ============================================

  /**
   * סנכרון נתוני לקוח
   * POST /api/v1/sync/customer
   */
  app.post('/api/v1/sync/customer', async (request, reply) => {
    try {
      const parsed = SyncCustomerSchema.parse({
        body: request.body,
      });

      const result = await integrationService.syncCustomerData(
        parsed.body.customerId,
        parsed.body.idNumber
      );

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      logger.error('Customer sync request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * סנכרון כל הלקוחות (batch)
   * POST /api/v1/sync/batch
   */
  app.post('/api/v1/sync/batch', async (request, reply) => {
    try {
      const { customers } = request.body as {
        customers: Array<{ customerId: string; idNumber: string; agentId?: string }>;
      };

      if (!customers || !Array.isArray(customers)) {
        return reply.status(400).send({ error: 'customers array is required' });
      }

      const results = [];
      for (const customer of customers) {
        try {
          const result = await integrationService.syncCustomerData(
            customer.customerId,
            customer.idNumber
          );
          results.push({ customerId: customer.customerId, ...result });
        } catch (error) {
          results.push({
            customerId: customer.customerId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        total: customers.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      logger.error('Batch sync request failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // ============================================
  // COVERAGE GAPS
  // ============================================

  /**
   * ניתוח פערי כיסוי
   * GET /api/v1/analysis/gaps/:customerId?idNumber=123456789
   */
  app.get('/api/v1/analysis/gaps/:customerId', async (request, reply) => {
    try {
      const { customerId } = request.params as { customerId: string };
      const { idNumber } = request.query as { idNumber?: string };

      if (!idNumber) {
        return reply.status(400).send({ error: 'idNumber is required' });
      }

      const data = await integrationService.getCustomer360(customerId, idNumber);

      return {
        customerId,
        gaps: data.gaps_identified,
        total_coverage: data.total_coverage,
        total_premium_annual: data.total_premium_annual,
        total_pension_balance: data.total_pension_balance,
        risk_score: data.risk_score,
        analysis_date: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Coverage gaps analysis failed', { error });
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  logger.info('API routes registered');
}
