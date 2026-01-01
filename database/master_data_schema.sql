-- Schema for master_data table
-- Run this in Supabase SQL Editor

-- Drop existing table if needed (uncomment if you want to recreate)
-- DROP TABLE IF EXISTS master_data;

CREATE TABLE IF NOT EXISTS master_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Financial fields
  total_expected_accumulation NUMERIC,  -- Sum of AZ + CZ columns
  product_type_new TEXT,                 -- BE column - סוג מוצר חדש
  producer_new TEXT,                     -- BF column - יצרן חדש
  documents_transfer_date DATE,          -- DH column - תאריך העברת מסמכים

  -- Store original row for reference
  raw_data JSONB,

  -- Metadata
  project_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role full access" ON master_data
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_master_data_project_id ON master_data(project_id);
CREATE INDEX IF NOT EXISTS idx_master_data_created_at ON master_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_master_data_product_type ON master_data(product_type_new);
CREATE INDEX IF NOT EXISTS idx_master_data_producer ON master_data(producer_new);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_master_data_updated_at ON master_data;
CREATE TRIGGER update_master_data_updated_at
  BEFORE UPDATE ON master_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
