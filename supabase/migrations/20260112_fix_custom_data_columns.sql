-- =============================================================================
-- Fix custom_data table - add missing import columns
-- Run this SQL in Supabase SQL Editor
-- =============================================================================

-- Add missing import tracking columns
ALTER TABLE custom_data ADD COLUMN IF NOT EXISTS raw_data JSONB;
ALTER TABLE custom_data ADD COLUMN IF NOT EXISTS import_batch TEXT;
ALTER TABLE custom_data ADD COLUMN IF NOT EXISTS import_date TIMESTAMPTZ;
ALTER TABLE custom_data ADD COLUMN IF NOT EXISTS import_month INTEGER;
ALTER TABLE custom_data ADD COLUMN IF NOT EXISTS import_year INTEGER;

-- Copy data from 'data' to 'raw_data' if raw_data is null
UPDATE custom_data SET raw_data = data WHERE raw_data IS NULL AND data IS NOT NULL;

-- Create index for import tracking
CREATE INDEX IF NOT EXISTS idx_custom_data_import_batch ON custom_data(import_batch);
CREATE INDEX IF NOT EXISTS idx_custom_data_import_month_year ON custom_data(import_year, import_month);
CREATE INDEX IF NOT EXISTS idx_custom_data_raw_data_gin ON custom_data USING GIN (raw_data);

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'custom_data table columns added successfully!' as status;
