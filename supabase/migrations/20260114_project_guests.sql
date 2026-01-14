-- Project Guests Table
-- Allows inviting external users to view projects without full registration

CREATE TABLE IF NOT EXISTS project_guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    access_token VARCHAR(64) UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_guests_token ON project_guests(access_token);
CREATE INDEX IF NOT EXISTS idx_project_guests_project ON project_guests(project_id);
CREATE INDEX IF NOT EXISTS idx_project_guests_email ON project_guests(email);
CREATE INDEX IF NOT EXISTS idx_project_guests_invited_by ON project_guests(invited_by);

-- Enable Row Level Security
ALTER TABLE project_guests ENABLE ROW LEVEL SECURITY;

-- Policy: Project admins can view guests for their projects
CREATE POLICY "Project admins can view guests" ON project_guests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = project_guests.project_id
            AND user_project_access.user_id = auth.uid()
            AND user_project_access.role = 'admin'
        )
    );

-- Policy: Project admins can create guests
CREATE POLICY "Project admins can create guests" ON project_guests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = project_guests.project_id
            AND user_project_access.user_id = auth.uid()
            AND user_project_access.role = 'admin'
        )
        AND invited_by = auth.uid()
    );

-- Policy: Project admins can update guests
CREATE POLICY "Project admins can update guests" ON project_guests
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = project_guests.project_id
            AND user_project_access.user_id = auth.uid()
            AND user_project_access.role = 'admin'
        )
    );

-- Policy: Project admins can delete guests
CREATE POLICY "Project admins can delete guests" ON project_guests
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = project_guests.project_id
            AND user_project_access.user_id = auth.uid()
            AND user_project_access.role = 'admin'
        )
    );

-- Policy: Anyone can verify a guest token (for public access)
CREATE POLICY "Anyone can verify guest token" ON project_guests
    FOR SELECT
    TO anon
    USING (
        is_active = true
        AND expires_at > NOW()
    );

-- Policy: Anonymous can update access stats when using token
CREATE POLICY "Anonymous can update access stats" ON project_guests
    FOR UPDATE
    TO anon
    USING (is_active = true AND expires_at > NOW())
    WITH CHECK (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS project_guests_updated_at ON project_guests;
CREATE TRIGGER project_guests_updated_at
    BEFORE UPDATE ON project_guests
    FOR EACH ROW
    EXECUTE FUNCTION update_project_guests_updated_at();

-- Comments
COMMENT ON TABLE project_guests IS 'External guest access to projects without full registration';
COMMENT ON COLUMN project_guests.access_token IS 'Unique token for guest access URL';
COMMENT ON COLUMN project_guests.role IS 'Guest permission level (viewer = view + export)';
COMMENT ON COLUMN project_guests.access_count IS 'Number of times the guest accessed the project';
