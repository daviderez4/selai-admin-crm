-- Migration: Project Isolation Architecture
-- Date: 2026-01-07
-- Description: Add columns for project database isolation tracking

-- Add is_configured column to track if project has valid credentials
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT FALSE;

-- Add connection_last_tested to track when credentials were last validated
ALTER TABLE projects ADD COLUMN IF NOT EXISTS connection_last_tested TIMESTAMPTZ;

-- Add connection_error to store last error message
ALTER TABLE projects ADD COLUMN IF NOT EXISTS connection_error TEXT;

-- Create index for faster queries on configured status
CREATE INDEX IF NOT EXISTS idx_projects_is_configured ON projects(is_configured);

-- Mark existing projects using Central DB as unconfigured
-- They will need to be reconfigured with their own database credentials
UPDATE projects
SET is_configured = false,
    connection_error = 'Project needs reconfiguration with own database credentials'
WHERE supabase_url LIKE '%vcskhgqeqctitubryoet%';

-- Mark projects with valid external URLs as configured
UPDATE projects
SET is_configured = true
WHERE supabase_url NOT LIKE '%vcskhgqeqctitubryoet%'
  AND supabase_url LIKE 'https://%.supabase.co';
