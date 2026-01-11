import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Single Message Template API
 * GET, PUT, DELETE operations on a specific template
 */

// GET - Get a single template
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const { id: projectId, templateId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check project access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: template, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });

  } catch (error) {
    console.error('Message template GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT - Update a template
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const { id: projectId, templateId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check editor/admin access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || !['admin', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check template exists and belongs to this project
    const { data: existing } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found or cannot modify global template' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, category, template_text, placeholders, email_subject, is_active, is_default } = body;

    // If setting as default, unset other defaults
    if (is_default && !existing.is_default) {
      await supabase
        .from('message_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
        .eq('channel', existing.channel)
        .eq('is_default', true);
    }

    // Extract placeholders if template changed
    const finalPlaceholders = template_text
      ? (placeholders || extractPlaceholders(template_text))
      : existing.placeholders;

    const { data: template, error } = await supabase
      .from('message_templates')
      .update({
        name: name ?? existing.name,
        category: category !== undefined ? category : existing.category,
        template_text: template_text ?? existing.template_text,
        placeholders: finalPlaceholders,
        email_subject: email_subject !== undefined ? email_subject : existing.email_subject,
        is_active: is_active ?? existing.is_active,
        is_default: is_default ?? existing.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template });

  } catch (error) {
    console.error('Message template PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  try {
    const { id: projectId, templateId } = await params;
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

    // Check template exists and belongs to this project (can't delete global)
    const { data: existing } = await supabase
      .from('message_templates')
      .select('id, project_id')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found or cannot delete global template' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Message template DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

// Helper function to extract placeholders from template text
function extractPlaceholders(text: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = text.match(regex) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}
