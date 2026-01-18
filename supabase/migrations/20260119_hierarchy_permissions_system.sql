-- =====================================================
-- HIERARCHY & PERMISSIONS SYSTEM
-- Version: 2.0
-- Date: 2026-01-19
--
-- Complete role-based access control with custom permissions
-- Supports: Admin > Manager > Supervisor > Agent > Client
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: PERMISSION TEMPLATES (Base permissions per role)
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL UNIQUE CHECK (role IN ('admin', 'manager', 'supervisor', 'agent', 'client', 'guest')),
    -- Data Access
    can_view_all_users BOOLEAN DEFAULT false,
    can_view_team_users BOOLEAN DEFAULT false,
    can_view_own_data BOOLEAN DEFAULT true,
    -- User Management
    can_manage_users BOOLEAN DEFAULT false,
    can_approve_registrations BOOLEAN DEFAULT false,
    can_assign_supervisors BOOLEAN DEFAULT false,
    -- CRM Access
    can_view_all_contacts BOOLEAN DEFAULT false,
    can_view_team_contacts BOOLEAN DEFAULT false,
    can_view_own_contacts BOOLEAN DEFAULT true,
    can_edit_contacts BOOLEAN DEFAULT false,
    can_delete_contacts BOOLEAN DEFAULT false,
    -- Financial Data
    can_view_financial_data BOOLEAN DEFAULT false,
    can_view_team_financial BOOLEAN DEFAULT false,
    can_view_own_financial BOOLEAN DEFAULT true,
    can_export_financial BOOLEAN DEFAULT false,
    -- Projects
    can_manage_projects BOOLEAN DEFAULT false,
    can_view_all_projects BOOLEAN DEFAULT false,
    can_import_data BOOLEAN DEFAULT false,
    can_export_data BOOLEAN DEFAULT false,
    -- System
    can_access_admin_panel BOOLEAN DEFAULT false,
    can_modify_permissions BOOLEAN DEFAULT false,
    can_view_audit_logs BOOLEAN DEFAULT false,
    -- Metadata
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default permission templates
INSERT INTO permission_templates (role, description,
    can_view_all_users, can_view_team_users,
    can_manage_users, can_approve_registrations, can_assign_supervisors,
    can_view_all_contacts, can_view_team_contacts, can_edit_contacts, can_delete_contacts,
    can_view_financial_data, can_view_team_financial, can_export_financial,
    can_manage_projects, can_view_all_projects, can_import_data, can_export_data,
    can_access_admin_panel, can_modify_permissions, can_view_audit_logs
) VALUES
-- ADMIN: Full access
('admin', 'System administrator with full access',
    true, true,  -- users
    true, true, true,  -- user management
    true, true, true, true,  -- contacts
    true, true, true,  -- financial
    true, true, true, true,  -- projects
    true, true, true  -- system
),
-- MANAGER: Manages assigned supervisors and their teams
('manager', 'Organization manager with team oversight',
    false, true,  -- users (team only)
    true, true, true,  -- user management
    false, true, true, false,  -- contacts (team, no delete)
    false, true, true,  -- financial (team)
    true, true, true, true,  -- projects
    false, false, true  -- system (audit only)
),
-- SUPERVISOR: Manages agents and sees their clients
('supervisor', 'Team supervisor managing agents',
    false, true,  -- users (team)
    false, true, false,  -- can approve agents
    false, true, true, false,  -- contacts (team, no delete)
    false, true, false,  -- financial (team, no export)
    false, true, true, false,  -- projects (view, import)
    false, false, false  -- no admin
),
-- AGENT: Manages own clients
('agent', 'Field agent managing clients',
    false, false,  -- own only
    false, false, false,  -- no user management
    false, false, true, false,  -- own contacts only
    false, false, false,  -- own financial, no export
    false, true, false, false,  -- view projects
    false, false, false  -- no admin
),
-- CLIENT: Views own data only
('client', 'End client with limited access',
    false, false,  -- own only
    false, false, false,  -- no management
    false, false, false, false,  -- no contacts
    false, false, false,  -- own financial only
    false, false, false, false,  -- no projects
    false, false, false  -- no admin
),
-- GUEST: Minimal access
('guest', 'Guest with minimal access',
    false, false,
    false, false, false,
    false, false, false, false,
    false, false, false,
    false, false, false, false,
    false, false, false
)
ON CONFLICT (role) DO UPDATE SET
    updated_at = NOW();

