-- =============================================================================
-- Fix missing tables and columns
-- Run this SQL in Supabase SQL Editor
-- =============================================================================

-- 1. Add missing column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_import_enabled BOOLEAN DEFAULT false;

-- 2. Create nifraim table (נפרעים)
CREATE TABLE IF NOT EXISTS nifraim (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    agent_id UUID,
    agent_name TEXT,
    data JSONB NOT NULL DEFAULT '{}',

    -- Common fields
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

    -- Source tracking
    source_file TEXT,
    sheet_name TEXT,
    row_number INTEGER,

    -- Timestamps
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create gemel table (גמל)
CREATE TABLE IF NOT EXISTS gemel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    agent_id UUID,
    agent_name TEXT,
    data JSONB NOT NULL DEFAULT '{}',

    -- Common fields
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

    -- Source tracking
    source_file TEXT,
    sheet_name TEXT,
    row_number INTEGER,

    -- Timestamps
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for nifraim
CREATE INDEX IF NOT EXISTS idx_nifraim_project_id ON nifraim(project_id);
CREATE INDEX IF NOT EXISTS idx_nifraim_agent_id ON nifraim(agent_id);
CREATE INDEX IF NOT EXISTS idx_nifraim_id_number ON nifraim(id_number);
CREATE INDEX IF NOT EXISTS idx_nifraim_phone ON nifraim(phone);
CREATE INDEX IF NOT EXISTS idx_nifraim_data_gin ON nifraim USING GIN (data);

-- 5. Create indexes for gemel
CREATE INDEX IF NOT EXISTS idx_gemel_project_id ON gemel(project_id);
CREATE INDEX IF NOT EXISTS idx_gemel_agent_id ON gemel(agent_id);
CREATE INDEX IF NOT EXISTS idx_gemel_id_number ON gemel(id_number);
CREATE INDEX IF NOT EXISTS idx_gemel_phone ON gemel(phone);
CREATE INDEX IF NOT EXISTS idx_gemel_data_gin ON gemel USING GIN (data);

-- 6. Enable RLS on all tables
ALTER TABLE nifraim ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemel ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for nifraim
DROP POLICY IF EXISTS "Service role full access nifraim" ON nifraim;
CREATE POLICY "Service role full access nifraim" ON nifraim FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view nifraim" ON nifraim;
CREATE POLICY "Authenticated can view nifraim" ON nifraim FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert nifraim" ON nifraim;
CREATE POLICY "Authenticated can insert nifraim" ON nifraim FOR INSERT TO authenticated WITH CHECK (true);

-- 8. RLS Policies for gemel
DROP POLICY IF EXISTS "Service role full access gemel" ON gemel;
CREATE POLICY "Service role full access gemel" ON gemel FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view gemel" ON gemel;
CREATE POLICY "Authenticated can view gemel" ON gemel FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert gemel" ON gemel;
CREATE POLICY "Authenticated can insert gemel" ON gemel FOR INSERT TO authenticated WITH CHECK (true);

-- 9. Grant permissions
GRANT ALL ON nifraim TO authenticated;
GRANT ALL ON nifraim TO service_role;
GRANT ALL ON gemel TO authenticated;
GRANT ALL ON gemel TO service_role;

-- 10. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT 'Migration completed! Tables created: nifraim, gemel. Column added: auto_import_enabled' as status;
