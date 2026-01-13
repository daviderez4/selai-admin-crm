-- =====================================================
-- SELAI USERS & HIERARCHY REBUILD
-- Comprehensive users table with proper hierarchy
-- Run this AFTER 20260113_registration_requests.sql
-- =====================================================

-- ============================================
-- STEP 1: Drop old conflicting tables/policies
-- ============================================

-- Drop user_profiles table (will consolidate into users)
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS manager_supervisor_access CASCADE;
DROP TABLE IF EXISTS manager_project_access CASCADE;
DROP TABLE IF EXISTS approval_requests CASCADE;

-- Drop old policies on users table
DROP POLICY IF EXISTS "users_service_role" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_admin_all" ON users;

-- ============================================
-- STEP 2: Recreate users table from scratch
-- ============================================

-- Drop and recreate for clean schema
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to Supabase Auth
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Basic info
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,

    -- Israeli ID / Agent license
    id_number TEXT,
    license_number TEXT,

    -- Company
    company_name TEXT,

    -- ROLE HIERARCHY: admin > manager > supervisor > agent > client
    user_type TEXT NOT NULL DEFAULT 'pending' CHECK (
        user_type IN ('admin', 'manager', 'supervisor', 'agent', 'client', 'pending', 'guest')
    ),

    -- Hierarchy links
    supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- For agents
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,     -- For supervisors

    -- Status flags
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    is_email_verified BOOLEAN DEFAULT false,

    -- Approval tracking
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,
    admin_notes TEXT,

    -- Timestamps
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_supervisor_id ON users(supervisor_id);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_approved ON users(is_approved);

-- ============================================
-- STEP 4: Manager-to-Supervisor assignments
-- ============================================

CREATE TABLE manager_supervisor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, supervisor_id)
);

CREATE INDEX idx_manager_supervisor_manager ON manager_supervisor_assignments(manager_id);
CREATE INDEX idx_manager_supervisor_supervisor ON manager_supervisor_assignments(supervisor_id);

-- ============================================
-- STEP 5: Manager-to-Project assignments
-- ============================================

CREATE TABLE manager_project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, project_id)
);

CREATE INDEX idx_manager_project_manager ON manager_project_assignments(manager_id);
CREATE INDEX idx_manager_project_project ON manager_project_assignments(project_id);

-- ============================================
-- STEP 6: System settings table
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    value_json JSONB,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
    ('system_email', NULL, 'System email address for sending notifications'),
    ('system_email_password', NULL, 'System email password (encrypted)'),
    ('smtp_host', NULL, 'SMTP server host'),
    ('smtp_port', '587', 'SMTP server port'),
    ('allow_public_registration', 'true', 'Allow public user registration'),
    ('require_email_verification', 'true', 'Require email verification for new users'),
    ('auto_approve_agents', 'false', 'Auto-approve agents if external match found'),
    ('maintenance_mode', 'false', 'Enable maintenance mode (only admins can login)')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- STEP 7: Enable RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_supervisor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: Helper functions
-- ============================================

