-- =====================================================
-- SELAI ADMIN HUB - CLEAN START SCRIPT
-- =====================================================
--
-- IMPORTANT: Run this script in Supabase SQL Editor
-- This will clean and rebuild the user hierarchy system
--
-- BACKUP YOUR DATA BEFORE RUNNING!
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: DROP OLD CONFLICTING OBJECTS
-- =====================================================

DROP FUNCTION IF EXISTS get_current_user_type() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_manager() CASCADE;
DROP FUNCTION IF EXISTS is_supervisor() CASCADE;
DROP FUNCTION IF EXISTS crm_get_supervised_agents() CASCADE;
DROP FUNCTION IF EXISTS crm_is_supervisor() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_updated() CASCADE;
DROP FUNCTION IF EXISTS get_team_user_ids() CASCADE;

-- =====================================================
-- STEP 2: ENSURE USERS TABLE EXISTS WITH ALL COLUMNS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all required columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add foreign key for supervisor_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_supervisor_id_fkey'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_supervisor_id_fkey
        FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =====================================================
-- STEP 3: CREATE MANAGER ASSIGNMENTS TABLE
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
-- STEP 4: CREATE REGISTRATION REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    id_number TEXT,
    license_number TEXT,
    company_name TEXT,
    requested_role TEXT NOT NULL DEFAULT 'agent',
    supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    match_confidence INTEGER DEFAULT 0,
    match_details JSONB,
    matched_external_id TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    reviewer_notes TEXT,
    encrypted_password TEXT,
    created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rr_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_rr_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_rr_supervisor ON registration_requests(supervisor_id);

-- =====================================================
-- STEP 5: ADD DASHBOARD COLUMNS TO PROJECTS
-- =====================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS dashboard_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dashboard_username TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dashboard_password TEXT;

-- =====================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- =====================================================

-- Get current user's internal ID
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

-- CRM helper: check if user is supervisor or higher
CREATE OR REPLACE FUNCTION crm_is_supervisor()
RETURNS BOOLEAN AS $$
    SELECT get_current_user_type() IN ('supervisor', 'manager', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- CRM helper: get supervised agent IDs
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

    IF current_user_type = 'admin' THEN
        SELECT array_agg(id) INTO agent_ids FROM users WHERE user_type = 'agent' AND is_active = true;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

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

    IF current_user_type = 'supervisor' THEN
        SELECT array_agg(id) INTO agent_ids
        FROM users
        WHERE supervisor_id = current_user_id AND is_active = true;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

    RETURN '{}'::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 7: AUTH TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = LOWER(NEW.email)) THEN
        UPDATE users
        SET
            auth_id = NEW.id,
            is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            updated_at = NOW()
        WHERE email = LOWER(NEW.email) AND auth_id IS NULL;
    ELSE
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_created();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_updated();

-- =====================================================
-- STEP 8: GRANT PERMISSIONS
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

GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON registration_requests TO anon;

COMMIT;

-- =====================================================
-- STEP 9: NOTIFY SCHEMA RELOAD
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '=== MIGRATION COMPLETE ===' as status;

-- Show current users
SELECT
    id,
    email,
    full_name,
    user_type,
    supervisor_id,
    is_active,
    is_approved
FROM users
ORDER BY
    CASE user_type
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'supervisor' THEN 3
        WHEN 'agent' THEN 4
        ELSE 5
    END,
    full_name;

SELECT '=== COPY THE ABOVE RESULTS ===' as note;
