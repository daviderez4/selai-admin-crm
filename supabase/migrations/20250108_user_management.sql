-- ===========================================
-- User Management Tables for Sela Dashboards
-- ===========================================

-- 1. Profiles table - stores user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- 2. User Project Access - manages permissions
-- ===========================================
CREATE TABLE IF NOT EXISTS user_project_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_project_access_user ON user_project_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_access_project ON user_project_access(project_id);

-- Enable RLS
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;

-- Policies for user_project_access
-- Users can see access records for projects they have access to
CREATE POLICY "Users can view project access" ON user_project_access
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM user_project_access WHERE user_id = auth.uid()
    )
  );

-- Only admins can modify access
CREATE POLICY "Admins can insert access" ON user_project_access
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_id = auth.uid()
      AND project_id = user_project_access.project_id
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update access" ON user_project_access
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_id = auth.uid()
      AND project_id = user_project_access.project_id
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete access" ON user_project_access
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_id = auth.uid()
      AND project_id = user_project_access.project_id
      AND role = 'admin'
    )
  );

-- ===========================================
-- 3. Pending Invitations - for new users
-- ===========================================
CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_ids UUID[] NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON pending_invitations(email);

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for pending_invitations
CREATE POLICY "Admins can view invitations" ON pending_invitations
  FOR SELECT TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "Admins can create invitations" ON pending_invitations
  FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Admins can delete invitations" ON pending_invitations
  FOR DELETE TO authenticated
  USING (invited_by = auth.uid());

-- ===========================================
-- 4. Function to process pending invitations on signup
-- ===========================================
CREATE OR REPLACE FUNCTION public.process_pending_invitation()
RETURNS TRIGGER AS $$
DECLARE
  invitation RECORD;
  project_id UUID;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT * INTO invitation
  FROM pending_invitations
  WHERE email = LOWER(NEW.email)
  AND expires_at > NOW()
  AND used_at IS NULL;

  IF FOUND THEN
    -- Grant access to all projects in the invitation
    FOREACH project_id IN ARRAY invitation.project_ids
    LOOP
      INSERT INTO user_project_access (user_id, project_id, role)
      VALUES (NEW.id, project_id, invitation.role)
      ON CONFLICT (user_id, project_id) DO UPDATE SET role = EXCLUDED.role;
    END LOOP;

    -- Mark invitation as used
    UPDATE pending_invitations
    SET used_at = NOW()
    WHERE id = invitation.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process invitation after profile creation
DROP TRIGGER IF EXISTS on_profile_created_check_invitation ON profiles;
CREATE TRIGGER on_profile_created_check_invitation
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.process_pending_invitation();

-- ===========================================
-- 5. Audit Logs - track user actions
-- ===========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Anyone can insert logs (for their own actions)
CREATE POLICY "Users can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ===========================================
-- 6. Auto-create profile for existing users
-- ===========================================
INSERT INTO profiles (id, email, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 7. Grant admin access to project creators
-- ===========================================
-- Function to auto-grant admin access when creating a project
CREATE OR REPLACE FUNCTION public.grant_project_creator_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_project_access (user_id, project_id, role)
  VALUES (auth.uid(), NEW.id, 'admin')
  ON CONFLICT (user_id, project_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to grant access on project creation
DROP TRIGGER IF EXISTS on_project_created ON projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION public.grant_project_creator_access();
