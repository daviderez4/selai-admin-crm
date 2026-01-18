import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProjectClient, decrypt, normalizeSupabaseUrl } from '@/lib/utils/projectDatabase';
import { checkProjectAccess } from '@/lib/utils/projectAccess';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access - admins/managers get implicit access
    const accessResult = await checkProjectAccess(supabase, user.id, user.email, projectId);

    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key, table_name, is_configured, storage_mode')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if this is a LOCAL project (data stored in main Supabase)
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local';

    if (isLocalProject) {
      // For local projects, return the project's configured table
      // Data tables available in local mode
      const localTables = [
        { name: project.table_name || 'master_data', schema: 'public' },
        { name: 'master_data', schema: 'public' },
        { name: 'insurance_data', schema: 'public' },
        { name: 'processes_data', schema: 'public' },
        { name: 'commissions_data', schema: 'public' },
      ];

      // Remove duplicates
      const uniqueTables = localTables.filter((table, index, self) =>
        index === self.findIndex((t) => t.name === table.name)
      );

      return NextResponse.json({
        tables: uniqueTables,
        mode: 'local',
        message: 'פרויקט מקומי - נתונים מאוחסנים במערכת המרכזית'
      });
    }

    // EXTERNAL PROJECT - STRICT PROJECT ISOLATION
    const clientResult = createProjectClient({
      supabase_url: project.supabase_url,
      supabase_service_key: project.supabase_service_key,
      table_name: project.table_name || 'master_data',
      is_configured: project.is_configured,
    });

    if (!clientResult.success) {
      return NextResponse.json({
        error: 'מסד הנתונים של הפרויקט לא מוגדר',
        details: clientResult.error,
        errorCode: clientResult.errorCode,
        action: 'configure_project',
      }, { status: 400 });
    }

    const projectClient = clientResult.client!;
    const serviceKey = decrypt(project.supabase_service_key);
    const normalizedUrl = normalizeSupabaseUrl(project.supabase_url || '');

    // Try to get tables using RPC function (if exists)
    const { data: rpcData, error: rpcError } = await projectClient.rpc('get_public_tables');

    if (!rpcError && rpcData) {
      return NextResponse.json({ tables: rpcData });
    }

    // Fallback 1: Try OpenAPI schema endpoint (PostgREST exposes this)
    const openApiUrl = `${project.supabase_url}/rest/v1/`;

    try {
      const response = await fetch(openApiUrl, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Accept': 'application/openapi+json, application/json',
        }
      });

      if (response.ok) {
        const schema = await response.json();

        // Try multiple paths where table definitions might be
        let tableNames: string[] = [];

        // Option 1: definitions object (OpenAPI 2.0 / Swagger)
        if (schema.definitions) {
          tableNames = Object.keys(schema.definitions)
            .filter(name => !name.startsWith('_'));
        }
        // Option 2: components.schemas (OpenAPI 3.0)
        else if (schema.components?.schemas) {
          tableNames = Object.keys(schema.components.schemas)
            .filter(name => !name.startsWith('_'));
        }
        // Option 3: paths object - extract table names from endpoints
        else if (schema.paths) {
          tableNames = Object.keys(schema.paths)
            .filter(path => path.startsWith('/') && !path.includes('{'))
            .map(path => path.replace('/', ''))
            .filter(name => name && !name.startsWith('_') && !name.startsWith('rpc/'));
        }

        if (tableNames.length > 0) {
          const tables = tableNames.map(name => ({
            name,
            schema: 'public',
            columns: [],
          }));
          return NextResponse.json({ tables });
        }
      }
    } catch (e) {
      console.log('OpenAPI approach failed:', e);
    }

    // Fallback 2: Try fetching table list from a known table (attempt to query)
    // This is a hack but works when OpenAPI is not exposed
    const commonTables = ['users', 'clients', 'orders', 'products', 'policies', 'insurances', 'contacts'];
    const discoveredTables: { name: string; schema: string; columns: string[] }[] = [];

    for (const tableName of commonTables) {
      try {
        const { data, error } = await projectClient
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error && data) {
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          discoveredTables.push({
            name: tableName,
            schema: 'public',
            columns,
          });
        }
      } catch {
        // Table doesn't exist, skip
      }
    }

    if (discoveredTables.length > 0) {
      return NextResponse.json({
        tables: discoveredTables,
        message: 'Auto-discovered common tables. For complete list, run the SQL function below.',
      });
    }

    // Final fallback: Return empty with instruction to create RPC function
    return NextResponse.json({
      tables: [],
      message: 'Could not auto-discover tables. Create this function in your Supabase SQL Editor:',
      sql: `CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(name text, schema text) AS $$
  SELECT table_name::text as name, table_schema::text as schema
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  ORDER BY table_name;
$$ LANGUAGE sql SECURITY DEFINER;`
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
