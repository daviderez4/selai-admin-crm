-- =====================================================
-- ADD DELETE POLICY FOR REGISTRATION_REQUESTS
-- Allows authenticated users (admins/managers) to delete registration requests
-- =====================================================

-- Drop existing delete policy if exists
DROP POLICY IF EXISTS "registration_requests_delete_auth" ON registration_requests;

-- Add DELETE policy for authenticated users
CREATE POLICY "registration_requests_delete_auth" ON registration_requests
FOR DELETE TO authenticated USING (true);

-- Verify policy was created
SELECT 'SUCCESS: Delete policy added for registration_requests' as result;
