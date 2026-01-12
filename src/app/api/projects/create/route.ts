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
 * Creates a new project with optional database credentials.
 * Supports two modes:
 * - 'local': Excel-only project without Supabase connection
 * - 'external': Project connected to external Supabase database
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
      mode = 'local', // 'local' (Excel only) or 'external' (Supabase connected)
      // Database credentials - REQUIRED only for 'external' mode
      supabase_url,
      supabase_anon_key,
      supabase_service_key,
    } = await request.json();

    // =========================================================================
    // Validation
    // =========================================================================

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'שם הפרויקט הוא שדה חובה' },
        { status: 400 }
      );
    }

    const tableName = table_name?.trim() || 'master_data';
    let normalizedUrl: string | null = null;
    let testResult: { success: boolean; tableExists?: boolean; rowCount?: number; error?: string } | null = null;
    let tableWarning: string | null = null;
    let encryptedServiceKey: string | null = null;

    // =========================================================================
    // External Mode - Validate and test Supabase credentials
    // =========================================================================

    if (mode === 'external') {
      if (!supabase_url?.trim()) {
        return NextResponse.json(
          { error: 'Supabase URL הוא שדה חובה במצב חיבור חיצוני' },
          { status: 400 }
        );
      }

      if (!supabase_anon_key?.trim()) {
        return NextResponse.json(
          { error: 'Anon Key הוא שדה חובה במצב חיבור חיצוני' },
          { status: 400 }
        );
      }

      // Normalize and validate URL
      normalizedUrl = normalizeSupabaseUrl(supabase_url.trim());
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

      // Test Connection BEFORE creating project
      console.log('Testing connection to:', normalizedUrl, 'table:', tableName);

      testResult = await testProjectConnection(
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
      tableWarning = !testResult.tableExists
        ? `הטבלה '${tableName}' לא קיימת עדיין במסד הנתונים. תוכל ליצור אותה בהמשך.`
        : null;

      encryptedServiceKey = encrypt(serviceKeyToUse);
    }

    // =========================================================================
    // Create Project
    // =========================================================================

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        supabase_url: normalizedUrl, // null for local mode
        supabase_anon_key: mode === 'external' ? supabase_anon_key.trim() : null,
        supabase_service_key: encryptedServiceKey, // null for local mode
        description: description?.trim() || '',
        storage_mode: mode, // 'local' or 'external'
        table_name: tableName,
        data_type: data_type || 'custom',
        icon: icon || 'layout-dashboard',
        color: color || 'slate',
        is_configured: mode === 'external', // Only true if external DB validated
        connection_last_tested: mode === 'external' ? new Date().toISOString() : null,
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
        mode,
        table_name: tableName,
        supabase_url: normalizedUrl,
        table_exists: testResult?.tableExists ?? null,
        row_count: testResult?.rowCount ?? null,
      },
    });

    console.log('Project created successfully:', project.name, 'Mode:', mode, 'URL:', normalizedUrl || 'local');

    return NextResponse.json({
      project,
      warning: tableWarning,
      mode,
      connection: mode === 'external' ? {
        tested: true,
        tableExists: testResult?.tableExists,
        rowCount: testResult?.rowCount
      } : null
    });

  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    );
  }
}
