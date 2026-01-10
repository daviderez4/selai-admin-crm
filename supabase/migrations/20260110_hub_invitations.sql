-- Hub Invitations Table
-- This table stores invitation links for users to register to the Hub

CREATE TABLE IF NOT EXISTS hub_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'agent')),
  agent_id UUID, -- Optional link to external_agents in SELAI
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) -- The user account created from this invitation
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_hub_invitations_token ON hub_invitations(token);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_hub_invitations_status ON hub_invitations(status);

-- Enable RLS
ALTER TABLE hub_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read invitations by token (for registration page)
CREATE POLICY "Public can verify invitation tokens"
  ON hub_invitations
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create invitations
CREATE POLICY "Authenticated users can create invitations"
  ON hub_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update invitations
CREATE POLICY "Authenticated users can update invitations"
  ON hub_invitations
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete invitations
CREATE POLICY "Authenticated users can delete invitations"
  ON hub_invitations
  FOR DELETE
  TO authenticated
  USING (true);


-- Also create/update users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'supervisor', 'agent')),
  agent_id UUID, -- Link to external_agents in SELAI
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can manage all
CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  TO service_role
  USING (true);
