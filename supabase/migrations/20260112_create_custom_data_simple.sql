-- =============================================================================
-- Simple custom_data table for Excel imports
-- Run this SQL in Supabase SQL Editor
-- =============================================================================

-- Create custom_data table
CREATE TABLE IF NOT EXISTS custom_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project reference
    project_id UUID,

    -- Agent association
    agent_id UUID,
    agent_name TEXT,

    -- Flexible data storage
    data JSONB NOT NULL DEFAULT '{}',

    -- Common fields for quick queries
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    id_number TEXT,
    phone TEXT,
    email TEXT,
    balance DECIMAL(15,2),
    premium DECIMAL(15,2),
    commission DECIMAL(15,2),
    status TEXT,
    policy_number TEXT,
    insurance_company TEXT,
    product_type TEXT,

    -- Source info
    source_file TEXT,
    sheet_name TEXT,
    row_number INTEGER,

    -- Timestamps
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_custom_data_project_id ON custom_data(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_data_agent_id ON custom_data(agent_id);
CREATE INDEX IF NOT EXISTS idx_custom_data_id_number ON custom_data(id_number);
CREATE INDEX IF NOT EXISTS idx_custom_data_phone ON custom_data(phone);
CREATE INDEX IF NOT EXISTS idx_custom_data_data_gin ON custom_data USING GIN (data);

-- Enable RLS
ALTER TABLE custom_data ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API imports)
DROP POLICY IF EXISTS "Service role full access" ON custom_data;
CREATE POLICY "Service role full access" ON custom_data
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Allow authenticated users to view data
DROP POLICY IF EXISTS "Authenticated users can view" ON custom_data;
CREATE POLICY "Authenticated users can view" ON custom_data
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to insert data
DROP POLICY IF EXISTS "Authenticated users can insert" ON custom_data;
CREATE POLICY "Authenticated users can insert" ON custom_data
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON custom_data TO authenticated;
GRANT ALL ON custom_data TO service_role;

-- Verify table created
SELECT 'custom_data table created successfully!' as status;
