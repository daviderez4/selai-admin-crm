-- =====================================================
-- COMPLETE REGISTRATION FLOW
-- Fixes and additions for the new registration system
-- Run this AFTER all previous migrations
-- =====================================================

-- ============================================
-- STEP 1: Add missing status values to registration_requests
-- ============================================

-- First, drop the existing check constraint
ALTER TABLE registration_requests DROP CONSTRAINT IF EXISTS registration_requests_status_check;

-- Add new check constraint with additional statuses
ALTER TABLE registration_requests ADD CONSTRAINT registration_requests_status_check
CHECK (status IN ('email_pending', 'profile_pending', 'pending', 'needs_review', 'approved', 'rejected'));

-- ============================================
-- STEP 2: Ensure all required columns exist on registration_requests
-- ============================================

-- encrypted_password for storing password until approval
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS encrypted_password TEXT;

-- reviewer_notes for admin notes during review
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- rejection_reason for explaining rejection
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- created_user_id to link to created user after approval
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS created_user_id UUID REFERENCES users(id);

-- agent_id for client registrations (which agent owns this client)
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES users(id);

-- email_verified flag
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- email_verification_token for verification
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

-- email_verification_sent_at timestamp
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

-- email_verified_at timestamp
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ============================================
-- STEP 3: Add index for verification token
-- ============================================

CREATE INDEX IF NOT EXISTS idx_registration_requests_verification_token
ON registration_requests(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- ============================================
-- STEP 4: Fix CRM functions to use correct column names
-- ============================================

-- Drop old functions
DROP FUNCTION IF EXISTS crm_get_user_role();
DROP FUNCTION IF EXISTS crm_is_admin();
DROP FUNCTION IF EXISTS crm_is_supervisor();
DROP FUNCTION IF EXISTS crm_get_supervised_agents();

-- Get user role from users table (fix: use user_type instead of role)
CREATE OR REPLACE FUNCTION crm_get_user_role()
RETURNS TEXT AS $$
  SELECT user_type FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin (fix: use user_type and auth_id)
CREATE OR REPLACE FUNCTION crm_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid() AND user_type = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is supervisor or admin (fix: use user_type and auth_id)
CREATE OR REPLACE FUNCTION crm_is_supervisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid() AND user_type IN ('admin', 'supervisor')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is manager (new function)
CREATE OR REPLACE FUNCTION crm_is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid() AND user_type IN ('admin', 'manager')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get supervised agent IDs (fix: use supervisor_id from users table)
CREATE OR REPLACE FUNCTION crm_get_supervised_agents()
RETURNS UUID[] AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(id)
      FROM users
      WHERE supervisor_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    ),
    '{}'::UUID[]
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: Add user_messages table for internal messaging
-- ============================================

CREATE TABLE IF NOT EXISTS user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'message' CHECK (message_type IN ('message', 'system', 'notification', 'alert')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_messages_to_user ON user_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_from_user ON user_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_is_read ON user_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_user_messages_created ON user_messages(created_at DESC);

-- Enable RLS
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_messages
DROP POLICY IF EXISTS "user_messages_service_role" ON user_messages;
CREATE POLICY "user_messages_service_role" ON user_messages
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_messages_select_own" ON user_messages;
CREATE POLICY "user_messages_select_own" ON user_messages
FOR SELECT TO authenticated
USING (
    to_user_id = get_current_user_id()
    OR from_user_id = get_current_user_id()
    OR is_admin()
);

DROP POLICY IF EXISTS "user_messages_insert" ON user_messages;
CREATE POLICY "user_messages_insert" ON user_messages
FOR INSERT TO authenticated
WITH CHECK (from_user_id = get_current_user_id() OR is_admin_or_manager());

DROP POLICY IF EXISTS "user_messages_update" ON user_messages;
CREATE POLICY "user_messages_update" ON user_messages
FOR UPDATE TO authenticated
USING (to_user_id = get_current_user_id() OR is_admin());

-- Grants
GRANT ALL ON user_messages TO authenticated;
GRANT ALL ON user_messages TO service_role;

-- ============================================
-- STEP 6: Update crm_contacts RLS for hierarchy
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Agents own their contacts" ON crm_contacts;

-- Create new policy with proper hierarchy (using users table structure)
CREATE POLICY "Agents access their contacts" ON crm_contacts
FOR ALL USING (
    -- Agent owns the contact
    agent_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    -- Admin can see all
    OR is_admin()
    -- Manager can see contacts of their supervised agents
    OR (
        crm_is_manager()
        AND agent_id IN (
            SELECT u.id FROM users u
            WHERE u.manager_id = (SELECT id FROM users WHERE auth_id = auth.uid())
            OR u.supervisor_id IN (
                SELECT id FROM users
                WHERE manager_id = (SELECT id FROM users WHERE auth_id = auth.uid())
            )
        )
    )
    -- Supervisor can see contacts of their agents
    OR (
        crm_is_supervisor()
        AND agent_id IN (
            SELECT id FROM users
            WHERE supervisor_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    )
);

-- ============================================
-- STEP 7: Add external_agents table for SELA matching
-- ============================================

CREATE TABLE IF NOT EXISTS external_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identification
    external_id TEXT UNIQUE,
    id_number TEXT,
    license_number TEXT,

    -- Personal info
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,

    -- Company info
    company_name TEXT,
    branch TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    source TEXT DEFAULT 'sela', -- sela, manual, import
    raw_data JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_external_agents_id_number ON external_agents(id_number);
CREATE INDEX IF NOT EXISTS idx_external_agents_license ON external_agents(license_number);
CREATE INDEX IF NOT EXISTS idx_external_agents_email ON external_agents(email);
CREATE INDEX IF NOT EXISTS idx_external_agents_phone ON external_agents(phone);
CREATE INDEX IF NOT EXISTS idx_external_agents_name ON external_agents(full_name);

-- Enable RLS
ALTER TABLE external_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only admins can manage, authenticated can read for matching
DROP POLICY IF EXISTS "external_agents_select" ON external_agents;
CREATE POLICY "external_agents_select" ON external_agents
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "external_agents_admin" ON external_agents;
CREATE POLICY "external_agents_admin" ON external_agents
FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "external_agents_service_role" ON external_agents;
CREATE POLICY "external_agents_service_role" ON external_agents
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT ON external_agents TO authenticated;
GRANT ALL ON external_agents TO service_role;

-- ============================================
-- STEP 8: Update registration_requests anon policy
-- ============================================

-- Allow anon users to check their registration status by email
DROP POLICY IF EXISTS "registration_requests_select_anon" ON registration_requests;
CREATE POLICY "registration_requests_select_anon" ON registration_requests
FOR SELECT TO anon USING (true);

-- Allow anon to update (for email verification)
DROP POLICY IF EXISTS "registration_requests_update_anon" ON registration_requests;
CREATE POLICY "registration_requests_update_anon" ON registration_requests
FOR UPDATE TO anon USING (true);

-- ============================================
-- STEP 9: Grant execute on helper functions
-- ============================================

GRANT EXECUTE ON FUNCTION crm_get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION crm_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION crm_is_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION crm_is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION crm_get_supervised_agents() TO authenticated;

-- ============================================
-- STEP 10: Notify schema reload
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: Complete registration flow migration applied!' as result;
