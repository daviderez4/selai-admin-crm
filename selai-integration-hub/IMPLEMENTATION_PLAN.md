# SELAI Insurance Integration Hub - Complete Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for preparing the SELAI Integration Hub to connect to **any insurance data source** in the Israeli market. The system architecture is designed for extensibility, real-time data synchronization, and comprehensive coverage analysis.

---

## Current System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SELAI CRM (Base44)                              │
│                    Frontend / Agent Dashboard                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SELAI INTEGRATION HUB API                           │
│                        (Fastify + TypeScript)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Routes    │  │  Services   │  │   Models    │  │   Utils     │    │
│  │   (API)     │  │  (Business) │  │   (Zod)     │  │  (Logger)   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│                        CONNECTORS LAYER                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Har HaBituach│ │   Mislaka    │ │   Carriers   │ │  [Future]    │   │
│  │  (Vehicle)   │ │  (Pension)   │ │ (14 Israeli) │ │  Adapters    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                    │                │                │
                    ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         INFRASTRUCTURE                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   Supabase   │ │    Kafka     │ │    Redis     │ │     n8n      │   │
│  │ (PostgreSQL) │ │ (Events)     │ │  (Cache)     │ │ (Workflows)  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PART 1: COMPONENT MAPPING

### 1.1 Core Files & Their Functions

| File Path | Purpose | Key Functions |
|-----------|---------|---------------|
| `src/index.ts` | Server entry point | Application bootstrap, plugin registration |
| `src/api/routes.ts` | REST API endpoints | All HTTP route handlers |
| `src/models/canonical.ts` | Data schemas | Zod validation for all entities |
| `src/services/integration-service.ts` | Business logic orchestration | `getCustomer360()`, `syncCustomerData()`, `analyzeCoverageGaps()` |
| `src/services/supabase-sync.ts` | Database synchronization | `fullCustomerSync()`, `syncPolicies()`, `syncPensionAccounts()` |
| `src/services/event-bus.ts` | Event streaming | Kafka producer/consumer, event publishing |
| `src/utils/logger.ts` | Logging | Winston-based structured logging |
| `src/connectors/carrier-adapter.ts` | Base connector interface | Abstract adapter for all carriers |
| `src/connectors/har-habitoach/connector.ts` | Vehicle insurance | `getPoliciesByOwnerId()`, `getVehicleHistory()` |
| `src/connectors/mislaka/connector.ts` | Pension data | `getPensionAccounts()`, `createConsent()` |
| `src/connectors/carriers/israeli-carriers.ts` | Israeli carriers | 14 carrier implementations |

### 1.2 Data Models (Zod Schemas)

| Model | Location | Description |
|-------|----------|-------------|
| `CustomerSchema` | `canonical.ts:L15-45` | Customer personal data |
| `PolicySchema` | `canonical.ts:L50-100` | Insurance policy structure |
| `PensionAccountSchema` | `canonical.ts:L105-170` | Pension/provident funds |
| `ClaimSchema` | `canonical.ts:L175-220` | Insurance claims |
| `QuoteSchema` | `canonical.ts:L225-270` | Premium quotes |
| `CommissionSchema` | `canonical.ts:L275-310` | Agent commissions |
| `PaymentSchema` | `canonical.ts:L315-355` | Payment records |
| `ConsentSchema` | `canonical.ts:L360-400` | Data consent management |

### 1.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/connectors` | GET | Connector status |
| `/api/v1/customers/:customerId/360` | GET | Full customer view |
| `/api/v1/vehicle/policies` | GET | Vehicle policies by ID |
| `/api/v1/vehicle/:vehicleNumber/history` | GET | Vehicle insurance history |
| `/api/v1/pension/accounts` | GET | Pension accounts by ID |
| `/api/v1/pension/accounts/:accountNumber` | GET | Specific pension account |
| `/api/v1/pension/consent` | POST | Create data consent |
| `/api/v1/sync/customer` | POST | Trigger customer sync |
| `/api/v1/sync/batch` | POST | Batch sync multiple customers |
| `/api/v1/analysis/gaps/:customerId` | GET | Coverage gap analysis |

### 1.4 Database Tables

| Table | Description | Indexes |
|-------|-------------|---------|
| `external_policies` | All insurance policies | contact_id, agent_id, status, type |
| `pension_accounts` | Pension & provident funds | contact_id, account_type, status |
| `external_claims` | Insurance claims | external_policy_id, contact_id |
| `data_sync_log` | Sync audit trail | contact_id, created_at |
| `data_consents` | Customer consents | contact_id, consent_type |

### 1.5 Event Topics (Kafka)

| Topic | Description |
|-------|-------------|
| `selai.policies.updated` | Policy changes |
| `selai.policies.created` | New policies |
| `selai.policies.cancelled` | Policy cancellations |
| `selai.claims.submitted` | New claims |
| `selai.claims.status_changed` | Claim updates |
| `selai.payments.due` | Upcoming payments |
| `selai.commissions.calculated` | Commission events |
| `selai.customers.synced` | Sync completions |
| `selai.customers.gaps_detected` | Coverage gaps found |
| `selai.pension.balance_updated` | Pension changes |
| `selai.dlq` | Dead letter queue |

---

## PART 2: IMPLEMENTATION TASKS

### Phase 1: Foundation & Infrastructure

#### 1.1 Complete Connector Interface Enhancement
**Location:** `src/connectors/connector-interface.ts` (NEW)

