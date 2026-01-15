-- ============================================
-- SELAI Insurance Integration Hub
-- Migration 002 - Enhanced Tables
--
-- New tables for:
-- - Insurance Products Catalog
-- - Quote History & Comparison
-- - Insurance Applications
-- - Coverage Analysis Results
-- - Notifications Log
-- - Agent Performance Metrics
-- - API Keys Management
-- ============================================

-- ============================================
-- INSURANCE PRODUCTS CATALOG
-- מוצרי ביטוח מכל החברות
-- ============================================
CREATE TABLE IF NOT EXISTS insurance_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Carrier information
  carrier_code TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  carrier_name_hebrew TEXT,

  -- Product identification
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_name_hebrew TEXT,

  -- Product type
  insurance_type TEXT NOT NULL,
  insurance_category TEXT, -- 'general', 'life', 'pension', 'health'
  description TEXT,
  description_hebrew TEXT,

  -- Eligibility
  min_age INTEGER,
  max_age INTEGER,
  required_consents TEXT[] DEFAULT '{}',

  -- Coverage options
  coverage_options JSONB DEFAULT '[]',
  -- Example: [{"name": "basic", "coverage": 100000, "premium": 500}, ...]

  -- Pricing
  pricing_model TEXT DEFAULT 'QUOTED', -- 'FIXED', 'CALCULATED', 'QUOTED'
  base_premium DECIMAL(15, 2),
  commission_rate DECIMAL(5, 2),

  -- Terms
  terms JSONB DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',
  waiting_period_days INTEGER,

  -- Availability
  is_active BOOLEAN DEFAULT true,
  available_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  available_until TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(carrier_code, product_code)
);

-- Indexes
CREATE INDEX idx_products_carrier ON insurance_products(carrier_code);
CREATE INDEX idx_products_type ON insurance_products(insurance_type);
CREATE INDEX idx_products_active ON insurance_products(is_active);
CREATE INDEX idx_products_category ON insurance_products(insurance_category);

-- ============================================
-- QUOTE HISTORY
-- היסטוריית הצעות מחיר
-- ============================================
CREATE TABLE IF NOT EXISTS quote_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),

  -- Request details
  request_id TEXT UNIQUE NOT NULL,
  insurance_type TEXT NOT NULL,
  coverage_amount DECIMAL(15, 2) NOT NULL,
  deductible DECIMAL(15, 2),
  start_date DATE NOT NULL,

  -- Customer data snapshot
  customer_data JSONB NOT NULL,

  -- Additional request data
  request_data JSONB DEFAULT '{}',

  -- Quotes received
  quotes JSONB NOT NULL DEFAULT '[]',
  -- Array of quote objects with carrier, premium, coverage, etc.

  quotes_count INTEGER DEFAULT 0,
  lowest_premium DECIMAL(15, 2),
  highest_premium DECIMAL(15, 2),

  -- Selection
  selected_quote_id TEXT,
  selected_carrier TEXT,
  selected_premium DECIMAL(15, 2),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'accepted', 'expired', 'cancelled'
  )),

  -- Validity
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quote_history_contact ON quote_history(contact_id);
CREATE INDEX idx_quote_history_agent ON quote_history(agent_id);
CREATE INDEX idx_quote_history_type ON quote_history(insurance_type);
CREATE INDEX idx_quote_history_status ON quote_history(status);
CREATE INDEX idx_quote_history_created ON quote_history(created_at DESC);
CREATE INDEX idx_quote_history_request ON quote_history(request_id);

