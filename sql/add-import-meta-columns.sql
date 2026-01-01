-- Add meta columns for import tracking
-- Run this in Supabase SQL Editor

-- Add import tracking columns to master_data
ALTER TABLE master_data ADD COLUMN IF NOT EXISTS import_batch TEXT;
ALTER TABLE master_data ADD COLUMN IF NOT EXISTS import_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE master_data ADD COLUMN IF NOT EXISTS import_month INTEGER;
ALTER TABLE master_data ADD COLUMN IF NOT EXISTS import_year INTEGER;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_master_data_import_batch ON master_data(import_batch);
CREATE INDEX IF NOT EXISTS idx_master_data_import_month_year ON master_data(import_month, import_year);

-- Update import_history table to have proper columns
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS import_month INTEGER;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS import_year INTEGER;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS import_mode TEXT DEFAULT 'append';

-- Make sure created_at exists in import_history
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
