-- =============================================================================
-- Complete Database Setup for Selai Admin Hub
-- Run this SQL in Supabase SQL Editor
-- Date: 2026-01-12
-- =============================================================================

-- =============================================================================
-- 1. PROJECTS TABLE (Core table - must exist first)
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID,

    -- External Supabase connection (nullable for local mode)
    supabase_url TEXT,
    supabase_anon_key TEXT,
    supabase_service_key TEXT,

    -- Storage configuration
    storage_mode VARCHAR(20) DEFAULT 'local' CHECK (storage_mode IN ('local', 'external')),
    table_name VARCHAR(255) DEFAULT 'master_data',
    data_type VARCHAR(50) DEFAULT 'custom',

    -- Visual customization
    icon VARCHAR(50) DEFAULT 'layout-dashboard',
    color VARCHAR(30) DEFAULT 'slate',

    -- Connection status
    is_configured BOOLEAN DEFAULT false,
    connection_last_tested TIMESTAMPTZ,
    connection_error TEXT,

    -- Auto import
    auto_import_enabled BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_storage_mode ON projects(storage_mode);
CREATE INDEX IF NOT EXISTS idx_projects_data_type ON projects(data_type);

-- =============================================================================
-- 2. USERS TABLE (User management)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('admin', 'supervisor', 'agent')),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    supervisor_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);

-- =============================================================================
-- 3. USER PROJECT ACCESS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_project_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'agent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_project_access_user_id ON user_project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_access_project_id ON user_project_access(project_id);

-- =============================================================================
-- 4. USER PROFILES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    handler_name TEXT,
    supervisor_id UUID REFERENCES users(id),
    department TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_supervisor_id ON user_profiles(supervisor_id);