```typescript
// Create unified connector interface
interface IInsuranceConnector {
  // Identity
  readonly name: string;
  readonly code: string;
  readonly type: ConnectorType;

  // Lifecycle
  initialize(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  shutdown(): Promise<void>;

  // Data Operations
  getPolicies(customerId: string, options?: QueryOptions): Promise<Policy[]>;
  getClaims(customerId: string, options?: QueryOptions): Promise<Claim[]>;
  getPayments(customerId: string, options?: QueryOptions): Promise<Payment[]>;

  // Mutations
  submitClaim?(request: ClaimRequest): Promise<ClaimResponse>;
  createPolicy?(request: PolicyRequest): Promise<PolicyResponse>;
}
```

**Tasks:**
- [ ] Create `connector-interface.ts` with unified interface
- [ ] Add `ConnectorType` enum (VEHICLE, PENSION, HEALTH, LIFE, GENERAL)
- [ ] Define `QueryOptions` for pagination, filtering, date ranges
- [ ] Add `HealthStatus` interface with detailed status reporting

#### 1.2 Connector Registry System
**Location:** `src/services/connector-registry.ts` (NEW)

```typescript
// Central registry for all connectors
class ConnectorRegistry {
  private connectors: Map<string, IInsuranceConnector>;

  register(connector: IInsuranceConnector): void;
  unregister(connectorCode: string): void;
  get(connectorCode: string): IInsuranceConnector;
  getByType(type: ConnectorType): IInsuranceConnector[];
  healthCheckAll(): Promise<Map<string, HealthStatus>>;
  initializeAll(): Promise<void>;
}
```

**Tasks:**
- [ ] Create `connector-registry.ts`
- [ ] Implement auto-discovery of connectors
- [ ] Add connector lifecycle management
- [ ] Implement parallel initialization

#### 1.3 Configuration Management
**Location:** `src/config/` (NEW directory)

**Tasks:**
- [ ] Create `src/config/index.ts` - Central config loader
- [ ] Create `src/config/connectors.ts` - Connector-specific configs
- [ ] Create `src/config/database.ts` - Database configs
- [ ] Create `src/config/kafka.ts` - Kafka configs
- [ ] Create `src/config/redis.ts` - Redis configs
- [ ] Add config validation using Zod

---

### Phase 2: Enhanced Data Models

#### 2.1 Extended Insurance Types
**Location:** `src/models/canonical.ts`

**New Insurance Types to Add:**
```typescript
enum InsuranceType {
  // Existing
  CAR = 'car',
  HOME = 'home',
  HEALTH = 'health',
  LIFE = 'life',
  PENSION = 'pension',
  PROVIDENT_FUND = 'provident_fund',

  // New Types
  MORTGAGE = 'mortgage',              // ביטוח משכנתא
  TRAVEL = 'travel',                  // ביטוח נסיעות
  BUSINESS = 'business',              // ביטוח עסקי
  PROFESSIONAL_LIABILITY = 'professional_liability', // אחריות מקצועית
  DIRECTORS_OFFICERS = 'directors_officers', // D&O
  CYBER = 'cyber',                    // ביטוח סייבר
  PET = 'pet',                        // ביטוח חיות מחמד
  MARINE = 'marine',                  // ביטוח ימי
  ENGINEERING = 'engineering',        // ביטוח הנדסי
  CREDIT = 'credit',                  // ביטוח אשראי
  AGRICULTURAL = 'agricultural',      // ביטוח חקלאי
  ACCIDENT = 'accident',              // תאונות אישיות
  CRITICAL_ILLNESS = 'critical_illness', // מחלות קשות
  DISABILITY = 'disability',          // אובדן כושר עבודה
  LONG_TERM_CARE = 'long_term_care',  // סיעוד
}
```

**Tasks:**
- [ ] Add new insurance types to enum
- [ ] Create type-specific schemas for each insurance type
- [ ] Add Hebrew display names mapping
- [ ] Create validation rules per type

#### 2.2 Product Catalog Schema
**Location:** `src/models/products.ts` (NEW)

```typescript
const ProductSchema = z.object({
  product_id: z.string().uuid(),
  carrier_code: z.string(),
  carrier_name: z.string(),
  insurance_type: InsuranceTypeSchema,
  product_name: z.string(),
  product_code: z.string(),
  description: z.string().optional(),

  // Eligibility
  min_age: z.number().optional(),
  max_age: z.number().optional(),
  required_consents: z.array(z.string()),

  // Coverage Options
  coverage_options: z.array(CoverageOptionSchema),

  // Pricing
  pricing_model: z.enum(['FIXED', 'CALCULATED', 'QUOTED']),
  base_premium: z.number().optional(),

  // Availability
  is_active: z.boolean(),
  available_from: z.string().datetime(),
  available_until: z.string().datetime().optional(),
});
```

**Tasks:**
- [ ] Create `products.ts` with product schemas
- [ ] Add `CoverageOptionSchema` for coverage variants
- [ ] Create product-to-carrier mapping

#### 2.3 Enhanced Customer Profile
**Location:** `src/models/canonical.ts`

**New Fields:**
```typescript
const EnhancedCustomerSchema = CustomerSchema.extend({
  // Risk Profile
  risk_score: z.number().min(0).max(100).optional(),
  risk_factors: z.array(z.string()).optional(),

  // Financial Profile
  income_bracket: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).optional(),
  credit_score: z.number().optional(),

  // Insurance Profile
  insurance_history_years: z.number().optional(),
  claims_history_count: z.number().optional(),
  total_coverage_value: z.number().optional(),

  // Preferences
  preferred_carriers: z.array(z.string()).optional(),
  communication_preferences: CommunicationPreferencesSchema.optional(),
});
```

