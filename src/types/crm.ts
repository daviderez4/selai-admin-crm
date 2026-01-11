// =====================================================
// SELAI CRM Type Definitions
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export type ContactStatus = 'active' | 'inactive' | 'prospect' | 'converted' | 'archived';

export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'converted'
  | 'lost'
  | 'archived';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type DealStatus =
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'contract_sent'
  | 'won'
  | 'lost';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TaskType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'follow_up'
  | 'renewal'
  | 'policy_creation'
  | 'document'
  | 'other';

export type MeetingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type MeetingType = 'in_person' | 'video_call' | 'phone_call' | 'office';

export type MessageChannel = 'email' | 'sms' | 'whatsapp' | 'internal';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type PolicyStatus = 'active' | 'pending' | 'cancelled' | 'expired' | 'renewed';

export type GapType = 'missing_policy' | 'under_coverage' | 'bundle_opportunity';

export type GapStatus = 'open' | 'contacted' | 'converted' | 'dismissed';

export type InsuranceCategory = 'car' | 'home' | 'life' | 'health' | 'savings' | 'business';

// =====================================================
// INSURANCE COMPANIES
// =====================================================

export interface InsuranceCompany {
  id: string;
  name: string;
  name_en?: string;
  logo_url?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
  api_endpoint?: string;
  is_active: boolean;
  created_at: string;
}

// =====================================================
// CONTACTS
// =====================================================

export interface Contact {
  id: string;
  agent_id: string;

  // Basic info
  first_name: string;
  last_name?: string;
  full_name: string;
  phone?: string;
  mobile?: string;
  email?: string;

  // Demographics
  id_number?: string;
  birth_date?: string;
  gender?: string;
  marital_status?: string;
  wedding_anniversary?: string;

  // Work
  occupation?: string;
  employer?: string;
  employment_type?: string;
  income_bracket?: string;

  // Address
  city?: string;
  address?: string;
  postal_code?: string;

  // Meta
  source: string;
  source_file?: string;
  upload_batch_id?: string;
  status: ContactStatus;
  tags: string[];
  notes?: string;

  // Tracking
  converted_to_lead: boolean;
  lead_id?: string;
  converted_to_client: boolean;
  client_id?: string;

  // Timestamps
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;

  // Relations (populated on fetch)
  family?: ContactFamily[];
  assets?: ContactAsset[];
  scores?: ContactScore;
  policies?: Policy[];
  leads?: Lead[];
  deals?: Deal[];
  tasks?: Task[];
  meetings?: Meeting[];
  messages?: Message[];
  coverage_gaps?: CoverageGap[];
}

export interface ContactInsert {
  agent_id?: string; // Will be set by API from auth
  first_name: string;
  last_name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  id_number?: string;
  birth_date?: string;
  gender?: string;
  marital_status?: string;
  wedding_anniversary?: string;
  occupation?: string;
  employer?: string;
  employment_type?: string;
  income_bracket?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  source?: string;
  source_file?: string;
  upload_batch_id?: string;
  status?: ContactStatus;
  tags?: string[];
  notes?: string;
}

export interface ContactUpdate extends Partial<ContactInsert> {
  converted_to_lead?: boolean;
  lead_id?: string;
  converted_to_client?: boolean;
  client_id?: string;
  last_contacted_at?: string;
}

// =====================================================
// CONTACT FAMILY
// =====================================================

export interface ContactFamily {
  id: string;
  contact_id: string;
  relationship: string;
  name: string;
  birth_date?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface ContactFamilyInsert {
  contact_id: string;
  relationship: string;
  name: string;
  birth_date?: string;
  phone?: string;
  notes?: string;
}

// =====================================================
// CONTACT ASSETS
// =====================================================

export interface ContactAsset {
  id: string;
  contact_id: string;
  asset_type: string;
  details: Record<string, unknown>;
  estimated_value?: number;
  created_at: string;
  updated_at: string;
}

export interface ContactAssetInsert {
  contact_id: string;
  asset_type: string;
  details: Record<string, unknown>;
  estimated_value?: number;
}

// =====================================================
// CONTACT SCORES
// =====================================================

export interface ContactScore {
  id: string;
  contact_id: string;
  engagement_score: number;
  satisfaction_score: number;
  churn_risk_score: number;
  growth_potential_score: number;
  lifetime_value: number;
  factors: string[];
  calculated_at: string;
}

export interface ContactScoreUpdate {
  engagement_score?: number;
  satisfaction_score?: number;
  churn_risk_score?: number;
  growth_potential_score?: number;
  lifetime_value?: number;
  factors?: string[];
}

// =====================================================
// LEADS
// =====================================================

export interface Lead {
  id: string;
  agent_id: string;
  supervisor_id?: string;
  contact_id?: string;

