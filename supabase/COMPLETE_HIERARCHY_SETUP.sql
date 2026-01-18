-- =====================================================
-- SELAI ADMIN HUB - COMPLETE HIERARCHY SETUP
-- =====================================================
--
-- הוראות:
-- 1. העתק את כל הקוד הזה
-- 2. הדבק ב-Supabase SQL Editor
-- 3. לחץ Run
-- 4. וודא שהתוצאה מציגה SUCCESS
--
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: CLEAN UP OLD FUNCTIONS
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
DROP FUNCTION IF EXISTS get_visible_user_ids(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_permission(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_my_permissions() CASCADE;
DROP FUNCTION IF EXISTS can_view_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_my_team_hierarchy() CASCADE;

-- =====================================================
-- PART 2: ENSURE USERS TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Role and hierarchy
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_id UUID;

-- Status
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Notes
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Client specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_since TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employer TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_income_range TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_profile TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_supervisor_id ON users(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =====================================================
-- PART 3: MANAGER ASSIGNMENTS TABLE
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
-- PART 4: PERMISSION TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL UNIQUE,
    can_view_all_users BOOLEAN DEFAULT false,
    can_view_team_users BOOLEAN DEFAULT false,
    can_view_own_data BOOLEAN DEFAULT true,
    can_manage_users BOOLEAN DEFAULT false,
    can_approve_registrations BOOLEAN DEFAULT false,
    can_assign_supervisors BOOLEAN DEFAULT false,
    can_view_all_contacts BOOLEAN DEFAULT false,
    can_view_team_contacts BOOLEAN DEFAULT false,
    can_view_own_contacts BOOLEAN DEFAULT true,
    can_edit_contacts BOOLEAN DEFAULT false,
    can_delete_contacts BOOLEAN DEFAULT false,
    can_view_financial_data BOOLEAN DEFAULT false,
    can_view_team_financial BOOLEAN DEFAULT false,
    can_view_own_financial BOOLEAN DEFAULT true,
    can_export_financial BOOLEAN DEFAULT false,
    can_manage_projects BOOLEAN DEFAULT false,
    can_view_all_projects BOOLEAN DEFAULT false,
    can_import_data BOOLEAN DEFAULT false,
    can_export_data BOOLEAN DEFAULT false,
    can_access_admin_panel BOOLEAN DEFAULT false,
    can_modify_permissions BOOLEAN DEFAULT false,
    can_view_audit_logs BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO permission_templates (role, description,
    can_view_all_users, can_view_team_users,
    can_manage_users, can_approve_registrations, can_assign_supervisors,
    can_view_all_contacts, can_view_team_contacts, can_edit_contacts, can_delete_contacts,
    can_view_financial_data, can_view_team_financial, can_export_financial,
    can_manage_projects, can_view_all_projects, can_import_data, can_export_data,
    can_access_admin_panel, can_modify_permissions, can_view_audit_logs
) VALUES
('admin', 'System administrator', true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true),
('manager', 'Organization manager', false, true, true, true, true, false, true, true, false, false, true, true, true, true, true, true, false, false, true),
('supervisor', 'Team supervisor', false, true, false, true, false, false, true, true, false, false, true, false, false, true, true, false, false, false, false),
('agent', 'Field agent', false, false, false, false, false, false, false, true, false, false, false, false, false, true, false, false, false, false, false),
('client', 'End client', false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false),
('guest', 'Guest', false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false)
ON CONFLICT (role) DO UPDATE SET updated_at = NOW();

-- =====================================================
-- PART 5: USER PERMISSIONS (OVERRIDES)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    can_view_all_users BOOLEAN,
    can_view_team_users BOOLEAN,
    can_view_own_data BOOLEAN,
    can_manage_users BOOLEAN,
    can_approve_registrations BOOLEAN,
    can_assign_supervisors BOOLEAN,
    can_view_all_contacts BOOLEAN,
    can_view_team_contacts BOOLEAN,
    can_view_own_contacts BOOLEAN,
    can_edit_contacts BOOLEAN,
    can_delete_contacts BOOLEAN,
    can_view_financial_data BOOLEAN,
    can_view_team_financial BOOLEAN,
    can_view_own_financial BOOLEAN,
    can_export_financial BOOLEAN,
    can_manage_projects BOOLEAN,
    can_view_all_projects BOOLEAN,
    can_import_data BOOLEAN,
    can_export_data BOOLEAN,
    can_access_admin_panel BOOLEAN,
    can_modify_permissions BOOLEAN,
    can_view_audit_logs BOOLEAN,
    restricted_projects UUID[] DEFAULT '{}',
    allowed_projects UUID[],
    notes TEXT,
    modified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- =====================================================
-- PART 6: VISIBILITY RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS visibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_role TEXT NOT NULL,
    target_role TEXT NOT NULL,
    can_see BOOLEAN DEFAULT false,
    condition TEXT,
    data_types TEXT[] DEFAULT ARRAY['users', 'contacts', 'leads', 'deals', 'policies'],
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(viewer_role, target_role)
);

INSERT INTO visibility_rules (viewer_role, target_role, can_see, condition, description) VALUES
('admin', 'admin', true, 'all', 'Admin sees all'),
('admin', 'manager', true, 'all', 'Admin sees all'),
('admin', 'supervisor', true, 'all', 'Admin sees all'),
('admin', 'agent', true, 'all', 'Admin sees all'),
('admin', 'client', true, 'all', 'Admin sees all'),
('manager', 'supervisor', true, 'assigned', 'Manager sees assigned supervisors'),
('manager', 'agent', true, 'team', 'Manager sees team agents'),
('manager', 'client', true, 'team', 'Manager sees team clients'),
('supervisor', 'agent', true, 'team', 'Supervisor sees their agents'),
('supervisor', 'client', true, 'team', 'Supervisor sees agents clients'),
('agent', 'client', true, 'own', 'Agent sees their clients')
ON CONFLICT (viewer_role, target_role) DO UPDATE SET can_see = EXCLUDED.can_see, condition = EXCLUDED.condition;

-- =====================================================
-- PART 7: REGISTRATION REQUESTS
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
-- PART 8: DASHBOARD CREDENTIALS
-- =====================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS dashboard_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dashboard_username TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dashboard_password TEXT;

-- =====================================================
-- PART 9: HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM users WHERE auth_id = auth.uid() LIMIT 1;
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_type()
RETURNS TEXT AS $$
DECLARE utype TEXT;
BEGIN
    SELECT user_type INTO utype FROM users WHERE auth_id = auth.uid() LIMIT 1;
    RETURN COALESCE(utype, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_type() = 'admin'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_type() = 'manager'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_type() = 'supervisor'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION crm_is_supervisor()
RETURNS BOOLEAN AS $$
    SELECT get_current_user_type() IN ('supervisor', 'manager', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION crm_get_supervised_agents()
RETURNS UUID[] AS $$
DECLARE
    current_user_id UUID;
    current_user_type TEXT;
    agent_ids UUID[];
    supervisor_ids UUID[];
BEGIN
    SELECT id, user_type INTO current_user_id, current_user_type
    FROM users WHERE auth_id = auth.uid();

    IF current_user_id IS NULL THEN RETURN '{}'::UUID[]; END IF;

    IF current_user_type = 'admin' THEN
        SELECT array_agg(id) INTO agent_ids FROM users WHERE user_type = 'agent' AND is_active = true;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

    IF current_user_type = 'manager' THEN
        SELECT array_agg(supervisor_id) INTO supervisor_ids
        FROM manager_supervisor_assignments WHERE manager_id = current_user_id;
        IF supervisor_ids IS NOT NULL THEN
            SELECT array_agg(id) INTO agent_ids FROM users
            WHERE supervisor_id = ANY(supervisor_ids) AND is_active = true;
        END IF;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

    IF current_user_type = 'supervisor' THEN
        SELECT array_agg(id) INTO agent_ids FROM users
        WHERE supervisor_id = current_user_id AND is_active = true;
        RETURN COALESCE(agent_ids, '{}'::UUID[]);
    END IF;

    RETURN '{}'::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- PART 10: AUTH TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = LOWER(NEW.email)) THEN
        UPDATE users SET
            auth_id = NEW.id,
            is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            updated_at = NOW()
        WHERE email = LOWER(NEW.email) AND auth_id IS NULL;
    ELSE
        INSERT INTO users (id, auth_id, email, full_name, user_type, is_active, is_approved, is_email_verified, created_at, updated_at)
        VALUES (
            gen_random_uuid(), NEW.id, LOWER(NEW.email),
            COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
            'pending', true, false,
            COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            NOW(), NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET
        is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        last_login_at = CASE
            WHEN OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at
            THEN NEW.last_sign_in_at ELSE last_login_at
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
-- PART 11: GRANTS
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

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ SUCCESS: Hierarchy system installed!' as status;

SELECT 'Users count: ' || COUNT(*)::TEXT FROM users;
SELECT 'Permission templates: ' || COUNT(*)::TEXT FROM permission_templates;
