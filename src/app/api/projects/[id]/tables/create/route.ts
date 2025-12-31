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
  // Remove any characters that aren't alphanumeric, underscores, or Hebrew
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u0590-\u05FF]/g, '')
    .replace(/^_+|_+$/g, '');
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
    const projectClient = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Execute the SQL using rpc if available, or fallback to a direct query
    const { error: sqlError } = await projectClient.rpc('exec_sql', { sql_query: sql });

    if (sqlError) {
      // Try direct SQL execution via REST endpoint
      const sqlEndpoint = `${project.supabase_url}/rest/v1/rpc/exec_sql`;
      const response = await fetch(sqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        // Return a helpful message about needing to create the table manually
        return NextResponse.json({
          success: false,
          error: 'Could not create table automatically. Please create it manually in Supabase.',
          sql: sql.trim(),
          tableName: sanitizedTableName,
        }, { status: 400 });
      }
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
