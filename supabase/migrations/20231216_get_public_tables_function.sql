-- Function to get all public tables
-- Used by the admin dashboard to list available tables in project databases

CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(name text, schema text) AS $$
  SELECT table_name::text as name, table_schema::text as schema
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  ORDER BY table_name;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_tables() TO service_role;
