-- SELAI Admin Hub Database Schema
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS import_history CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_project_access CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  supabase_service_key TEXT NOT NULL,
  service_key_encrypted TEXT, -- Legacy column for backwards compatibility
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- User project access table
CREATE TABLE user_project_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- User settings table
CREATE TABLE user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(5) DEFAULT 'he',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import history table
CREATE TABLE import_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  rows_imported INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_project_access_user_id ON user_project_access(user_id);
CREATE INDEX idx_user_project_access_project_id ON user_project_access(project_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_import_history_project_id ON import_history(project_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid())
);
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid() AND role = 'admin')
);

-- User project access policies
CREATE POLICY "access_select" ON user_project_access FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "access_insert" ON user_project_access FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  project_id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "access_delete" ON user_project_access FOR DELETE USING (
  project_id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid() AND role = 'admin')
);

-- User settings policies
CREATE POLICY "settings_select" ON user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "settings_insert" ON user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "settings_update" ON user_settings FOR UPDATE USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (
  user_id = auth.uid() OR
  project_id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid())
);
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- Import history policies
CREATE POLICY "import_select" ON import_history FOR SELECT USING (
  project_id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid())
);
CREATE POLICY "import_insert" ON import_history FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM user_project_access WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
