import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { MappingConfiguration } from '@/types/column-mapping';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/projects/[id]/column-mapping
 * Get all mapping configurations for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const { data, error } = await supabase
      .from('column_mapping_configs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ configs: data || [] });
  } catch (error) {
    console.error('Get column mappings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch column mappings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/column-mapping
 * Save a new mapping configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const config: MappingConfiguration = await request.json();

    // Ensure project ID is set
    config.projectId = projectId;

    const { data, error } = await supabase
      .from('column_mapping_configs')
      .upsert(
        {
          id: config.id,
          project_id: projectId,
          name: config.name,
          description: config.description,
          source_file: config.sourceFile,
          source_columns: config.sourceColumns,
          mappings: config.mappings,
          ignored_columns: config.ignoredColumns,
          settings: config.settings,
          approved: config.approved,
          approved_at: config.approvedAt,
          approved_by: config.approvedBy,
          created_at: config.createdAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Save column mapping error:', error);
    return NextResponse.json(
      { error: 'Failed to save column mapping' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/column-mapping
 * Delete a mapping configuration
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');

    if (!configId) {
      return NextResponse.json(
        { error: 'Missing configId parameter' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('column_mapping_configs')
      .delete()
      .eq('id', configId)
      .eq('project_id', projectId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete column mapping error:', error);
    return NextResponse.json(
      { error: 'Failed to delete column mapping' },
      { status: 500 }
    );
  }
}
