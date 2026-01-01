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

interface ColumnDefinition {
  name: string;
  type: 'text' | 'integer' | 'numeric' | 'boolean' | 'timestamp' | 'jsonb';
}

function sanitizeIdentifier(name: string): string {
  // Remove any characters that aren't alphanumeric or underscores (ASCII only for PostgreSQL)
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')  // ASCII only - no Hebrew
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_')
    .slice(0, 63);  // PostgreSQL identifier limit
}

// Convert dashboard URL to API URL
// https://supabase.com/dashboard/project/xxxxx -> https://xxxxx.supabase.co
function normalizeSupabaseUrl(url: string): string {
  if (!url) return url;

  // Check if it's a dashboard URL
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboardMatch) {
    const projectRef = dashboardMatch[1];
    return `https://${projectRef}.supabase.co`;
  }

  // Already correct format
  return url;
}

export async function POST(
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

    // Check access - require admin or editor role
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || !['admin', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project?.supabase_url || !project?.supabase_service_key) {
      return NextResponse.json({ error: 'Project database not configured' }, { status: 400 });
    }

    // Parse request body
    const { tableName, columns } = await request.json() as {
      tableName: string;
      columns: ColumnDefinition[];
    };

    if (!tableName || !columns || columns.length === 0) {
      return NextResponse.json(
        { error: 'Table name and columns are required' },
        { status: 400 }
      );
    }

    // Sanitize table name
    const sanitizedTableName = sanitizeIdentifier(tableName);
    if (!sanitizedTableName) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      );
    }

    // Build CREATE TABLE SQL
    const columnDefs = columns.map(col => {
      const colName = sanitizeIdentifier(col.name);
      if (!colName) return null;

      let pgType: string;
      switch (col.type) {
        case 'integer':
          pgType = 'INTEGER';
          break;
        case 'numeric':
          pgType = 'NUMERIC';
          break;
        case 'boolean':
          pgType = 'BOOLEAN';
          break;
        case 'timestamp':
          pgType = 'TIMESTAMPTZ';
          break;
        case 'jsonb':
          pgType = 'JSONB';
          break;
        default:
          pgType = 'TEXT';
      }

      return `"${colName}" ${pgType}`;
    }).filter(Boolean);

    if (columnDefs.length === 0) {
      return NextResponse.json(
        { error: 'No valid columns provided' },
        { status: 400 }
      );
    }

    // Add auto-increment ID and timestamps
    const sql = `
      CREATE TABLE IF NOT EXISTS "${sanitizedTableName}" (
        id BIGSERIAL PRIMARY KEY,
        ${columnDefs.join(',\n        ')},
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE "${sanitizedTableName}" ENABLE ROW LEVEL SECURITY;

      -- Create policy for service role
      CREATE POLICY "Service role has full access" ON "${sanitizedTableName}"
        FOR ALL
        USING (true)
        WITH CHECK (true);
    `;

    // Connect to project's Supabase and execute SQL
    const serviceKey = decrypt(project.supabase_service_key);
    const supabaseUrl = normalizeSupabaseUrl(project.supabase_url);

    console.log('Creating table in Supabase:', supabaseUrl, 'table:', sanitizedTableName);

    const projectClient = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // First, check if table already exists by trying to query it
    const { error: checkError } = await projectClient
      .from(sanitizedTableName)
      .select('*')
      .limit(1);

    // If no error, table exists - check if columns exist and add missing ones
    if (!checkError) {
      console.log(`Table "${sanitizedTableName}" already exists, checking columns...`);

      // Get existing columns from the table
      const { data: existingCols, error: colsError } = await projectClient.rpc('exec_sql', {
        sql_query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = '${sanitizedTableName}'
          AND table_schema = 'public'
        `
      });

      // If we can't check columns (exec_sql not available), try to add them anyway
      let existingColumnNames: string[] = [];
      if (!colsError && existingCols) {
        try {
          // Parse the result - it might be a string or array
          if (typeof existingCols === 'string') {
            existingColumnNames = JSON.parse(existingCols).map((r: { column_name: string }) => r.column_name);
          } else if (Array.isArray(existingCols)) {
            existingColumnNames = existingCols.map((r: { column_name: string }) => r.column_name);
          }
        } catch {
          console.log('Could not parse existing columns');
        }
      }

      // Find columns that need to be added
      const columnsToAdd = columns.filter(col => {
        const sanitizedName = sanitizeIdentifier(col.name);
        return sanitizedName && !existingColumnNames.includes(sanitizedName);
      });

      if (columnsToAdd.length > 0) {
        console.log(`Adding ${columnsToAdd.length} missing columns to "${sanitizedTableName}"`);

        // Build ALTER TABLE statements
        const alterStatements = columnsToAdd.map(col => {
          const colName = sanitizeIdentifier(col.name);
          let pgType: string;
          switch (col.type) {
            case 'integer': pgType = 'INTEGER'; break;
            case 'numeric': pgType = 'NUMERIC'; break;
            case 'boolean': pgType = 'BOOLEAN'; break;
            case 'timestamp': pgType = 'TIMESTAMPTZ'; break;
            case 'jsonb': pgType = 'JSONB'; break;
            default: pgType = 'TEXT';
          }
          return `ALTER TABLE "${sanitizedTableName}" ADD COLUMN IF NOT EXISTS "${colName}" ${pgType};`;
        }).join('\n');

        // Try to add columns via exec_sql
        const { error: alterError } = await projectClient.rpc('exec_sql', { sql_query: alterStatements });

        if (alterError) {
          console.log('Could not add columns automatically:', alterError.message);
          // Return SQL for manual execution
          return NextResponse.json({
            success: false,
            needsManualCreation: true,
            sql: alterStatements,
            tableName: sanitizedTableName,
            message: 'יש להוסיף עמודות חסרות ידנית',
          }, { status: 200 });
        }

        // Notify PostgREST to reload schema
        try {
          await projectClient.rpc('exec_sql', { sql_query: "NOTIFY pgrst, 'reload schema'" });
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch {
          console.log('Schema reload notify failed');
        }

        console.log(`Added ${columnsToAdd.length} columns to "${sanitizedTableName}"`);
      }

      return NextResponse.json({
        success: true,
        tableName: sanitizedTableName,
        message: `Table "${sanitizedTableName}" ready`,
        existed: true,
        columnsAdded: columnsToAdd.length,
      });
    }

    // Table doesn't exist - try to create it using SQL endpoint
    let createSuccess = false;
    let createMethod = '';

    // Method 1: Try direct SQL execution via Supabase's /sql endpoint (newer Supabase versions)
    try {
      const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          // Try to call a hypothetical sql execution endpoint
        }),
      });
      // This is a probe - we'll try other methods below
    } catch (e) {
      console.log('Direct SQL probe failed:', e);
    }

    // Method 2: Try exec_sql RPC if it exists
    const { error: rpcError } = await projectClient.rpc('exec_sql', { sql_query: sql });

    if (!rpcError) {
      createSuccess = true;
      createMethod = 'exec_sql';
    } else {
      console.log('exec_sql RPC not available:', rpcError.message);

      // Method 3: Try run_sql RPC (alternative name)
      const { error: runSqlError } = await projectClient.rpc('run_sql', { query: sql });
      if (!runSqlError) {
        createSuccess = true;
        createMethod = 'run_sql';
      } else {
        console.log('run_sql RPC not available:', runSqlError.message);

        // Method 4: Try query RPC
        const { error: queryError } = await projectClient.rpc('query', { sql });
        if (!queryError) {
          createSuccess = true;
          createMethod = 'query';
        } else {
          console.log('query RPC not available:', queryError.message);

          // Method 5: Try execute_sql RPC
          const { error: executeSqlError } = await projectClient.rpc('execute_sql', { query: sql });
          if (!executeSqlError) {
            createSuccess = true;
            createMethod = 'execute_sql';
          } else {
            console.log('execute_sql RPC not available:', executeSqlError.message);
          }
        }
      }
    }

    if (!createSuccess) {
      // Include the exec_sql function creation so future operations work automatically
      const setupSql = `
-- Step 1: Create the exec_sql function (run this once to enable automatic table creation)
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- Step 2: Create the table
${sql.trim()}

-- Step 3: Notify PostgREST to reload schema (important!)
NOTIFY pgrst, 'reload schema';
`;

      // Return the SQL for manual creation with a special status
      return NextResponse.json({
        success: false,
        needsManualCreation: true,
        sql: setupSql.trim(),
        tableName: sanitizedTableName,
        message: 'הטבלה צריכה להיווצר ידנית ב-Supabase SQL Editor',
        instructions: [
          '1. לך לפרויקט ה-Supabase שלך',
          '2. לחץ על SQL Editor',
          '3. הדבק והרץ את ה-SQL למטה (כולל יצירת הפונקציה)',
          '4. חזור ולחץ "המשך ייבוא"',
          '(לאחר הפעם הראשונה, טבלאות חדשות ייווצרו אוטומטית)',
        ],
      }, { status: 200 }); // Return 200 so frontend can handle it gracefully
    }

    // Table was created via exec_sql - notify PostgREST to reload schema
    try {
      await projectClient.rpc('exec_sql', { sql_query: "NOTIFY pgrst, 'reload schema'" });
      console.log('PostgREST schema reload notified');
      // Wait a moment for schema to reload
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (notifyError) {
      console.log('Schema reload notify failed (non-critical):', notifyError);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'create_table',
      details: {
        table_name: sanitizedTableName,
        columns: columns.map(c => c.name),
      },
    });

    return NextResponse.json({
      success: true,
      tableName: sanitizedTableName,
      message: `Table "${sanitizedTableName}" created successfully`,
    });
  } catch (error) {
    console.error('Create table error:', error);
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    );
  }
}