-- ============================================
-- INSURANCE APPLICATIONS
-- בקשות לביטוח
-- ============================================
CREATE TABLE IF NOT EXISTS insurance_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  quote_id UUID REFERENCES quote_history(id),

  -- Application identification
  application_number TEXT UNIQUE,
  external_id TEXT,

  -- Product details
  carrier_code TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  product_code TEXT,
  product_name TEXT,
  insurance_type TEXT NOT NULL,

  -- Application data
  application_data JSONB NOT NULL,

  -- Coverage & Premium
  coverage_amount DECIMAL(15, 2),
  premium_amount DECIMAL(15, 2),
  premium_frequency TEXT DEFAULT 'monthly',

  -- Status workflow
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'documents_required',
    'approved', 'rejected', 'cancelled', 'issued'
  )),
  status_history JSONB DEFAULT '[]',

  -- Documents
  documents JSONB DEFAULT '[]',
  -- Array: [{"name": "...", "type": "...", "url": "...", "uploaded_at": "..."}]

  -- Timeline
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  decision_at TIMESTAMP WITH TIME ZONE,
  issued_at TIMESTAMP WITH TIME ZONE,

  -- Decision
  decision_reason TEXT,
  reviewer_notes TEXT,

  -- Resulting policy
  policy_id UUID REFERENCES external_policies(id),
  policy_number TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_applications_contact ON insurance_applications(contact_id);
CREATE INDEX idx_applications_agent ON insurance_applications(agent_id);
CREATE INDEX idx_applications_status ON insurance_applications(status);
CREATE INDEX idx_applications_carrier ON insurance_applications(carrier_code);
CREATE INDEX idx_applications_created ON insurance_applications(created_at DESC);

-- ============================================
-- COVERAGE ANALYSIS RESULTS
-- תוצאות ניתוח כיסויים
-- ============================================
CREATE TABLE IF NOT EXISTS coverage_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),

  -- Analysis date
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Portfolio snapshot
  policies_count INTEGER DEFAULT 0,
  pension_accounts_count INTEGER DEFAULT 0,

  -- Coverage totals
  total_life_coverage DECIMAL(15, 2) DEFAULT 0,
  total_health_coverage DECIMAL(15, 2) DEFAULT 0,
  total_property_coverage DECIMAL(15, 2) DEFAULT 0,
  total_vehicle_coverage DECIMAL(15, 2) DEFAULT 0,
  total_pension_balance DECIMAL(15, 2) DEFAULT 0,

  -- Premium totals
  total_annual_premium DECIMAL(15, 2) DEFAULT 0,
  premium_breakdown JSONB DEFAULT '{}',

  -- Coverage score (0-100)
  coverage_score INTEGER,
  category_scores JSONB DEFAULT '{}',
  -- {"life": 85, "health": 90, "property": 70, "retirement": 75, "liability": 50}

  grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  grade_description TEXT,

  -- Gaps detected
  gaps JSONB DEFAULT '[]',
  gaps_count INTEGER DEFAULT 0,
  high_priority_gaps INTEGER DEFAULT 0,

  -- Recommendations
  recommendations JSONB DEFAULT '[]',
  recommendations_count INTEGER DEFAULT 0,

  -- Risk assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB DEFAULT '[]',
  protection_level INTEGER, -- 0-100
  vulnerability_areas TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coverage_analysis_contact ON coverage_analysis(contact_id);
CREATE INDEX idx_coverage_analysis_agent ON coverage_analysis(agent_id);
CREATE INDEX idx_coverage_analysis_date ON coverage_analysis(analysis_date DESC);
CREATE INDEX idx_coverage_analysis_score ON coverage_analysis(coverage_score);

-- ============================================
-- COVERAGE GAPS (standalone table for tracking)
-- פערי כיסוי
-- ============================================
CREATE TABLE IF NOT EXISTS coverage_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  analysis_id UUID REFERENCES coverage_analysis(id) ON DELETE CASCADE,

  -- Gap identification
  gap_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),

  -- Gap details
  title TEXT NOT NULL,
  title_hebrew TEXT,
  description TEXT,
  description_hebrew TEXT,
  insurance_type TEXT NOT NULL,

  -- Recommendations
  recommended_coverage DECIMAL(15, 2),
  estimated_premium DECIMAL(15, 2),

  -- Related records
  related_policy_id UUID REFERENCES external_policies(id),
  related_pension_id UUID REFERENCES pension_accounts(id),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'addressed', 'dismissed', 'expired')),
  addressed_at TIMESTAMP WITH TIME ZONE,
  addressed_by UUID REFERENCES users(id),
  addressed_notes TEXT,

  -- Detection
  detection_rule TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gaps_contact ON coverage_gaps(contact_id);
