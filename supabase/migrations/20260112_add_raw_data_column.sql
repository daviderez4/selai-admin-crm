-- =============================================================================
-- Migration: Add raw_data column to custom_data, nifraim, and gemel tables
-- Date: 2026-01-12
-- Description: The import API expects a raw_data JSONB column to store Excel data
-- =============================================================================

-- Add raw_data column to custom_data
ALTER TABLE IF EXISTS custom_data ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Add raw_data column to nifraim (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nifraim') THEN
        ALTER TABLE nifraim ADD COLUMN IF NOT EXISTS raw_data JSONB;
    END IF;
END $$;

-- Add raw_data column to gemel (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gemel') THEN
        ALTER TABLE gemel ADD COLUMN IF NOT EXISTS raw_data JSONB;
    END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('custom_data', 'nifraim', 'gemel')
AND column_name = 'raw_data';