  // Basic info
  name: string;
  phone?: string;
  email?: string;
  company?: string;

  // Lead details
  source?: string;
  source_campaign_id?: string;
  source_landing_page_id?: string;

  // Status
  status: LeadStatus;
  priority: Priority;
  score: number;

  // Interest
  interested_in: string[];
  estimated_value?: number;

  // Notes
  notes?: string;
  tags: string[];

  // Tracking
  first_contact_at?: string;
  last_contact_at?: string;
  converted_at?: string;
  lost_reason?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  contact?: Contact;
  activities?: LeadActivity[];
  deals?: Deal[];
  tasks?: Task[];
}

export interface LeadInsert {
  agent_id?: string;
  supervisor_id?: string;
  contact_id?: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source?: string;
  source_campaign_id?: string;
  source_landing_page_id?: string;
  status?: LeadStatus;
  priority?: Priority;
  score?: number;
  interested_in?: string[];
  estimated_value?: number;
  notes?: string;
  tags?: string[];
}

export interface LeadUpdate extends Partial<LeadInsert> {
  first_contact_at?: string;
  last_contact_at?: string;
  converted_at?: string;
  lost_reason?: string;
}

// =====================================================
// LEAD ACTIVITIES
// =====================================================

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  description?: string;
  metadata: Record<string, unknown>;
  created_at: string;

  // Relations
  user?: { full_name: string };
}

export interface LeadActivityInsert {
  lead_id: string;
  user_id?: string; // Will be set by API from auth
  activity_type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// =====================================================
// DEALS
// =====================================================

export interface Deal {
  id: string;
  agent_id: string;
  contact_id: string;
  lead_id?: string;

  // Deal info
  title: string;
  description?: string;

  // Financial
  amount: number;
  commission?: number;
  commission_rate?: number;
  currency: string;

  // Status
  status: DealStatus;
  probability: number;

  // Product
  product_type?: string;
  insurance_company_id?: string;
  insurance_company_name?: string;
  policy_details: Record<string, unknown>;

  // Dates
  expected_close_date?: string;
  actual_close_date?: string;

  // Notes
  notes?: string;
  tags: string[];
  lost_reason?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  contact?: Contact;
  lead?: Lead;
  activities?: DealActivity[];
  insurance_company?: InsuranceCompany;
}

export interface DealInsert {
  agent_id?: string;
  contact_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  amount: number;
  commission?: number;
  commission_rate?: number;
  currency?: string;
  status?: DealStatus;
  probability?: number;
  product_type?: string;
  insurance_company_id?: string;
  insurance_company_name?: string;
  policy_details?: Record<string, unknown>;
  expected_close_date?: string;
  notes?: string;
  tags?: string[];
}

export interface DealUpdate extends Partial<DealInsert> {
  actual_close_date?: string;
  lost_reason?: string;
}

// =====================================================
// DEAL ACTIVITIES
// =====================================================

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string;
  activity_type: string;
  description?: string;
  metadata: Record<string, unknown>;
  created_at: string;

  // Relations
  user?: { full_name: string };
}

export interface DealActivityInsert {
  deal_id: string;
  user_id?: string;
  activity_type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// =====================================================
// TASKS
// =====================================================

export interface Task {
  id: string;
  agent_id: string;

  // Related entities
  contact_id?: string;
  lead_id?: string;
  deal_id?: string;

  // Task info
  title: string;
  description?: string;
  task_type: TaskType;

  // Status
  status: TaskStatus;
  priority: Priority;

  // Dates
  due_date?: string;
  due_time?: string;
  reminder_at?: string;
  completed_at?: string;

  // AI source
  source: string;
  ai_confidence?: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  contact?: Contact;
  lead?: Lead;
  deal?: Deal;
}

export interface TaskInsert {
  agent_id?: string;
  contact_id?: string;
  lead_id?: string;
  deal_id?: string;
  title: string;
  description?: string;
  task_type?: TaskType;
  status?: TaskStatus;
  priority?: Priority;
  due_date?: string;
  due_time?: string;
  reminder_at?: string;
  source?: string;
  ai_confidence?: number;
}

export interface TaskUpdate extends Partial<TaskInsert> {
  completed_at?: string;
}

// =====================================================
// MEETINGS
// =====================================================

export interface Meeting {
  id: string;
  agent_id: string;
  contact_id?: string;

