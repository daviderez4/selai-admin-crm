-- =====================================================
-- SELAI ADMIN HUB - SETUP ADMIN USER
-- =====================================================
--
-- Run this AFTER the CLEAN_START_SCRIPT.sql
-- This sets up your admin account
--
-- CHANGE THE EMAIL BELOW TO YOUR EMAIL!
-- =====================================================

-- Set your email here:
DO $$
DECLARE
    admin_email TEXT := 'david@fliqwise.com';  -- <-- CHANGE THIS TO YOUR EMAIL
    admin_auth_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get auth_id from auth.users
    SELECT id INTO admin_auth_id
    FROM auth.users
    WHERE email = admin_email;

    IF admin_auth_id IS NULL THEN
        RAISE NOTICE 'Auth user not found for email %. Please sign up first!', admin_email;
        RETURN;
    END IF;

    -- Check if user exists in users table
    SELECT id INTO admin_user_id
    FROM users
    WHERE email = admin_email;

    IF admin_user_id IS NOT NULL THEN
        -- Update existing user to admin
        UPDATE users
        SET
            auth_id = admin_auth_id,
            user_type = 'admin',
            is_active = true,
            is_approved = true,
            is_email_verified = true,
            updated_at = NOW()
        WHERE id = admin_user_id;

        RAISE NOTICE 'Updated user % to admin', admin_email;
    ELSE
        -- Create new admin user
        INSERT INTO users (
            auth_id,
            email,
            full_name,
            user_type,
            is_active,
            is_approved,
            is_email_verified,
            created_at,
            updated_at
        ) VALUES (
            admin_auth_id,
            admin_email,
            'David (Admin)',
            'admin',
            true,
            true,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO admin_user_id;

        RAISE NOTICE 'Created new admin user % with id %', admin_email, admin_user_id;
    END IF;
END $$;

-- Verify the setup
SELECT
    id,
    email,
    full_name,
    user_type,
    is_active,
    is_approved,
    auth_id IS NOT NULL as has_auth_link
FROM users
WHERE user_type = 'admin';

-- =====================================================
-- OPTIONAL: CREATE TEST SUPERVISOR
-- =====================================================

-- Uncomment and modify to create a test supervisor:
/*
INSERT INTO users (email, full_name, user_type, is_active, is_approved)
VALUES ('supervisor@test.com', 'Test Supervisor', 'supervisor', true, true)
ON CONFLICT (email) DO UPDATE SET
    user_type = 'supervisor',
    is_active = true,
    is_approved = true;
*/

-- =====================================================
-- OPTIONAL: CREATE TEST AGENT UNDER SUPERVISOR
-- =====================================================

-- Uncomment and modify to create a test agent:
/*
DO $$
DECLARE
    sup_id UUID;
BEGIN
    SELECT id INTO sup_id FROM users WHERE email = 'supervisor@test.com';

    INSERT INTO users (email, full_name, user_type, supervisor_id, is_active, is_approved)
    VALUES ('agent@test.com', 'Test Agent', 'agent', sup_id, true, true)
    ON CONFLICT (email) DO UPDATE SET
        user_type = 'agent',
        supervisor_id = sup_id,
        is_active = true,
        is_approved = true;
END $$;
*/

SELECT '=== ADMIN SETUP COMPLETE ===' as status;