-- =============================================================================
-- 5. CUSTOM_DATA TABLE (Generic Excel imports)
-- =============================================================================
CREATE TABLE IF NOT EXISTS custom_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_name TEXT,

    -- Flexible data storage
    data JSONB NOT NULL DEFAULT '{}',
    raw_data JSONB,

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
    import_batch TEXT,
    import_date DATE,
    import_month INTEGER,
    import_year INTEGER,

    -- Timestamps
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_data_project_id ON custom_data(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_data_agent_id ON custom_data(agent_id);
CREATE INDEX IF NOT EXISTS idx_custom_data_id_number ON custom_data(id_number);
CREATE INDEX IF NOT EXISTS idx_custom_data_phone ON custom_data(phone);
CREATE INDEX IF NOT EXISTS idx_custom_data_data_gin ON custom_data USING GIN (data);

-- =============================================================================
-- 6. NIFRAIM TABLE (נפרעים)
-- =============================================================================
CREATE TABLE IF NOT EXISTS nifraim (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_name TEXT,

    -- View-specific fields (matching VIEW_SCHEMAS in API)
    provider TEXT,
    processing_month TEXT,
    branch TEXT,
    premium DECIMAL(15,2),
    comission DECIMAL(15,2),

    -- Flexible data storage
    data JSONB NOT NULL DEFAULT '{}',
    raw_data JSONB,

    -- Common fields
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    id_number TEXT,
    phone TEXT,
    email TEXT,
    balance DECIMAL(15,2),
    commission DECIMAL(15,2),
    status TEXT,
    policy_number TEXT,
    insurance_company TEXT,
    product_type TEXT,

    -- Source tracking
    source_file TEXT,
    sheet_name TEXT,
    row_number INTEGER,
    import_batch TEXT,
    import_date DATE,
    import_month INTEGER,
    import_year INTEGER,

    -- Timestamps
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nifraim_project_id ON nifraim(project_id);
CREATE INDEX IF NOT EXISTS idx_nifraim_agent_id ON nifraim(agent_id);
CREATE INDEX IF NOT EXISTS idx_nifraim_agent_name ON nifraim(agent_name);
CREATE INDEX IF NOT EXISTS idx_nifraim_provider ON nifraim(provider);
CREATE INDEX IF NOT EXISTS idx_nifraim_processing_month ON nifraim(processing_month);
CREATE INDEX IF NOT EXISTS idx_nifraim_id_number ON nifraim(id_number);
CREATE INDEX IF NOT EXISTS idx_nifraim_data_gin ON nifraim USING GIN (data);

-- =============================================================================
-- 7. GEMEL TABLE (גמל)
-- =============================================================================
CREATE TABLE IF NOT EXISTS gemel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_name TEXT,

    -- View-specific fields (matching VIEW_SCHEMAS in API)
    provider TEXT,
    processing_month TEXT,
    branch TEXT,
    accumulation_balance DECIMAL(15,2),
    comission DECIMAL(15,2),

    -- Flexible data storage
    data JSONB NOT NULL DEFAULT '{}',
    raw_data JSONB,

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
    import_batch TEXT,
    import_date DATE,
    import_month INTEGER,
    import_year INTEGER,

    -- Timestamps
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gemel_project_id ON gemel(project_id);
CREATE INDEX IF NOT EXISTS idx_gemel_agent_id ON gemel(agent_id);
CREATE INDEX IF NOT EXISTS idx_gemel_agent_name ON gemel(agent_name);
CREATE INDEX IF NOT EXISTS idx_gemel_provider ON gemel(provider);
CREATE INDEX IF NOT EXISTS idx_gemel_processing_month ON gemel(processing_month);
CREATE INDEX IF NOT EXISTS idx_gemel_id_number ON gemel(id_number);
CREATE INDEX IF NOT EXISTS idx_gemel_data_gin ON gemel USING GIN (data);

-- =============================================================================
-- 8. MASTER_DATA TABLE (Legacy support)
-- =============================================================================
CREATE TABLE IF NOT EXISTS master_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Flexible data storage
    raw_data JSONB,
    data JSONB NOT NULL DEFAULT '{}',

    -- Financial fields
    total_expected_accumulation DECIMAL(15,2),
    product_type_new TEXT,
    producer_new TEXT,
    documents_transfer_date DATE,

    -- Import tracking
    import_batch TEXT,
    import_date DATE,
    import_month INTEGER,
    import_year INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_data_project_id ON master_data(project_id);
CREATE INDEX IF NOT EXISTS idx_master_data_agent_id ON master_data(agent_id);
CREATE INDEX IF NOT EXISTS idx_master_data_created_at ON master_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_master_data_raw_data_gin ON master_data USING GIN (raw_data);

-- =============================================================================
-- 9. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE nifraim ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemel ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 10. RLS POLICIES - Service Role Full Access
-- =============================================================================

-- Projects
DROP POLICY IF EXISTS "Service role full access projects" ON projects;
CREATE POLICY "Service role full access projects" ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users
DROP POLICY IF EXISTS "Service role full access users" ON users;
CREATE POLICY "Service role full access users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User Project Access
DROP POLICY IF EXISTS "Service role full access user_project_access" ON user_project_access;
CREATE POLICY "Service role full access user_project_access" ON user_project_access FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User Profiles
DROP POLICY IF EXISTS "Service role full access user_profiles" ON user_profiles;
CREATE POLICY "Service role full access user_profiles" ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Custom Data
DROP POLICY IF EXISTS "Service role full access custom_data" ON custom_data;
CREATE POLICY "Service role full access custom_data" ON custom_data FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Nifraim
DROP POLICY IF EXISTS "Service role full access nifraim" ON nifraim;
CREATE POLICY "Service role full access nifraim" ON nifraim FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Gemel
DROP POLICY IF EXISTS "Service role full access gemel" ON gemel;
CREATE POLICY "Service role full access gemel" ON gemel FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Master Data
DROP POLICY IF EXISTS "Service role full access master_data" ON master_data;
CREATE POLICY "Service role full access master_data" ON master_data FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 11. RLS POLICIES - Authenticated Users
-- =============================================================================

-- Projects - authenticated can view
DROP POLICY IF EXISTS "Authenticated can view projects" ON projects;
CREATE POLICY "Authenticated can view projects" ON projects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert projects" ON projects;
CREATE POLICY "Authenticated can insert projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update projects" ON projects;
CREATE POLICY "Authenticated can update projects" ON projects FOR UPDATE TO authenticated USING (true);

-- Users - authenticated can view
DROP POLICY IF EXISTS "Authenticated can view users" ON users;
CREATE POLICY "Authenticated can view users" ON users FOR SELECT TO authenticated USING (true);

-- User Project Access - authenticated can view their own
DROP POLICY IF EXISTS "Authenticated can view user_project_access" ON user_project_access;
CREATE POLICY "Authenticated can view user_project_access" ON user_project_access FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert user_project_access" ON user_project_access;
CREATE POLICY "Authenticated can insert user_project_access" ON user_project_access FOR INSERT TO authenticated WITH CHECK (true);

-- Custom Data
DROP POLICY IF EXISTS "Authenticated can view custom_data" ON custom_data;
CREATE POLICY "Authenticated can view custom_data" ON custom_data FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert custom_data" ON custom_data;
CREATE POLICY "Authenticated can insert custom_data" ON custom_data FOR INSERT TO authenticated WITH CHECK (true);

-- Nifraim
DROP POLICY IF EXISTS "Authenticated can view nifraim" ON nifraim;
CREATE POLICY "Authenticated can view nifraim" ON nifraim FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert nifraim" ON nifraim;
CREATE POLICY "Authenticated can insert nifraim" ON nifraim FOR INSERT TO authenticated WITH CHECK (true);

-- Gemel
DROP POLICY IF EXISTS "Authenticated can view gemel" ON gemel;
CREATE POLICY "Authenticated can view gemel" ON gemel FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert gemel" ON gemel;
CREATE POLICY "Authenticated can insert gemel" ON gemel FOR INSERT TO authenticated WITH CHECK (true);

-- Master Data
DROP POLICY IF EXISTS "Authenticated can view master_data" ON master_data;
CREATE POLICY "Authenticated can view master_data" ON master_data FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert master_data" ON master_data;
CREATE POLICY "Authenticated can insert master_data" ON master_data FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- 12. GRANT PERMISSIONS
-- =============================================================================

GRANT ALL ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;

GRANT ALL ON user_project_access TO authenticated;
GRANT ALL ON user_project_access TO service_role;

GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO service_role;

GRANT ALL ON custom_data TO authenticated;
GRANT ALL ON custom_data TO service_role;

GRANT ALL ON nifraim TO authenticated;
GRANT ALL ON nifraim TO service_role;

GRANT ALL ON gemel TO authenticated;
GRANT ALL ON gemel TO service_role;

GRANT ALL ON master_data TO authenticated;
GRANT ALL ON master_data TO service_role;

-- =============================================================================
-- 13. REFRESH SCHEMA CACHE
-- =============================================================================

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 14. VERIFICATION
-- =============================================================================

SELECT 'Database setup complete!' as status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('projects', 'users', 'user_project_access', 'custom_data', 'nifraim', 'gemel', 'master_data')) as tables_created;
