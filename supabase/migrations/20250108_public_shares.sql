-- Create public_shares table for sharing dashboards with external users
CREATE TABLE IF NOT EXISTS public_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token VARCHAR(64) UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID NOT NULL,
  password_hash VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'שיתוף דשבורד',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_public_shares_token ON public_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_public_shares_project ON public_shares(project_id);

-- Enable RLS
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own shares
CREATE POLICY "Users can view own shares"
  ON public_shares
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy: Users can create shares
CREATE POLICY "Users can create shares"
  ON public_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own shares
CREATE POLICY "Users can update own shares"
  ON public_shares
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy: Users can delete their own shares
CREATE POLICY "Users can delete own shares"
  ON public_shares
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy: Allow anonymous read for share verification (needed for public access)
CREATE POLICY "Anyone can read share by token"
  ON public_shares
  FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > NOW());

-- Policy: Allow anonymous update for view count
CREATE POLICY "Anyone can update view count"
  ON public_shares
  FOR UPDATE
  TO anon
  USING (is_active = true)
  WITH CHECK (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_public_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS public_shares_updated_at ON public_shares;
CREATE TRIGGER public_shares_updated_at
  BEFORE UPDATE ON public_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_public_shares_updated_at();