CREATE INDEX idx_gaps_agent ON coverage_gaps(agent_id);
CREATE INDEX idx_gaps_analysis ON coverage_gaps(analysis_id);
CREATE INDEX idx_gaps_status ON coverage_gaps(status);
CREATE INDEX idx_gaps_priority ON coverage_gaps(priority);
CREATE INDEX idx_gaps_type ON coverage_gaps(gap_type);

-- ============================================
-- NOTIFICATIONS LOG
-- יומן התראות
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Recipients
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  user_id UUID REFERENCES users(id), -- For agent notifications

  -- Notification type
  notification_type TEXT NOT NULL,
  -- Types: 'policy_expiry', 'payment_due', 'claim_update', 'gap_alert',
  --        'renewal_reminder', 'document_required', 'quote_received', etc.

  -- Channel
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'webhook')),

  -- Content
  subject TEXT,
  content TEXT,
  content_html TEXT,

  -- Template
  template_id TEXT,
  template_data JSONB DEFAULT '{}',

  -- Related records
  related_policy_id UUID REFERENCES external_policies(id),
  related_claim_id UUID REFERENCES external_claims(id),
  related_gap_id UUID REFERENCES coverage_gaps(id),
  metadata JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'
  )),

  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_contact ON notifications(contact_id);
CREATE INDEX idx_notifications_agent ON notifications(agent_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- AGENT PERFORMANCE METRICS
-- מדדי ביצועים של סוכנים
-- ============================================
CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Agent
  agent_id UUID NOT NULL REFERENCES users(id),

  -- Period
  metric_date DATE NOT NULL,
  metric_period TEXT DEFAULT 'daily' CHECK (metric_period IN ('daily', 'weekly', 'monthly')),

  -- Customer metrics
  customer_count INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,

  -- Policy metrics
  policies_count INTEGER DEFAULT 0,
  policies_sold INTEGER DEFAULT 0,
  policies_renewed INTEGER DEFAULT 0,
  policies_cancelled INTEGER DEFAULT 0,

  -- Financial metrics
  total_premium DECIMAL(15, 2) DEFAULT 0,
  new_premium DECIMAL(15, 2) DEFAULT 0,
  total_commission DECIMAL(15, 2) DEFAULT 0,
  pending_commission DECIMAL(15, 2) DEFAULT 0,

  -- Quote metrics
  quotes_generated INTEGER DEFAULT 0,
  quotes_accepted INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2),

  -- Sync metrics
  syncs_performed INTEGER DEFAULT 0,
  gaps_detected INTEGER DEFAULT 0,
  gaps_addressed INTEGER DEFAULT 0,

  -- Coverage metrics
  avg_coverage_score DECIMAL(5, 2),
  customers_at_risk INTEGER DEFAULT 0,

  -- Claim metrics
  claims_submitted INTEGER DEFAULT 0,
  claims_approved INTEGER DEFAULT 0,
  claims_paid_amount DECIMAL(15, 2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(agent_id, metric_date, metric_period)
);

-- Indexes
CREATE INDEX idx_agent_metrics_agent ON agent_metrics(agent_id);
CREATE INDEX idx_agent_metrics_date ON agent_metrics(metric_date DESC);
CREATE INDEX idx_agent_metrics_period ON agent_metrics(metric_period);