**Tasks:**
- [ ] Extend customer schema with risk profile
- [ ] Add financial profile fields
- [ ] Create communication preferences schema
- [ ] Add insurance preferences

---

### Phase 3: Additional Data Source Connectors

#### 3.1 Surense Aggregator Connector
**Location:** `src/connectors/surense/connector.ts` (NEW)

```typescript
// Surense - Insurance comparison aggregator
class SurenseConnector implements IInsuranceConnector {
  name = 'Surense';
  code = 'SURENSE';
  type = ConnectorType.GENERAL;

  // Get quotes from multiple carriers
  async getQuotes(request: QuoteRequest): Promise<Quote[]>;

  // Get customer policies through Surense
  async getCustomerPolicies(customerId: string): Promise<Policy[]>;

  // Submit application through Surense
  async submitApplication(application: ApplicationRequest): Promise<ApplicationResponse>;
}
```

**Tasks:**
- [ ] Create `src/connectors/surense/connector.ts`
- [ ] Implement OAuth2 authentication
- [ ] Add quote comparison logic
- [ ] Create response mapping to canonical models

#### 3.2 MOH (Ministry of Health) Connector
**Location:** `src/connectors/moh/connector.ts` (NEW)

```typescript
// Ministry of Health - Health insurance registry
class MOHConnector implements IInsuranceConnector {
  name = 'Ministry of Health';
  code = 'MOH';
  type = ConnectorType.HEALTH;

  // Get health fund membership
  async getHealthFundMembership(customerId: string): Promise<HealthFundMembership>;

  // Get supplementary health insurance
  async getSupplementaryInsurance(customerId: string): Promise<HealthInsurance[]>;
}
```

**Tasks:**
- [ ] Create `src/connectors/moh/connector.ts`
- [ ] Research MOH API documentation
- [ ] Implement health fund data retrieval
- [ ] Add supplementary insurance support

#### 3.3 Government Vehicle Registry Connector
**Location:** `src/connectors/vehicle-registry/connector.ts` (NEW)

```typescript
// Vehicle registry - Ministry of Transport
class VehicleRegistryConnector {
  // Get vehicle ownership
  async getVehicleOwnership(vehicleNumber: string): Promise<VehicleOwnership>;

  // Get vehicle details
  async getVehicleDetails(vehicleNumber: string): Promise<VehicleDetails>;

  // Get vehicle test history (טסט)
  async getVehicleTestHistory(vehicleNumber: string): Promise<VehicleTest[]>;
}
```

**Tasks:**
- [ ] Create `src/connectors/vehicle-registry/connector.ts`
- [ ] Implement government API integration
- [ ] Add vehicle verification logic

#### 3.4 Bank Integration Connector
**Location:** `src/connectors/banks/connector.ts` (NEW)

```typescript
// Open Banking integration
class BankConnector implements IInsuranceConnector {
  name = 'Bank Integration';
  code = 'BANK';

  // Get mortgage insurance
  async getMortgageInsurance(customerId: string): Promise<MortgageInsurance[]>;

  // Get direct debit details
  async getDirectDebitStatus(customerId: string): Promise<DirectDebitStatus>;
}
```

**Tasks:**
- [ ] Create `src/connectors/banks/connector.ts`
- [ ] Research Open Banking Israel APIs
- [ ] Implement mortgage insurance retrieval

---

### Phase 4: Enhanced API Endpoints

#### 4.1 New REST Endpoints
**Location:** `src/api/routes.ts`

**New Endpoints:**

```typescript
// Product Catalog
GET /api/v1/products                          // List all products
GET /api/v1/products/:productId               // Product details
GET /api/v1/products/search                   // Search products

// Quotes
POST /api/v1/quotes/compare                   // Multi-carrier quote comparison
GET /api/v1/quotes/:quoteId                   // Get saved quote
POST /api/v1/quotes/:quoteId/accept           // Accept quote

// Applications
POST /api/v1/applications                     // Submit new application
GET /api/v1/applications/:applicationId       // Application status
POST /api/v1/applications/:applicationId/documents  // Upload documents

// Claims
POST /api/v1/claims                           // Submit FNOL
GET /api/v1/claims/:claimId                   // Claim details
PUT /api/v1/claims/:claimId                   // Update claim
GET /api/v1/customers/:customerId/claims      // Customer claims history

// Commissions
GET /api/v1/commissions                       // Agent commissions
GET /api/v1/commissions/summary               // Commission summary
GET /api/v1/commissions/:commissionId         // Commission details

// Analytics
GET /api/v1/analytics/coverage-score/:customerId  // Coverage adequacy score
GET /api/v1/analytics/portfolio/:customerId       // Portfolio analysis
GET /api/v1/analytics/recommendations/:customerId // Personalized recommendations

// Admin
GET /api/v1/admin/connectors                  // Connector management
POST /api/v1/admin/connectors/:code/refresh   // Force connector refresh
GET /api/v1/admin/sync-status                 // Sync status dashboard
```

**Tasks:**
- [ ] Add product catalog endpoints
- [ ] Implement quote comparison API
- [ ] Create application submission flow
- [ ] Add claims management endpoints
- [ ] Implement commission reporting
- [ ] Create analytics endpoints
- [ ] Add admin management APIs

