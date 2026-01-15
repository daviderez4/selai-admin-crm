/**
 * SELAI Insurance Integration Hub
 * Quote Comparison Service - שירות השוואת הצעות מחיר
 *
 * Provides multi-carrier quote comparison:
 * - Parallel quote fetching from multiple carriers
 * - Quote ranking by various criteria
 * - Total cost of ownership calculations
 * - Quote caching and history
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { getConnectorRegistry } from '../connectors/connector-registry.js';
import {
  IInsuranceConnector,
  IAggregatorConnector,
  QuoteRequest,
  ConnectorType,
  isInsuranceConnector,
  isAggregatorConnector
} from '../connectors/connector-interface.js';
import { Quote, InsuranceType } from '../models/canonical.js';
import { CacheService, getCacheService } from './cache-service.js';
import { EventBus, getEventBus } from './event-bus.js';

// ============================================
// TYPES
// ============================================

export interface QuoteComparisonRequest {
  customer_id?: string;
  id_number: string;
  insurance_type: string;
  coverage: {
    amount: number;
    deductible?: number;
    additional?: Record<string, any>;
  };
  start_date: string;
  customer_data?: {
    birth_date?: string;
    gender?: string;
    occupation?: string;
    address?: {
      city: string;
      street?: string;
    };
  };
  // Vehicle specific
  vehicle?: {
    vehicle_number?: string;
    make?: string;
    model?: string;
    year?: number;
    value?: number;
  };
  // Home specific
  home?: {
    size_sqm?: number;
    floor?: number;
    building_type?: string;
    construction_year?: number;
  };
  // Filtering
  carriers?: string[]; // Specific carriers to query
  exclude_carriers?: string[]; // Carriers to exclude
}

export interface QuoteComparisonResult {
  request_id: string;
  request: QuoteComparisonRequest;
  quotes: RankedQuote[];
  summary: {
    total_carriers_queried: number;
    successful_responses: number;
    failed_responses: number;
    lowest_premium: number;
    highest_premium: number;
    average_premium: number;
  };
  errors: Array<{
    carrier: string;
    error: string;
  }>;
  created_at: string;
  expires_at: string;
}

export interface RankedQuote extends Quote {
  rank: number;
  score: number;
  carrier_code: string;
  comparison_factors: {
    premium_score: number;      // 0-100, lower premium = higher score
    coverage_score: number;     // 0-100, more coverage = higher score
    deductible_score: number;   // 0-100, lower deductible = higher score
    carrier_rating?: number;    // External carrier rating
    value_score: number;        // Overall value (coverage/premium ratio)
  };
  tco?: TCOAnalysis;
}

export interface TCOAnalysis {
  years: number;
  total_premiums: number;
  estimated_claims_cost: number;
  total_cost: number;
  annual_average: number;
  monthly_average: number;
}

export interface RankingCriteria {
  premium_weight: number;      // Weight for premium (0-1)
  coverage_weight: number;     // Weight for coverage (0-1)
  deductible_weight: number;   // Weight for deductible (0-1)
  carrier_rating_weight: number; // Weight for carrier rating (0-1)
  sort_by: 'score' | 'premium' | 'coverage' | 'value';
  sort_order: 'asc' | 'desc';
}

// Default ranking criteria
const DEFAULT_RANKING_CRITERIA: RankingCriteria = {
  premium_weight: 0.4,
  coverage_weight: 0.3,
  deductible_weight: 0.15,
  carrier_rating_weight: 0.15,
  sort_by: 'score',
  sort_order: 'desc'
};

// ============================================
// QUOTE COMPARISON SERVICE
// ============================================

export class QuoteComparisonService {
  private static instance: QuoteComparisonService;
  private cacheService?: CacheService;
  private eventBus?: EventBus;

  private constructor() {}

  static getInstance(): QuoteComparisonService {
    if (!QuoteComparisonService.instance) {
      QuoteComparisonService.instance = new QuoteComparisonService();
    }
    return QuoteComparisonService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      this.cacheService = getCacheService();
      this.eventBus = getEventBus();
      logger.info('QuoteComparisonService initialized');
    } catch (error) {
      logger.warn('QuoteComparisonService: Optional services not available', { error });
    }
  }

  // ============================================
  // MAIN COMPARISON METHOD
  // ============================================

  /**
   * Get quotes from multiple carriers and compare them
   */
  async compareQuotes(
    request: QuoteComparisonRequest,
    criteria: Partial<RankingCriteria> = {}
  ): Promise<QuoteComparisonResult> {
    const requestId = uuidv4();
    const startTime = Date.now();
    const rankingCriteria = { ...DEFAULT_RANKING_CRITERIA, ...criteria };

    logger.info('QuoteComparison: Starting comparison', {
      requestId,
      insuranceType: request.insurance_type,
      coverage: request.coverage.amount
    });

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    if (this.cacheService) {
      const cached = await this.cacheService.get<QuoteComparisonResult>(cacheKey);
      if (cached && new Date(cached.expires_at) > new Date()) {
        logger.info('QuoteComparison: Returning cached result', { requestId });
        return cached;
      }
    }

    // Get available connectors
    const connectors = this.getAvailableConnectors(request);

    if (connectors.length === 0) {
      logger.warn('QuoteComparison: No connectors available');
      return this.createEmptyResult(requestId, request);
    }

    // Fetch quotes in parallel
    const quotePromises = connectors.map(connector =>
      this.fetchQuoteFromConnector(connector, request)
    );

    const results = await Promise.allSettled(quotePromises);

    // Process results
    const quotes: Quote[] = [];
    const errors: Array<{ carrier: string; error: string }> = [];

    results.forEach((result, index) => {
      const connectorCode = connectors[index].metadata.code;

      if (result.status === 'fulfilled' && result.value) {
        quotes.push(...result.value);
      } else if (result.status === 'rejected') {
        errors.push({
          carrier: connectorCode,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // Rank quotes
    const rankedQuotes = this.rankQuotes(quotes, rankingCriteria);

    // Calculate summary
    const premiums = rankedQuotes.map(q => q.premium.amount);
    const summary = {
      total_carriers_queried: connectors.length,
      successful_responses: quotes.length,
      failed_responses: errors.length,
      lowest_premium: premiums.length > 0 ? Math.min(...premiums) : 0,
      highest_premium: premiums.length > 0 ? Math.max(...premiums) : 0,
      average_premium: premiums.length > 0
        ? premiums.reduce((a, b) => a + b, 0) / premiums.length
        : 0
    };

    // Create result
    const result: QuoteComparisonResult = {
      request_id: requestId,
      request,
      quotes: rankedQuotes,
      summary,
      errors,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };

    // Cache result
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 1800); // 30 minutes
    }

    // Publish event
    if (this.eventBus) {
      await this.eventBus.publish('selai.quotes.received', {
        request_id: requestId,
        customer_id: request.customer_id,
        insurance_type: request.insurance_type,
        quotes_count: rankedQuotes.length,
        lowest_premium: summary.lowest_premium
      });
    }

    const duration = Date.now() - startTime;
    logger.info('QuoteComparison: Comparison complete', {
      requestId,
      duration,
      quotesFound: rankedQuotes.length,
      errors: errors.length
    });

    return result;
  }

  // ============================================
  // QUOTE FETCHING
  // ============================================

  /**
   * Get available connectors for the request
   */
  private getAvailableConnectors(
    request: QuoteComparisonRequest
  ): (IInsuranceConnector | IAggregatorConnector)[] {
    const registry = getConnectorRegistry();
    const connectors: (IInsuranceConnector | IAggregatorConnector)[] = [];

    // Get insurance carrier connectors
    const carriers = registry.getByType(ConnectorType.CARRIER);
    for (const connector of carriers) {
      if (!isInsuranceConnector(connector)) continue;

      // Filter by requested carriers
      if (request.carriers && !request.carriers.includes(connector.metadata.code)) {
        continue;
      }

      // Filter out excluded carriers
      if (request.exclude_carriers?.includes(connector.metadata.code)) {
        continue;
      }

      connectors.push(connector);
    }

    // Get aggregator connectors
    const aggregators = registry.getByType(ConnectorType.AGGREGATOR);
    for (const connector of aggregators) {
      if (isAggregatorConnector(connector)) {
        connectors.push(connector);
      }
    }

    return connectors;
  }

  /**
   * Fetch quote from a single connector
   */
  private async fetchQuoteFromConnector(
    connector: IInsuranceConnector | IAggregatorConnector,
    request: QuoteComparisonRequest
  ): Promise<Quote[]> {
    const quoteRequest: QuoteRequest = {
      insurance_type: request.insurance_type,
      customer_data: {
        id_number: request.id_number,
        birth_date: request.customer_data?.birth_date,
        gender: request.customer_data?.gender,
        occupation: request.customer_data?.occupation,
        address: request.customer_data?.address
      },
      coverage: {
        amount: request.coverage.amount,
        deductible: request.coverage.deductible,
        additional: request.coverage.additional
      },
      start_date: request.start_date,
      additional_data: {
        vehicle: request.vehicle,
        home: request.home
      }
    };

    try {
      if (isAggregatorConnector(connector)) {
        // Aggregator returns multiple quotes
        const result = await connector.getMultiCarrierQuotes(quoteRequest);
        if (result.success && result.data) {
          return result.data.map(q => ({
            ...q,
            insurance_company: q.insurance_company || connector.metadata.name
          }));
        }
      } else if (isInsuranceConnector(connector) && connector.getQuote) {
        // Single carrier quote
        const result = await connector.getQuote(quoteRequest);
        if (result.success && result.data) {
          return [{
            ...result.data,
            insurance_company: connector.metadata.name
          }];
        }
      }
    } catch (error) {
      logger.error(`QuoteComparison: Failed to fetch from ${connector.metadata.code}`, {
        error
      });
      throw error;
    }

    return [];
  }

  // ============================================
  // RANKING
  // ============================================

  /**
   * Rank quotes based on criteria
   */
  rankQuotes(quotes: Quote[], criteria: RankingCriteria): RankedQuote[] {
    if (quotes.length === 0) return [];

    // Calculate min/max for normalization
    const premiums = quotes.map(q => q.premium.amount);
    const coverages = quotes.map(q => q.coverage.primary_coverage);
    const deductibles = quotes.map(q => q.coverage.deductible || 0);

    const minPremium = Math.min(...premiums);
    const maxPremium = Math.max(...premiums);
    const minCoverage = Math.min(...coverages);
    const maxCoverage = Math.max(...coverages);
    const minDeductible = Math.min(...deductibles);
    const maxDeductible = Math.max(...deductibles);

    // Score and rank each quote
    const rankedQuotes: RankedQuote[] = quotes.map(quote => {
      // Calculate individual scores (0-100)
      const premiumScore = maxPremium === minPremium ? 100 :
        100 - ((quote.premium.amount - minPremium) / (maxPremium - minPremium)) * 100;

      const coverageScore = maxCoverage === minCoverage ? 100 :
        ((quote.coverage.primary_coverage - minCoverage) / (maxCoverage - minCoverage)) * 100;

      const deductible = quote.coverage.deductible || 0;
      const deductibleScore = maxDeductible === minDeductible ? 100 :
        100 - ((deductible - minDeductible) / (maxDeductible - minDeductible)) * 100;

      const carrierRating = this.getCarrierRating(quote.insurance_company);

      // Calculate value score (coverage per premium)
      const valueScore = quote.premium.amount > 0
        ? (quote.coverage.primary_coverage / quote.premium.amount) * 10
        : 0;

      // Calculate weighted total score
      const score =
        premiumScore * criteria.premium_weight +
        coverageScore * criteria.coverage_weight +
        deductibleScore * criteria.deductible_weight +
        (carrierRating || 75) * criteria.carrier_rating_weight;

      return {
        ...quote,
        rank: 0, // Will be set after sorting
        score: Math.round(score * 100) / 100,
        carrier_code: this.getCarrierCode(quote.insurance_company),
        comparison_factors: {
          premium_score: Math.round(premiumScore * 100) / 100,
          coverage_score: Math.round(coverageScore * 100) / 100,
          deductible_score: Math.round(deductibleScore * 100) / 100,
          carrier_rating: carrierRating,
          value_score: Math.round(valueScore * 100) / 100
        }
      };
    });

    // Sort based on criteria
    rankedQuotes.sort((a, b) => {
      let comparison = 0;

      switch (criteria.sort_by) {
        case 'premium':
          comparison = a.premium.amount - b.premium.amount;
          break;
        case 'coverage':
          comparison = b.coverage.primary_coverage - a.coverage.primary_coverage;
          break;
        case 'value':
          comparison = b.comparison_factors.value_score - a.comparison_factors.value_score;
          break;
        case 'score':
        default:
          comparison = b.score - a.score;
      }

      return criteria.sort_order === 'asc' ? comparison : -comparison;
    });

    // Assign ranks
    rankedQuotes.forEach((quote, index) => {
      quote.rank = index + 1;
    });

    return rankedQuotes;
  }

  // ============================================
  // TCO CALCULATION
  // ============================================

  /**
   * Calculate Total Cost of Ownership for a quote
   */
  calculateTCO(quote: Quote, years: number = 5): TCOAnalysis {
    // Annualize premium
    let annualPremium = quote.premium.amount;
    switch (quote.premium.frequency) {
      case 'monthly':
        annualPremium *= 12;
        break;
      case 'quarterly':
        annualPremium *= 4;
        break;
      case 'semi_annual':
        annualPremium *= 2;
        break;
    }

    const totalPremiums = annualPremium * years;

    // Estimate claims cost (industry average: 60-70% loss ratio)
    const estimatedClaimsCost = totalPremiums * 0.65;

    const totalCost = totalPremiums;
    const annualAverage = totalCost / years;
    const monthlyAverage = annualAverage / 12;

    return {
      years,
      total_premiums: Math.round(totalPremiums),
      estimated_claims_cost: Math.round(estimatedClaimsCost),
      total_cost: Math.round(totalCost),
      annual_average: Math.round(annualAverage),
      monthly_average: Math.round(monthlyAverage)
    };
  }

  /**
   * Add TCO analysis to ranked quotes
   */
  addTCOToQuotes(quotes: RankedQuote[], years: number = 5): RankedQuote[] {
    return quotes.map(quote => ({
      ...quote,
      tco: this.calculateTCO(quote, years)
    }));
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get carrier rating (placeholder - should integrate with external ratings)
   */
  private getCarrierRating(carrierName: string): number | undefined {
    // Placeholder ratings - should be replaced with actual data
    const ratings: Record<string, number> = {
      'כלל ביטוח': 85,
      'הראל ביטוח': 88,
      'מגדל ביטוח': 87,
      'הפניקס': 84,
      'מנורה מבטחים': 83,
      'איילון ביטוח': 80,
      'ביטוח ישיר': 82,
      'ליברה': 78,
      'AIG ישראל': 81
    };

    return ratings[carrierName];
  }

  /**
   * Get carrier code from name
   */
  private getCarrierCode(carrierName: string): string {
    const codes: Record<string, string> = {
      'כלל ביטוח': 'CLAL',
      'הראל ביטוח': 'HAREL',
      'מגדל ביטוח': 'MIGDAL',
      'הפניקס': 'PHOENIX',
      'מנורה מבטחים': 'MENORA',
      'איילון ביטוח': 'AYALON',
      'ביטוח ישיר': 'BITUACH_YASHIR',
      'ליברה': 'LIBRA',
      'AIG ישראל': 'AIG'
    };

    return codes[carrierName] || 'UNKNOWN';
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: QuoteComparisonRequest): string {
    const keyParts = [
      'quote',
      request.insurance_type,
      request.id_number,
      request.coverage.amount.toString(),
      request.start_date
    ];

    if (request.vehicle?.vehicle_number) {
      keyParts.push(request.vehicle.vehicle_number);
    }

    return keyParts.join(':');
  }

  /**
   * Create empty result
   */
  private createEmptyResult(
    requestId: string,
    request: QuoteComparisonRequest
  ): QuoteComparisonResult {
    return {
      request_id: requestId,
      request,
      quotes: [],
      summary: {
        total_carriers_queried: 0,
        successful_responses: 0,
        failed_responses: 0,
        lowest_premium: 0,
        highest_premium: 0,
        average_premium: 0
      },
      errors: [],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
  }

  // ============================================
  // QUOTE MANAGEMENT
  // ============================================

  /**
   * Get a saved quote comparison result
   */
  async getQuoteComparison(requestId: string): Promise<QuoteComparisonResult | null> {
    if (!this.cacheService) return null;

    return this.cacheService.get<QuoteComparisonResult>(`comparison:${requestId}`);
  }

  /**
   * Accept a quote
   */
  async acceptQuote(
    requestId: string,
    quoteId: string,
    customerId?: string
  ): Promise<{ success: boolean; message: string }> {
    logger.info('QuoteComparison: Accepting quote', { requestId, quoteId, customerId });

    // Publish event
    if (this.eventBus) {
      await this.eventBus.publish('selai.quotes.accepted', {
        request_id: requestId,
        quote_id: quoteId,
        customer_id: customerId,
        accepted_at: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: 'Quote accepted successfully'
    };
  }
}

// ============================================
// SINGLETON ACCESSOR
// ============================================

let _quoteComparisonService: QuoteComparisonService | null = null;

export function getQuoteComparisonService(): QuoteComparisonService {
  if (!_quoteComparisonService) {
    _quoteComparisonService = QuoteComparisonService.getInstance();
  }
  return _quoteComparisonService;
}
