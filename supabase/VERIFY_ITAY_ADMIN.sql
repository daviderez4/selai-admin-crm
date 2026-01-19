-- =====================================================
-- VERIFY ITAY NACHUM ADMIN STATUS
-- =====================================================
-- Run this in Supabase SQL Editor to verify and fix
-- =====================================================

-- Step 1: Check current status of itayn@selam.co.il
SELECT
    'CURRENT STATUS' as check_type,
    id,
    email,
    full_name,
    user_type,
    is_active,
    is_approved,
    auth_id,
    supervisor_id,
    manager_id,
    created_at
FROM users
WHERE email = 'itayn@selam.co.il';

-- Step 2: Check if there are duplicates
SELECT
    'DUPLICATE CHECK' as check_type,
    email,
    COUNT(*) as count
FROM users
WHERE email = 'itayn@selam.co.il'
GROUP BY email;

-- Step 3: Check auth.users link
SELECT
    'AUTH LINK CHECK' as check_type,
    u.email as users_email,
    u.auth_id as users_auth_id,
    au.id as auth_users_id,
    au.email as auth_email,
    CASE WHEN u.auth_id = au.id THEN '✓ Linked' ELSE '✗ Not Linked' END as status
FROM users u
LEFT JOIN auth.users au ON LOWER(u.email) = LOWER(au.email)
WHERE u.email = 'itayn@selam.co.il';

-- Step 4: Ensure itayn@selam.co.il is properly set as admin
UPDATE users
SET
    user_type = 'admin',
    is_active = true,
    is_approved = true,
    updated_at = NOW()
WHERE email = 'itayn@selam.co.il';

-- Step 5: Link to auth.users if not linked
UPDATE users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
  AND u.email = 'itayn@selam.co.il'
  AND u.auth_id IS NULL;

-- Step 6: Verify final status
SELECT
    'FINAL STATUS' as check_type,
    id,
    email,
    full_name,
    user_type,
    is_active,
    is_approved,
    auth_id,
    CASE
        WHEN user_type = 'admin' AND is_active = true AND is_approved = true AND auth_id IS NOT NULL
        THEN '✓ All OK - Full Admin Access'
        WHEN user_type = 'admin' AND is_active = true AND is_approved = true
        THEN '⚠️ Admin but auth_id missing - check auth.users'
        ELSE '✗ Issue - check user_type/is_active/is_approved'
    END as status
FROM users
WHERE email = 'itayn@selam.co.il';

-- Step 7: Show hierarchy - who reports to whom
SELECT
    'HIERARCHY VIEW' as check_type,
    u.full_name,
    u.email,
    u.user_type,
    CASE u.user_type
        WHEN 'admin' THEN '👑 Admin - sees everything'
        WHEN 'manager' THEN '👔 Manager - sees supervisors & agents'
        WHEN 'supervisor' THEN '👷 Supervisor - sees agents'
        WHEN 'agent' THEN '🧑 Agent - sees own data'
        WHEN 'client' THEN '👤 Client - limited view'
        ELSE '❓ Unknown'
    END as access_level,
    s.full_name as reports_to
FROM users u
LEFT JOIN users s ON u.supervisor_id = s.id OR u.manager_id = s.id
ORDER BY
    CASE u.user_type
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'supervisor' THEN 3
        WHEN 'agent' THEN 4
        WHEN 'client' THEN 5
        ELSE 6
    END;

SELECT '✓ Verification complete' as status;
