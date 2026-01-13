-- =====================================================
-- AUDIT LOGS TABLE
-- Track user actions in the system
-- =====================================================

-- ============================================
-- STEP 1: Create audit_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User who performed the action
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Optional project context
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Action details
    action TEXT NOT NULL,
    details JSONB,

    -- Request info
    ip_address TEXT,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- STEP 3: Enable RLS
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "audit_logs_service_role" ON audit_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Only admins can view audit logs
CREATE POLICY "audit_logs_admin_select" ON audit_logs
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND user_type = 'admin'
    )
);

-- Anyone authenticated can insert (log their own actions)
CREATE POLICY "audit_logs_insert" ON audit_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- STEP 4: Grants
-- ============================================

GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;

-- ============================================
-- STEP 5: Refresh schema
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: Audit logs table created!' as result;
