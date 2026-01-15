/**
 * SELAI Insurance Integration Hub
 * Test Helpers - Common testing utilities
 */

import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// MOCK DATA FACTORIES
// ============================================

export function createMockCustomer(overrides: Partial<any> = {}): any {
  return {
    id: uuidv4(),
    id_number: generateIsraeliId(),
    first_name: 'ישראל',
    last_name: 'ישראלי',
    email: `test-${Date.now()}@example.com`,
    phone: '+972-50-123-4567',
    birth_date: '1985-06-15T00:00:00.000Z',
    gender: 'male',
    marital_status: 'married',
    address: {
      street: 'הרצל',
      house_number: '10',
      city: 'תל אביב',
      zip_code: '6100001',
      country: 'IL'
    },
    occupation: 'מהנדס תוכנה',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

export function createMockPolicy(overrides: Partial<any> = {}): any {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    id: uuidv4(),
    policy_number: `POL-${Date.now()}`,
    customer_id: uuidv4(),
    insurance_type: 'car',
    insurance_company: 'הראל',
    insurance_company_code: 'HAREL',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    status: 'active',
    coverage: {
      primary_coverage: 500000,
      deductible: 1000
    },
    premium: {
      amount: 350,
      currency: 'ILS',
      frequency: 'monthly'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_system: 'test',
    ...overrides
  };
}

export function createMockPensionAccount(overrides: Partial<any> = {}): any {
  return {
    id: uuidv4(),
    account_number: `PEN-${Date.now()}`,
    customer_id: uuidv4(),
    account_type: 'pension_comprehensive',
    managing_company: 'מגדל',
    managing_company_code: '512',
    fund_name: 'מגדל מקיפה',
    balance: {
      total: 150000,
      severance: 50000,
      employer_contributions: 60000,
      employee_contributions: 30000,
      returns: 10000,
      as_of_date: new Date().toISOString()
    },
    contributions: {
      monthly_salary: 15000,
      employee_rate: 6,
      employer_rate: 6.5,
      severance_rate: 8.33
    },
    management_fees: {
      savings_fee_percent: 0.35,
      contributions_fee_percent: 2
    },
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_system: 'mislaka',
    ...overrides
  };
}

export function createMockClaim(overrides: Partial<any> = {}): any {
  return {
    id: uuidv4(),
    claim_number: `CLM-${Date.now()}`,
    policy_id: uuidv4(),
    customer_id: uuidv4(),
    type: 'vehicle_damage',
    description: 'נזק לרכב בתאונה',
    incident_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reported_date: new Date().toISOString(),
    claimed_amount: 5000,
    currency: 'ILS',
    status: 'submitted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_system: 'test',
    ...overrides
  };
}

export function createMockQuote(overrides: Partial<any> = {}): any {
  return {
    id: uuidv4(),
    request_id: uuidv4(),
    carrier_code: 'HAREL',
    carrier_name: 'הראל',
    insurance_type: 'car',
    coverage_amount: 500000,
    monthly_premium: 350,
    annual_premium: 4200,
    coverage_details: {
      comprehensive: true,
      third_party: true,
      medical: true
    },
    ranking_score: 85,
    rank_position: 1,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    ...overrides
  };
}

// ============================================
// ISRAELI ID GENERATOR
// ============================================

export function generateIsraeliId(): string {
  // Generate random 8 digits
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += Math.floor(Math.random() * 10);
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    let digit = parseInt(id[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return id + checkDigit;
}

// ============================================
// API TEST HELPERS
// ============================================

export interface TestContext {
  app: FastifyInstance;
  authToken?: string;
  apiKey?: string;
}

export async function createTestUser(ctx: TestContext): Promise<{
  userId: string;
  email: string;
  token: string;
}> {
  const email = `test-${Date.now()}@example.com`;

  // In real tests, this would create a user and get a token
  const token = 'test-jwt-token';

  return {
    userId: uuidv4(),
    email,
    token
  };
}

export async function makeAuthenticatedRequest(
  ctx: TestContext,
  method: string,
  url: string,
  body?: any
): Promise<any> {
  const headers: Record<string, string> = {};

  if (ctx.authToken) {
    headers['Authorization'] = `Bearer ${ctx.authToken}`;
  } else if (ctx.apiKey) {
    headers['X-API-Key'] = ctx.apiKey;
  }

  const response = await ctx.app.inject({
    method: method as any,
    url,
    headers,
    payload: body
  });

  return {
    statusCode: response.statusCode,
    body: JSON.parse(response.body)
  };
}

// ============================================
// ASSERTION HELPERS
// ============================================

export function expectSuccess(response: any): void {
  if (response.statusCode >= 400) {
    throw new Error(`Expected success but got ${response.statusCode}: ${JSON.stringify(response.body)}`);
  }
  if (response.body?.success === false) {
    throw new Error(`Response indicated failure: ${response.body.error}`);
  }
}

export function expectError(response: any, expectedCode?: string, expectedStatus?: number): void {
  if (expectedStatus && response.statusCode !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus} but got ${response.statusCode}`);
  }
  if (expectedCode && response.body?.code !== expectedCode) {
    throw new Error(`Expected error code ${expectedCode} but got ${response.body?.code}`);
  }
}

export function expectValidUUID(value: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`Expected valid UUID but got: ${value}`);
  }
}

export function expectValidIsraeliId(value: string): void {
  if (!/^\d{9}$/.test(value)) {
    throw new Error(`Expected 9-digit Israeli ID but got: ${value}`);
  }
}

// ============================================
// MOCK SERVICE HELPERS
// ============================================

export function createMockCacheService() {
  const cache = new Map<string, { value: string; expiry?: number }>();

  return {
    get: jest.fn(async (key: string) => {
      const item = cache.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        cache.delete(key);
        return null;
      }
      return item.value;
    }),
    set: jest.fn(async (key: string, value: string, ttl?: number) => {
      cache.set(key, {
        value,
        expiry: ttl ? Date.now() + ttl * 1000 : undefined
      });
    }),
    delete: jest.fn(async (key: string) => {
      cache.delete(key);
    }),
    increment: jest.fn(async (key: string) => {
      const current = parseInt(cache.get(key)?.value || '0', 10);
      cache.set(key, { value: String(current + 1) });
      return current + 1;
    }),
    clear: () => cache.clear()
  };
}

export function createMockEventBus() {
  const handlers = new Map<string, Function[]>();
  const publishedEvents: Array<{ topic: string; data: any }> = [];

  return {
    subscribe: jest.fn((topic: string, handler: Function) => {
      if (!handlers.has(topic)) {
        handlers.set(topic, []);
      }
      handlers.get(topic)!.push(handler);
    }),
    publish: jest.fn(async (topic: string, data: any) => {
      publishedEvents.push({ topic, data });
      const topicHandlers = handlers.get(topic) || [];
      for (const handler of topicHandlers) {
        await handler({ id: uuidv4(), type: topic, data, timestamp: new Date().toISOString() });
      }
    }),
    getPublishedEvents: () => publishedEvents,
    clearEvents: () => publishedEvents.length = 0
  };
}

// ============================================
// TIMING HELPERS
// ============================================

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

export function measureTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    resolve({ result, duration });
  });
}
