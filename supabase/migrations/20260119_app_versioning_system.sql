-- =====================================================
-- APP VERSIONING & CHANGE LOG SYSTEM
-- Version: 1.0
-- Date: 2026-01-19
--
-- This system tracks all app changes and versions
-- to ensure production matches the latest code.
-- =====================================================

-- =====================================================
-- TABLE 1: app_versions - Current app version
-- =====================================================

CREATE TABLE IF NOT EXISTS app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL,
    commit_hash VARCHAR(40),
    branch VARCHAR(100) DEFAULT 'main',
    environment VARCHAR(20) DEFAULT 'production',
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_by UUID REFERENCES auth.users(id),
    is_current BOOLEAN DEFAULT true,
    build_number INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one version can be current per environment
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_versions_current
ON app_versions(environment)
WHERE is_current = true;

-- =====================================================
-- TABLE 2: change_logs - All changes history
-- =====================================================

CREATE TABLE IF NOT EXISTS change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES app_versions(id),
    change_type VARCHAR(50) NOT NULL, -- 'feature', 'fix', 'refactor', 'migration', 'config'
    category VARCHAR(100), -- 'hierarchy', 'invitations', 'projects', 'users', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    files_changed TEXT[], -- Array of file paths
    commit_hash VARCHAR(40),
    commit_message TEXT,
    author VARCHAR(255),
    is_breaking_change BOOLEAN DEFAULT false,
    requires_migration BOOLEAN DEFAULT false,
    migration_script TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'deployed', 'rolled_back'
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_change_logs_version ON change_logs(version_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_status ON change_logs(status);
CREATE INDEX IF NOT EXISTS idx_change_logs_category ON change_logs(category);
CREATE INDEX IF NOT EXISTS idx_change_logs_created ON change_logs(created_at DESC);

-- =====================================================
-- TABLE 3: deployment_history - Track all deployments
-- =====================================================

CREATE TABLE IF NOT EXISTS deployment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES app_versions(id),
    environment VARCHAR(20) NOT NULL, -- 'development', 'staging', 'production'
    status VARCHAR(20) NOT NULL, -- 'started', 'success', 'failed', 'rolled_back'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    error_message TEXT,
    triggered_by VARCHAR(100), -- 'manual', 'github_push', 'vercel_webhook'
    commit_hash VARCHAR(40),
    build_logs TEXT,
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_deployment_history_env ON deployment_history(environment);
CREATE INDEX IF NOT EXISTS idx_deployment_history_status ON deployment_history(status);

-- =====================================================
-- FUNCTION: Set new current version
-- =====================================================

CREATE OR REPLACE FUNCTION set_current_version(
    p_version VARCHAR,
    p_commit_hash VARCHAR,
    p_environment VARCHAR DEFAULT 'production',
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_version_id UUID;
BEGIN
    -- Mark all existing versions as not current for this environment
    UPDATE app_versions
    SET is_current = false
    WHERE environment = p_environment AND is_current = true;

    -- Insert new version
    INSERT INTO app_versions (version, commit_hash, environment, is_current, notes)
    VALUES (p_version, p_commit_hash, p_environment, true, p_notes)
    RETURNING id INTO new_version_id;

    RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Add change log entry
-- =====================================================

CREATE OR REPLACE FUNCTION add_change_log(
    p_change_type VARCHAR,
    p_category VARCHAR,
    p_title VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_files_changed TEXT[] DEFAULT NULL,
    p_commit_hash VARCHAR DEFAULT NULL,
    p_commit_message TEXT DEFAULT NULL,
    p_requires_migration BOOLEAN DEFAULT false,
    p_migration_script TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_log_id UUID;
    current_version_id UUID;
BEGIN
    -- Get current version
    SELECT id INTO current_version_id
    FROM app_versions
    WHERE is_current = true AND environment = 'production'
    LIMIT 1;

    -- Insert change log
    INSERT INTO change_logs (
        version_id, change_type, category, title, description,
        files_changed, commit_hash, commit_message,
        requires_migration, migration_script, status
    )
    VALUES (
        current_version_id, p_change_type, p_category, p_title, p_description,
        p_files_changed, p_commit_hash, p_commit_message,
        p_requires_migration, p_migration_script, 'pending'
    )
    RETURNING id INTO new_log_id;

    RETURN new_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get current version info
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_version(p_environment VARCHAR DEFAULT 'production')
RETURNS TABLE (
    version VARCHAR,
    commit_hash VARCHAR,
    deployed_at TIMESTAMPTZ,
    pending_changes BIGINT,
    last_change_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        av.version,
        av.commit_hash,
        av.deployed_at,
        (SELECT COUNT(*) FROM change_logs cl WHERE cl.status = 'pending')::BIGINT as pending_changes,
        (SELECT MAX(cl.created_at) FROM change_logs cl)::TIMESTAMPTZ as last_change_at
    FROM app_versions av
    WHERE av.is_current = true AND av.environment = p_environment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read versions
CREATE POLICY "app_versions_select" ON app_versions
FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "app_versions_admin" ON app_versions
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.user_type = 'admin'
    )
);

-- Everyone can read change logs
CREATE POLICY "change_logs_select" ON change_logs
FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "change_logs_admin" ON change_logs
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.user_type = 'admin'
    )
);

-- Everyone can read deployment history
CREATE POLICY "deployment_history_select" ON deployment_history
FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "deployment_history_admin" ON deployment_history
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.user_type = 'admin'
    )
);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON app_versions TO authenticated;
GRANT ALL ON change_logs TO authenticated;
GRANT ALL ON deployment_history TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_version TO authenticated;
GRANT EXECUTE ON FUNCTION add_change_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_version TO authenticated;

-- =====================================================
-- INITIAL DATA - Set current version
-- =====================================================

-- Insert initial version
SELECT set_current_version(
    '1.0.0',
    'bbc1131',
    'production',
    'Initial version with hierarchy page fix and project invitations'
);

-- Add recent changes
SELECT add_change_log(
    'refactor',
    'hierarchy',
    'Show only registered users in hierarchy',
    'Changed hierarchy page to fetch from users table only, filtering by auth_id IS NOT NULL. Removed external SELAI data (398 agents, 12 supervisors).',
    ARRAY['src/app/(dashboard)/hierarchy/page.tsx'],
    '9b25fd5',
    'refactor: Show only registered users in hierarchy page',
    false,
    NULL
);

SELECT add_change_log(
    'feature',
    'invitations',
    'Project-specific invitations',
    'Added project_id to invitations. When user registers with project invitation, they automatically get user_project_access record.',
    ARRAY['src/app/api/invitations/route.ts', 'src/app/api/invitations/[token]/route.ts', 'supabase/migrations/20260119_add_project_to_invitations.sql'],
    'bbc1131',
    'feat: Add project-specific invitations system',
    true,
    'ALTER TABLE hub_invitations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);'
);

-- Mark changes as deployed
UPDATE change_logs SET status = 'deployed', deployed_at = NOW() WHERE status = 'pending';

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Versioning system created!' as status;
SELECT * FROM get_current_version();
