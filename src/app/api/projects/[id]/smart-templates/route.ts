import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SmartDashboardTemplate } from '@/types/dashboard';

// GET - List all smart templates for a project
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

    // Get templates from smart_dashboard_templates table
    const { data: templates, error } = await supabase
      .from('smart_dashboard_templates')
      .select('*')
      .eq('project_id', projectId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      // Table might not exist yet - return empty array
      console.warn('Smart templates fetch error:', error.message);
      return NextResponse.json({ templates: [] });
    }

    // Transform to match our types
    const transformedTemplates = (templates || []).map(t => ({
      id: t.id,
      projectId: t.project_id,
      name: t.name,
      description: t.description,
      tableName: t.table_name,
      dataAnalysis: t.data_analysis,
      fieldSelection: t.field_selection || [],
      filtersConfig: t.filters_config || [],
      cardsConfig: t.cards_config || [],
      tableConfig: t.table_config || { columns: [], pageSize: 50, enableSearch: true, enableExport: true },
      chartsConfig: t.charts_config || [],
      isDefault: t.is_default,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return NextResponse.json({ templates: transformedTemplates });
  } catch (error) {
    console.warn('Error fetching smart templates:', error);
    // Return empty array instead of error to prevent console errors
    return NextResponse.json({ templates: [] });
  }
}

// POST - Create a new smart template
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

    // Check access (need editor or admin role)
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || !['admin', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json() as Partial<SmartDashboardTemplate>;

    if (!body.name || !body.tableName) {
      return NextResponse.json(
        { error: 'Name and tableName are required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (body.isDefault) {
      await supabase
        .from('smart_dashboard_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
        .eq('is_default', true);
    }

    // Create template
    const { data: template, error } = await supabase
      .from('smart_dashboard_templates')
      .insert({
        project_id: projectId,
        name: body.name,
        description: body.description,
        table_name: body.tableName,
        data_analysis: body.dataAnalysis,
        field_selection: body.fieldSelection,
        filters_config: body.filtersConfig,
        cards_config: body.cardsConfig,
        table_config: body.tableConfig,
        charts_config: body.chartsConfig,
        is_default: body.isDefault || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transform response
    const transformedTemplate = {
      id: template.id,
      projectId: template.project_id,
      name: template.name,
      description: template.description,
      tableName: template.table_name,
      dataAnalysis: template.data_analysis,
      fieldSelection: template.field_selection || [],
      filtersConfig: template.filters_config || [],
      cardsConfig: template.cards_config || [],
      tableConfig: template.table_config,
      chartsConfig: template.charts_config || [],
      isDefault: template.is_default,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };

    return NextResponse.json({ template: transformedTemplate });
  } catch (error) {
    console.error('Error creating smart template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PUT - Update a smart template
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

    // Check access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || !['admin', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { id: templateId, ...updates } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (updates.isDefault) {
      await supabase
        .from('smart_dashboard_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
        .eq('is_default', true);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.tableName !== undefined) updateData.table_name = updates.tableName;
    if (updates.dataAnalysis !== undefined) updateData.data_analysis = updates.dataAnalysis;
    if (updates.fieldSelection !== undefined) updateData.field_selection = updates.fieldSelection;
    if (updates.filtersConfig !== undefined) updateData.filters_config = updates.filtersConfig;
    if (updates.cardsConfig !== undefined) updateData.cards_config = updates.cardsConfig;
    if (updates.tableConfig !== undefined) updateData.table_config = updates.tableConfig;
    if (updates.chartsConfig !== undefined) updateData.charts_config = updates.chartsConfig;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

    // Update template
    const { data: template, error } = await supabase
      .from('smart_dashboard_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transform response
    const transformedTemplate = {
      id: template.id,
      projectId: template.project_id,
      name: template.name,
      description: template.description,
      tableName: template.table_name,
      dataAnalysis: template.data_analysis,
      fieldSelection: template.field_selection || [],
      filtersConfig: template.filters_config || [],
      cardsConfig: template.cards_config || [],
      tableConfig: template.table_config,
      chartsConfig: template.charts_config || [],
      isDefault: template.is_default,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };

    return NextResponse.json({ template: transformedTemplate });
  } catch (error) {
    console.error('Error updating smart template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a smart template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

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

    if (!access || !['admin', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete template
    const { error } = await supabase
      .from('smart_dashboard_templates')
      .delete()
      .eq('id', templateId)
      .eq('project_id', projectId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting smart template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
