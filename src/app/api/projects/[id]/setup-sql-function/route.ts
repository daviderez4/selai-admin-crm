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

// SQL to create the exec_sql function
const EXEC_SQL_FUNCTION = `
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
`;

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

    // Check access - require admin role
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || access.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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

    // Connect to project's Supabase
    const serviceKey = decrypt(project.supabase_service_key);
    const projectClient = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if exec_sql function already exists
    const { error: checkError } = await projectClient.rpc('exec_sql', { sql_query: 'SELECT 1' });

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'exec_sql function already exists',
        alreadySetup: true,
      });
    }

    // Function doesn't exist - return the SQL to create it
    return NextResponse.json({
      success: false,
      needsSetup: true,
      sql: EXEC_SQL_FUNCTION.trim(),
      message: 'יש להתקין את פונקציית ה-SQL ב-Supabase',
      instructions: [
        '1. לך לפרויקט ה-Supabase שלך',
        '2. לחץ על SQL Editor',
        '3. הדבק והרץ את ה-SQL למטה',
        '4. לאחר מכן, טבלאות ייווצרו אוטומטית',
      ],
    });
  } catch (error) {
    console.error('Setup SQL function error:', error);
    return NextResponse.json(
      { error: 'Failed to check SQL function setup' },
      { status: 500 }
    );
  }
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

    if (projectError || !project?.supabase_url || !project?.supabase_service_key) {
      return NextResponse.json({ error: 'Project database not configured' }, { status: 400 });
    }

    // Connect to project's Supabase
    const serviceKey = decrypt(project.supabase_service_key);
    const projectClient = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if exec_sql function exists
    const { error: checkError } = await projectClient.rpc('exec_sql', { sql_query: 'SELECT 1' });

    return NextResponse.json({
      isSetup: !checkError,
      message: checkError ? 'exec_sql function not installed' : 'exec_sql function is ready',
    });
  } catch (error) {
    console.error('Check SQL function error:', error);
    return NextResponse.json(
      { error: 'Failed to check SQL function' },
      { status: 500 }
    );
  }
}