#### 4.2 GraphQL API (Optional Enhancement)
**Location:** `src/api/graphql/` (NEW directory)

**Tasks:**
- [ ] Evaluate GraphQL necessity
- [ ] Create schema definitions
- [ ] Implement resolvers
- [ ] Add DataLoader for batching

---

### Phase 5: Advanced Services

#### 5.1 Coverage Analysis Engine
**Location:** `src/services/coverage-analyzer.ts` (NEW)

```typescript
class CoverageAnalyzer {
  // Analyze customer's full insurance portfolio
  async analyzePortfolio(customerId: string): Promise<PortfolioAnalysis>;

  // Detect coverage gaps
  async detectGaps(customerId: string): Promise<CoverageGap[]>;

  // Calculate coverage score (0-100)
  async calculateCoverageScore(customerId: string): Promise<CoverageScore>;

  // Generate recommendations
  async generateRecommendations(customerId: string): Promise<Recommendation[]>;

  // Risk assessment
  async assessRisk(customerId: string): Promise<RiskAssessment>;
}
```

**Gap Detection Rules:**
```typescript
const GAP_RULES = [
  { type: 'LIFE', rule: 'No life insurance AND age > 25 AND has_dependents' },
  { type: 'HOME', rule: 'No home insurance AND owns_property' },
  { type: 'HEALTH', rule: 'No supplementary health AND income > threshold' },
  { type: 'DISABILITY', rule: 'No disability coverage AND is_employed' },
  { type: 'LONG_TERM_CARE', rule: 'No LTC AND age > 50' },
  { type: 'PENSION_FEE', rule: 'Pension fees > 0.5%' },
  { type: 'PENSION_COVERAGE', rule: 'Pension without disability/death coverage' },
  { type: 'VEHICLE_COMPREHENSIVE', rule: 'Vehicle > 3 years old without comprehensive' },
];
```

**Tasks:**
- [ ] Create `coverage-analyzer.ts`
- [ ] Implement gap detection rules engine
- [ ] Add coverage scoring algorithm
- [ ] Create recommendation generator
- [ ] Implement risk assessment logic

#### 5.2 Quote Comparison Service
**Location:** `src/services/quote-comparison.ts` (NEW)

```typescript
class QuoteComparisonService {
  // Get quotes from all relevant carriers
  async getMultiCarrierQuotes(request: QuoteRequest): Promise<QuoteComparison>;

  // Rank quotes by criteria
  async rankQuotes(quotes: Quote[], criteria: RankingCriteria): Promise<RankedQuote[]>;

  // Calculate total cost of ownership
  async calculateTCO(quote: Quote, years: number): Promise<TCOAnalysis>;
}
```

**Tasks:**
- [ ] Create `quote-comparison.ts`
- [ ] Implement parallel quote fetching
- [ ] Add ranking algorithms
- [ ] Create TCO calculator

#### 5.3 Document Management Service
**Location:** `src/services/document-service.ts` (NEW)

```typescript
class DocumentService {
  // Upload document
  async uploadDocument(file: Buffer, metadata: DocumentMetadata): Promise<Document>;

  // Download from carrier
  async downloadFromCarrier(carrierCode: string, documentId: string): Promise<Buffer>;

  // Parse policy document (OCR/AI)
  async parseDocument(documentId: string): Promise<ParsedDocument>;

  // Generate document (e.g., coverage summary)
  async generateDocument(type: DocumentType, data: any): Promise<Buffer>;
}
```

**Tasks:**
- [ ] Create `document-service.ts`
- [ ] Integrate with Supabase Storage
- [ ] Add document parsing (OCR)
- [ ] Implement document generation

#### 5.4 Notification Service
**Location:** `src/services/notification-service.ts` (NEW)

```typescript
class NotificationService {
  // Send notifications
  async sendNotification(notification: Notification): Promise<void>;

  // Schedule reminder
  async scheduleReminder(reminder: Reminder): Promise<string>;

  // Process Kafka events into notifications
  async processEvent(event: InsuranceEvent): Promise<void>;
}
```

**Notification Types:**
- Policy expiry reminders
- Payment due alerts
- Claim status updates
- Coverage gap alerts
- Renewal opportunities

**Tasks:**
- [ ] Create `notification-service.ts`
- [ ] Integrate with email service
- [ ] Add SMS integration
- [ ] Create push notification support
- [ ] Implement reminder scheduling

---

### Phase 6: Database Enhancements

#### 6.1 New Database Tables
**Location:** `db/migrations/002_enhanced_tables.sql` (NEW)

```sql
-- Insurance Products Catalog
CREATE TABLE insurance_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_code VARCHAR(10) NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  insurance_type VARCHAR(50) NOT NULL,
  description TEXT,
  coverage_options JSONB,
  pricing_model VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(carrier_code, product_code)
);

-- Quote History
CREATE TABLE quote_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id),
  agent_id UUID REFERENCES users(id),
  insurance_type VARCHAR(50) NOT NULL,
  request_data JSONB NOT NULL,
  quotes JSONB NOT NULL,
  selected_quote_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Applications
CREATE TABLE insurance_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id),
  agent_id UUID REFERENCES users(id),
  quote_id UUID REFERENCES quote_history(id),
  carrier_code VARCHAR(10) NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',
  application_data JSONB NOT NULL,
  documents JSONB,
  submitted_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  decision_reason TEXT,
  policy_id UUID REFERENCES external_policies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coverage Analysis Results
CREATE TABLE coverage_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id),
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  coverage_score INTEGER,
  total_coverage_amount DECIMAL(15,2),
  gaps JSONB,
  recommendations JSONB,
  risk_assessment JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id),
  agent_id UUID REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  subject VARCHAR(255),
  content TEXT,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Performance Metrics
CREATE TABLE agent_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id),
  metric_date DATE NOT NULL,
  policies_sold INTEGER DEFAULT 0,
  total_premium DECIMAL(15,2) DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,
  quotes_generated INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, metric_date)
);
```

