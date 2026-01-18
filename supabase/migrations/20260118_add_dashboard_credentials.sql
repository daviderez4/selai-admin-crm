-- =====================================================
-- ADD DASHBOARD CREDENTIALS TO PROJECTS
-- This migration adds fields for external dashboard link
-- with username and password (encrypted) for each project
-- =====================================================

-- Add dashboard link fields to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS dashboard_url TEXT,
ADD COLUMN IF NOT EXISTS dashboard_username TEXT,
ADD COLUMN IF NOT EXISTS dashboard_password TEXT; -- Will be encrypted before storage

-- Add comment for documentation
COMMENT ON COLUMN projects.dashboard_url IS 'External dashboard URL for this project';
COMMENT ON COLUMN projects.dashboard_username IS 'Username for dashboard authentication';
COMMENT ON COLUMN projects.dashboard_password IS 'Encrypted password for dashboard authentication';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_dashboard_url ON projects(dashboard_url) WHERE dashboard_url IS NOT NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: Dashboard credentials fields added to projects table!' as result;
