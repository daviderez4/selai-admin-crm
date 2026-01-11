-- Column Mapping Configurations Table
-- Stores mapping configurations for Excel/CSV imports

CREATE TABLE IF NOT EXISTS column_mapping_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Source file info
  source_file JSONB NOT NULL DEFAULT '{}',
  -- {
  --   name: string,
  --   type: 'xlsx' | 'csv',
  --   sheetName?: string,
  --   totalRows: number,
  --   totalColumns: number,
  --   uploadedAt: string
  -- }

  -- Detected columns from source
  source_columns JSONB NOT NULL DEFAULT '[]',
  -- Array of SourceColumn objects

  -- Column mappings
  mappings JSONB NOT NULL DEFAULT '[]',
  -- Array of ColumnMapping objects

  -- Columns to ignore
  ignored_columns TEXT[] DEFAULT '{}',

  -- Import settings
  settings JSONB NOT NULL DEFAULT '{
    "skipRows": 1,
    "duplicateHandling": "skip",
    "uniqueColumns": [],
    "validateBeforeImport": true,
    "createBackup": true
  }',

  -- Approval status
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_column_mapping_configs_project ON column_mapping_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_column_mapping_configs_approved ON column_mapping_configs(approved);

-- RLS Policies
ALTER TABLE column_mapping_configs ENABLE ROW LEVEL SECURITY;

-- Allow read access to users with project access
CREATE POLICY column_mapping_configs_select ON column_mapping_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = column_mapping_configs.project_id
      AND user_project_access.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Allow insert for users with editor+ access
CREATE POLICY column_mapping_configs_insert ON column_mapping_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = column_mapping_configs.project_id
      AND user_project_access.user_id = auth.uid()
      AND user_project_access.role IN ('admin', 'editor')
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Allow update for users with editor+ access
CREATE POLICY column_mapping_configs_update ON column_mapping_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = column_mapping_configs.project_id
      AND user_project_access.user_id = auth.uid()
      AND user_project_access.role IN ('admin', 'editor')
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Allow delete for admins only
CREATE POLICY column_mapping_configs_delete ON column_mapping_configs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_column_mapping_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_column_mapping_configs_timestamp ON column_mapping_configs;
CREATE TRIGGER update_column_mapping_configs_timestamp
  BEFORE UPDATE ON column_mapping_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_column_mapping_config_timestamp();

-- Comments
COMMENT ON TABLE column_mapping_configs IS 'Stores column mapping configurations for data imports';
COMMENT ON COLUMN column_mapping_configs.source_columns IS 'JSON array of detected source columns with type info';
COMMENT ON COLUMN column_mapping_configs.mappings IS 'JSON array of source-to-target field mappings';
COMMENT ON COLUMN column_mapping_configs.settings IS 'Import settings like skip rows, duplicate handling';
