-- =============================================================================
-- Supabase Tables Setup Script for SelAI Admin Hub
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor to create all required tables.
-- These tables are predefined and used by the application.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. exec_sql function (IMPORTANT: enables automatic data imports)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. master_data - Sales/Accumulation data
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_data (
  id BIGSERIAL PRIMARY KEY,
  -- Add your columns here based on your Excel structure
  -- Example columns:
  agent_name TEXT,
  client_name TEXT,
  product TEXT,
  amount NUMERIC,
  date TIMESTAMPTZ,
  status TEXT,
  notes TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "Service role has full access to master_data" ON master_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. insurance_data - Insurance data
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insurance_data (
  id BIGSERIAL PRIMARY KEY,
  -- Add your columns here
  policy_number TEXT,
  client_name TEXT,
  insurance_type TEXT,
  premium NUMERIC,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT,
  agent_name TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE insurance_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to insurance_data" ON insurance_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. processes_data - Process data
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS processes_data (
  id BIGSERIAL PRIMARY KEY,
  -- Add your columns here
  process_name TEXT,
  client_name TEXT,
  agent_name TEXT,
  status TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  notes TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE processes_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to processes_data" ON processes_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. sahbak_data - SAHBAK data
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sahbak_data (
  id BIGSERIAL PRIMARY KEY,
  -- Add your columns here
  agent_name TEXT,
  client_name TEXT,
  product TEXT,
  amount NUMERIC,
  date TIMESTAMPTZ,
  status TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sahbak_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to sahbak_data" ON sahbak_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. commissions_data - Commissions data
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commissions_data (
  id BIGSERIAL PRIMARY KEY,
  -- Add your columns here
  agent_name TEXT,
  client_name TEXT,
  product TEXT,
  commission_amount NUMERIC,
  commission_type TEXT,
  date TIMESTAMPTZ,
  status TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE commissions_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to commissions_data" ON commissions_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7. leads_data - Leads data
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads_data (
  id BIGSERIAL PRIMARY KEY,
  -- Add your columns here
  lead_name TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  status TEXT,
  assigned_agent TEXT,
  notes TEXT,
  created_date TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to leads_data" ON leads_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Notify PostgREST to reload schema (IMPORTANT!)
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Done! All tables have been created.
-- You can now use these tables in the SelAI Admin Hub application.
--
-- Note: The columns defined above are examples. When you import Excel data,
-- the system will automatically add any missing columns to the tables.
-- =============================================================================
