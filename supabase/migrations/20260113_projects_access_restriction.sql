-- =====================================================
-- PROJECTS ACCESS RESTRICTION
-- Only admin and manager can see projects
-- Agents and supervisors cannot access projects directly
-- =====================================================

-- ============================================
-- STEP 1: Drop old project policies
-- ============================================

DROP POLICY IF EXISTS "Users can view accessible projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update accessible projects" ON projects;
DROP POLICY IF EXISTS "Users can delete accessible projects" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
DROP POLICY IF EXISTS "projects_admin_all" ON projects;

-- ============================================
-- STEP 2: Enable RLS on projects
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: New restricted policies
-- ============================================

-- Service role full access
CREATE POLICY "projects_service_role" ON projects
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Only admins can see ALL projects
CREATE POLICY "projects_admin_select" ON projects
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND user_type = 'admin'
    )
);

-- Managers can see projects they are assigned to
CREATE POLICY "projects_manager_select" ON projects
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND u.user_type = 'manager'
        AND (
            -- Check if project is in manager_project_assignments
            EXISTS (
                SELECT 1 FROM manager_project_assignments mpa
                WHERE mpa.manager_id = u.id
                AND mpa.project_id = projects.id
            )
        )
    )
);

-- Only admins can create projects
CREATE POLICY "projects_admin_insert" ON projects
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND user_type = 'admin'
    )
);

-- Only admins can update projects
CREATE POLICY "projects_admin_update" ON projects
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND user_type = 'admin'
    )
);

-- Only admins can delete projects
CREATE POLICY "projects_admin_delete" ON projects
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND user_type = 'admin'
    )
);

-- ============================================
-- STEP 4: Shared reports table for agents/supervisors
-- ============================================

CREATE TABLE IF NOT EXISTS shared_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Report info
    title TEXT NOT NULL,
    description TEXT,
    report_type TEXT DEFAULT 'data' CHECK (report_type IN ('data', 'summary', 'chart', 'custom')),

    -- Source
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    data_source TEXT,
    query_config JSONB,

    -- Sharing
    shared_by UUID NOT NULL REFERENCES users(id),
    shared_with_type TEXT NOT NULL CHECK (shared_with_type IN ('user', 'supervisor', 'team', 'all_agents')),
    shared_with_id UUID REFERENCES users(id),  -- For specific user or supervisor

    -- Access control
    can_download BOOLEAN DEFAULT false,
    can_share_further BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,

    -- Data snapshot (optional - for static reports)
    data_snapshot JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_reports_project ON shared_reports(project_id);
CREATE INDEX idx_shared_reports_shared_by ON shared_reports(shared_by);
CREATE INDEX idx_shared_reports_shared_with ON shared_reports(shared_with_id);

-- ============================================
-- STEP 5: Shared reports RLS
-- ============================================

ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "shared_reports_service_role" ON shared_reports
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins can see all shared reports
CREATE POLICY "shared_reports_admin" ON shared_reports
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND user_type = 'admin')
);

-- Managers can see and create shared reports for their projects
CREATE POLICY "shared_reports_manager" ON shared_reports
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        JOIN manager_project_assignments mpa ON mpa.manager_id = u.id
        WHERE u.auth_id = auth.uid()
        AND u.user_type = 'manager'
        AND mpa.project_id = shared_reports.project_id
    )
);

-- Supervisors can see reports shared with them or their team
CREATE POLICY "shared_reports_supervisor_select" ON shared_reports
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND u.user_type = 'supervisor'
        AND (
            -- Reports shared specifically with this supervisor
            (shared_with_type = 'supervisor' AND shared_with_id = u.id)
            -- Reports shared with all agents under this supervisor's team
            OR shared_with_type = 'all_agents'
        )
    )
);

-- Agents can see reports shared with them or all agents
CREATE POLICY "shared_reports_agent_select" ON shared_reports
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND u.user_type = 'agent'
        AND (
            -- Reports shared specifically with this agent
            (shared_with_type = 'user' AND shared_with_id = u.id)
            -- Reports shared with all agents
            OR shared_with_type = 'all_agents'
            -- Reports shared with this agent's supervisor (and the supervisor shared with team)
            OR (shared_with_type = 'supervisor' AND shared_with_id = u.supervisor_id)
        )
    )
);

-- ============================================
-- STEP 6: Grants
-- ============================================

GRANT ALL ON shared_reports TO authenticated;
GRANT ALL ON shared_reports TO service_role;

-- ============================================
-- STEP 7: Updated timestamp trigger
-- ============================================

CREATE TRIGGER shared_reports_updated_at
    BEFORE UPDATE ON shared_reports
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- STEP 8: Refresh schema
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: Projects access restricted to admin/manager only!' as result;
