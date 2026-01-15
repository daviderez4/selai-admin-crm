/**
 * SELAI Insurance Integration Hub
 * API Routes V2 - Enhanced API endpoints
 *
 * New endpoints for:
 * - Quote comparison
 * - Coverage analysis
 * - Portfolio analytics
 * - Products catalog
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import {
  getQuoteComparisonService,
  QuoteComparisonRequest,
  RankingCriteria
} from '../services/quote-comparison.js';
import {
  getCoverageAnalyzer,
  CustomerProfile,
  PortfolioAnalysis
} from '../services/coverage-analyzer.js';
import { getCacheService } from '../services/cache-service.js';
import { getConnectorRegistry } from '../connectors/connector-registry.js';

// ============================================
// REQUEST SCHEMAS
// ============================================

const QuoteCompareRequestSchema = z.object({
  id_number: z.string().regex(/^\d{9}$/, 'Invalid Israeli ID number'),
  insurance_type: z.string(),
  coverage_amount: z.number().positive(),
  deductible: z.number().optional(),
  start_date: z.string(),
  customer_data: z.object({
    birth_date: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    occupation: z.string().optional(),
    city: z.string().optional()
  }).optional(),
  vehicle: z.object({
    vehicle_number: z.string().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    value: z.number().optional()
  }).optional(),
  home: z.object({
    size_sqm: z.number().optional(),
    floor: z.number().optional(),
    building_type: z.string().optional()
  }).optional(),
  carriers: z.array(z.string()).optional(),
  exclude_carriers: z.array(z.string()).optional()
});

const AnalyzePortfolioRequestSchema = z.object({
  customer_id: z.string().uuid(),
  id_number: z.string().regex(/^\d{9}$/),
  profile: z.object({
    age: z.number().optional(),
    has_dependents: z.boolean().optional(),
    owns_property: z.boolean().optional(),
    owns_vehicle: z.boolean().optional(),
    is_employed: z.boolean().optional(),
    income_bracket: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
    marital_status: z.string().optional()
  }).optional()
});

// ============================================
// ROUTE HANDLERS
// ============================================

export async function registerV2Routes(fastify: FastifyInstance): Promise<void> {
  // ============================================
  // QUOTES ENDPOINTS
  // ============================================

  /**
   * POST /api/v2/quotes/compare
   * Compare quotes from multiple carriers
   */
  fastify.post('/api/v2/quotes/compare', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = QuoteCompareRequestSchema.parse(request.body);

      const quoteService = getQuoteComparisonService();
      await quoteService.initialize();

      const comparisonRequest: QuoteComparisonRequest = {
        id_number: body.id_number,
        insurance_type: body.insurance_type,
        coverage: {
          amount: body.coverage_amount,
          deductible: body.deductible
        },
        start_date: body.start_date,
        customer_data: body.customer_data ? {
          birth_date: body.customer_data.birth_date,
          gender: body.customer_data.gender,
          occupation: body.customer_data.occupation,
          address: body.customer_data.city ? { city: body.customer_data.city } : undefined
        } : undefined,
        vehicle: body.vehicle,
        home: body.home,
        carriers: body.carriers,
        exclude_carriers: body.exclude_carriers
      };

      const result = await quoteService.compareQuotes(comparisonRequest);

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Quote comparison failed', { error });

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Quote comparison failed'
      });
    }
  });

  /**
   * GET /api/v2/quotes/:requestId
   * Get a saved quote comparison
   */
  fastify.get('/api/v2/quotes/:requestId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { requestId } = request.params as { requestId: string };

      const quoteService = getQuoteComparisonService();
      const result = await quoteService.getQuoteComparison(requestId);

      if (!result) {
        return reply.code(404).send({
          success: false,
          error: 'Quote comparison not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get quote failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve quote'
      });
    }
  });

  /**
   * POST /api/v2/quotes/:requestId/accept
   * Accept a quote from comparison
   */
  fastify.post('/api/v2/quotes/:requestId/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { requestId } = request.params as { requestId: string };
      const { quote_id, customer_id } = request.body as { quote_id: string; customer_id?: string };

      const quoteService = getQuoteComparisonService();
      const result = await quoteService.acceptQuote(requestId, quote_id, customer_id);

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Accept quote failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Failed to accept quote'
      });
    }
  });

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================

  /**
   * POST /api/v2/analytics/portfolio
   * Analyze customer's insurance portfolio
   */
  fastify.post('/api/v2/analytics/portfolio', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = AnalyzePortfolioRequestSchema.parse(request.body);

      const analyzer = getCoverageAnalyzer();
      await analyzer.initialize();

      // Get customer data from integration service
      // For now, we'll use the provided profile
      const profile: CustomerProfile = {
        id: body.customer_id,
        id_number: body.id_number,
        ...body.profile
      };

      // In a real implementation, we would fetch policies and pension accounts
      // from the integration service. For now, return a sample analysis.
      const analysis = await analyzer.analyzePortfolio(
        body.customer_id,
        profile,
        [], // policies - would come from integration service
        []  // pensionAccounts - would come from integration service
      );

      return reply.code(200).send({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Portfolio analysis failed', { error });

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Portfolio analysis failed'
      });
    }
  });

  /**
   * GET /api/v2/analytics/gaps/:customerId
   * Get coverage gaps for a customer
   */
  fastify.get('/api/v2/analytics/gaps/:customerId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { customerId } = request.params as { customerId: string };
      const { id_number } = request.query as { id_number?: string };

      if (!id_number) {
        return reply.code(400).send({
          success: false,
          error: 'id_number query parameter is required'
        });
      }

      const analyzer = getCoverageAnalyzer();
      await analyzer.initialize();

      // Simplified gap detection
      const profile: CustomerProfile = {
        id: customerId,
        id_number,
        has_dependents: true,
        is_employed: true
      };

      const gaps = analyzer.detectGaps(profile, [], []);

      return reply.code(200).send({
        success: true,
        data: {
          customer_id: customerId,
          gaps_count: gaps.length,
          gaps
        }
      });
    } catch (error) {
      logger.error('Gap analysis failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Gap analysis failed'
      });
    }
  });

  /**
   * GET /api/v2/analytics/score/:customerId
   * Get coverage score for a customer
   */
  fastify.get('/api/v2/analytics/score/:customerId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { customerId } = request.params as { customerId: string };

      const analyzer = getCoverageAnalyzer();
      await analyzer.initialize();

      const profile: CustomerProfile = {
        id: customerId,
        id_number: '000000000'
      };

      const score = analyzer.calculateCoverageScore(profile, [], [], []);

      return reply.code(200).send({
        success: true,
        data: {
          customer_id: customerId,
          score
        }
      });
    } catch (error) {
      logger.error('Score calculation failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Score calculation failed'
      });
    }
  });

  // ============================================
  // CONNECTORS ENDPOINTS
  // ============================================

  /**
   * GET /api/v2/connectors
   * Get all connector status
   */
  fastify.get('/api/v2/connectors', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const registry = getConnectorRegistry();
      const status = registry.getStatus();
      const stats = registry.getStats();

      return reply.code(200).send({
        success: true,
        data: {
          connectors: status,
          stats
        }
      });
    } catch (error) {
      logger.error('Get connectors failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Failed to get connectors'
      });
    }
  });

  /**
   * GET /api/v2/connectors/:code/health
   * Health check for specific connector
   */
  fastify.get('/api/v2/connectors/:code/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code } = request.params as { code: string };

      const registry = getConnectorRegistry();
      const health = await registry.healthCheck(code);

      if (!health) {
        return reply.code(404).send({
          success: false,
          error: 'Connector not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Connector health check failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Health check failed'
      });
    }
  });

  /**
   * POST /api/v2/connectors/health-check-all
   * Health check all connectors
   */
  fastify.post('/api/v2/connectors/health-check-all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const registry = getConnectorRegistry();
      const result = await registry.healthCheckAll();

      // Convert Map to object for JSON serialization
      const results: Record<string, any> = {};
      result.results.forEach((value, key) => {
        results[key] = value;
      });

      return reply.code(200).send({
        success: true,
        data: {
          timestamp: result.timestamp,
          duration_ms: result.duration_ms,
          summary: result.summary,
          results
        }
      });
    } catch (error) {
      logger.error('Health check all failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Health check failed'
      });
    }
  });

  // ============================================
  // CACHE ENDPOINTS
  // ============================================

  /**
   * GET /api/v2/cache/stats
   * Get cache statistics
   */
  fastify.get('/api/v2/cache/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cacheService = getCacheService();
      const stats = await cacheService.getStats();

      return reply.code(200).send({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get cache stats failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Failed to get cache stats'
      });
    }
  });

  /**
   * POST /api/v2/cache/invalidate/customer/:customerId
   * Invalidate customer cache
   */
  fastify.post('/api/v2/cache/invalidate/customer/:customerId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { customerId } = request.params as { customerId: string };

      const cacheService = getCacheService();
      await cacheService.invalidateCustomer(customerId);

      return reply.code(200).send({
        success: true,
        message: `Cache invalidated for customer ${customerId}`
      });
    } catch (error) {
      logger.error('Cache invalidation failed', { error });
      return reply.code(500).send({
        success: false,
        error: 'Cache invalidation failed'
      });
    }
  });

  logger.info('V2 routes registered');
}
