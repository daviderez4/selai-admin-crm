-- =====================================================
-- ADD HANDLER_NAME TO USERS TABLE
-- =====================================================
-- This field links users to their financial data in Excel imports
-- The handler_name must match the "מטפל" column in imported Excel files
-- =====================================================

-- Add handler_name column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'handler_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN handler_name TEXT;
        COMMENT ON COLUMN public.users.handler_name IS 'שם מטפל - מקשר את המשתמש לנתונים פיננסיים מאקסל. חייב להתאים בדיוק לערך בעמודת מטפל בקבצי האקסל';
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_handler_name ON public.users(handler_name) WHERE handler_name IS NOT NULL;

-- Function to get user's team financial data based on handler_name
CREATE OR REPLACE FUNCTION get_user_handler_names(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
    user_role TEXT;
    result TEXT[];
BEGIN
    -- Get user's role
    SELECT user_type INTO user_role FROM users WHERE id = user_uuid;

    IF user_role = 'admin' THEN
        -- Admin sees all handler names
        SELECT ARRAY_AGG(DISTINCT handler_name) INTO result
        FROM users WHERE handler_name IS NOT NULL;
    ELSIF user_role = 'manager' THEN
        -- Manager sees their supervisors' and agents' handler names
        SELECT ARRAY_AGG(DISTINCT handler_name) INTO result
        FROM users
        WHERE handler_name IS NOT NULL
          AND (
            manager_id = user_uuid  -- Direct supervisors
            OR supervisor_id IN (SELECT id FROM users WHERE manager_id = user_uuid)  -- Agents under supervisors
          );
    ELSIF user_role = 'supervisor' THEN
        -- Supervisor sees their own and their agents' handler names
        SELECT ARRAY_AGG(DISTINCT handler_name) INTO result
        FROM users
        WHERE handler_name IS NOT NULL
          AND (id = user_uuid OR supervisor_id = user_uuid);
    ELSE
        -- Agent sees only their own handler name
        SELECT ARRAY[handler_name] INTO result
        FROM users WHERE id = user_uuid AND handler_name IS NOT NULL;
    END IF;

    RETURN COALESCE(result, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_handler_names(UUID) TO authenticated;

SELECT 'handler_name column added to users table' as status;