-- ============================================
-- API KEYS
-- מפתחות API
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Owner
  user_id UUID REFERENCES users(id),
  tenant_id UUID,

  -- Key details
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash
  key_prefix TEXT NOT NULL, -- First 8 chars for identification

  -- Permissions
  permissions TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour

  -- Validity
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- ============================================
-- REMINDERS / SCHEDULED TASKS
-- תזכורות ומשימות מתוזמנות
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  policy_id UUID REFERENCES external_policies(id),

  -- Reminder type
  reminder_type TEXT NOT NULL,
  -- Types: 'policy_renewal', 'payment_due', 'document_expiry',
  --        'follow_up', 'review_coverage', 'custom'

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  reminder_days_before INTEGER DEFAULT 0,

  -- Recurrence
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
  recurrence_end_date DATE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'acknowledged', 'completed', 'cancelled', 'snoozed'
  )),

  -- Action taken
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  completion_notes TEXT,

  -- Snooze
  snoozed_until DATE,
  snooze_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reminders_contact ON scheduled_reminders(contact_id);
CREATE INDEX idx_reminders_agent ON scheduled_reminders(agent_id);
CREATE INDEX idx_reminders_policy ON scheduled_reminders(policy_id);
CREATE INDEX idx_reminders_date ON scheduled_reminders(scheduled_date);
CREATE INDEX idx_reminders_status ON scheduled_reminders(status);
CREATE INDEX idx_reminders_type ON scheduled_reminders(reminder_type);

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

-- Products (public read, admin write)
CREATE POLICY "products_select" ON insurance_products
  FOR SELECT USING (true);

CREATE POLICY "products_insert" ON insurance_products
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

CREATE POLICY "products_update" ON insurance_products
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

-- Quote History
CREATE POLICY "quote_history_select" ON quote_history
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
    OR agent_id IN (
      SELECT agent_id FROM agent_supervisor_relations
      WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "quote_history_insert" ON quote_history
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

-- Insurance Applications
CREATE POLICY "applications_select" ON insurance_applications
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
    OR agent_id IN (
      SELECT agent_id FROM agent_supervisor_relations
      WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "applications_insert" ON insurance_applications
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

CREATE POLICY "applications_update" ON insurance_applications
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

-- Coverage Analysis
CREATE POLICY "coverage_analysis_select" ON coverage_analysis
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
    OR agent_id IN (
      SELECT agent_id FROM agent_supervisor_relations
      WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "coverage_analysis_insert" ON coverage_analysis
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

-- Coverage Gaps
CREATE POLICY "coverage_gaps_select" ON coverage_gaps
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
    OR agent_id IN (
      SELECT agent_id FROM agent_supervisor_relations
      WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "coverage_gaps_all" ON coverage_gaps
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

-- Notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
    OR user_id = auth.uid()
  );

-- Agent Metrics
CREATE POLICY "agent_metrics_select" ON agent_metrics
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
    OR agent_id IN (
      SELECT agent_id FROM agent_supervisor_relations
      WHERE supervisor_id = auth.uid()
    )
  );

-- API Keys
CREATE POLICY "api_keys_select" ON api_keys
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "api_keys_all" ON api_keys
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR user_id = auth.uid()
  );

-- Scheduled Reminders
CREATE POLICY "reminders_select" ON scheduled_reminders
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

CREATE POLICY "reminders_all" ON scheduled_reminders
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_insurance_products_updated_at
  BEFORE UPDATE ON insurance_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_history_updated_at
  BEFORE UPDATE ON quote_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_applications_updated_at
  BEFORE UPDATE ON insurance_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coverage_gaps_updated_at
  BEFORE UPDATE ON coverage_gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_metrics_updated_at
  BEFORE UPDATE ON agent_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reminders_updated_at
  BEFORE UPDATE ON scheduled_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON insurance_products TO authenticated;
GRANT ALL ON quote_history TO authenticated;
GRANT ALL ON insurance_applications TO authenticated;
GRANT ALL ON coverage_analysis TO authenticated;
GRANT ALL ON coverage_gaps TO authenticated;
GRANT SELECT, INSERT ON notifications TO authenticated;
GRANT SELECT ON agent_metrics TO authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON scheduled_reminders TO authenticated;
