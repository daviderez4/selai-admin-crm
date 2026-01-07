import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  encrypt,
  normalizeSupabaseUrl,
  isValidSupabaseUrl,
  testProjectConnection
} from '@/lib/utils/projectDatabase';

/**
 * POST /api/projects/create
 *
 * Creates a new project with REQUIRED database credentials.
 * NO FALLBACK to Central database - each project must have its own Supabase.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      name,
      description,
      table_name,
      data_type,
      icon,
      color,
      // Database credentials - REQUIRED (no fallback!)
      supabase_url,
      supabase_anon_key,
      supabase_service_key,
    } = await request.json();

    // =========================================================================
    // Validation - ALL credentials are REQUIRED
    // =========================================================================

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'שם הפרויקט הוא שדה חובה' },
        { status: 400 }
      );
    }

    if (!supabase_url?.trim()) {
      return NextResponse.json(
        { error: 'Supabase URL הוא שדה חובה. כל פרויקט חייב להיות מחובר למסד נתונים משלו.' },
        { status: 400 }
      );
    }

    if (!supabase_anon_key?.trim()) {
      return NextResponse.json(
        { error: 'Anon Key הוא שדה חובה' },
        { status: 400 }
      );
    }

    // Normalize and validate URL
    const normalizedUrl = normalizeSupabaseUrl(supabase_url.trim());
    if (!isValidSupabaseUrl(normalizedUrl)) {
      return NextResponse.json(
        {
          error: 'כתובת Supabase URL לא תקינה',
          details: `נדרש פורמט: https://xxxxx.supabase.co`,
          received: supabase_url
        },
        { status: 400 }
      );
    }

    // Use service key if provided, otherwise use anon key (limited access)
    const serviceKeyToUse = supabase_service_key?.trim() || supabase_anon_key.trim();
    const tableName = table_name?.trim() || 'master_data';

    // =========================================================================
    // Test Connection BEFORE creating project
    // =========================================================================

    console.log('Testing connection to:', normalizedUrl, 'table:', tableName);

    const testResult = await testProjectConnection(
      normalizedUrl,
      supabase_anon_key.trim(),
      serviceKeyToUse,
      tableName
    );

    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'בדיקת החיבור נכשלה',
          details: testResult.error,
          action: 'check_credentials'
        },
        { status: 400 }
      );
    }

    // Warn if table doesn't exist but connection works
    const tableWarning = !testResult.tableExists
      ? `הטבלה '${tableName}' לא קיימת עדיין במסד הנתונים. תוכל ליצור אותה בהמשך.`
      : null;

    // =========================================================================
    // Create Project with validated credentials
    // =========================================================================

    const encryptedServiceKey = encrypt(serviceKeyToUse);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        supabase_url: normalizedUrl,
        supabase_anon_key: supabase_anon_key.trim(),
        supabase_service_key: encryptedServiceKey,
        description: description?.trim() || '',
        table_name: tableName,
        data_type: data_type || 'custom',
        icon: icon || 'layout-dashboard',
        color: color || 'slate',
        is_configured: true, // Validated credentials
        connection_last_tested: new Date().toISOString(),
        connection_error: null,
        created_by: user.id,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);

      if (projectError.code === 'PGRST204' || projectError.code === '42P01') {
        return NextResponse.json(
          { error: 'טבלאות מסד הנתונים לא מוגדרות. יש להריץ את schema.sql ב-Supabase SQL Editor.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: `יצירת הפרויקט נכשלה: ${projectError.message}` },
        { status: 500 }
      );
    }

    // Grant admin access to the creator
    const { error: accessError } = await supabase
      .from('user_project_access')
      .insert({
        user_id: user.id,
        project_id: project.id,
        role: 'admin',
      });

    if (accessError) {
      console.error('Error granting access:', accessError);
      // Rollback project creation
      await supabase.from('projects').delete().eq('id', project.id);
      return NextResponse.json(
        { error: 'שגיאה בהענקת הרשאות' },
        { status: 500 }
      );
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: project.id,
      action: 'create_project',
      details: {
        project_name: name,
        table_name: tableName,
        supabase_url: normalizedUrl,
        table_exists: testResult.tableExists,
        row_count: testResult.rowCount,
      },
    });

    console.log('Project created successfully:', project.name, 'URL:', normalizedUrl);

    return NextResponse.json({
      project,
      warning: tableWarning,
      connection: {
        tested: true,
        tableExists: testResult.tableExists,
        rowCount: testResult.rowCount
      }
    });

  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
