-- =====================================================
-- FIX HIERARCHY ASSIGNMENTS
-- =====================================================
-- הריצו את הסקריפט הזה אחרי COMPLETE_HIERARCHY_SETUP.sql
-- כדי לשייך סוכנים למפקחים
-- =====================================================

-- Step 1: Set david@fliqwise.com as supervisor
UPDATE users
SET
    user_type = 'supervisor',
    is_approved = true,
    is_active = true,
    updated_at = NOW()
WHERE email = 'david@fliqwise.com';

-- Step 2: Show all users with their current assignments
SELECT
    id,
    email,
    full_name,
    user_type,
    supervisor_id,
    is_active,
    is_approved
FROM users
ORDER BY
    CASE user_type
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'supervisor' THEN 3
        WHEN 'agent' THEN 4
        WHEN 'client' THEN 5
        ELSE 6
    END,
    full_name;

-- Step 3: Get the supervisor ID
-- Copy this ID and use it in the next query
SELECT id, email, full_name
FROM users
WHERE user_type = 'supervisor';

-- =====================================================
-- MANUAL ASSIGNMENT EXAMPLE
-- =====================================================
-- After getting the supervisor ID, assign agents:
--
-- UPDATE users
-- SET supervisor_id = 'SUPERVISOR-UUID-HERE'
-- WHERE email IN ('agent1@example.com', 'agent2@example.com')
--   AND user_type = 'agent';
-- =====================================================

-- Step 4: Verify assignments
SELECT
    u.full_name as agent_name,
    u.email as agent_email,
    u.user_type,
    s.full_name as supervisor_name,
    s.email as supervisor_email
FROM users u
LEFT JOIN users s ON u.supervisor_id = s.id
WHERE u.user_type IN ('agent', 'supervisor')
ORDER BY u.user_type, u.full_name;

SELECT 'Script completed. Check results above.' as status;
