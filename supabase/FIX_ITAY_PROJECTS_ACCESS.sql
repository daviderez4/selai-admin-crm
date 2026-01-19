-- =====================================================
-- FIX ITAY NACHUM PROJECTS ACCESS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Check Itay's current status
SELECT
    'USER STATUS' as check_type,
    id,
    email,
    full_name,
    user_type,
    auth_id,
    is_active,
    is_approved
FROM users
WHERE email ILIKE '%itay%'
   OR full_name ILIKE '%איתי%'
   OR full_name ILIKE '%itay%';

-- Step 2: Check all users with their types
SELECT
    'ALL USERS' as check_type,
    id,
    email,
    full_name,
    user_type,
    auth_id IS NOT NULL as has_auth_id,
    is_active,
    is_approved
FROM users
ORDER BY
    CASE user_type
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'supervisor' THEN 3
        WHEN 'agent' THEN 4
        ELSE 5
    END;

-- Step 3: Check projects
SELECT
    'PROJECTS' as check_type,
    id,
    name,
    created_at
FROM projects;

-- Step 4: Check current project access
SELECT
    'PROJECT ACCESS' as check_type,
    upa.user_id,
    u.email,
    u.full_name,
    upa.project_id,
    p.name as project_name,
    upa.access_level
FROM user_project_access upa
LEFT JOIN auth.users au ON upa.user_id = au.id
LEFT JOIN users u ON u.auth_id = au.id
LEFT JOIN projects p ON upa.project_id = p.id;

-- Step 5: Make sure Itay is admin
UPDATE users
SET
    user_type = 'admin',
    is_active = true,
    is_approved = true
WHERE email ILIKE '%itay%'
   OR full_name ILIKE '%איתי%'
   OR full_name ILIKE '%itay%';

-- Step 6: Grant Itay access to all projects
INSERT INTO user_project_access (user_id, project_id, access_level)
SELECT u.auth_id, p.id, 'admin'
FROM users u
CROSS JOIN projects p
WHERE (u.email ILIKE '%itay%' OR u.full_name ILIKE '%איתי%' OR u.full_name ILIKE '%itay%')
AND u.auth_id IS NOT NULL
ON CONFLICT (user_id, project_id) DO UPDATE SET access_level = 'admin';

-- Step 7: Also grant all admins access to all projects
INSERT INTO user_project_access (user_id, project_id, access_level)
SELECT u.auth_id, p.id, 'admin'
FROM users u
CROSS JOIN projects p
WHERE u.user_type = 'admin'
AND u.is_active = true
AND u.auth_id IS NOT NULL
ON CONFLICT (user_id, project_id) DO UPDATE SET access_level = 'admin';

-- Step 8: Verify the fix
SELECT
    'AFTER FIX - USER STATUS' as check_type,
    id,
    email,
    full_name,
    user_type,
    auth_id,
    is_active,
    is_approved
FROM users
WHERE email ILIKE '%itay%'
   OR full_name ILIKE '%איתי%'
   OR full_name ILIKE '%itay%';

SELECT
    'AFTER FIX - PROJECT ACCESS' as check_type,
    upa.user_id,
    u.email,
    u.full_name,
    COUNT(upa.project_id) as num_projects
FROM user_project_access upa
LEFT JOIN auth.users au ON upa.user_id = au.id
LEFT JOIN users u ON u.auth_id = au.id
GROUP BY upa.user_id, u.email, u.full_name;

SELECT 'DONE! Refresh the page and try accessing projects.' as result;