  // Meeting info
  title: string;
  description?: string;
  meeting_type: MeetingType;

  // Location
  location?: string;
  video_link?: string;

  // Time
  start_time: string;
  end_time: string;
  duration_minutes: number;

  // Status
  status: MeetingStatus;

  // Cal.com integration
  cal_event_id?: string;
  cal_booking_uid?: string;

  // Notes
  agenda?: string;
  notes?: string;
  outcome?: string;

  // Follow-up
  follow_up_required: boolean;
  follow_up_date?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  contact?: Contact;
}

export interface MeetingInsert {
  agent_id?: string;
  contact_id?: string;
  title: string;
  description?: string;
  meeting_type?: MeetingType;
  location?: string;
  video_link?: string;
  start_time: string;
  end_time: string;
  status?: MeetingStatus;
  cal_event_id?: string;
  cal_booking_uid?: string;
  agenda?: string;
}

export interface MeetingUpdate extends Partial<MeetingInsert> {
  notes?: string;
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

// =====================================================
// MESSAGES
// =====================================================

export interface Message {
  id: string;
  agent_id: string;
  contact_id?: string;

  // Message info
  channel: MessageChannel;
  direction: MessageDirection;
  status: MessageStatus;

  // Content
  subject?: string;
  content: string;
  content_html?: string;

  // Recipients
  from_address?: string;
  to_address?: string;

  // Media
  attachments: MessageAttachment[];

  // Template
  template_id?: string;
  template_variables: Record<string, string>;

  // WhatsApp specific
  whatsapp_message_id?: string;
  whatsapp_status?: string;

  // AI analysis
  ai_analysis?: MessageAnalysis;
  ai_suggested_tasks?: string[];

  // Timestamps
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;

  // Relations
  contact?: Contact;
}

export interface MessageAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface MessageAnalysis {
  intent: 'inquiry' | 'complaint' | 'renewal' | 'claim' | 'general';
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  topic?: string;
  requires_action: boolean;
}

export interface MessageInsert {
  agent_id?: string;
  contact_id?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  status?: MessageStatus;
  subject?: string;
  content: string;
  content_html?: string;
  from_address?: string;
  to_address?: string;
  attachments?: MessageAttachment[];
  template_id?: string;
  template_variables?: Record<string, string>;
  whatsapp_message_id?: string;
}

export interface MessageUpdate {
  status?: MessageStatus;
  whatsapp_status?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  ai_analysis?: MessageAnalysis;
  ai_suggested_tasks?: string[];
}

// =====================================================
// CAMPAIGNS
// =====================================================

export interface Campaign {
  id: string;
  agent_id: string;

  // Campaign info
  name: string;
  description?: string;
  campaign_type?: string;

  // Status
  status: CampaignStatus;

  // Template
  template_id?: string;
  message_content?: string;

  // Audience
  audience_filter: Record<string, unknown>;
  contact_ids: string[];
  total_recipients: number;

  // Schedule
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;

  // Stats
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
  failed_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  recipients?: CampaignRecipient[];
}

export interface CampaignInsert {
  agent_id?: string;
  name: string;
  description?: string;
  campaign_type?: string;
  status?: CampaignStatus;
  template_id?: string;
  message_content?: string;
  audience_filter?: Record<string, unknown>;
  contact_ids?: string[];
  scheduled_at?: string;
}

export interface CampaignUpdate extends Partial<CampaignInsert> {
  total_recipients?: number;
  started_at?: string;
  completed_at?: string;
  sent_count?: number;
  delivered_count?: number;
  read_count?: number;
  clicked_count?: number;
  failed_count?: number;
}

// =====================================================
// CAMPAIGN RECIPIENTS
// =====================================================

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;

  // Status
  status: MessageStatus;

  // Message reference
  message_id?: string;

  // Timestamps
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  clicked_at?: string;
  created_at: string;

  // Relations
  contact?: Contact;
}

export interface CampaignRecipientInsert {
  campaign_id: string;
  contact_id: string;
  status?: MessageStatus;
}

// =====================================================
// POLICIES
// =====================================================

export interface Policy {
  id: string;
  agent_id: string;
  contact_id: string;
  deal_id?: string;

  // Policy info
  policy_number?: string;
  policy_type: string;
  category: InsuranceCategory;

  // Company
  insurance_company_id?: string;
  insurance_company_name?: string;

  // Dates
  start_date: string;
  end_date: string;
  renewal_date?: string;

