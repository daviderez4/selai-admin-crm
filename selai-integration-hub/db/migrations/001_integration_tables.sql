-- ============================================
-- SELAI Insurance Integration Hub
-- Supabase Migration - External Data Tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- External Policies Table (from integration hub)
-- ============================================
CREATE TABLE IF NOT EXISTS external_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  
  -- Policy identification
  policy_number TEXT NOT NULL,
  external_id TEXT,
  
  -- Policy details
  insurance_type TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  insurance_company_code TEXT,
  
  -- Dates
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  issue_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expired', 'cancelled', 'suspended', 'renewed')),
  
  -- Coverage & Premium
  coverage_amount DECIMAL(15, 2),
  coverage_details JSONB DEFAULT '{}',
  premium_amount DECIMAL(15, 2),
  premium_frequency TEXT DEFAULT 'monthly',
  premium_currency TEXT DEFAULT 'ILS',
  
  -- Type-specific data
  type_specific_data JSONB DEFAULT '{}',
  
  -- Beneficiaries
  beneficiaries JSONB DEFAULT '[]',
  
  -- Source tracking
  source_system TEXT NOT NULL,
  raw_data JSONB,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(policy_number, insurance_company)
);

-- Indexes
CREATE INDEX idx_external_policies_contact ON external_policies(contact_id);
CREATE INDEX idx_external_policies_agent ON external_policies(agent_id);
CREATE INDEX idx_external_policies_status ON external_policies(status);
CREATE INDEX idx_external_policies_type ON external_policies(insurance_type);
CREATE INDEX idx_external_policies_company ON external_policies(insurance_company);
CREATE INDEX idx_external_policies_end_date ON external_policies(end_date);

-- ============================================
-- Pension Accounts Table
-- ============================================
CREATE TABLE IF NOT EXISTS pension_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  
  -- Account identification
  account_number TEXT NOT NULL,
  
  -- Account type
  account_type TEXT NOT NULL CHECK (account_type IN (
    'pension_comprehensive', 'pension_general', 'provident_fund',
    'severance_fund', 'gemel_savings', 'gemel_investment'
  )),
  
  -- Managing company
  managing_company TEXT NOT NULL,
  managing_company_code TEXT,
  fund_name TEXT,
  fund_number TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'transferred', 'closed')),
  
  -- Balance
  balance_total DECIMAL(15, 2),
  balance_severance DECIMAL(15, 2),
  balance_employer DECIMAL(15, 2),
  balance_employee DECIMAL(15, 2),
  balance_returns DECIMAL(15, 2),
  balance_date TIMESTAMP WITH TIME ZONE,
  
  -- Contributions
  monthly_salary DECIMAL(15, 2),
  employee_contribution_rate DECIMAL(5, 2),
  employer_contribution_rate DECIMAL(5, 2),
  severance_rate DECIMAL(5, 2),
  last_contribution_date TIMESTAMP WITH TIME ZONE,
  
  -- Management fees
  savings_management_fee DECIMAL(5, 3),
  contributions_management_fee DECIMAL(5, 3),
  
  -- Insurance coverage
  disability_coverage DECIMAL(15, 2),
  death_coverage DECIMAL(15, 2),
  
  -- Beneficiaries
  beneficiaries JSONB DEFAULT '[]',
  
  -- Source tracking
  source_system TEXT NOT NULL,
  raw_data JSONB,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_number, managing_company)
);

-- Indexes
CREATE INDEX idx_pension_accounts_contact ON pension_accounts(contact_id);
CREATE INDEX idx_pension_accounts_agent ON pension_accounts(agent_id);
CREATE INDEX idx_pension_accounts_type ON pension_accounts(account_type);
CREATE INDEX idx_pension_accounts_company ON pension_accounts(managing_company);
CREATE INDEX idx_pension_accounts_status ON pension_accounts(status);