**Tasks:**
- [ ] Create migration file `002_enhanced_tables.sql`
- [ ] Add RLS policies for new tables
- [ ] Create indexes for performance
- [ ] Add triggers for updated_at

#### 6.2 Database Views Enhancement
**Location:** `db/migrations/003_views.sql` (NEW)

```sql
-- Agent Dashboard View
CREATE VIEW agent_dashboard AS
SELECT
  u.id AS agent_id,
  u.name AS agent_name,
  COUNT(DISTINCT c.id) AS total_customers,
  COUNT(DISTINCT ep.id) AS total_policies,
  SUM(ep.premium_amount * CASE
    WHEN ep.premium_frequency = 'monthly' THEN 12
    WHEN ep.premium_frequency = 'quarterly' THEN 4
    WHEN ep.premium_frequency = 'semi_annual' THEN 2
    ELSE 1 END
  ) AS annual_premium_total,
  COUNT(DISTINCT pa.id) AS pension_accounts,
  SUM(pa.balance_total) AS total_pension_balance
FROM users u
LEFT JOIN contacts c ON c.agent_id = u.id
LEFT JOIN external_policies ep ON ep.agent_id = u.id AND ep.status = 'active'
LEFT JOIN pension_accounts pa ON pa.agent_id = u.id AND pa.status = 'active'
GROUP BY u.id, u.name;

-- Policy Expiry Alert View
CREATE VIEW policy_expiry_alerts AS
SELECT
  ep.id,
  ep.policy_number,
  ep.insurance_type,
  ep.insurance_company,
  ep.end_date,
  ep.contact_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  c.phone,
  c.email,
  ep.agent_id,
  ep.end_date - CURRENT_DATE AS days_until_expiry
FROM external_policies ep
JOIN contacts c ON c.id = ep.contact_id
WHERE ep.status = 'active'
  AND ep.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
ORDER BY ep.end_date;
```

**Tasks:**
- [ ] Create migration file `003_views.sql`
- [ ] Add agent dashboard view
- [ ] Create expiry alerts view
- [ ] Add commission summary view

---

### Phase 7: Event-Driven Architecture Enhancement

#### 7.1 New Kafka Topics
**Location:** `src/services/event-bus.ts`

**New Topics:**
```typescript
enum EventTopic {
  // Existing topics...

  // New topics
  QUOTE_REQUESTED = 'selai.quotes.requested',
  QUOTE_RECEIVED = 'selai.quotes.received',
  QUOTE_ACCEPTED = 'selai.quotes.accepted',

  APPLICATION_SUBMITTED = 'selai.applications.submitted',
  APPLICATION_APPROVED = 'selai.applications.approved',
  APPLICATION_REJECTED = 'selai.applications.rejected',

  DOCUMENT_UPLOADED = 'selai.documents.uploaded',
  DOCUMENT_PROCESSED = 'selai.documents.processed',

  NOTIFICATION_SENT = 'selai.notifications.sent',
  REMINDER_DUE = 'selai.reminders.due',

  CONNECTOR_STATUS_CHANGED = 'selai.system.connector_status',
  SYNC_COMPLETED = 'selai.system.sync_completed',
  SYNC_FAILED = 'selai.system.sync_failed',
}
```

**Tasks:**
- [ ] Add new event topics
- [ ] Create event schemas for each topic
- [ ] Implement event consumers
- [ ] Add event handlers for business logic

#### 7.2 Event Consumers
**Location:** `src/consumers/` (NEW directory)

```typescript
// src/consumers/notification-consumer.ts
class NotificationConsumer {
  async handlePolicyExpiry(event: PolicyEvent): Promise<void>;
  async handleClaimStatusChange(event: ClaimEvent): Promise<void>;
  async handlePaymentDue(event: PaymentEvent): Promise<void>;
}

// src/consumers/sync-consumer.ts
class SyncConsumer {
  async handleSyncRequest(event: SyncEvent): Promise<void>;
  async handleConnectorStatusChange(event: ConnectorEvent): Promise<void>;
}
```

**Tasks:**
- [ ] Create `src/consumers/` directory
- [ ] Implement notification consumer
- [ ] Create sync consumer
- [ ] Add analytics consumer

---

### Phase 8: Caching & Performance

#### 8.1 Redis Caching Layer
**Location:** `src/services/cache-service.ts` (NEW)

```typescript
class CacheService {
  // Cache customer data
  async cacheCustomer360(customerId: string, data: Customer360): Promise<void>;
  async getCustomer360(customerId: string): Promise<Customer360 | null>;

  // Cache quotes
  async cacheQuotes(requestHash: string, quotes: Quote[]): Promise<void>;
  async getQuotes(requestHash: string): Promise<Quote[] | null>;

  // Cache connector responses
  async cacheConnectorResponse(key: string, response: any, ttl: number): Promise<void>;

  // Invalidation
  async invalidateCustomer(customerId: string): Promise<void>;
  async invalidateConnector(connectorCode: string): Promise<void>;
}
```