  // Financial
  premium_monthly?: number;
  premium_annual?: number;
  coverage_amount?: number;
  deductible?: number;

  // Status
  status: PolicyStatus;

  // Commission
  commission_rate?: number;
  commission_amount?: number;

  // Details
  coverage_details: Record<string, unknown>;
  beneficiaries: PolicyBeneficiary[];

  // Notes
  notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relations
  contact?: Contact;
  deal?: Deal;
  insurance_company?: InsuranceCompany;
}

export interface PolicyBeneficiary {
  name: string;
  relationship: string;
  percentage: number;
  id_number?: string;
}

export interface PolicyInsert {
  agent_id?: string;
  contact_id: string;
  deal_id?: string;
  policy_number?: string;
  policy_type: string;
  category: InsuranceCategory;
  insurance_company_id?: string;
  insurance_company_name?: string;
  start_date: string;
  end_date: string;
  renewal_date?: string;
  premium_monthly?: number;
  premium_annual?: number;
  coverage_amount?: number;
  deductible?: number;
  status?: PolicyStatus;
  commission_rate?: number;
  commission_amount?: number;
  coverage_details?: Record<string, unknown>;
  beneficiaries?: PolicyBeneficiary[];
  notes?: string;
}

export interface PolicyUpdate extends Partial<PolicyInsert> {}

// =====================================================
// COVERAGE GAPS
// =====================================================

export interface CoverageGap {
  id: string;
  contact_id: string;

  // Gap info
  gap_type: GapType;
  category: InsuranceCategory;
  title: string;
  description?: string;

  // Priority
  priority: Priority;

  // Recommendation
  recommended_product?: string;
  recommended_company?: string;
  estimated_premium?: number;
  estimated_commission?: number;

  // Talking points
  talking_points: string[];

  // Status
  status: GapStatus;
  dismissed_reason?: string;

  // AI
  ai_confidence?: number;
  calculated_at: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CoverageGapInsert {
  contact_id: string;
  gap_type: GapType;
  category: InsuranceCategory;
  title: string;
  description?: string;
  priority: Priority;
  recommended_product?: string;
  recommended_company?: string;
  estimated_premium?: number;
  estimated_commission?: number;
  talking_points?: string[];
  status?: GapStatus;
  ai_confidence?: number;
}

export interface CoverageGapUpdate {
  status?: GapStatus;
  dismissed_reason?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface CRMListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CRMFilters {
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export interface CRMDashboardStats {
  contacts: {
    total: number;
    active: number;
    newThisMonth: number;
    changePercent: number;
  };
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
    conversionRate: number;
  };
  deals: {
    total: number;
    open: number;
    won: number;
    totalValue: number;
    averageValue: number;
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    dueToday: number;
  };
  meetings: {
    upcoming: number;
    thisWeek: number;
    completed: number;
  };
  policies: {
    total: number;
    active: number;
    expiringThisMonth: number;
    totalPremium: number;
  };
}

// =====================================================
// KANBAN BOARD TYPES
// =====================================================

export interface KanbanColumn<T> {
  id: string;
  title: string;
  items: T[];
  color?: string;
}

export type LeadKanbanBoard = Record<LeadStatus, Lead[]>;
export type DealKanbanBoard = Record<DealStatus, Deal[]>;

// =====================================================
// WHATSAPP TYPES
// =====================================================

export interface WhatsAppMessage {
  phone: string;
  message: string;
  quotedMessageId?: string;
}

export interface WhatsAppMedia {
  phone: string;
  mediaUrl: string;
  caption?: string;
}

export interface WhatsAppStatus {
  state: 'connected' | 'disconnected' | 'connecting';
  phone?: string;
  lastSeen?: string;
}

// =====================================================
// AI TYPES
// =====================================================

export interface GapAnalysisInput {
  contact: {
    name: string;
    age: number;
    marital_status: string;
    occupation: string;
    income_bracket: string;
    family: Array<{ relationship: string; age?: number }>;
    assets: Array<{ type: string; value?: number }>;
  };
  policies: Array<{
    type: string;
    category: string;
    coverage_amount?: number;
    premium_monthly?: number;
  }>;
}

export interface GapAnalysisResult {
  gaps: CoverageGapInsert[];
}

export interface ChurnPrediction {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface ScoreCalculation {
  engagement_score: number;
  satisfaction_score: number;
  churn_risk_score: number;
  growth_potential_score: number;
  lifetime_value: number;
  factors: string[];
}
