-- Import logs table to track all data imports
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Import details
  file_name TEXT NOT NULL,
  file_size INTEGER,
  target_table TEXT NOT NULL, -- 'master_data', 'insurance_data', etc.

  -- Results
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed', 'partial'
  rows_total INTEGER DEFAULT 0,
  rows_imported INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  -- Metadata
  column_mapping JSONB, -- How columns were mapped
  import_options JSONB, -- Any options selected during import

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see import logs for projects they have access to
CREATE POLICY "Users can view import logs for their projects" ON import_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = import_logs.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

-- Policy: Users can create import logs for projects they have editor/admin access to
CREATE POLICY "Users can create import logs" ON import_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = import_logs.project_id
      AND user_project_access.user_id = auth.uid()
      AND user_project_access.role IN ('admin', 'editor')
    )
  );

-- Policy: Users can update their own import logs
CREATE POLICY "Users can update own import logs" ON import_logs
  FOR UPDATE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_logs_project_id ON import_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_user_id ON import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON import_logs(created_at DESC);