-- Get current user's role from users table
CREATE OR REPLACE FUNCTION get_current_user_type()
RETURNS TEXT AS $$
    SELECT COALESCE(
        (SELECT user_type FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'guest'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's ID from users table
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
    SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND user_type IN ('admin', 'manager')
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND user_type = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 9: Users table RLS policies
-- ============================================

-- Service role full access
CREATE POLICY "users_service_role" ON users
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins can see all users
CREATE POLICY "users_admin_select" ON users
FOR SELECT TO authenticated
USING (is_admin());

-- Managers can see their assigned supervisors and those supervisors' agents
CREATE POLICY "users_manager_select" ON users
FOR SELECT TO authenticated
USING (
    get_current_user_type() = 'manager'
    AND (
        -- Own record
        auth_id = auth.uid()
        -- Supervisors assigned to this manager
        OR id IN (
            SELECT supervisor_id FROM manager_supervisor_assignments
            WHERE manager_id = get_current_user_id()
        )
        -- Agents under assigned supervisors
        OR supervisor_id IN (
            SELECT supervisor_id FROM manager_supervisor_assignments
            WHERE manager_id = get_current_user_id()
        )
    )
);

-- Supervisors can see their agents
CREATE POLICY "users_supervisor_select" ON users
FOR SELECT TO authenticated
USING (
    get_current_user_type() = 'supervisor'
    AND (
        -- Own record
        auth_id = auth.uid()
        -- Agents under this supervisor
        OR supervisor_id = get_current_user_id()
    )
);

-- Agents can only see themselves
CREATE POLICY "users_agent_select" ON users
FOR SELECT TO authenticated
USING (
    get_current_user_type() = 'agent'
    AND auth_id = auth.uid()
);

-- Clients can only see themselves
CREATE POLICY "users_client_select" ON users
FOR SELECT TO authenticated
USING (
    get_current_user_type() = 'client'
    AND auth_id = auth.uid()
);

-- Pending/Guest can see themselves
CREATE POLICY "users_pending_select" ON users
FOR SELECT TO authenticated
USING (
    get_current_user_type() IN ('pending', 'guest')
    AND auth_id = auth.uid()
);

-- Anyone authenticated can insert (for self-registration)
CREATE POLICY "users_insert" ON users
FOR INSERT TO authenticated
WITH CHECK (true);

-- Admins can update any user
CREATE POLICY "users_admin_update" ON users
FOR UPDATE TO authenticated
USING (is_admin());

-- Users can update their own record (limited fields handled by trigger)
CREATE POLICY "users_self_update" ON users
FOR UPDATE TO authenticated
USING (auth_id = auth.uid());

-- Only admins can delete users
CREATE POLICY "users_admin_delete" ON users
FOR DELETE TO authenticated
USING (is_admin());

-- ============================================
-- STEP 10: Manager assignments RLS
-- ============================================

-- Admins can manage all assignments
CREATE POLICY "manager_supervisor_admin" ON manager_supervisor_assignments
FOR ALL TO authenticated
USING (is_admin());

CREATE POLICY "manager_project_admin" ON manager_project_assignments
FOR ALL TO authenticated
USING (is_admin());

-- Managers can see their own assignments
CREATE POLICY "manager_supervisor_manager_select" ON manager_supervisor_assignments
FOR SELECT TO authenticated
USING (manager_id = get_current_user_id());

CREATE POLICY "manager_project_manager_select" ON manager_project_assignments
FOR SELECT TO authenticated
USING (manager_id = get_current_user_id());

-- ============================================
-- STEP 11: System settings RLS
-- ============================================

-- Only admins can access system settings
CREATE POLICY "system_settings_admin" ON system_settings
FOR ALL TO authenticated
USING (is_admin());

-- ============================================
-- STEP 12: Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- STEP 13: Auto-create user record on auth signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user already exists (from registration approval)
    IF EXISTS (SELECT 1 FROM users WHERE email = LOWER(NEW.email)) THEN
        -- Link existing user to auth
        UPDATE users
        SET auth_id = NEW.id,
            is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            last_login_at = NOW(),
            updated_at = NOW()
        WHERE email = LOWER(NEW.email);
    ELSE
        -- Create new user record
        INSERT INTO users (
            auth_id,
            email,
            full_name,
            user_type,
            is_email_verified
        ) VALUES (
            NEW.id,
            LOWER(NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'pending',
            COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_created();

-- ============================================
-- STEP 14: Update user on auth changes
-- ============================================

CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        last_login_at = CASE WHEN NEW.last_sign_in_at != OLD.last_sign_in_at THEN NEW.last_sign_in_at ELSE last_login_at END,
        updated_at = NOW()
    WHERE auth_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_updated();

-- ============================================
-- STEP 15: Insert system admins
-- ============================================

-- Insert the two system admins
INSERT INTO users (email, full_name, user_type, is_active, is_approved) VALUES
    ('davide@selam.co.il', 'David E', 'admin', true, true),
    ('itayn@selam.co.il', 'Itay Nachum', 'admin', true, true)
ON CONFLICT (email) DO UPDATE SET
    user_type = 'admin',
    is_active = true,
    is_approved = true,
    updated_at = NOW();

-- ============================================
-- STEP 16: Migrate existing auth users
-- ============================================

-- Link any existing auth users that match by email
INSERT INTO users (auth_id, email, full_name, user_type, is_approved, is_active)
SELECT
    au.id as auth_id,
    LOWER(au.email) as email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
    'pending' as user_type,
    false as is_approved,
    true as is_active
FROM auth.users au
WHERE au.email IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER(au.email))
ON CONFLICT (email) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    updated_at = NOW();

-- Update existing users with their auth_id if not set
UPDATE users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
AND u.auth_id IS NULL;

-- ============================================
-- STEP 17: Grants
-- ============================================

GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT ALL ON manager_supervisor_assignments TO authenticated;
GRANT ALL ON manager_supervisor_assignments TO service_role;
GRANT ALL ON manager_project_assignments TO authenticated;
GRANT ALL ON manager_project_assignments TO service_role;
GRANT ALL ON system_settings TO authenticated;
GRANT ALL ON system_settings TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_current_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================
-- STEP 18: Refresh schema
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: Users hierarchy rebuilt!' as result;
