-- =====================================================
-- CLEAN HIERARCHY FOUNDATION
-- Version: 1.0
-- Date: 2026-01-19
--
-- This migration creates a solid foundation for the
-- user hierarchy system. Run this on a FRESH database
-- or after backing up existing data.
-- =====================================================

-- =====================================================
-- STEP 1: DROP OLD CONFLICTING OBJECTS
-- =====================================================

-- Drop old functions that may conflict
DROP FUNCTION IF EXISTS get_current_user_type() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_manager() CASCADE;
DROP FUNCTION IF EXISTS is_supervisor() CASCADE;
DROP FUNCTION IF EXISTS crm_get_supervised_agents() CASCADE;
DROP FUNCTION IF EXISTS crm_is_supervisor() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_updated() CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- =====================================================
-- STEP 2: ENSURE USERS TABLE HAS CORRECT STRUCTURE
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint for user_type values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_user_type_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_user_type_check
        CHECK (user_type IN ('admin', 'manager', 'supervisor', 'agent', 'client', 'pending', 'guest'));
    END IF;
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);

-- =====================================================
-- STEP 3: CREATE CORE HELPER FUNCTIONS
-- =====================================================

-- Get current user's internal ID (from users table)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid
    FROM users
    WHERE auth_id = auth.uid()
    LIMIT 1;
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user's type
CREATE OR REPLACE FUNCTION get_current_user_type()
RETURNS TEXT AS $$
DECLARE
    utype TEXT;