-- =====================================================
-- STEP 2: USER PERMISSIONS (Custom overrides per user)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Override flags (NULL = use template default)
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
    -- Specific restrictions
    restricted_projects UUID[] DEFAULT '{}',  -- Projects user CANNOT access
    allowed_projects UUID[] DEFAULT NULL,     -- If set, ONLY these projects (NULL = all allowed)
    restricted_data_types TEXT[] DEFAULT '{}', -- Data types user cannot see
    -- Notes
    notes TEXT,
    modified_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- =====================================================
-- STEP 3: VISIBILITY MATRIX (Who can see whom)
-- =====================================================

CREATE TABLE IF NOT EXISTS visibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Rule definition
    viewer_role TEXT NOT NULL CHECK (viewer_role IN ('admin', 'manager', 'supervisor', 'agent', 'client')),
    target_role TEXT NOT NULL CHECK (target_role IN ('admin', 'manager', 'supervisor', 'agent', 'client')),
    -- Can see users of target_role?
    can_see BOOLEAN DEFAULT false,
    -- Under what conditions?
    condition TEXT CHECK (condition IN ('all', 'team', 'assigned', 'own', 'none')),
    -- Applies to which data types
    data_types TEXT[] DEFAULT ARRAY['users', 'contacts', 'leads', 'deals', 'policies'],
    -- Description
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(viewer_role, target_role)
);

-- Insert visibility matrix
INSERT INTO visibility_rules (viewer_role, target_role, can_see, condition, description) VALUES
-- ADMIN sees everyone
('admin', 'admin', true, 'all', 'Admin sees all admins'),
('admin', 'manager', true, 'all', 'Admin sees all managers'),
('admin', 'supervisor', true, 'all', 'Admin sees all supervisors'),
('admin', 'agent', true, 'all', 'Admin sees all agents'),
('admin', 'client', true, 'all', 'Admin sees all clients'),

-- MANAGER sees assigned team
('manager', 'admin', false, 'none', 'Manager cannot see admins'),
('manager', 'manager', false, 'own', 'Manager sees only self'),
('manager', 'supervisor', true, 'assigned', 'Manager sees assigned supervisors'),
('manager', 'agent', true, 'team', 'Manager sees agents under assigned supervisors'),
('manager', 'client', true, 'team', 'Manager sees clients of team agents'),

-- SUPERVISOR sees their agents
('supervisor', 'admin', false, 'none', 'Supervisor cannot see admins'),
('supervisor', 'manager', false, 'none', 'Supervisor cannot see managers'),
('supervisor', 'supervisor', false, 'own', 'Supervisor sees only self'),
('supervisor', 'agent', true, 'team', 'Supervisor sees their agents'),
('supervisor', 'client', true, 'team', 'Supervisor sees clients of their agents'),

-- AGENT sees their clients
('agent', 'admin', false, 'none', 'Agent cannot see admins'),
('agent', 'manager', false, 'none', 'Agent cannot see managers'),
('agent', 'supervisor', false, 'own', 'Agent sees their supervisor only'),
('agent', 'agent', false, 'own', 'Agent sees only self'),
('agent', 'client', true, 'own', 'Agent sees their clients'),

-- CLIENT sees only self
('client', 'admin', false, 'none', 'Client cannot see admins'),
('client', 'manager', false, 'none', 'Client cannot see managers'),
('client', 'supervisor', false, 'none', 'Client cannot see supervisors'),
('client', 'agent', false, 'own', 'Client sees their agent only'),
('client', 'client', false, 'own', 'Client sees only self')