**Cache Keys:**
```
customer:360:{customerId}           TTL: 5 minutes
customer:policies:{customerId}      TTL: 5 minutes
customer:pension:{customerId}       TTL: 5 minutes
quotes:{requestHash}                TTL: 30 minutes
connector:token:{connectorCode}     TTL: 55 minutes
connector:health:{connectorCode}    TTL: 1 minute
```

**Tasks:**
- [ ] Create `cache-service.ts`
- [ ] Implement cache-aside pattern
- [ ] Add cache invalidation strategies
- [ ] Create cache warming jobs

#### 8.2 Rate Limiting Enhancement
**Location:** `src/middleware/rate-limiter.ts` (NEW)

```typescript
// Per-client rate limiting
const rateLimitConfig = {
  global: { max: 1000, window: '1m' },
  perClient: { max: 100, window: '1m' },
  perEndpoint: {
    '/api/v1/quotes/compare': { max: 10, window: '1m' },
    '/api/v1/sync/batch': { max: 5, window: '1m' },
  }
};
```

**Tasks:**
- [ ] Create advanced rate limiter
- [ ] Add per-client tracking
- [ ] Implement endpoint-specific limits
- [ ] Add rate limit headers

---

### Phase 9: Security Enhancements

#### 9.1 JWT Authentication
**Location:** `src/middleware/auth.ts` (NEW)

```typescript
interface JWTPayload {
  sub: string;          // User ID
  role: UserRole;       // admin, agent, supervisor
  tenant_id: string;    // Multi-tenant support
  permissions: string[];
  exp: number;
  iat: number;
}

class AuthMiddleware {
  async verifyToken(token: string): Promise<JWTPayload>;
  async refreshToken(refreshToken: string): Promise<TokenPair>;
  checkPermission(required: string): Middleware;
  checkRole(roles: UserRole[]): Middleware;
}
```

**Tasks:**
- [ ] Create `auth.ts` middleware
- [ ] Implement JWT verification
- [ ] Add refresh token flow
- [ ] Create permission checking

#### 9.2 API Key Management
**Location:** `src/services/api-key-service.ts` (NEW)

```typescript
class APIKeyService {
  async createKey(clientId: string, permissions: string[]): Promise<APIKey>;
  async validateKey(key: string): Promise<APIKeyValidation>;
  async revokeKey(keyId: string): Promise<void>;
  async rotateKey(keyId: string): Promise<APIKey>;
}
```

**Tasks:**
- [ ] Create API key service
- [ ] Implement key generation
- [ ] Add key validation
- [ ] Create key rotation

#### 9.3 Data Encryption
**Location:** `src/utils/encryption.ts` (NEW)

```typescript
class EncryptionService {
  // Encrypt sensitive data (ID numbers, bank details)
  async encrypt(data: string): Promise<string>;
  async decrypt(encrypted: string): Promise<string>;

  // Hash for comparison
  hashIdNumber(idNumber: string): string;
}
```

**Tasks:**
- [ ] Create encryption service
- [ ] Implement field-level encryption
- [ ] Add key management
- [ ] Create secure hashing

---

### Phase 10: Monitoring & Observability

#### 10.1 Metrics Collection
**Location:** `src/services/metrics-service.ts` (NEW)

```typescript
// Prometheus-compatible metrics
const metrics = {
  // API metrics
  http_requests_total: Counter,
  http_request_duration_seconds: Histogram,

  // Connector metrics
  connector_requests_total: Counter,
  connector_errors_total: Counter,
  connector_latency_seconds: Histogram,

  // Business metrics
  policies_synced_total: Counter,
  gaps_detected_total: Counter,
  quotes_generated_total: Counter,
};
```

**Tasks:**
- [ ] Create metrics service
- [ ] Add Prometheus endpoint
- [ ] Implement custom metrics
- [ ] Create Grafana dashboards

#### 10.2 Health Checks Enhancement
**Location:** `src/api/health.ts` (NEW)

```typescript
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
    kafka: ComponentHealth;
    connectors: Record<string, ComponentHealth>;
  };
  version: string;
  uptime: number;
}
```

**Tasks:**
- [ ] Create comprehensive health checks
- [ ] Add component-level status
- [ ] Implement readiness/liveness probes
- [ ] Create status page endpoint

---

## PART 3: COMPLETE FILE STRUCTURE

