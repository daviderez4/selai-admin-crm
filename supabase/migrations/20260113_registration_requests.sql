-- =====================================================
-- REGISTRATION REQUESTS TABLE
-- For pre-user registration flow
-- =====================================================

-- 1. Create registration_requests table
CREATE TABLE IF NOT EXISTS registration_requests (
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
    supervisor_id UUID REFERENCES users(id),
    requested_supervisor_id UUID REFERENCES users(id),
    requested_manager_id UUID REFERENCES users(id),

    -- Company info
    company_name TEXT,
    notes TEXT,

    -- External agent matching (from auth/register-request)
    matched_external_id UUID,
    match_score INTEGER DEFAULT 0,
    match_details JSONB DEFAULT '{}',

    -- Sela matching (from /api/registration)
    sela_match_found BOOLEAN DEFAULT FALSE,
    sela_match_id UUID,
    sela_match_data JSONB,
    match_confidence INTEGER DEFAULT 0,
    match_method TEXT,

    -- Status and review
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'needs_review', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_id_number ON registration_requests(id_number);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created ON registration_requests(created_at DESC);

-- 3. Enable RLS
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Service role can do anything
DROP POLICY IF EXISTS "registration_requests_service_role" ON registration_requests;
CREATE POLICY "registration_requests_service_role" ON registration_requests
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anyone can insert a registration request (anonymous)
DROP POLICY IF EXISTS "registration_requests_insert_anon" ON registration_requests;
CREATE POLICY "registration_requests_insert_anon" ON registration_requests
FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users can insert too
DROP POLICY IF EXISTS "registration_requests_insert_auth" ON registration_requests;
CREATE POLICY "registration_requests_insert_auth" ON registration_requests
FOR INSERT TO authenticated WITH CHECK (true);

-- Admins can view all registration requests
DROP POLICY IF EXISTS "registration_requests_select_admin" ON registration_requests;
CREATE POLICY "registration_requests_select_admin" ON registration_requests
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_type = 'admin')
);

-- Admins can update registration requests
DROP POLICY IF EXISTS "registration_requests_update_admin" ON registration_requests;
CREATE POLICY "registration_requests_update_admin" ON registration_requests
FOR UPDATE TO authenticated
USING (
    EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_type = 'admin')
);

-- Managers can view registration requests
DROP POLICY IF EXISTS "registration_requests_select_manager" ON registration_requests;
CREATE POLICY "registration_requests_select_manager" ON registration_requests
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.user_type = 'manager')
);

-- Supervisors can view registration requests assigned to them
DROP POLICY IF EXISTS "registration_requests_select_supervisor" ON registration_requests;
CREATE POLICY "registration_requests_select_supervisor" ON registration_requests
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND u.user_type = 'supervisor'
        AND (
            registration_requests.requested_supervisor_id = u.id
            OR registration_requests.supervisor_id = u.id
        )
    )
);

-- Users can view their own request by email (after auth)
DROP POLICY IF EXISTS "registration_requests_select_own" ON registration_requests;
CREATE POLICY "registration_requests_select_own" ON registration_requests
FOR SELECT TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 5. Trigger for updated_at
DROP TRIGGER IF EXISTS registration_requests_updated_at ON registration_requests;
CREATE TRIGGER registration_requests_updated_at
    BEFORE UPDATE ON registration_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Grants
GRANT SELECT, INSERT ON registration_requests TO anon;
GRANT ALL ON registration_requests TO authenticated;
GRANT ALL ON registration_requests TO service_role;

-- 7. Refresh schema
SELECT pg_notify('pgrst', 'reload schema');

SELECT 'SUCCESS: Registration requests table created!' as result;
