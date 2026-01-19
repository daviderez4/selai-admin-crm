-- Add project_id to hub_invitations for project-specific invitations
-- Also add 'manager' role option

-- Add project_id column
ALTER TABLE hub_invitations
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- Update role check to include 'manager'
ALTER TABLE hub_invitations
DROP CONSTRAINT IF EXISTS hub_invitations_role_check;

ALTER TABLE hub_invitations
ADD CONSTRAINT hub_invitations_role_check
CHECK (role IN ('admin', 'manager', 'supervisor', 'agent'));

-- Add index for project queries
CREATE INDEX IF NOT EXISTS idx_hub_invitations_project ON hub_invitations(project_id);

-- Comment for documentation
COMMENT ON COLUMN hub_invitations.project_id IS 'Optional project to grant access to upon registration';
