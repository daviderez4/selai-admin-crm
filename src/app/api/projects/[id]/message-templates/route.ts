import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Message Templates API
 * Manages WhatsApp, SMS, and email message templates for a project
 */

interface MessageTemplate {
  id: string;
  project_id: string | null;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email';
  category: string | null;
  template_text: string;
  placeholders: string[];
  email_subject: string | null;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// GET - List all templates for a project (including global templates)
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

    // Get URL params for filtering
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active') !== 'false';

    // Build query - get both project-specific and global templates
    let query = supabase
      .from('message_templates')
      .select('*')
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .order('is_default', { ascending: false })
      .order('usage_count', { ascending: false });

    if (channel) {
      query = query.eq('channel', channel);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      templates: templates || [],
      count: templates?.length || 0,
    });

  } catch (error) {
    console.error('Message templates GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create a new template
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

    const body = await request.json();
    const { name, channel, category, template_text, placeholders, email_subject, is_default } = body;

    // Validation
    if (!name || !channel || !template_text) {
      return NextResponse.json(
        { error: 'Missing required fields: name, channel, template_text' },
        { status: 400 }
      );
    }

    if (!['whatsapp', 'sms', 'email'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be whatsapp, sms, or email' },
        { status: 400 }
      );
    }

    // Extract placeholders from template if not provided
    const extractedPlaceholders = placeholders || extractPlaceholders(template_text);

    // If setting as default, unset other defaults for this channel
    if (is_default) {
      await supabase
        .from('message_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
        .eq('channel', channel)
        .eq('is_default', true);
    }

    // Create template
    const { data: template, error } = await supabase
      .from('message_templates')
      .insert({
        project_id: projectId,
        name,
        channel,
        category: category || null,
        template_text,
        placeholders: extractedPlaceholders,
        email_subject: channel === 'email' ? email_subject : null,
        is_active: true,
        is_default: is_default || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });

  } catch (error) {
    console.error('Message templates POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
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
