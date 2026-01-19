-- =====================================================
-- FIX PROJECTS ACCESS FOR ADMINS
-- Version: 1.0
-- Date: 2026-01-19
--
-- This migration fixes the projects access issue where
-- admins couldn't see projects due to RLS policies and
-- missing user_project_access records.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: DIAGNOSIS - Check current state
-- =====================================================

-- Check Itay Nachum's user record
DO $$
DECLARE
    itay_record RECORD;
BEGIN
    SELECT id, email, full_name, user_type, auth_id, is_active, is_approved
    INTO itay_record
    FROM users
    WHERE email ILIKE '%itay%' OR full_name ILIKE '%איתי%';

    IF itay_record IS NOT NULL THEN
        RAISE NOTICE 'Found user: % (%) - type: %, active: %, approved: %',
            itay_record.full_name, itay_record.email, itay_record.user_type,
            itay_record.is_active, itay_record.is_approved;
    ELSE
        RAISE NOTICE 'User not found!';
    END IF;
END $$;

-- =====================================================
-- STEP 2: DROP OLD PROJECT POLICIES
-- =====================================================

DROP POLICY IF EXISTS "projects_admin_select" ON projects;
DROP POLICY IF EXISTS "projects_manager_select" ON projects;
DROP POLICY IF EXISTS "projects_admin_insert" ON projects;
DROP POLICY IF EXISTS "projects_admin_update" ON projects;
DROP POLICY IF EXISTS "projects_admin_delete" ON projects;
DROP POLICY IF EXISTS "projects_service_role" ON projects;

-- =====================================================
-- STEP 3: CREATE NEW SIMPLIFIED POLICIES
-- =====================================================

-- Make sure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Service role always has full access
CREATE POLICY "projects_service_role" ON projects
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ADMIN: Full access to ALL projects (no restrictions)
CREATE POLICY "projects_admin_all" ON projects
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.user_type = 'admin'
        AND users.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.user_type = 'admin'
        AND users.is_active = true
    )
);

-- MANAGER: Can see projects assigned to them via manager_project_assignments
CREATE POLICY "projects_manager_select" ON projects
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND u.user_type = 'manager'
        AND u.is_active = true
        AND EXISTS (
            SELECT 1 FROM manager_project_assignments mpa
            WHERE mpa.manager_id = u.id
            AND mpa.project_id = projects.id
        )
    )
);

-- =====================================================
-- STEP 4: Create manager_project_assignments if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS manager_project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_mpa_manager ON manager_project_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_mpa_project ON manager_project_assignments(project_id);

-- =====================================================
-- STEP 5: Ensure user_project_access table exists (for compatibility)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_project_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    access_level TEXT DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- Enable RLS on user_project_access
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;

-- Policies for user_project_access
DROP POLICY IF EXISTS "user_project_access_select" ON user_project_access;
DROP POLICY IF EXISTS "user_project_access_admin" ON user_project_access;

-- Users can see their own access records
CREATE POLICY "user_project_access_select" ON user_project_access
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all access records
CREATE POLICY "user_project_access_admin" ON user_project_access
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_id = auth.uid()
        AND users.user_type = 'admin'
        AND users.is_active = true
    )
);

-- =====================================================
-- STEP 6: Auto-grant admins access to all projects
-- =====================================================

-- Create a function to auto-grant admin access
CREATE OR REPLACE FUNCTION auto_grant_admin_project_access()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new project is created, grant access to all admins
    INSERT INTO user_project_access (user_id, project_id, access_level)
    SELECT u.auth_id, NEW.id, 'admin'
    FROM users u
    WHERE u.user_type = 'admin'
    AND u.is_active = true
    AND u.auth_id IS NOT NULL
    ON CONFLICT (user_id, project_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_grant_admin_project_access ON projects;
CREATE TRIGGER trigger_auto_grant_admin_project_access
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION auto_grant_admin_project_access();

-- =====================================================
-- STEP 7: Grant all current admins access to all projects
-- =====================================================

INSERT INTO user_project_access (user_id, project_id, access_level)
SELECT u.auth_id, p.id, 'admin'
FROM users u
CROSS JOIN projects p
WHERE u.user_type = 'admin'
AND u.is_active = true
AND u.auth_id IS NOT NULL
ON CONFLICT (user_id, project_id) DO UPDATE SET access_level = 'admin';

-- =====================================================
-- STEP 8: Grants
-- =====================================================

GRANT ALL ON projects TO authenticated;
GRANT ALL ON user_project_access TO authenticated;
GRANT ALL ON manager_project_assignments TO authenticated;

COMMIT;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Migration complete! Checking admin access...' as status;

-- Show all admins and their project access
SELECT
    u.full_name,
    u.email,
    u.user_type,
    u.is_active,
    COUNT(upa.project_id) as project_access_count
FROM users u
LEFT JOIN user_project_access upa ON upa.user_id = u.auth_id
WHERE u.user_type = 'admin'
GROUP BY u.id, u.full_name, u.email, u.user_type, u.is_active;

SELECT 'Done!' as result;
