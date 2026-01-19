-- =====================================================
-- FIX ITAY NACHUM ACCESS
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Verify itayn@selam.co.il exists and is admin
SELECT
    id,
    email,
    full_name,
    user_type,
    is_active,
    is_approved,
    auth_id
FROM users
WHERE email = 'itayn@selam.co.il';

-- Step 2: Ensure he is admin with proper flags
UPDATE users
SET
    user_type = 'admin',
    is_active = true,
    is_approved = true,
    updated_at = NOW()
WHERE email = 'itayn@selam.co.il';

-- Step 3: Link auth_id if missing
UPDATE users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
  AND u.email = 'itayn@selam.co.il'
  AND u.auth_id IS NULL;

-- Step 4: Verify auth link
SELECT
    u.email,
    u.user_type,
    u.auth_id,
    au.id as auth_users_id,
    CASE WHEN u.auth_id = au.id THEN '✓ Linked' ELSE '✗ Not Linked' END as auth_status
FROM users u
LEFT JOIN auth.users au ON LOWER(u.email) = LOWER(au.email)
WHERE u.email = 'itayn@selam.co.il';

-- Step 5: Show all projects
SELECT id, name, table_name, created_at FROM projects ORDER BY created_at DESC;

-- Step 6: Show user_project_access for itay
SELECT
    upa.project_id,
    p.name as project_name,
    upa.role,
    upa.created_at
FROM user_project_access upa
JOIN projects p ON upa.project_id = p.id
JOIN users u ON upa.user_id = u.auth_id OR upa.user_id::text = u.id::text
WHERE u.email = 'itayn@selam.co.il';

SELECT '✓ Done - refresh the page and try again' as status;