-- ============================================
-- External Claims Table
-- ============================================
CREATE TABLE IF NOT EXISTS external_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_policy_id UUID REFERENCES external_policies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id),
  
  -- Claim identification
  claim_number TEXT NOT NULL,
  external_id TEXT,
  
  -- Claim details
  claim_type TEXT NOT NULL,
  description TEXT,
  incident_date TIMESTAMP WITH TIME ZONE,
  reported_date TIMESTAMP WITH TIME ZONE,
  
  -- Amounts
  claimed_amount DECIMAL(15, 2),
  approved_amount DECIMAL(15, 2),
  paid_amount DECIMAL(15, 2),
  currency TEXT DEFAULT 'ILS',
  
  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'under_review', 'approved', 'rejected', 'partial_approved', 'paid', 'closed'
  )),
  
  -- Status history
  status_history JSONB DEFAULT '[]',
  
  -- Decision
  decision_date TIMESTAMP WITH TIME ZONE,
  decision_reason TEXT,
  
  -- Payment
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Source tracking
  source_system TEXT NOT NULL,
  raw_data JSONB,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_external_claims_policy ON external_claims(external_policy_id);
CREATE INDEX idx_external_claims_contact ON external_claims(contact_id);
CREATE INDEX idx_external_claims_status ON external_claims(status);

-- ============================================
-- Data Sync Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS data_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id),
  agent_id UUID REFERENCES users(id),
  
  -- Sync details
  sync_type TEXT NOT NULL, -- 'full', 'policies', 'pension', 'claims'
  source_system TEXT NOT NULL,
  
  -- Results
  success BOOLEAN DEFAULT false,
  policies_synced INTEGER DEFAULT 0,
  pension_accounts_synced INTEGER DEFAULT 0,
  claims_synced INTEGER DEFAULT 0,
  gaps_detected INTEGER DEFAULT 0,
  
  -- Errors
  error_message TEXT,
  error_details JSONB,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_data_sync_log_contact ON data_sync_log(contact_id);
CREATE INDEX idx_data_sync_log_created ON data_sync_log(created_at DESC);

-- ============================================
-- Consents Table (for Mislaka, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS data_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Consent details
  consent_type TEXT NOT NULL, -- 'mislaka_access', 'data_access', 'marketing', etc.
  scope TEXT,
  description TEXT,
  
  -- Validity
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  
  -- Document
  document_url TEXT,
  signature TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_data_consents_contact ON data_consents(contact_id);
CREATE INDEX idx_data_consents_type ON data_consents(consent_type);
CREATE INDEX idx_data_consents_status ON data_consents(status);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE external_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pension_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_consents ENABLE ROW LEVEL SECURITY;

-- External Policies RLS
CREATE POLICY "external_policies_select" ON external_policies
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
    OR agent_id = auth.uid()
    OR agent_id IN (
      SELECT agent_id FROM agent_supervisor_relations 
      WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "external_policies_insert" ON external_policies
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

CREATE POLICY "external_policies_update" ON external_policies
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

-- Pension Accounts RLS (same pattern)
CREATE POLICY "pension_accounts_select" ON pension_accounts
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
    OR agent_id IN (
      SELECT agent_id FROM agent_supervisor_relations 
      WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "pension_accounts_insert" ON pension_accounts
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR agent_id = auth.uid()
  );

-- ============================================
-- Updated At Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_external_policies_updated_at
  BEFORE UPDATE ON external_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pension_accounts_updated_at
  BEFORE UPDATE ON pension_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_claims_updated_at
  BEFORE UPDATE ON external_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_consents_updated_at
  BEFORE UPDATE ON data_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views for easy querying
-- ============================================

-- Customer insurance summary view
CREATE OR REPLACE VIEW customer_insurance_summary AS
SELECT 
  c.id as contact_id,
  c.full_name,
  c.id_number,
  c.agent_id,
  COUNT(DISTINCT ep.id) as policies_count,
  COUNT(DISTINCT pa.id) as pension_accounts_count,
  COALESCE(SUM(ep.coverage_amount), 0) as total_coverage,
  COALESCE(SUM(ep.premium_amount), 0) as total_annual_premium,
  COALESCE(SUM(pa.balance_total), 0) as total_pension_balance,
  COUNT(DISTINCT cg.id) FILTER (WHERE cg.status = 'active') as active_gaps_count,
  MAX(ep.last_sync_at) as last_policies_sync,
  MAX(pa.last_sync_at) as last_pension_sync
FROM contacts c
LEFT JOIN external_policies ep ON ep.contact_id = c.id AND ep.status = 'active'
LEFT JOIN pension_accounts pa ON pa.contact_id = c.id AND pa.status = 'active'
LEFT JOIN coverage_gaps cg ON cg.contact_id = c.id
GROUP BY c.id, c.full_name, c.id_number, c.agent_id;

-- Grant permissions
GRANT SELECT ON customer_insurance_summary TO authenticated;