BEGIN
    SELECT user_type INTO utype
    FROM users
    WHERE auth_id = auth.uid()
    LIMIT 1;
    RETURN COALESCE(utype, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_type() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_type() = 'manager';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is supervisor
CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_current_user_type() = 'supervisor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- CRM helper: check if user is supervisor
CREATE OR REPLACE FUNCTION crm_is_supervisor()
RETURNS BOOLEAN AS $$
    SELECT get_current_user_type() IN ('supervisor', 'manager', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- CRM helper: get supervised agent IDs
-- Returns array of user IDs that current user supervises
CREATE OR REPLACE FUNCTION crm_get_supervised_agents()
RETURNS UUID[] AS $$
DECLARE
    current_user_id UUID;
    current_user_type TEXT;
    agent_ids UUID[];
    supervisor_ids UUID[];
BEGIN
    SELECT id, user_type INTO current_user_id, current_user_type
    FROM users
    WHERE auth_id = auth.uid();

    IF current_user_id IS NULL THEN
        RETURN '{}'::UUID[];
    END IF;

    -- Admin sees all
    IF current_user_type = 'admin' THEN
        SELECT array_agg(id) INTO agent_ids FROM users WHERE user_type = 'agent' AND is_active = true;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

    -- Manager sees their assigned supervisors' agents
    IF current_user_type = 'manager' THEN
        SELECT array_agg(supervisor_id) INTO supervisor_ids
        FROM manager_supervisor_assignments
        WHERE manager_id = current_user_id;

        IF supervisor_ids IS NOT NULL THEN
            SELECT array_agg(id) INTO agent_ids
            FROM users
            WHERE supervisor_id = ANY(supervisor_ids) AND is_active = true;
        END IF;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

    -- Supervisor sees their agents
    IF current_user_type = 'supervisor' THEN
        SELECT array_agg(id) INTO agent_ids
        FROM users
        WHERE supervisor_id = current_user_id AND is_active = true;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

    -- Others see nothing
    RETURN '{}'::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get team user IDs (including self and all team members)
CREATE OR REPLACE FUNCTION get_team_user_ids()
RETURNS UUID[] AS $$
DECLARE
    current_user_id UUID;
    current_user_type TEXT;
    team_ids UUID[];
    supervised_agents UUID[];
BEGIN
    SELECT id, user_type INTO current_user_id, current_user_type
    FROM users
    WHERE auth_id = auth.uid();

    IF current_user_id IS NULL THEN
        RETURN '{}'::UUID[];
    END IF;

    -- Admin sees all
    IF current_user_type = 'admin' THEN
        RETURN NULL; -- NULL means no filter needed
    END IF;

    -- Start with self
    team_ids := ARRAY[current_user_id];

    -- Add supervised agents
    supervised_agents := crm_get_supervised_agents();
    IF supervised_agents IS NOT NULL AND array_length(supervised_agents, 1) > 0 THEN
        team_ids := team_ids || supervised_agents;
    END IF;

    RETURN team_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: AUTH TRIGGERS
-- =====================================================

-- Trigger function: when auth user is created
CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user already exists by email
    IF EXISTS (SELECT 1 FROM users WHERE email = LOWER(NEW.email)) THEN
        -- Link existing user to auth
        UPDATE users
        SET
            auth_id = NEW.id,
            is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            updated_at = NOW()
        WHERE email = LOWER(NEW.email) AND auth_id IS NULL;
    ELSE
        -- Create new user record
        INSERT INTO users (id, auth_id, email, full_name, user_type, is_active, is_approved, is_email_verified, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            NEW.id,
            LOWER(NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
            'pending',
            true,
            false,
            COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            NOW(),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: when auth user is updated
CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        last_login_at = CASE
            WHEN OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at
            THEN NEW.last_sign_in_at
            ELSE last_login_at
        END,
        updated_at = NOW()
    WHERE auth_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_created();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_updated();

-- =====================================================
-- STEP 5: MANAGER ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS manager_supervisor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, supervisor_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_manager ON manager_supervisor_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_msa_supervisor ON manager_supervisor_assignments(supervisor_id);

-- =====================================================
-- STEP 6: REGISTRATION REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Basic info
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    id_number TEXT,
    license_number TEXT,
    company_name TEXT,
    -- Role request
    requested_role TEXT NOT NULL DEFAULT 'agent'
        CHECK (requested_role IN ('agent', 'supervisor', 'manager', 'client')),
    -- Hierarchy
    supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL, -- For client registrations
    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'needs_review', 'approved', 'rejected')),
    -- Matching
    match_confidence INTEGER DEFAULT 0,
    match_details JSONB,
    matched_external_id TEXT,
    -- Review info
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    reviewer_notes TEXT,
    -- Password (encrypted, cleared after approval)
    encrypted_password TEXT,
    -- Result
    created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Notes
    notes TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rr_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_rr_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_rr_supervisor ON registration_requests(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_rr_created_at ON registration_requests(created_at DESC);

-- =====================================================
-- STEP 7: RLS POLICIES FOR USERS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_select_manager" ON users;
DROP POLICY IF EXISTS "users_select_supervisor" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Admins can see all users
CREATE POLICY "users_select_admin" ON users
FOR SELECT USING (is_admin());

-- Managers can see themselves + their assigned supervisors + those supervisors' agents
CREATE POLICY "users_select_manager" ON users
FOR SELECT USING (
    is_manager() AND (
        auth_id = auth.uid()  -- Self
        OR id IN (
            SELECT supervisor_id FROM manager_supervisor_assignments
            WHERE manager_id = get_current_user_id()
        )  -- Assigned supervisors
        OR supervisor_id IN (
            SELECT supervisor_id FROM manager_supervisor_assignments
            WHERE manager_id = get_current_user_id()
        )  -- Agents under assigned supervisors
    )
);

-- Supervisors can see themselves + their agents
CREATE POLICY "users_select_supervisor" ON users
FOR SELECT USING (
    is_supervisor() AND (
        auth_id = auth.uid()  -- Self
        OR supervisor_id = get_current_user_id()  -- Their agents
    )
);

-- Everyone can see themselves
CREATE POLICY "users_select_self" ON users
FOR SELECT USING (auth_id = auth.uid());

-- Users can update their own non-sensitive fields
CREATE POLICY "users_update_self" ON users
FOR UPDATE USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

-- Only admins can insert users
CREATE POLICY "users_insert_admin" ON users
FOR INSERT WITH CHECK (is_admin());

-- Only admins can delete users
CREATE POLICY "users_delete_admin" ON users
FOR DELETE USING (is_admin());

-- =====================================================
-- STEP 8: RLS POLICIES FOR REGISTRATION REQUESTS
-- =====================================================

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rr_select" ON registration_requests;
DROP POLICY IF EXISTS "rr_insert" ON registration_requests;
DROP POLICY IF EXISTS "rr_update" ON registration_requests;

-- Admins see all, managers see their team's, supervisors see requests to them
CREATE POLICY "rr_select" ON registration_requests
FOR SELECT USING (
    is_admin()
    OR (is_manager() AND supervisor_id IN (
        SELECT msa.supervisor_id FROM manager_supervisor_assignments msa
        WHERE msa.manager_id = get_current_user_id()
    ))
    OR (is_supervisor() AND supervisor_id = get_current_user_id())
);

-- Anyone can create a registration request (public signup)
CREATE POLICY "rr_insert" ON registration_requests
FOR INSERT WITH CHECK (true);

-- Only admins/managers/supervisors can update (for approval)
CREATE POLICY "rr_update" ON registration_requests
FOR UPDATE USING (
    is_admin()
    OR (is_manager() AND supervisor_id IN (
        SELECT msa.supervisor_id FROM manager_supervisor_assignments msa
        WHERE msa.manager_id = get_current_user_id()
    ))
    OR (is_supervisor() AND supervisor_id = get_current_user_id())
);

-- =====================================================
-- STEP 9: GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION is_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION crm_is_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION crm_get_supervised_agents() TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_user_ids() TO authenticated;

-- For anon users (public registration)
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON registration_requests TO anon;

-- =====================================================
-- STEP 10: NOTIFY SCHEMA RELOAD
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT 'Hierarchy Foundation Migration Complete!' as status;

-- Show users table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
