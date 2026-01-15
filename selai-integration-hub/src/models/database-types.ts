/**
 * SELAI Insurance Integration Hub
 * Database Types - TypeScript interfaces for database tables
 *
 * Generated from db/migrations/002_enhanced_tables.sql
 */

import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const GapPriority = z.enum(['critical', 'high', 'medium', 'low']);
export type GapPriority = z.infer<typeof GapPriority>;

export const GapStatus = z.enum(['open', 'addressed', 'dismissed', 'resolved']);
export type GapStatus = z.infer<typeof GapStatus>;

export const CoverageGrade = z.enum(['A', 'B', 'C', 'D', 'F']);
export type CoverageGrade = z.infer<typeof CoverageGrade>;

export const NotificationType = z.enum([
  'policy_expiring',
  'payment_due',
  'claim_status',
  'gap_detected',
  'quote_ready',
  'application_status',
  'renewal_reminder',
  'general'
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotificationPriority = z.enum(['urgent', 'high', 'normal', 'low']);
export type NotificationPriority = z.infer<typeof NotificationPriority>;

export const NotificationChannel = z.enum(['in_app', 'email', 'sms', 'push', 'whatsapp']);
export type NotificationChannel = z.infer<typeof NotificationChannel>;

export const NotificationStatus = z.enum(['pending', 'sent', 'read', 'failed', 'cancelled']);
export type NotificationStatus = z.infer<typeof NotificationStatus>;

export const ReminderType = z.enum([
  'follow_up',
  'renewal',
  'callback',
  'document_request',
  'payment',
  'meeting',
  'custom'
]);
export type ReminderType = z.infer<typeof ReminderType>;

export const ReminderStatus = z.enum(['pending', 'snoozed', 'completed', 'cancelled']);
export type ReminderStatus = z.infer<typeof ReminderStatus>;

export const RecurrenceRule = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly'
]);
export type RecurrenceRule = z.infer<typeof RecurrenceRule>;

export const QuoteStatus = z.enum(['pending', 'accepted', 'rejected', 'expired']);
export type QuoteStatus = z.infer<typeof QuoteStatus>;

