-- =====================================================
-- REGISTRATION REQUESTS TABLE
-- For pre-user registration flow
-- =====================================================

-- Step 1: Drop existing table if exists
DROP TABLE IF EXISTS registration_requests CASCADE;

-- Step 2: Create the trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create registration_requests table
CREATE TABLE registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,

    -- ID fields (for agent matching)
    id_number TEXT,
    national_id TEXT,
    license_number TEXT,

    -- Role and hierarchy
    requested_role TEXT DEFAULT 'agent' CHECK (requested_role IN ('agent', 'supervisor', 'manager', 'admin', 'client')),
    supervisor_id UUID,
    requested_supervisor_id UUID,
    requested_manager_id UUID,

    -- Company info
    company_name TEXT,
    notes TEXT,

    -- External agent matching
    matched_external_id UUID,
    match_score INTEGER DEFAULT 0,
    match_details JSONB DEFAULT '{}',

    -- Sela matching
    sela_match_found BOOLEAN DEFAULT FALSE,
    sela_match_id UUID,
    sela_match_data JSONB,
    match_confidence INTEGER DEFAULT 0,
    match_method TEXT,

    -- Status and review
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'needs_review', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX idx_registration_requests_email ON registration_requests(email);
CREATE INDEX idx_registration_requests_status ON registration_requests(status);
CREATE INDEX idx_registration_requests_id_number ON registration_requests(id_number);
CREATE INDEX idx_registration_requests_created ON registration_requests(created_at DESC);

-- Step 5: Enable RLS
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies

-- Service role can do anything
CREATE POLICY "registration_requests_service_role" ON registration_requests
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anyone can insert (for registration)
CREATE POLICY "registration_requests_insert_anon" ON registration_requests
FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users can insert
CREATE POLICY "registration_requests_insert_auth" ON registration_requests
FOR INSERT TO authenticated WITH CHECK (true);

-- Authenticated users can view all (open policy for admin access)
CREATE POLICY "registration_requests_select_auth" ON registration_requests
FOR SELECT TO authenticated USING (true);

-- Authenticated users can update
CREATE POLICY "registration_requests_update_auth" ON registration_requests
FOR UPDATE TO authenticated USING (true);

-- Step 7: Trigger for updated_at
CREATE TRIGGER registration_requests_updated_at
    BEFORE UPDATE ON registration_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Grants
GRANT SELECT, INSERT ON registration_requests TO anon;
GRANT ALL ON registration_requests TO authenticated;
GRANT ALL ON registration_requests TO service_role;

-- Step 9: Refresh schema
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: Registration requests table created!' as result;
