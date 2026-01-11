-- =====================================================
-- SELAI CRM Schema Migration
-- Created: 2026-01-12
-- Description: Complete CRM system tables for insurance agency management
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Contact status
DO $$ BEGIN
  CREATE TYPE crm_contact_status AS ENUM ('active', 'inactive', 'prospect', 'converted', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lead status (pipeline stages)
DO $$ BEGIN
  CREATE TYPE crm_lead_status AS ENUM (
    'new', 'assigned', 'contacted', 'qualified',
    'proposal', 'negotiation', 'converted', 'lost', 'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lead/Task priority
DO $$ BEGIN
  CREATE TYPE crm_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Deal status (pipeline stages)
DO $$ BEGIN
  CREATE TYPE crm_deal_status AS ENUM (
    'discovery', 'proposal', 'negotiation',
    'contract_sent', 'won', 'lost'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task status
DO $$ BEGIN
  CREATE TYPE crm_task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task type
DO $$ BEGIN
  CREATE TYPE crm_task_type AS ENUM (
    'call', 'email', 'meeting', 'follow_up',
    'renewal', 'policy_creation', 'document', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Meeting status
DO $$ BEGIN
  CREATE TYPE crm_meeting_status AS ENUM (
    'scheduled', 'confirmed', 'completed',
    'cancelled', 'no_show', 'rescheduled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Meeting type
DO $$ BEGIN
  CREATE TYPE crm_meeting_type AS ENUM (
    'in_person', 'video_call', 'phone_call', 'office'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Message channel
DO $$ BEGIN
  CREATE TYPE crm_message_channel AS ENUM ('email', 'sms', 'whatsapp', 'internal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Message direction
DO $$ BEGIN
  CREATE TYPE crm_message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Message status
DO $$ BEGIN
  CREATE TYPE crm_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Campaign status
DO $$ BEGIN
  CREATE TYPE crm_campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Policy status
DO $$ BEGIN
  CREATE TYPE crm_policy_status AS ENUM ('active', 'pending', 'cancelled', 'expired', 'renewed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- HELPER FUNCTION: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION crm_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLE 1: Insurance Companies (Reference Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  logo_url TEXT,
  website TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common Israeli insurance companies
INSERT INTO crm_insurance_companies (name, name_en, is_active) VALUES
  ('הראל', 'Harel', true),
  ('מגדל', 'Migdal', true),
  ('כלל', 'Clal', true),
  ('הפניקס', 'Phoenix', true),
  ('מנורה מבטחים', 'Menora Mivtachim', true),
  ('איילון', 'Ayalon', true),
  ('הכשרה', 'Hachshara', true),
  ('ביטוח ישיר', 'Bituach Yashir', true),
  ('AIG', 'AIG', true),
  ('שלמה', 'Shlomo', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- TABLE 2: Contacts (Main CRM Entity)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic info
  first_name TEXT NOT NULL DEFAULT 'ללא שם',
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED,
  phone TEXT,
  mobile TEXT,
  email TEXT,

  -- Demographics
  id_number TEXT,
  birth_date DATE,
  gender TEXT,
  marital_status TEXT,
  wedding_anniversary DATE,

  -- Work
  occupation TEXT,
  employer TEXT,
  employment_type TEXT,
  income_bracket TEXT,

  -- Address
  city TEXT,
  address TEXT,
  postal_code TEXT,

  -- Meta
  source TEXT DEFAULT 'manual',
  source_file TEXT,
  upload_batch_id TEXT,
  status crm_contact_status DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- Tracking
  converted_to_lead BOOLEAN DEFAULT false,
  lead_id UUID,
  converted_to_client BOOLEAN DEFAULT false,
  client_id UUID,

  -- Timestamps
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per agent (same phone can't be added twice by same agent)
  UNIQUE(agent_id, phone)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_agent ON crm_contacts(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone ON crm_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_created ON crm_contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_full_name ON crm_contacts(full_name);

-- Trigger
DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 3: Contact Family Members
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_contact_family (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- spouse, child, parent, sibling
  name TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_family_contact ON crm_contact_family(contact_id);

-- =====================================================
-- TABLE 4: Contact Assets
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_contact_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- car, property, business
  details JSONB NOT NULL DEFAULT '{}',
  estimated_value DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_assets_contact ON crm_contact_assets(contact_id);

DROP TRIGGER IF EXISTS update_crm_contact_assets_updated_at ON crm_contact_assets;
CREATE TRIGGER update_crm_contact_assets_updated_at
  BEFORE UPDATE ON crm_contact_assets
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 5: Contact Scores (AI-generated)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_contact_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID UNIQUE NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  satisfaction_score INTEGER DEFAULT 0 CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100),
  churn_risk_score INTEGER DEFAULT 0 CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
  growth_potential_score INTEGER DEFAULT 0 CHECK (growth_potential_score >= 0 AND growth_potential_score <= 100),
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  factors JSONB DEFAULT '[]', -- Array of factor descriptions
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_scores_contact ON crm_contact_scores(contact_id);

-- =====================================================
-- TABLE 6: Leads
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES users(id),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,

  -- Basic info
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,

  -- Lead details
  source TEXT, -- landing_page, referral, campaign, manual, website, phone
  source_campaign_id UUID,
  source_landing_page_id UUID,

  -- Status
  status crm_lead_status DEFAULT 'new',
  priority crm_priority DEFAULT 'medium',
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),

  -- Interest
  interested_in TEXT[] DEFAULT '{}', -- ['car_insurance', 'life_insurance']
  estimated_value DECIMAL(12,2),

  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Tracking
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_leads_agent ON crm_leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON crm_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_score ON crm_leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_priority ON crm_leads(priority);

DROP TRIGGER IF EXISTS update_crm_leads_updated_at ON crm_leads;
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 7: Lead Activities
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL, -- call, email, meeting, note, status_change
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead ON crm_lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_user ON crm_lead_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_created ON crm_lead_activities(created_at DESC);

-- =====================================================
-- TABLE 8: Deals
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,

  -- Deal info
  title TEXT NOT NULL,
  description TEXT,

  -- Financial
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission DECIMAL(12,2),
  commission_rate DECIMAL(5,2),
  currency TEXT DEFAULT 'ILS',

  -- Status
  status crm_deal_status DEFAULT 'discovery',
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),

  -- Product
  product_type TEXT, -- car_insurance, life_insurance, etc.
  insurance_company_id UUID REFERENCES crm_insurance_companies(id),
  insurance_company_name TEXT,
  policy_details JSONB DEFAULT '{}',

  -- Dates
  expected_close_date DATE,
  actual_close_date DATE,

  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  lost_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_deals_agent ON crm_deals(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_status ON crm_deals(status);
CREATE INDEX IF NOT EXISTS idx_crm_deals_created ON crm_deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_expected_close ON crm_deals(expected_close_date);

DROP TRIGGER IF EXISTS update_crm_deals_updated_at ON crm_deals;
CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 9: Deal Activities
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_activities_deal ON crm_deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_deal_activities_created ON crm_deal_activities(created_at DESC);

-- =====================================================
-- TABLE 10: Tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Related entities
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,

  -- Task info
  title TEXT NOT NULL,
  description TEXT,
  task_type crm_task_type DEFAULT 'other',

  -- Status
  status crm_task_status DEFAULT 'pending',
  priority crm_priority DEFAULT 'medium',

  -- Dates
  due_date DATE,
  due_time TIME,
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- AI source
  source TEXT DEFAULT 'manual', -- manual, ai_recommendation, automation
  ai_confidence DECIMAL(3,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_tasks_agent ON crm_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact ON crm_tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON crm_tasks(priority);

DROP TRIGGER IF EXISTS update_crm_tasks_updated_at ON crm_tasks;
CREATE TRIGGER update_crm_tasks_updated_at
  BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 11: Meetings
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,

  -- Meeting info
  title TEXT NOT NULL,
  description TEXT,
  meeting_type crm_meeting_type DEFAULT 'video_call',

  -- Location
  location TEXT,
  video_link TEXT,

  -- Time
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
  ) STORED,

  -- Status
  status crm_meeting_status DEFAULT 'scheduled',

  -- Cal.com integration
  cal_event_id TEXT,
  cal_booking_uid TEXT,

  -- Notes
  agenda TEXT,
  notes TEXT,
  outcome TEXT,

  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_meetings_agent ON crm_meetings(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_meetings_contact ON crm_meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_meetings_start ON crm_meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_crm_meetings_status ON crm_meetings(status);

DROP TRIGGER IF EXISTS update_crm_meetings_updated_at ON crm_meetings;
CREATE TRIGGER update_crm_meetings_updated_at
  BEFORE UPDATE ON crm_meetings
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 12: Messages
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,

  -- Message info
  channel crm_message_channel NOT NULL,
  direction crm_message_direction NOT NULL,
  status crm_message_status DEFAULT 'pending',

  -- Content
  subject TEXT,
  content TEXT NOT NULL,
  content_html TEXT,

  -- Recipients
  from_address TEXT,
  to_address TEXT,

  -- Media
  attachments JSONB DEFAULT '[]',

  -- Template
  template_id UUID,
  template_variables JSONB DEFAULT '{}',

  -- WhatsApp specific
  whatsapp_message_id TEXT,
  whatsapp_status TEXT,

  -- AI analysis
  ai_analysis JSONB,
  ai_suggested_tasks UUID[],

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_messages_agent ON crm_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_contact ON crm_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_channel ON crm_messages(channel);
CREATE INDEX IF NOT EXISTS idx_crm_messages_created ON crm_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_messages_direction ON crm_messages(direction);

-- =====================================================
-- TABLE 13: Campaigns
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Campaign info
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT, -- whatsapp_blast, email_sequence, sms

  -- Status
  status crm_campaign_status DEFAULT 'draft',

  -- Template
  template_id UUID,
  message_content TEXT,

  -- Audience
  audience_filter JSONB DEFAULT '{}',
  contact_ids UUID[] DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,

  -- Schedule
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Stats
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_agent ON crm_campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON crm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_scheduled ON crm_campaigns(scheduled_at);

DROP TRIGGER IF EXISTS update_crm_campaigns_updated_at ON crm_campaigns;
CREATE TRIGGER update_crm_campaigns_updated_at
  BEFORE UPDATE ON crm_campaigns
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 14: Campaign Recipients
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,

  -- Status
  status crm_message_status DEFAULT 'pending',

  -- Message reference
  message_id UUID REFERENCES crm_messages(id),

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_campaign ON crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_contact ON crm_campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_status ON crm_campaign_recipients(status);

-- =====================================================
-- TABLE 15: Policies
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,

  -- Policy info
  policy_number TEXT,
  policy_type TEXT NOT NULL, -- car_comprehensive, car_mandatory, life, health, home, etc.
  category TEXT NOT NULL, -- car, home, life, health, savings, business

  -- Company
  insurance_company_id UUID REFERENCES crm_insurance_companies(id),
  insurance_company_name TEXT,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,

  -- Financial
  premium_monthly DECIMAL(12,2),
  premium_annual DECIMAL(12,2),
  coverage_amount DECIMAL(12,2),
  deductible DECIMAL(12,2),

  -- Status
  status crm_policy_status DEFAULT 'active',

  -- Commission
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(12,2),

  -- Details
  coverage_details JSONB DEFAULT '{}',
  beneficiaries JSONB DEFAULT '[]',

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_policies_agent ON crm_policies(agent_id);
CREATE INDEX IF NOT EXISTS idx_crm_policies_contact ON crm_policies(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_policies_status ON crm_policies(status);
CREATE INDEX IF NOT EXISTS idx_crm_policies_renewal ON crm_policies(renewal_date);
CREATE INDEX IF NOT EXISTS idx_crm_policies_category ON crm_policies(category);

DROP TRIGGER IF EXISTS update_crm_policies_updated_at ON crm_policies;
CREATE TRIGGER update_crm_policies_updated_at
  BEFORE UPDATE ON crm_policies
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- TABLE 16: Coverage Gaps (AI-identified)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_coverage_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,

  -- Gap info
  gap_type TEXT NOT NULL, -- missing_policy, under_coverage, bundle_opportunity
  category TEXT NOT NULL, -- car, home, life, health, savings
  title TEXT NOT NULL,
  description TEXT,

  -- Priority
  priority crm_priority NOT NULL DEFAULT 'medium',

  -- Recommendation
  recommended_product TEXT,
  recommended_company TEXT,
  estimated_premium DECIMAL(12,2),
  estimated_commission DECIMAL(12,2),

  -- Talking points
  talking_points TEXT[] DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'open', -- open, contacted, converted, dismissed
  dismissed_reason TEXT,

  -- AI
  ai_confidence DECIMAL(3,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_coverage_gaps_contact ON crm_coverage_gaps(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_coverage_gaps_status ON crm_coverage_gaps(status);
CREATE INDEX IF NOT EXISTS idx_crm_coverage_gaps_priority ON crm_coverage_gaps(priority);
CREATE INDEX IF NOT EXISTS idx_crm_coverage_gaps_category ON crm_coverage_gaps(category);

DROP TRIGGER IF EXISTS update_crm_coverage_gaps_updated_at ON crm_coverage_gaps;
CREATE TRIGGER update_crm_coverage_gaps_updated_at
  BEFORE UPDATE ON crm_coverage_gaps
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all CRM tables
ALTER TABLE crm_insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contact_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contact_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contact_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_coverage_gaps ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS HELPER FUNCTIONS
-- =====================================================

-- Get user role from users table
CREATE OR REPLACE FUNCTION crm_get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION crm_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is supervisor or admin
CREATE OR REPLACE FUNCTION crm_is_supervisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get supervised agent IDs
CREATE OR REPLACE FUNCTION crm_get_supervised_agents()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    (SELECT array_agg(agent_id) FROM agent_supervisor_relations WHERE supervisor_id = auth.uid()),
    '{}'::UUID[]
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Insurance Companies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can read insurance companies" ON crm_insurance_companies;
CREATE POLICY "Anyone can read insurance companies" ON crm_insurance_companies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage insurance companies" ON crm_insurance_companies;
CREATE POLICY "Admins can manage insurance companies" ON crm_insurance_companies
  FOR ALL USING (crm_is_admin());

-- Contacts
DROP POLICY IF EXISTS "Agents own their contacts" ON crm_contacts;
CREATE POLICY "Agents own their contacts" ON crm_contacts
  FOR ALL USING (
    agent_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Contact Family (through contact ownership)
DROP POLICY IF EXISTS "Access contact family through contact" ON crm_contact_family;
CREATE POLICY "Access contact family through contact" ON crm_contact_family
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_contacts
      WHERE crm_contacts.id = contact_id
      AND (
        crm_contacts.agent_id = auth.uid()
        OR crm_is_admin()
        OR (crm_is_supervisor() AND crm_contacts.agent_id = ANY(crm_get_supervised_agents()))
      )
    )
  );

-- Contact Assets (through contact ownership)
DROP POLICY IF EXISTS "Access contact assets through contact" ON crm_contact_assets;
CREATE POLICY "Access contact assets through contact" ON crm_contact_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_contacts
      WHERE crm_contacts.id = contact_id
      AND (
        crm_contacts.agent_id = auth.uid()
        OR crm_is_admin()
        OR (crm_is_supervisor() AND crm_contacts.agent_id = ANY(crm_get_supervised_agents()))
      )
    )
  );

-- Contact Scores (through contact ownership)
DROP POLICY IF EXISTS "Access contact scores through contact" ON crm_contact_scores;
CREATE POLICY "Access contact scores through contact" ON crm_contact_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_contacts
      WHERE crm_contacts.id = contact_id
      AND (
        crm_contacts.agent_id = auth.uid()
        OR crm_is_admin()
        OR (crm_is_supervisor() AND crm_contacts.agent_id = ANY(crm_get_supervised_agents()))
      )
    )
  );

-- Leads
DROP POLICY IF EXISTS "Agents own their leads" ON crm_leads;
CREATE POLICY "Agents own their leads" ON crm_leads
  FOR ALL USING (
    agent_id = auth.uid()
    OR supervisor_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Lead Activities
DROP POLICY IF EXISTS "Access lead activities through lead" ON crm_lead_activities;
CREATE POLICY "Access lead activities through lead" ON crm_lead_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_id
      AND (
        crm_leads.agent_id = auth.uid()
        OR crm_leads.supervisor_id = auth.uid()
        OR crm_is_admin()
        OR (crm_is_supervisor() AND crm_leads.agent_id = ANY(crm_get_supervised_agents()))
      )
    )
  );

-- Deals
DROP POLICY IF EXISTS "Agents own their deals" ON crm_deals;
CREATE POLICY "Agents own their deals" ON crm_deals
  FOR ALL USING (
    agent_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Deal Activities
DROP POLICY IF EXISTS "Access deal activities through deal" ON crm_deal_activities;
CREATE POLICY "Access deal activities through deal" ON crm_deal_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = deal_id
      AND (
        crm_deals.agent_id = auth.uid()
        OR crm_is_admin()
        OR (crm_is_supervisor() AND crm_deals.agent_id = ANY(crm_get_supervised_agents()))
      )
    )
  );

-- Tasks
DROP POLICY IF EXISTS "Agents own their tasks" ON crm_tasks;
CREATE POLICY "Agents own their tasks" ON crm_tasks
  FOR ALL USING (
    agent_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Meetings
DROP POLICY IF EXISTS "Agents own their meetings" ON crm_meetings;
CREATE POLICY "Agents own their meetings" ON crm_meetings
  FOR ALL USING (
    agent_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Messages
DROP POLICY IF EXISTS "Agents own their messages" ON crm_messages;
CREATE POLICY "Agents own their messages" ON crm_messages
  FOR ALL USING (
    agent_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Campaigns
DROP POLICY IF EXISTS "Agents own their campaigns" ON crm_campaigns;
CREATE POLICY "Agents own their campaigns" ON crm_campaigns
  FOR ALL USING (
    agent_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Campaign Recipients
DROP POLICY IF EXISTS "Access campaign recipients through campaign" ON crm_campaign_recipients;
CREATE POLICY "Access campaign recipients through campaign" ON crm_campaign_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_campaigns
      WHERE crm_campaigns.id = campaign_id
      AND (
        crm_campaigns.agent_id = auth.uid()
        OR crm_is_admin()
        OR (crm_is_supervisor() AND crm_campaigns.agent_id = ANY(crm_get_supervised_agents()))
      )
    )
  );

-- Policies
DROP POLICY IF EXISTS "Agents own their policies" ON crm_policies;
CREATE POLICY "Agents own their policies" ON crm_policies
  FOR ALL USING (
    agent_id = auth.uid()
    OR crm_is_admin()
    OR (crm_is_supervisor() AND agent_id = ANY(crm_get_supervised_agents()))
  );

-- Coverage Gaps
DROP POLICY IF EXISTS "Access coverage gaps through contact" ON crm_coverage_gaps;
CREATE POLICY "Access coverage gaps through contact" ON crm_coverage_gaps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm_contacts
      WHERE crm_contacts.id = contact_id
      AND (
        crm_contacts.agent_id = auth.uid()
        OR crm_is_admin()
        OR (crm_is_supervisor() AND crm_contacts.agent_id = ANY(crm_get_supervised_agents()))
      )
    )
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to service role (for server-side operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE crm_contacts IS 'Main CRM contacts table - each agent manages their own contacts';
COMMENT ON TABLE crm_leads IS 'Sales leads pipeline with status tracking';
COMMENT ON TABLE crm_deals IS 'Deals/opportunities with financial tracking';
COMMENT ON TABLE crm_tasks IS 'Tasks and reminders for agents';
COMMENT ON TABLE crm_meetings IS 'Calendar meetings with contacts';
COMMENT ON TABLE crm_messages IS 'Communication history (WhatsApp, SMS, Email)';
COMMENT ON TABLE crm_campaigns IS 'Marketing campaigns for bulk messaging';
COMMENT ON TABLE crm_policies IS 'Insurance policies held by contacts';
COMMENT ON TABLE crm_coverage_gaps IS 'AI-identified coverage gaps for upselling';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
