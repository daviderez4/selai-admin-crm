-- ============================================
-- User Profiles with Role-Based Permissions
-- ============================================

-- Drop existing if needed (for development)
-- DROP TABLE IF EXISTS client_invitations CASCADE;
-- DROP TABLE IF EXISTS registration_requests CASCADE;
-- DROP TABLE IF EXISTS user_profiles CASCADE;

-- User profiles table with full role system
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  id_number TEXT, -- Israeli ID
  mobile TEXT,

  -- Role (admin, manager, supervisor, agent, client)
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'supervisor', 'agent', 'client')),

  -- Hierarchical links
  supervisor_id UUID REFERENCES user_profiles(id), -- For agents
  manager_id UUID REFERENCES user_profiles(id), -- For supervisors
  agent_id UUID REFERENCES user_profiles(id), -- For clients

  -- For managers: assigned supervisors and projects
  assigned_supervisor_ids UUID[] DEFAULT '{}',
  assigned_project_ids UUID[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  registration_status TEXT DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),

  -- Metadata
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registration requests (before approval)
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  mobile TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('agent', 'supervisor')),
  supervisor_id UUID REFERENCES user_profiles(id), -- For agents

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client invitations
CREATE TABLE IF NOT EXISTS client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES user_profiles(id),
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manager-Supervisor assignments (for managers to see specific supervisors)
CREATE TABLE IF NOT EXISTS manager_supervisor_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, supervisor_id)
);

-- Manager-Project assignments (for managers to see specific projects)
CREATE TABLE IF NOT EXISTS manager_project_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manager_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_supervisor ON user_profiles(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager ON user_profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_agent ON user_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_invitations_token ON client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_client_invitations_agent ON client_invitations(agent_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_timestamp ON user_profiles;
CREATE TRIGGER update_user_profiles_timestamp
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_timestamp();

-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_supervisor_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_project_access ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS user_profiles AS $$
  SELECT * FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- User Profiles Policies

-- Admins can see all profiles
CREATE POLICY user_profiles_admin_select ON user_profiles
  FOR SELECT
  USING (get_current_user_role() = 'admin');

-- Managers can see their assigned supervisors and those supervisors' agents
CREATE POLICY user_profiles_manager_select ON user_profiles
  FOR SELECT
  USING (
    get_current_user_role() = 'manager'
    AND (
      -- Own profile
      auth_user_id = auth.uid()
      -- Assigned supervisors
      OR id IN (
        SELECT supervisor_id FROM manager_supervisor_access
        WHERE manager_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      )
      -- Agents under assigned supervisors
      OR supervisor_id IN (
        SELECT supervisor_id FROM manager_supervisor_access
        WHERE manager_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
      )
    )
  );

-- Supervisors can see their agents
CREATE POLICY user_profiles_supervisor_select ON user_profiles
  FOR SELECT
  USING (
    get_current_user_role() = 'supervisor'
    AND (
      -- Own profile
      auth_user_id = auth.uid()
      -- Agents under this supervisor
      OR supervisor_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
    )
  );

-- Agents can see themselves and their clients
CREATE POLICY user_profiles_agent_select ON user_profiles
  FOR SELECT
  USING (
    get_current_user_role() = 'agent'
    AND (
      -- Own profile
      auth_user_id = auth.uid()
      -- Clients of this agent
      OR agent_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
    )
  );

-- Clients can only see themselves
CREATE POLICY user_profiles_client_select ON user_profiles
  FOR SELECT
  USING (
    get_current_user_role() = 'client'
    AND auth_user_id = auth.uid()
  );

-- Everyone can see their own profile (fallback)
CREATE POLICY user_profiles_own_select ON user_profiles
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- Only admins can insert profiles directly (registration goes through requests)
CREATE POLICY user_profiles_admin_insert ON user_profiles
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin');

-- Admins can update any profile, others can only update their own
CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE
  USING (
    get_current_user_role() = 'admin'
    OR auth_user_id = auth.uid()
  );

-- Registration Requests Policies

-- Anyone can create a registration request (no auth required initially)
CREATE POLICY registration_requests_insert ON registration_requests
  FOR INSERT
  WITH CHECK (true);

-- Admins and supervisors can view requests
CREATE POLICY registration_requests_select ON registration_requests
  FOR SELECT
  USING (
    get_current_user_role() IN ('admin', 'supervisor')
  );

-- Admins can update requests
CREATE POLICY registration_requests_update ON registration_requests
  FOR UPDATE
  USING (get_current_user_role() = 'admin');

-- Client Invitations Policies

-- Agents can create invitations
CREATE POLICY client_invitations_agent_insert ON client_invitations
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'agent'
    AND agent_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );

-- Agents can see their own invitations
CREATE POLICY client_invitations_agent_select ON client_invitations
  FOR SELECT
  USING (
    agent_id = (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
    OR get_current_user_role() = 'admin'
  );

-- Manager Access Policies

-- Admins can manage all access
CREATE POLICY manager_supervisor_access_admin ON manager_supervisor_access
  FOR ALL
  USING (get_current_user_role() = 'admin');

CREATE POLICY manager_project_access_admin ON manager_project_access
  FOR ALL
  USING (get_current_user_role() = 'admin');

-- Comments
COMMENT ON TABLE user_profiles IS 'User profiles with role-based hierarchy';
COMMENT ON TABLE registration_requests IS 'Pending registration requests for agents and supervisors';
COMMENT ON TABLE client_invitations IS 'Invitations sent by agents to their clients';
COMMENT ON TABLE manager_supervisor_access IS 'Which supervisors each manager can see';
COMMENT ON TABLE manager_project_access IS 'Which projects each manager can see';
