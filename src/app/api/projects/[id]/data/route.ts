import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createProjectClient } from '@/lib/utils/projectDatabase';
import { checkProjectAccess } from '@/lib/utils/projectAccess';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    // No limit by default - fetch all records. Use limit=N for pagination
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : null;
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access - admins/managers get implicit access (checkProjectAccess uses adminClient internally)
    const accessResult = await checkProjectAccess(supabase, user.id, user.email, projectId);

    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const access = { role: accessResult.role };

    // Get project database connection - use adminClient to bypass RLS
    const { data: project } = await adminClient
      .from('projects')
      .select('supabase_url, supabase_service_key, table_name, is_configured, storage_mode')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if this is a LOCAL project
    const isLocalProject = !project.supabase_url || project.storage_mode === 'local';

    let projectSupabase;

    if (isLocalProject) {
      projectSupabase = supabase;
    } else {
      const clientResult = createProjectClient({
        supabase_url: project.supabase_url,
        supabase_service_key: project.supabase_service_key,
        table_name: tableName,
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

      projectSupabase = clientResult.client!;
    }

    // Get total count
    const { count: totalCount } = await projectSupabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Fetch data - with optional pagination
    let query = projectSupabase.from(tableName).select('*');

    if (limit !== null) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const total = totalCount || 0;
    const effectiveLimit = limit || total;

    return NextResponse.json({
      data: data || [],
      total,
      limit: effectiveLimit,
      offset,
      hasMore: limit !== null && total > offset + limit,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