ON CONFLICT (viewer_role, target_role) DO UPDATE SET
    can_see = EXCLUDED.can_see,
    condition = EXCLUDED.condition;

-- =====================================================
-- STEP 4: ADD CLIENT FIELDS TO USERS TABLE
-- =====================================================

-- Client-specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT 'active'
    CHECK (client_status IN ('active', 'inactive', 'prospect', 'churned'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_since TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code TEXT;
-- Financial required fields for clients
ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS num_children INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employer TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS annual_income_range TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_profile TEXT CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive'));

CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);

-- =====================================================
-- STEP 5: HELPER FUNCTIONS FOR PERMISSIONS
-- =====================================================

-- Get effective permission for a user (combines template + overrides)
CREATE OR REPLACE FUNCTION get_user_permission(
    p_user_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    template_value BOOLEAN;
    override_value BOOLEAN;
BEGIN
    -- Get user's role
    SELECT user_type INTO user_role FROM users WHERE id = p_user_id;
    IF user_role IS NULL THEN RETURN false; END IF;

    -- Get template default
    EXECUTE format('SELECT %I FROM permission_templates WHERE role = $1', p_permission)
    INTO template_value
    USING user_role;

    -- Check for override
    EXECUTE format('SELECT %I FROM user_permissions WHERE user_id = $1', p_permission)
    INTO override_value
    USING p_user_id;

    -- Return override if set, otherwise template
    RETURN COALESCE(override_value, template_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all effective permissions for current user
CREATE OR REPLACE FUNCTION get_my_permissions()
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    template_perms RECORD;
    override_perms RECORD;
    result JSONB;
BEGIN
    SELECT id, user_type INTO current_user_id, user_role
    FROM users WHERE auth_id = auth.uid();

    IF current_user_id IS NULL THEN
        RETURN '{}'::JSONB;
    END IF;

    -- Get template permissions
    SELECT * INTO template_perms FROM permission_templates WHERE role = user_role;

    -- Get overrides
    SELECT * INTO override_perms FROM user_permissions WHERE user_id = current_user_id;

    -- Build result with overrides taking precedence
    result := jsonb_build_object(
        'role', user_role,
        'user_id', current_user_id,
        'can_view_all_users', COALESCE(override_perms.can_view_all_users, template_perms.can_view_all_users, false),
        'can_view_team_users', COALESCE(override_perms.can_view_team_users, template_perms.can_view_team_users, false),
        'can_manage_users', COALESCE(override_perms.can_manage_users, template_perms.can_manage_users, false),
        'can_approve_registrations', COALESCE(override_perms.can_approve_registrations, template_perms.can_approve_registrations, false),
        'can_view_all_contacts', COALESCE(override_perms.can_view_all_contacts, template_perms.can_view_all_contacts, false),
        'can_view_team_contacts', COALESCE(override_perms.can_view_team_contacts, template_perms.can_view_team_contacts, false),
        'can_edit_contacts', COALESCE(override_perms.can_edit_contacts, template_perms.can_edit_contacts, false),
        'can_delete_contacts', COALESCE(override_perms.can_delete_contacts, template_perms.can_delete_contacts, false),
        'can_view_financial_data', COALESCE(override_perms.can_view_financial_data, template_perms.can_view_financial_data, false),
        'can_view_team_financial', COALESCE(override_perms.can_view_team_financial, template_perms.can_view_team_financial, false),
        'can_export_financial', COALESCE(override_perms.can_export_financial, template_perms.can_export_financial, false),
        'can_manage_projects', COALESCE(override_perms.can_manage_projects, template_perms.can_manage_projects, false),
        'can_view_all_projects', COALESCE(override_perms.can_view_all_projects, template_perms.can_view_all_projects, false),
        'can_import_data', COALESCE(override_perms.can_import_data, template_perms.can_import_data, false),
        'can_export_data', COALESCE(override_perms.can_export_data, template_perms.can_export_data, false),
        'can_access_admin_panel', COALESCE(override_perms.can_access_admin_panel, template_perms.can_access_admin_panel, false),
        'can_modify_permissions', COALESCE(override_perms.can_modify_permissions, template_perms.can_modify_permissions, false),
        'can_view_audit_logs', COALESCE(override_perms.can_view_audit_logs, template_perms.can_view_audit_logs, false)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 6: GET VISIBLE USER IDS FUNCTION
-- =====================================================

-- Returns array of user IDs that current user can see
-- This is THE core function for all visibility filtering
CREATE OR REPLACE FUNCTION get_visible_user_ids(
    p_target_role TEXT DEFAULT NULL  -- Optional filter by role
)
RETURNS UUID[] AS $$
DECLARE
    current_user_id UUID;
    current_user_role TEXT;
    visible_ids UUID[];
    supervisor_ids UUID[];
    agent_ids UUID[];
BEGIN
    -- Get current user
    SELECT id, user_type INTO current_user_id, current_user_role
    FROM users WHERE auth_id = auth.uid();

    IF current_user_id IS NULL THEN
        RETURN '{}'::UUID[];
    END IF;

    -- ADMIN sees all
    IF current_user_role = 'admin' THEN
        IF p_target_role IS NOT NULL THEN
            SELECT array_agg(id) INTO visible_ids
            FROM users WHERE user_type = p_target_role AND is_active = true;
        ELSE
            SELECT array_agg(id) INTO visible_ids
            FROM users WHERE is_active = true;
        END IF;
        RETURN COALESCE(visible_ids, '{}'::UUID[]);
    END IF;

    -- MANAGER sees assigned supervisors + their agents + their clients
    IF current_user_role = 'manager' THEN
        -- Get assigned supervisors
        SELECT array_agg(supervisor_id) INTO supervisor_ids
        FROM manager_supervisor_assignments
        WHERE manager_id = current_user_id;

        IF supervisor_ids IS NULL THEN
            supervisor_ids := '{}'::UUID[];
        END IF;

        -- Get agents under supervisors
        SELECT array_agg(id) INTO agent_ids
        FROM users
        WHERE supervisor_id = ANY(supervisor_ids) AND is_active = true;

        IF agent_ids IS NULL THEN
            agent_ids := '{}'::UUID[];
        END IF;

        -- Build visible list based on target role
        IF p_target_role = 'supervisor' THEN
            visible_ids := supervisor_ids;
        ELSIF p_target_role = 'agent' THEN
            visible_ids := agent_ids;
        ELSIF p_target_role = 'client' THEN
            SELECT array_agg(id) INTO visible_ids
            FROM users
            WHERE user_type = 'client' AND agent_id = ANY(agent_ids) AND is_active = true;
        ELSE
            -- All visible
            visible_ids := supervisor_ids || agent_ids;
            -- Add clients
            SELECT array_agg(id) INTO agent_ids
            FROM users
            WHERE user_type = 'client' AND agent_id = ANY(agent_ids) AND is_active = true;
            visible_ids := visible_ids || COALESCE(agent_ids, '{}'::UUID[]);
        END IF;

        -- Always include self
        visible_ids := array_append(COALESCE(visible_ids, '{}'::UUID[]), current_user_id);
        RETURN visible_ids;
    END IF;

    -- SUPERVISOR sees their agents + agents' clients
    IF current_user_role = 'supervisor' THEN
        -- Get agents
        SELECT array_agg(id) INTO agent_ids
        FROM users
        WHERE supervisor_id = current_user_id AND is_active = true;

        IF agent_ids IS NULL THEN
            agent_ids := '{}'::UUID[];
        END IF;

        IF p_target_role = 'agent' THEN
            visible_ids := agent_ids;
        ELSIF p_target_role = 'client' THEN
            SELECT array_agg(id) INTO visible_ids
            FROM users
            WHERE user_type = 'client' AND agent_id = ANY(agent_ids) AND is_active = true;
        ELSE
            visible_ids := agent_ids;
            SELECT array_agg(id) INTO supervisor_ids
            FROM users
            WHERE user_type = 'client' AND agent_id = ANY(agent_ids) AND is_active = true;
            visible_ids := visible_ids || COALESCE(supervisor_ids, '{}'::UUID[]);
        END IF;

        -- Include self
        visible_ids := array_append(COALESCE(visible_ids, '{}'::UUID[]), current_user_id);
        RETURN visible_ids;
    END IF;

    -- AGENT sees their clients
    IF current_user_role = 'agent' THEN
        IF p_target_role = 'client' OR p_target_role IS NULL THEN
            SELECT array_agg(id) INTO visible_ids
            FROM users
            WHERE user_type = 'client' AND agent_id = current_user_id AND is_active = true;
        END IF;

        -- Include self
        visible_ids := array_append(COALESCE(visible_ids, '{}'::UUID[]), current_user_id);
        RETURN visible_ids;
    END IF;

    -- CLIENT sees only self
    IF current_user_role = 'client' THEN
        RETURN ARRAY[current_user_id];
    END IF;

    -- Default: only self
    RETURN ARRAY[current_user_id];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 7: CHECK IF CAN VIEW SPECIFIC USER
-- =====================================================

CREATE OR REPLACE FUNCTION can_view_user(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_target_user_id = ANY(get_visible_user_ids());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 8: GET TEAM HIERARCHY
-- =====================================================

-- Returns full team hierarchy for current user
CREATE OR REPLACE FUNCTION get_my_team_hierarchy()
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    current_user_role TEXT;
    result JSONB;
    supervisors JSONB;
    agents JSONB;
    clients JSONB;
BEGIN
    SELECT id, user_type INTO current_user_id, current_user_role
    FROM users WHERE auth_id = auth.uid();

    IF current_user_role = 'admin' THEN
        -- Admin gets full org structure
        SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'name', full_name,
            'email', email,
            'role', user_type,
            'is_active', is_active
        )) INTO result
        FROM users
        WHERE user_type IN ('manager', 'supervisor', 'agent')
        ORDER BY
            CASE user_type WHEN 'manager' THEN 1 WHEN 'supervisor' THEN 2 WHEN 'agent' THEN 3 END,
            full_name;

        RETURN COALESCE(result, '[]'::JSONB);
    END IF;

    IF current_user_role = 'supervisor' THEN
        -- Get my agents with their clients
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', a.id,
                'name', a.full_name,
                'email', a.email,
                'phone', a.phone,
                'is_active', a.is_active,
                'clients', (
                    SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'id', c.id,
                        'name', c.full_name,
                        'email', c.email,
                        'phone', c.phone,
                        'status', c.client_status
                    )), '[]'::JSONB)
                    FROM users c
                    WHERE c.agent_id = a.id AND c.user_type = 'client' AND c.is_active = true
                )
            )
        ) INTO agents
        FROM users a
        WHERE a.supervisor_id = current_user_id AND a.user_type = 'agent';

        RETURN jsonb_build_object(
            'role', 'supervisor',
            'agents', COALESCE(agents, '[]'::JSONB)
        );
    END IF;

    IF current_user_role = 'agent' THEN
        -- Get my clients
        SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'name', full_name,
            'email', email,
            'phone', phone,
            'status', client_status,
            'since', client_since
        )) INTO clients
        FROM users
        WHERE agent_id = current_user_id AND user_type = 'client' AND is_active = true;

        RETURN jsonb_build_object(
            'role', 'agent',
            'clients', COALESCE(clients, '[]'::JSONB)
        );
    END IF;

    RETURN jsonb_build_object('role', current_user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 9: GRANTS
-- =====================================================

GRANT SELECT ON permission_templates TO authenticated;
GRANT SELECT ON user_permissions TO authenticated;
GRANT SELECT ON visibility_rules TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_visible_user_ids(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_team_hierarchy() TO authenticated;

COMMIT;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Hierarchy Permissions System installed successfully!' as status;
