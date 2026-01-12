-- ============================================================================
-- Migration: Projects Local Mode Support
-- Description: Allow projects without external Supabase connection (Excel-only mode)
-- Date: 2026-01-12
-- ============================================================================

-- ============================================================================
-- STEP 1: Allow NULL values for Supabase credentials
-- This enables "local" mode where data is stored in the main Supabase instance
-- ============================================================================

ALTER TABLE projects
  ALTER COLUMN supabase_url DROP NOT NULL,
  ALTER COLUMN supabase_anon_key DROP NOT NULL,
  ALTER COLUMN supabase_service_key DROP NOT NULL;

-- ============================================================================
-- STEP 2: Add new columns for enhanced project management
-- ============================================================================

-- Storage mode: 'local' = Excel/main Supabase, 'external' = external Supabase
ALTER TABLE projects ADD COLUMN IF NOT EXISTS storage_mode VARCHAR(20) DEFAULT 'local'
  CHECK (storage_mode IN ('local', 'external'));

-- Table name for data storage (default: master_data)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS table_name VARCHAR(255) DEFAULT 'master_data';

-- Data type / dashboard type
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data_type VARCHAR(50) DEFAULT 'custom';

-- Visual customization
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'layout-dashboard';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(30) DEFAULT 'slate';

-- Connection status tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS connection_last_tested TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS connection_error TEXT;

-- ============================================================================
-- STEP 3: Update existing projects to have correct storage_mode
-- ============================================================================

-- Set storage_mode based on whether supabase_url exists
UPDATE projects
SET storage_mode = CASE
  WHEN supabase_url IS NOT NULL AND supabase_url != '' THEN 'external'
  ELSE 'local'
END
WHERE storage_mode IS NULL;

-- Set is_configured for existing external projects
UPDATE projects
SET is_configured = true
WHERE supabase_url IS NOT NULL
  AND supabase_url != ''
  AND is_configured IS NULL;

-- ============================================================================
-- STEP 4: Create indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_storage_mode ON projects(storage_mode);
CREATE INDEX IF NOT EXISTS idx_projects_data_type ON projects(data_type);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_is_configured ON projects(is_configured);

-- ============================================================================
-- STEP 5: Create helper function to get project storage info
-- ============================================================================

CREATE OR REPLACE FUNCTION get_project_storage_info(p_project_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_name VARCHAR(255),
  storage_mode VARCHAR(20),
  table_name VARCHAR(255),
  is_local BOOLEAN,
  has_external_db BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as project_id,
    p.name as project_name,
    COALESCE(p.storage_mode, 'local')::VARCHAR(20) as storage_mode,
    COALESCE(p.table_name, 'master_data')::VARCHAR(255) as table_name,
    (p.supabase_url IS NULL OR p.supabase_url = '') as is_local,
    (p.supabase_url IS NOT NULL AND p.supabase_url != '') as has_external_db
  FROM projects p
  WHERE p.id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create view for project overview (useful for admin dashboards)
-- ============================================================================

CREATE OR REPLACE VIEW projects_overview AS
SELECT
  p.id,
  p.name,
  p.description,
  COALESCE(p.storage_mode, 'local') as storage_mode,
  COALESCE(p.table_name, 'master_data') as table_name,
  COALESCE(p.data_type, 'custom') as data_type,
  COALESCE(p.icon, 'layout-dashboard') as icon,
  COALESCE(p.color, 'slate') as color,
  p.is_configured,
  p.connection_last_tested,
  p.connection_error,
  p.created_at,
  p.updated_at,
  p.created_by,
  (p.supabase_url IS NOT NULL AND p.supabase_url != '') as has_external_connection,
  (SELECT COUNT(*) FROM user_project_access upa WHERE upa.project_id = p.id) as member_count
FROM projects p;

-- ============================================================================
-- STEP 7: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN projects.storage_mode IS 'Storage mode: local (main Supabase) or external (separate Supabase instance)';
COMMENT ON COLUMN projects.table_name IS 'Target table name for data storage';
COMMENT ON COLUMN projects.data_type IS 'Dashboard/data type: accumulation, insurance, processes, commissions, custom';
COMMENT ON COLUMN projects.is_configured IS 'Whether the project has been fully configured and tested';
COMMENT ON COLUMN projects.connection_last_tested IS 'Last time the external connection was tested';
COMMENT ON COLUMN projects.connection_error IS 'Last connection error message if any';

-- ============================================================================
-- Done! Projects now support both local and external storage modes
-- ============================================================================
