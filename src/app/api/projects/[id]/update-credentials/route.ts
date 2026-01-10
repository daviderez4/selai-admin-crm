import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  encrypt,
  normalizeSupabaseUrl,
  isValidSupabaseUrl,
  testProjectConnection
} from '@/lib/utils/projectDatabase';

/**
 * PUT /api/projects/[id]/update-credentials
 *
 * Updates project database credentials with validation.
 * Tests connection before saving and updates is_configured status.
 */
export async function PUT(
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

    // Check if user has admin access to this project
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || access.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      supabase_url,
      supabase_anon_key,
      supabase_service_key,
      table_name,
      test_connection = true, // Default to testing connection
      // Update frequency settings
      update_frequency, // 'manual' | 'daily' | 'weekly' | 'monthly'
      auto_import_email, // Email to monitor for auto imports
      auto_import_enabled, // Boolean to enable/disable auto import
    } = await request.json();

    // Get current project data
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_anon_key, supabase_service_key, table_name, name')
      .eq('id', projectId)
      .single();

    if (fetchError || !currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate URL if provided
    const newUrl = supabase_url?.trim();
    if (newUrl) {
      const normalizedUrl = normalizeSupabaseUrl(newUrl);
      if (!isValidSupabaseUrl(normalizedUrl)) {
        return NextResponse.json({
          error: 'כתובת Supabase URL לא תקינה',
          details: `נדרש פורמט: https://xxxxx.supabase.co`,
          received: supabase_url
        }, { status: 400 });
      }
    }

    // Build update object - only update provided fields
    const updateData: Record<string, unknown> = {};

    if (newUrl) {
      updateData.supabase_url = normalizeSupabaseUrl(newUrl);
    }

    if (supabase_anon_key?.trim()) {
      updateData.supabase_anon_key = supabase_anon_key.trim();
    }

    if (supabase_service_key?.trim()) {
      updateData.supabase_service_key = encrypt(supabase_service_key.trim());
    }

    if (table_name?.trim()) {
      updateData.table_name = table_name.trim();
    }

    // Update frequency settings
    if (update_frequency) {
      updateData.update_frequency = update_frequency;
    }

    if (auto_import_email !== undefined) {
      updateData.auto_import_email = auto_import_email?.trim() || null;
    }

    if (auto_import_enabled !== undefined) {
      updateData.auto_import_enabled = auto_import_enabled;
    }

    // Test connection if requested and we have complete credentials
    let testResult = null;
    if (test_connection) {
      // Use new values if provided, otherwise use existing
      const testUrl = newUrl ? normalizeSupabaseUrl(newUrl) : currentProject.supabase_url;
      const testAnonKey = supabase_anon_key?.trim() || currentProject.supabase_anon_key;
      const testServiceKey = supabase_service_key?.trim() || null;
      const testTableName = table_name?.trim() || currentProject.table_name || 'master_data';

      // Only test if we have a service key to test with
      if (testServiceKey) {
        testResult = await testProjectConnection(
          testUrl,
          testAnonKey,
          testServiceKey,
          testTableName
        );

        // Update configuration status based on test
        updateData.is_configured = testResult.success;
        updateData.connection_last_tested = new Date().toISOString();
        updateData.connection_error = testResult.success ? null : testResult.error;

        // If test failed, return error but still save (user might want to fix manually)
        if (!testResult.success) {
          console.log('Connection test failed:', testResult.error);
        }
      }
    }

    // Update the project
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select('id, name, supabase_url, table_name, is_configured, connection_error')
      .single();

    if (updateError) {
      console.error('Error updating project credentials:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'update_credentials',
      details: {
        new_supabase_url: updateData.supabase_url || currentProject.supabase_url,
        new_table_name: updateData.table_name || currentProject.table_name,
        has_anon_key: !!supabase_anon_key,
        has_service_key: !!supabase_service_key,
        connection_tested: !!testResult,
        connection_success: testResult?.success,
      },
    });

    console.log('Updated project credentials:', project?.name, '→', project?.supabase_url);

    return NextResponse.json({
      success: true,
      project,
      connection_test: testResult ? {
        success: testResult.success,
        tableExists: testResult.tableExists,
        rowCount: testResult.rowCount,
        error: testResult.error,
      } : null,
      message: testResult?.success
        ? `פרטי החיבור עודכנו והחיבור נבדק בהצלחה`
        : testResult
          ? `פרטי החיבור עודכנו אך בדיקת החיבור נכשלה: ${testResult.error}`
          : `עודכנו פרטי החיבור לפרויקט "${project?.name}"`,
    });

  } catch (error) {
    console.error('Update credentials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