```
src/
├── api/
│   ├── routes.ts                    # [EXISTING] REST routes
│   ├── health.ts                    # [NEW] Health endpoints
│   └── graphql/                     # [NEW] GraphQL (optional)
│       ├── schema.ts
│       └── resolvers.ts
│
├── config/                          # [NEW] Configuration
│   ├── index.ts
│   ├── connectors.ts
│   ├── database.ts
│   ├── kafka.ts
│   └── redis.ts
│
├── connectors/
│   ├── connector-interface.ts       # [NEW] Unified interface
│   ├── connector-registry.ts        # [NEW] Registry system
│   ├── carrier-adapter.ts           # [EXISTING] Base adapter
│   ├── har-habitoach/
│   │   └── connector.ts             # [EXISTING] Vehicle insurance
│   ├── mislaka/
│   │   └── connector.ts             # [EXISTING] Pension data
│   ├── carriers/
│   │   └── israeli-carriers.ts      # [EXISTING] 14 carriers
│   ├── surense/                     # [NEW]
│   │   └── connector.ts             # Insurance aggregator
│   ├── moh/                         # [NEW]
│   │   └── connector.ts             # Ministry of Health
│   ├── vehicle-registry/            # [NEW]
│   │   └── connector.ts             # Vehicle registry
│   └── banks/                       # [NEW]
│       └── connector.ts             # Bank integration
│
├── consumers/                       # [NEW] Kafka consumers
│   ├── notification-consumer.ts
│   ├── sync-consumer.ts
│   └── analytics-consumer.ts
│
├── middleware/                      # [NEW]
│   ├── auth.ts                      # JWT authentication
│   ├── rate-limiter.ts              # Advanced rate limiting
│   └── validation.ts                # Request validation
│
├── models/
│   ├── canonical.ts                 # [EXISTING] Core schemas
│   └── products.ts                  # [NEW] Product catalog
│
├── services/
│   ├── integration-service.ts       # [EXISTING] Orchestration
│   ├── supabase-sync.ts             # [EXISTING] DB sync
│   ├── event-bus.ts                 # [EXISTING] Kafka
│   ├── coverage-analyzer.ts         # [NEW] Coverage analysis
│   ├── quote-comparison.ts          # [NEW] Quote comparison
│   ├── document-service.ts          # [NEW] Document management
│   ├── notification-service.ts      # [NEW] Notifications
│   ├── cache-service.ts             # [NEW] Redis caching
│   ├── api-key-service.ts           # [NEW] API key management
│   └── metrics-service.ts           # [NEW] Metrics collection
│
├── utils/
│   ├── logger.ts                    # [EXISTING] Logging
│   └── encryption.ts                # [NEW] Encryption
│
└── index.ts                         # [EXISTING] Entry point

db/
├── migrations/
│   ├── 001_integration_tables.sql   # [EXISTING]
│   ├── 002_enhanced_tables.sql      # [NEW]
│   └── 003_views.sql                # [NEW]

n8n-workflows/
├── 05_customer_data_sync.json       # [EXISTING]
├── 06_quote_comparison.json         # [NEW]
├── 07_expiry_reminders.json         # [NEW]
└── 08_gap_notifications.json        # [NEW]
```

---

## PART 4: IMPLEMENTATION PRIORITY

### Priority 1 - Critical (Week 1-2)
1. ✅ Connector Interface Enhancement
2. ✅ Connector Registry System
3. ✅ Configuration Management
4. ✅ Coverage Analysis Engine
5. ✅ New Database Tables Migration

### Priority 2 - High (Week 3-4)
6. Quote Comparison Service
7. Enhanced API Endpoints (Quotes, Analytics)
8. JWT Authentication
9. Redis Caching Layer
10. Additional Kafka Topics

### Priority 3 - Medium (Week 5-6)
11. Surense Connector
12. Document Management Service
13. Notification Service
14. Enhanced Health Checks
15. Metrics Collection

### Priority 4 - Enhancement (Week 7-8)
16. MOH Connector
17. Vehicle Registry Connector
18. Bank Integration Connector
19. GraphQL API (Optional)
20. Advanced Rate Limiting

---

## PART 5: CONNECTOR INTEGRATION MAP

### Data Sources Overview

| Source | Type | Status | Priority |
|--------|------|--------|----------|
| הר הביטוח | Vehicle Insurance | ✅ Implemented | - |
| המסלקה הפנסיונית | Pension | ✅ Implemented | - |
| כלל ביטוח | All Insurance | ✅ Base Implemented | - |
| הראל ביטוח | All Insurance | ⚠️ Inherits from Clal | High |
| מגדל ביטוח | All Insurance | ⚠️ Inherits from Clal | High |
| הפניקס | All Insurance | ⚠️ Inherits from Clal | High |
| מנורה מבטחים | All Insurance | ⚠️ Inherits from Clal | Medium |
| איילון ביטוח | All Insurance | ⚠️ Inherits from Clal | Medium |
| ביטוח ישיר | Vehicle/Home | ⚠️ Inherits from Clal | Medium |
| ליברה | Vehicle | ⚠️ Inherits from Clal | Low |
| AIG ישראל | All Insurance | ⚠️ Inherits from Clal | Low |
| Surense | Aggregator | 🔲 Planned | High |
| משרד הבריאות | Health | 🔲 Planned | Medium |
| משרד התחבורה | Vehicle Registry | 🔲 Planned | Low |
| Open Banking | Mortgage | 🔲 Planned | Low |

### Connector Authentication Matrix

| Connector | Auth Type | Token TTL | Certificate |
|-----------|-----------|-----------|-------------|
| Har HaBitouach | OAuth2 | 60 min | No |
| Mislaka | OAuth2 + Cert | 60 min | Yes |
| Israeli Carriers | OAuth2 | 60 min | No |
| Surense | API Key | N/A | No |
| MOH | TBD | TBD | TBD |

---

## PART 6: DATA FLOW DIAGRAMS

### Customer 360 Flow

```
┌─────────────┐
│   Client    │
│   Request   │
└──────┬──────┘
       │ GET /api/v1/customers/:id/360
       ▼
┌─────────────────────────────────────┐
│       Integration Service           │
│      getCustomer360(customerId)     │
└──────┬──────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ Har HaBituach││   Mislaka    ││   Carriers   ││    Cache     │
│  (Vehicle)   ││  (Pension)   ││  (Policies)  ││   (Redis)    │
└──────┬───────┘└──────┬───────┘└──────┬───────┘└──────┬───────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    Aggregate Results    │
              │   + Coverage Analysis   │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │      Sync to DB         │
              │    (if sync=true)       │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │    Publish Events       │
              │      (Kafka)            │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │    Return Response      │
              │   (Customer360 JSON)    │
              └─────────────────────────┘
```

