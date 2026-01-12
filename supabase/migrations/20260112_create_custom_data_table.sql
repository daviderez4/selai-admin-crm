-- =============================================================================
-- Migration: Create custom_data table for generic Excel imports
-- Date: 2026-01-12
-- Description: Creates a flexible table structure for storing imported Excel data
--              from projects that use 'custom_data' as their table_name
-- =============================================================================

-- Drop table if exists (for clean re-creation)
DROP TABLE IF EXISTS custom_data CASCADE;

-- Create custom_data table with flexible JSONB structure
CREATE TABLE custom_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core identification
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

    -- Agent/User association
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_name TEXT,

    -- Source tracking
    source_file TEXT,
    sheet_name TEXT,
    row_number INTEGER,

    -- Flexible data storage - stores all Excel columns as JSON
    data JSONB NOT NULL DEFAULT '{}',

    -- Common extracted fields (for faster querying)
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    id_number TEXT,
    phone TEXT,
    email TEXT,

    -- Financial fields
    balance DECIMAL(15,2),
    premium DECIMAL(15,2),
    commission DECIMAL(15,2),

    -- Status and dates
    status TEXT,
    start_date DATE,
    end_date DATE,

    -- Insurance/Policy fields
    policy_number TEXT,
    insurance_company TEXT,
    product_type TEXT,

    -- Metadata
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Data quality
    validation_status TEXT DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]',

    -- Search optimization
    search_vector tsvector
);

-- Create indexes for common queries
CREATE INDEX idx_custom_data_project_id ON custom_data(project_id);
CREATE INDEX idx_custom_data_agent_id ON custom_data(agent_id);
CREATE INDEX idx_custom_data_id_number ON custom_data(id_number);
CREATE INDEX idx_custom_data_phone ON custom_data(phone);
CREATE INDEX idx_custom_data_email ON custom_data(email);
CREATE INDEX idx_custom_data_full_name ON custom_data(full_name);
CREATE INDEX idx_custom_data_status ON custom_data(status);
CREATE INDEX idx_custom_data_imported_at ON custom_data(imported_at DESC);
CREATE INDEX idx_custom_data_data_gin ON custom_data USING GIN (data);
CREATE INDEX idx_custom_data_search ON custom_data USING GIN (search_vector);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_data_updated_at
    BEFORE UPDATE ON custom_data
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_data_updated_at();

-- Create search vector update trigger
CREATE OR REPLACE FUNCTION update_custom_data_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('simple',
        COALESCE(NEW.full_name, '') || ' ' ||
        COALESCE(NEW.first_name, '') || ' ' ||
        COALESCE(NEW.last_name, '') || ' ' ||
        COALESCE(NEW.phone, '') || ' ' ||
        COALESCE(NEW.email, '') || ' ' ||
        COALESCE(NEW.id_number, '') || ' ' ||
        COALESCE(NEW.policy_number, '') || ' ' ||
        COALESCE(NEW.agent_name, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_data_search_vector
    BEFORE INSERT OR UPDATE ON custom_data
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_data_search_vector();

-- Enable Row Level Security
ALTER TABLE custom_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can see all data
CREATE POLICY "Admins can view all custom_data"
    ON custom_data FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can insert all data
CREATE POLICY "Admins can insert custom_data"
    ON custom_data FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can update all data
CREATE POLICY "Admins can update custom_data"
    ON custom_data FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admins can delete all data
CREATE POLICY "Admins can delete custom_data"
    ON custom_data FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Supervisors can see their agents' data
CREATE POLICY "Supervisors can view their agents custom_data"
    ON custom_data FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'supervisor'
            AND (
                custom_data.agent_id = u.id
                OR custom_data.agent_id IN (
                    SELECT id FROM users WHERE supervisor_id = u.id
                )
            )
        )
    );

-- Agents can see their own data
CREATE POLICY "Agents can view their own custom_data"
    ON custom_data FOR SELECT
    TO authenticated
    USING (
        agent_id = auth.uid()
    );

-- Service role can do anything (for API imports)
CREATE POLICY "Service role has full access to custom_data"
    ON custom_data FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON custom_data TO authenticated;
GRANT ALL ON custom_data TO service_role;

-- Add comment
COMMENT ON TABLE custom_data IS 'Flexible storage for generic Excel imports with JSONB data field';
COMMENT ON COLUMN custom_data.data IS 'JSONB field containing all original Excel columns';
