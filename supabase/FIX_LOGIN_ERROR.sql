-- =====================================================
-- FIX LOGIN ERROR - "Database error granting user"
-- =====================================================
-- הריצו את הסקריפט הזה ב-Supabase SQL Editor
-- =====================================================

-- Step 1: בדיקת ה-trigger הבעייתי
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
   OR trigger_schema = 'auth';

-- Step 2: וודא שהמשתמשים קיימים בטבלת users
INSERT INTO public.users (email, full_name, user_type, is_active, is_approved, created_at, updated_at)
VALUES
    ('davide@selam.co.il', 'David E', 'admin', true, true, NOW(), NOW()),
    ('david@fliqwise.com', 'דוד ארז', 'supervisor', true, true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    is_active = true,
    is_approved = true,
    updated_at = NOW();

-- Step 3: קשר את auth_id
UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
  AND u.auth_id IS NULL;

-- Step 4: בדיקה האם יש trigger בעייתי על auth.users
-- אם כן, נשבית אותו זמנית
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    -- בדוק triggers על auth.users
    FOR trigger_rec IN
        SELECT tgname, tgrelid::regclass as table_name
        FROM pg_trigger
        WHERE tgrelid = 'auth.users'::regclass
          AND tgname LIKE '%user%'
          AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger: % on %', trigger_rec.tgname, trigger_rec.table_name;
    END LOOP;
END $$;

-- Step 5: בדוק אם יש function בעייתית
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%auth_user%'
   OR p.proname LIKE '%handle_new_user%'
   OR p.proname LIKE '%grant%user%';

-- Step 6: וודא שאין כפילויות
SELECT email, COUNT(*)
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Step 7: הצג את המשתמשים
SELECT
    u.id,
    u.email,
    u.full_name,
    u.user_type,
    u.is_active,
    u.is_approved,
    u.auth_id,
    CASE WHEN au.id IS NOT NULL THEN 'Linked' ELSE 'NOT Linked' END as auth_status
FROM public.users u
LEFT JOIN auth.users au ON u.auth_id = au.id
WHERE u.email IN ('davide@selam.co.il', 'david@fliqwise.com')
ORDER BY u.email;

SELECT 'Done! Try logging in again.' as status;