### Quote Comparison Flow

```
┌─────────────┐
│   Agent     │
│   Request   │
└──────┬──────┘
       │ POST /api/v1/quotes/compare
       ▼
┌─────────────────────────────────────┐
│     Quote Comparison Service        │
└──────┬──────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│    Clal     ││    Harel     ││   Migdal    ││   Phoenix    │
│  getQuote() ││  getQuote() ││  getQuote() ││  getQuote() │
└──────┬───────┘└──────┬───────┘└──────┬───────┘└──────┬───────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    Normalize Quotes     │
              │   + Rank by Criteria    │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   Cache & Store Quote   │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   Return Comparison     │
              │   (Ranked Quotes)       │
              └─────────────────────────┘
```

---

## PART 7: SUCCESS CRITERIA

### Phase Completion Checklist

#### Phase 1: Foundation
- [ ] All connectors implement unified interface
- [ ] Connector registry manages all connectors
- [ ] Configuration is centralized and validated
- [ ] Unit tests for new components pass

#### Phase 2: Data Models
- [ ] All insurance types have schemas
- [ ] Product catalog is queryable
- [ ] Customer profile includes risk data
- [ ] Schema validation prevents bad data

#### Phase 3: Connectors
- [ ] Surense returns real quotes
- [ ] Health data is retrievable (if API available)
- [ ] Vehicle verification works
- [ ] Bank integration returns mortgage data

#### Phase 4: API
- [ ] All new endpoints documented in Swagger
- [ ] Response times under 2 seconds
- [ ] Error handling is consistent
- [ ] Rate limiting prevents abuse

#### Phase 5: Services
- [ ] Coverage gaps detected accurately
- [ ] Quote comparison ranks correctly
- [ ] Documents upload and download
- [ ] Notifications deliver reliably

#### Phase 6: Database
- [ ] Migrations run without errors
- [ ] RLS policies enforced
- [ ] Queries perform under 100ms
- [ ] Views return correct data

#### Phase 7: Events
- [ ] All events publish to correct topics
- [ ] Consumers process without errors
- [ ] Dead letter queue handles failures
- [ ] Events are idempotent

#### Phase 8: Performance
- [ ] Cache hit rate above 80%
- [ ] API response p95 under 500ms
- [ ] Connector response p95 under 2s
- [ ] No memory leaks detected

#### Phase 9: Security
- [ ] JWT validates correctly
- [ ] API keys are secure
- [ ] Sensitive data encrypted
- [ ] No security vulnerabilities

#### Phase 10: Monitoring
- [ ] Metrics exported to Prometheus
- [ ] Health checks accurate
- [ ] Alerts fire correctly
- [ ] Logs are searchable

---

## APPENDIX A: Environment Variables Reference

```bash
# === Server ===
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
USE_MOCKS=false

# === Database ===
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx
SUPABASE_SERVICE_KEY=eyJxxx
TENANT_ID=selai-main

# === Cache ===
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# === Events ===
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=selai-integration-hub
KAFKA_GROUP_ID=selai-consumers

# === Connectors ===
HAR_HABITOUACH_API_URL=https://api.harhabitouach.co.il
HAR_HABITOUACH_CLIENT_ID=
HAR_HABITOUACH_CLIENT_SECRET=

MISLAKA_API_URL=https://api.mislaka-api.co.il
MISLAKA_CLIENT_ID=
MISLAKA_CLIENT_SECRET=

# [Per carrier - CLAL, HAREL, MIGDAL, PHOENIX, MENORA, AYALON, BITUACH_YASHIR, LIBRA, AIG]
{CARRIER}_API_URL=
{CARRIER}_CLIENT_ID=
{CARRIER}_CLIENT_SECRET=

SURENSE_API_URL=https://api.surense.co.il
SURENSE_API_KEY=
SURENSE_AGENCY_CODE=

# === Security ===
JWT_SECRET=
JWT_EXPIRY=1h
ENCRYPTION_KEY=

# === External ===
N8N_WEBHOOK_URL=
N8N_API_KEY=
```

---

## APPENDIX B: Hebrew to English Mapping

| Hebrew | English | Code |
|--------|---------|------|
| הר הביטוח | Har HaBitouach | HAR_HABITOUACH |
| המסלקה הפנסיונית | Pension Clearing House | MISLAKA |
| כלל ביטוח | Clal Insurance | CLAL |
| הראל ביטוח | Harel Insurance | HAREL |
| מגדל ביטוח | Migdal Insurance | MIGDAL |
| הפניקס | The Phoenix | PHOENIX |
| מנורה מבטחים | Menora Mivtachim | MENORA |
| איילון ביטוח | Ayalon Insurance | AYALON |
| ביטוח ישיר | Bituach Yashir | BITUACH_YASHIR |
| ליברה | Libra Insurance | LIBRA |
| פוליסה | Policy | policy |
| תביעה | Claim | claim |
| פרמיה | Premium | premium |
| כיסוי | Coverage | coverage |
| קרן פנסיה | Pension Fund | pension |
| קופת גמל | Provident Fund | provident_fund |
| פיצויים | Severance | severance |
| דמי ניהול | Management Fee | management_fee |
| מוטב | Beneficiary | beneficiary |
| הסכמה | Consent | consent |

---

*Document Version: 1.0*
*Last Updated: 2026-01-15*
*Author: SELAI Integration Team*
