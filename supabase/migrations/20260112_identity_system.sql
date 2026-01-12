-- =====================================================
-- SELAI IDENTITY SYSTEM - Complete Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop existing users table constraints if they conflict
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_national_id_key;

-- 2. Add new columns to existing users table (instead of dropping it)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_portal_access BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_invite_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_invite_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 3. Add check constraint for user_type if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_user_type_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_user_type_check
        CHECK (user_type IN ('guest', 'pending', 'agent', 'supervisor', 'admin', 'client'));
    END IF;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_supervisor ON users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_agent ON users(agent_id);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- 5. APPROVAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    requested_role TEXT NOT NULL,
    requested_supervisor_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_user ON approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);

-- 6. AUDIT LOG FOR AUTH EVENTS
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type TEXT NOT NULL,
    event_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON auth_audit_log(created_at DESC);

-- 7. CLIENT INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS client_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id) NOT NULL,
    client_email TEXT NOT NULL,
    client_name TEXT,
    client_phone TEXT,
    invite_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_invitations_agent ON client_invitations(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_email ON client_invitations(client_email);

-- 8. RLS POLICIES

-- Users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_service_role" ON users;
CREATE POLICY "users_service_role" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR auth_id = auth.uid()
    OR supervisor_id = auth.uid()
    OR agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_type = 'admin')
);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE TO authenticated
USING (id = auth.uid() OR auth_id = auth.uid());

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT TO authenticated WITH CHECK (true);

-- Approval requests RLS
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_requests_service_role" ON approval_requests;
CREATE POLICY "approval_requests_service_role" ON approval_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "approval_requests_admin" ON approval_requests;
CREATE POLICY "approval_requests_admin" ON approval_requests FOR ALL TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_type = 'admin')
);

-- Auth audit log RLS
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_audit_service_role" ON auth_audit_log;
CREATE POLICY "auth_audit_service_role" ON auth_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_audit_admin" ON auth_audit_log;
CREATE POLICY "auth_audit_admin" ON auth_audit_log FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_type = 'admin')
);

-- Client invitations RLS
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_invitations_service_role" ON client_invitations;
CREATE POLICY "client_invitations_service_role" ON client_invitations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "client_invitations_agent" ON client_invitations;
CREATE POLICY "client_invitations_agent" ON client_invitations FOR ALL TO authenticated
USING (
    agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_type IN ('admin', 'supervisor'))
);

-- 9. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
    SELECT user_type FROM users WHERE id = user_uuid OR auth_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_approved(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT COALESCE(is_approved, false) FROM users WHERE id = user_uuid OR auth_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_subordinates(supervisor_uuid UUID)
RETURNS SETOF users AS $$
    SELECT * FROM users WHERE supervisor_id = supervisor_uuid AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_by_auth_id(p_auth_id UUID)
RETURNS users AS $$
    SELECT * FROM users WHERE auth_id = p_auth_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 10. TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. GRANTS
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT ALL ON approval_requests TO authenticated;
GRANT ALL ON approval_requests TO service_role;
GRANT ALL ON auth_audit_log TO authenticated;
GRANT ALL ON auth_audit_log TO service_role;
GRANT ALL ON client_invitations TO authenticated;
GRANT ALL ON client_invitations TO service_role;

-- 12. Refresh schema
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'SUCCESS: Identity system tables created!' as result;
