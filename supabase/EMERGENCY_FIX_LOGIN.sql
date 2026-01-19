-- =====================================================
-- EMERGENCY FIX - LOGIN ERROR
-- =====================================================
-- העתק והדבק ב-Supabase SQL Editor
-- =====================================================

-- Step 1: השבת את ה-triggers הבעייתיים זמנית
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Step 2: תקן את הפונקציות עם טיפול בשגיאות
CREATE OR REPLACE FUNCTION handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
    -- בדיקה אם המשתמש כבר קיים
    IF EXISTS (SELECT 1 FROM public.users WHERE email = LOWER(NEW.email)) THEN
        -- עדכון auth_id אם חסר
        UPDATE public.users
        SET
            auth_id = NEW.id,
            updated_at = NOW()
        WHERE email = LOWER(NEW.email)
          AND (auth_id IS NULL OR auth_id = NEW.id);
    ELSE
        -- יצירת משתמש חדש - רק אם לא קיים
        BEGIN
            INSERT INTO public.users (id, auth_id, email, full_name, user_type, is_active, is_approved, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                NEW.id,
                LOWER(NEW.email),
                COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
                'pending',
                true,
                false,
                NOW(),
                NOW()
            );
        EXCEPTION WHEN unique_violation THEN
            -- אם יש כפילות, פשוט עדכן
            UPDATE public.users
            SET auth_id = NEW.id, updated_at = NOW()
            WHERE email = LOWER(NEW.email);
        END;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- לא לזרוק שגיאה - פשוט להמשיך
    RAISE WARNING 'handle_auth_user_created error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- עדכון פשוט ובטוח
    UPDATE public.users
    SET
        last_login_at = NEW.last_sign_in_at,
        updated_at = NOW()
    WHERE auth_id = NEW.id;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- לא לזרוק שגיאה - פשוט להמשיך
    RAISE WARNING 'handle_auth_user_updated error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: צור מחדש את ה-triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_created();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_auth_user_updated();

-- Step 4: וודא שהמשתמשים שלך קיימים ומקושרים
INSERT INTO public.users (email, full_name, user_type, is_active, is_approved, created_at, updated_at)
VALUES
    ('davide@selam.co.il', 'David Admin', 'admin', true, true, NOW(), NOW()),
    ('david@fliqwise.com', 'David Supervisor', 'supervisor', true, true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
    is_active = true,
    is_approved = true,
    user_type = EXCLUDED.user_type,
    updated_at = NOW();

-- Step 5: קשר auth_id
UPDATE public.users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
  AND (u.auth_id IS NULL OR u.auth_id != au.id);

-- Step 6: בדוק תוצאות
SELECT
    u.email,
    u.full_name,
    u.user_type,
    u.is_active,
    u.is_approved,
    CASE WHEN u.auth_id IS NOT NULL THEN '✓ Linked' ELSE '✗ Not Linked' END as auth_status
FROM public.users u
WHERE u.email IN ('davide@selam.co.il', 'david@fliqwise.com');

SELECT '✓ Done! Try logging in now.' as status;
