import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  testProjectConnectionFromCredentials,
  decrypt
} from '@/lib/utils/projectDatabase';

/**
 * POST /api/projects/[id]/test-connection
 *
 * Tests the connection to a project's Supabase database.
 * Updates is_configured, connection_last_tested, and connection_error.
 */
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

    // Check admin access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || access.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get project credentials
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_anon_key, supabase_service_key, table_name, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Test connection
    const testResult = await testProjectConnectionFromCredentials({
      supabase_url: project.supabase_url,
      supabase_anon_key: project.supabase_anon_key,
      supabase_service_key: project.supabase_service_key,
      table_name: project.table_name || 'master_data',
    });

    // Update project status in database
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        is_configured: testResult.success,
        connection_last_tested: new Date().toISOString(),
        connection_error: testResult.success ? null : testResult.error,
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update project status:', updateError);
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'test_connection',
      details: {
        success: testResult.success,
        error: testResult.error,
        table_exists: testResult.tableExists,
        row_count: testResult.rowCount,
      },
    });

    return NextResponse.json({
      success: testResult.success,
      tableExists: testResult.tableExists,
      rowCount: testResult.rowCount,
      error: testResult.error,
      tested_at: new Date().toISOString(),
      project_name: project.name,
    });

  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
