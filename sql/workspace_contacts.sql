-- Workspace Contacts Table
-- This table stores contacts for agents/supervisors to manage their own contact lists

CREATE TABLE IF NOT EXISTS workspace_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Contact information
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  phone2 TEXT,
  id_number TEXT,

  -- Status and classification
  status TEXT DEFAULT 'prospect' CHECK (status IN ('active', 'inactive', 'prospect', 'archived')),
  source TEXT, -- Where the contact came from (website, referral, facebook, etc.)
  tags TEXT[], -- Array of tags for categorization

  -- Additional info
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workspace_contacts_owner ON workspace_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_contacts_status ON workspace_contacts(status);
CREATE INDEX IF NOT EXISTS idx_workspace_contacts_phone ON workspace_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_workspace_contacts_email ON workspace_contacts(email);
CREATE INDEX IF NOT EXISTS idx_workspace_contacts_full_name ON workspace_contacts(full_name);

-- RLS Policies
ALTER TABLE workspace_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own contacts
CREATE POLICY "Users can view own contacts" ON workspace_contacts
  FOR SELECT USING (owner_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Users can insert their own contacts
CREATE POLICY "Users can insert own contacts" ON workspace_contacts
  FOR INSERT WITH CHECK (owner_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Users can update their own contacts
CREATE POLICY "Users can update own contacts" ON workspace_contacts
  FOR UPDATE USING (owner_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Users can delete their own contacts
CREATE POLICY "Users can delete own contacts" ON workspace_contacts
  FOR DELETE USING (owner_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Supervisors can see contacts of agents under them
CREATE POLICY "Supervisors can view team contacts" ON workspace_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = workspace_contacts.owner_id
      AND u.supervisor_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid() AND user_type IN ('supervisor', 'manager', 'admin')
      )
    )
  );

-- Admins and managers can see all contacts
CREATE POLICY "Admins can view all contacts" ON workspace_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_id = auth.uid() AND user_type IN ('admin', 'manager')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_workspace_contacts_updated_at ON workspace_contacts;
CREATE TRIGGER update_workspace_contacts_updated_at
  BEFORE UPDATE ON workspace_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_contacts_updated_at();

-- Grant permissions
GRANT ALL ON workspace_contacts TO authenticated;
GRANT ALL ON workspace_contacts TO service_role;

-- Comment
COMMENT ON TABLE workspace_contacts IS 'Contacts managed by agents/supervisors for campaigns and customer management';