export const ApplicationStatus = z.enum([
  'draft',
  'submitted',
  'under_review',
  'documents_required',
  'approved',
  'rejected',
  'cancelled',
  'converted_to_policy'
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

// ============================================
// INSURANCE PRODUCTS
// ============================================

export const InsuranceProductSchema = z.object({
  id: z.string().uuid(),
  carrier_code: z.string(),
  product_code: z.string(),
  product_name: z.string(),
  insurance_type: z.string(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  min_coverage: z.number().nullable(),
  max_coverage: z.number().nullable(),
  min_premium: z.number().nullable(),
  max_premium: z.number().nullable(),
  coverage_features: z.record(z.any()).nullable(),
  exclusions: z.array(z.string()).nullable(),
  waiting_period_days: z.number().nullable(),
  commission_rate: z.number().nullable(),
  is_active: z.boolean(),
  effective_from: z.string().datetime(),
  effective_until: z.string().datetime().nullable(),
  metadata: z.record(z.any()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type InsuranceProduct = z.infer<typeof InsuranceProductSchema>;

// ============================================
// QUOTE HISTORY
// ============================================

export const QuoteHistorySchema = z.object({
  id: z.string().uuid(),
  request_id: z.string().uuid(),
  customer_id: z.string().uuid().nullable(),
  id_number: z.string(),
  insurance_type: z.string(),
  coverage_amount: z.number(),
  deductible: z.number().nullable(),
  carrier_code: z.string(),
  carrier_name: z.string(),
  product_code: z.string().nullable(),
  monthly_premium: z.number(),
  annual_premium: z.number(),
  coverage_details: z.record(z.any()).nullable(),
  exclusions: z.array(z.string()).nullable(),
  ranking_score: z.number().nullable(),
  rank_position: z.number().nullable(),
  status: QuoteStatus,
  request_data: z.record(z.any()).nullable(),
  response_data: z.record(z.any()).nullable(),
  expires_at: z.string().datetime(),
  agent_id: z.string().uuid().nullable(),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type QuoteHistory = z.infer<typeof QuoteHistorySchema>;

// ============================================
// INSURANCE APPLICATIONS
// ============================================

export const InsuranceApplicationSchema = z.object({
  id: z.string().uuid(),
  application_number: z.string(),
  customer_id: z.string().uuid(),
  quote_id: z.string().uuid().nullable(),
  insurance_type: z.string(),
  carrier_code: z.string(),
  product_code: z.string().nullable(),
  status: ApplicationStatus,
  premium_amount: z.number().nullable(),
  coverage_amount: z.number().nullable(),
  application_data: z.record(z.any()).nullable(),
  documents: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    url: z.string().optional(),
    uploaded_at: z.string()
  })).nullable(),
  submitted_at: z.string().datetime().nullable(),
  approved_at: z.string().datetime().nullable(),
  rejected_at: z.string().datetime().nullable(),
  rejection_reason: z.string().nullable(),
  policy_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type InsuranceApplication = z.infer<typeof InsuranceApplicationSchema>;

// ============================================
// COVERAGE ANALYSIS
// ============================================

export const CoverageAnalysisSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  score: z.number(),
  grade: CoverageGrade,
  total_coverage_amount: z.number(),
  total_annual_premium: z.number(),
  policies_count: z.number(),
  pension_accounts_count: z.number(),
  gaps_count: z.number(),
  critical_gaps_count: z.number(),
  risk_areas: z.array(z.string()).nullable(),
  strengths: z.array(z.string()).nullable(),
  recommendations: z.array(z.object({
    type: z.string(),
    priority: z.string(),
    title: z.string(),
    description: z.string(),
    estimated_premium: z.number().optional()
  })).nullable(),
  analysis_details: z.record(z.any()).nullable(),
  analyzed_at: z.string().datetime(),
  agent_id: z.string().uuid().nullable(),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type CoverageAnalysis = z.infer<typeof CoverageAnalysisSchema>;

// ============================================
// COVERAGE GAPS
// ============================================

export const CoverageGapSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  analysis_id: z.string().uuid().nullable(),
  gap_type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: GapPriority,
  status: GapStatus,
  recommended_coverage: z.number().nullable(),
  recommended_product_id: z.string().uuid().nullable(),
  estimated_premium: z.number().nullable(),
  risk_score: z.number().nullable(),
  resolution_policy_id: z.string().uuid().nullable(),
  resolved_at: z.string().datetime().nullable(),
  metadata: z.record(z.any()).nullable(),
  agent_id: z.string().uuid().nullable(),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type CoverageGap = z.infer<typeof CoverageGapSchema>;

// ============================================
// NOTIFICATIONS
// ============================================

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: NotificationType,
  title: z.string(),
  message: z.string(),
  priority: NotificationPriority,
  customer_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  related_entity_type: z.string().nullable(),
  related_entity_id: z.string().uuid().nullable(),
  channel: NotificationChannel,
  status: NotificationStatus,
  scheduled_for: z.string().datetime().nullable(),
  sent_at: z.string().datetime().nullable(),
  read_at: z.string().datetime().nullable(),
  action_url: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type Notification = z.infer<typeof NotificationSchema>;

// ============================================
// AGENT METRICS
// ============================================

export const AgentMetricsSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  period_start: z.string().datetime(),
  period_end: z.string().datetime(),
  total_policies: z.number(),
  total_premium: z.number(),
  new_policies: z.number(),
  renewed_policies: z.number(),
  cancelled_policies: z.number(),
  total_claims: z.number(),
  claims_approved: z.number(),
  claims_rejected: z.number(),
  total_commissions: z.number(),
  conversion_rate: z.number(),
  retention_rate: z.number(),
  average_policy_value: z.number(),
  metrics_breakdown: z.record(z.any()).nullable(),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type AgentMetrics = z.infer<typeof AgentMetricsSchema>;

// ============================================
// API KEYS
// ============================================

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  key_hash: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
  tenant_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  expires_at: z.string().datetime().nullable(),
  last_used_at: z.string().datetime().nullable(),
  request_count: z.number(),
  rate_limit_per_minute: z.number().nullable(),
  allowed_ips: z.array(z.string()).nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type ApiKey = z.infer<typeof ApiKeySchema>;

// ============================================
// SCHEDULED REMINDERS
// ============================================

export const ScheduledReminderSchema = z.object({
  id: z.string().uuid(),
  type: ReminderType,
  title: z.string(),
  description: z.string().nullable(),
  customer_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  related_entity_type: z.string().nullable(),
  related_entity_id: z.string().uuid().nullable(),
  due_date: z.string().datetime(),
  priority: NotificationPriority,
  status: ReminderStatus,
  completed_at: z.string().datetime().nullable(),
  snoozed_until: z.string().datetime().nullable(),
  recurrence_rule: RecurrenceRule.nullable(),
  next_occurrence: z.string().datetime().nullable(),
  metadata: z.record(z.any()).nullable(),
  tenant_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type ScheduledReminder = z.infer<typeof ScheduledReminderSchema>;

// ============================================
// VIEW TYPES
// ============================================

export interface Customer360View {
  customer_id: string;
  id_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  city?: string;
  total_policies: number;
  active_policies: number;
  total_annual_premium: number;
  policy_types: string[];
  total_claims: number;
  pending_claims: number;
  approved_claims: number;
  coverage_score?: number;
  coverage_grade?: CoverageGrade;
  coverage_gaps_count: number;
  critical_gaps: number;
  pension_accounts: number;
  total_pension_balance: number;
  customer_since: string;
  last_updated: string;
}

export interface AgentPerformanceView {
  agent_id: string;
  period_start: string;
  period_end: string;
  total_policies: number;
  total_premium: number;
  new_policies: number;
  renewed_policies: number;
  cancelled_policies: number;
  total_claims: number;
  claims_approved: number;
  claims_rejected: number;
  total_commissions: number;
  conversion_rate: number;
  retention_rate: number;
  average_policy_value: number;
  claims_approval_rate: number;
  avg_premium_per_policy: number;
}

export interface AgentRankingView {
  agent_id: string;
  total_premium: number;
  new_policies: number;
  conversion_rate: number;
  retention_rate: number;
  total_commissions: number;
  premium_rank: number;
  policies_rank: number;
  conversion_rank: number;
  retention_rank: number;
  period_start: string;
  period_end: string;
}

export interface QuoteComparisonView {
  id: string;
  request_id: string;
  customer_id?: string;
  id_number: string;
  insurance_type: string;
  coverage_amount: number;
  deductible?: number;
  carrier_code: string;
  carrier_name: string;
  monthly_premium: number;
  annual_premium: number;
  coverage_details?: Record<string, any>;
  ranking_score?: number;
  rank_position?: number;
  status: QuoteStatus;
  is_best_option: boolean;
  price_per_1000_coverage: number;
  is_expired: boolean;
  created_at: string;
  expires_at: string;
}

export interface ApplicationsPipelineView {
  id: string;
  application_number: string;
  customer_id: string;
  customer_name: string;
  id_number: string;
  insurance_type: string;
  carrier_code: string;
  product_code?: string;
  status: ApplicationStatus;
  premium_amount?: number;
  coverage_amount?: number;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  days_in_process: number;
  agent_id?: string;
}

export interface CoverageGapsSummaryView {
  id: string;
  customer_id: string;
  customer_name: string;
  id_number: string;
  gap_type: string;
  title: string;
  description?: string;
  priority: GapPriority;
  status: GapStatus;
  recommended_coverage?: number;
  estimated_premium?: number;
  risk_score?: number;
  priority_order: number;
  created_at: string;
  resolved_at?: string;
}

export interface DailyStatsView {
  stats_date: string;
  new_policies_today: number;
  total_active_policies: number;
  total_active_premium: number;
  new_claims_today: number;
  pending_claims: number;
  quotes_generated_today: number;
  quote_requests_today: number;
  new_applications_today: number;
  pending_applications: number;
  open_gaps: number;
  critical_gaps: number;
  new_customers_today: number;
  total_customers: number;
}

export interface InsuranceDistributionView {
  insurance_type: string;
  policy_count: number;
  active_count: number;
  total_premium: number;
  active_premium: number;
  avg_premium: number;
  avg_coverage: number;
  percentage: number;
}

export interface CarrierPerformanceView {
  carrier_code: string;
  total_policies: number;
  total_customers: number;
  total_premium: number;
  avg_premium: number;
  total_claims: number;
  approved_claims: number;
  claim_approval_rate: number;
  total_quotes: number;
  accepted_quotes: number;
  quote_acceptance_rate: number;
}

// ============================================
// INPUT TYPES FOR FUNCTIONS
// ============================================

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  customer_id?: string;
  agent_id?: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  related_entity_type?: string;
  related_entity_id?: string;
  scheduled_for?: string;
  action_url?: string;
  metadata?: Record<string, any>;
}

export interface CreateReminderInput {
  type: ReminderType;
  title: string;
  description?: string;
  customer_id?: string;
  agent_id?: string;
  due_date: string;
  priority?: NotificationPriority;
  related_entity_type?: string;
  related_entity_id?: string;
  recurrence_rule?: RecurrenceRule;
  metadata?: Record<string, any>;
}

export interface RecordCoverageGapInput {
  customer_id: string;
  gap_type: string;
  title: string;
  description?: string;
  priority?: GapPriority;
  recommended_coverage?: number;
  estimated_premium?: number;
  risk_score?: number;
  metadata?: Record<string, any>;
}

export interface UpdateAgentMetricsInput {
  agent_id: string;
  period_start?: string;
  period_end?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface ExpiringPolicyResult {
  policy_id: string;
  policy_number: string;
  customer_id: string;
  customer_name: string;
  insurance_type: string;
  carrier_code: string;
  end_date: string;
  days_until_expiry: number;
  premium_amount: number;
  agent_id?: string;
}

export interface PolicyOverlapResult {
  overlapping_policy_id: string;
  policy_number: string;
  start_date: string;
  end_date: string;
}

export interface BestQuoteResult {
  quote_id: string;
  carrier_code: string;
  carrier_name: string;
  monthly_premium: number;
  annual_premium: number;
  ranking_score: number;
}

export interface ValidateApiKeyResult {
  id: string;
  name: string;
  permissions: string[];
  tenant_id?: string;
  rate_limit_per_minute?: number;
}

export interface CustomerCoverageByType {
  insurance_type: string;
  policy_count: number;
  total_coverage: number;
  total_premium: number;
}
