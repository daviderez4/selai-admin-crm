-- =====================================================
-- ADD ENCRYPTED PASSWORD TO REGISTRATION REQUESTS
-- For storing password until admin approval
-- =====================================================

-- Add encrypted_password column to registration_requests
ALTER TABLE registration_requests
ADD COLUMN IF NOT EXISTS encrypted_password TEXT;

-- Add reviewer_notes column if missing
ALTER TABLE registration_requests
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

-- Add rejection_reason column if missing
ALTER TABLE registration_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add created_user_id column if missing
ALTER TABLE registration_requests
ADD COLUMN IF NOT EXISTS created_user_id UUID REFERENCES users(id);

-- Add agent_id column if missing (for client registrations)
ALTER TABLE registration_requests
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES users(id);

SELECT 'SUCCESS: Added encrypted_password and other columns!' as result;
