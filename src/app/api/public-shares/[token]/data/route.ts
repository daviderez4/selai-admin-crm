import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get dashboard data for a public share (after authentication)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('session');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token required' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get the share
    const { data: share, error: shareError } = await supabase
      .from('public_shares')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share has expired' },
        { status: 410 }
      );
    }

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', share.project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get template
    const { data: templateData, error: templateError } = await supabase
      .from('smart_dashboard_templates')
      .select('*')
      .eq('id', share.template_id)
      .single();

    if (templateError || !templateData) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Parse template config
    const template = {
      ...templateData,
      summaryCards: typeof templateData.summary_cards === 'string'
        ? JSON.parse(templateData.summary_cards)
        : templateData.summary_cards || [],
      fieldSelection: typeof templateData.field_selection === 'string'
        ? JSON.parse(templateData.field_selection)
        : templateData.field_selection || [],
      chartConfig: typeof templateData.chart_config === 'string'
        ? JSON.parse(templateData.chart_config)
        : templateData.chart_config,
      filterConfig: typeof templateData.filter_config === 'string'
        ? JSON.parse(templateData.filter_config)
        : templateData.filter_config,
      tableName: templateData.table_name,
      isDefault: templateData.is_default,
    };

    // Get data from the project's table
    // We need to connect to the project's database
    const projectSupabase = await createClient();

    // Get data based on table name
    const tableName = template.tableName;
    const { data: tableData, error: dataError } = await projectSupabase
      .from(tableName)
      .select('*')
      .limit(1000);

    if (dataError) {
      console.error('Error fetching table data:', dataError);
      // Return empty data instead of error
      return NextResponse.json({
        template,
        data: [],
        shareName: share.name,
      });
    }

    return NextResponse.json({
      template,
      data: tableData || [],
      shareName: share.name,
    });
  } catch (error) {
    console.error('Error getting share data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
