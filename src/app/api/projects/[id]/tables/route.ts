import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

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

    // Check access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Decrypt the service key and connect to the project's Supabase
    const serviceKey = decrypt(project.supabase_service_key);
    const projectClient = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

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
