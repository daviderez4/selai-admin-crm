import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Encrypt service key before storing
function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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

    const { supabase_url, supabase_anon_key, supabase_service_key } = await request.json();

    if (!supabase_url) {
      return NextResponse.json({ error: 'Supabase URL is required' }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, string> = {
      supabase_url: supabase_url.trim(),
    };

    if (supabase_anon_key) {
      updateData.supabase_anon_key = supabase_anon_key.trim();
    }

    if (supabase_service_key) {
      updateData.supabase_service_key = encrypt(supabase_service_key.trim());
    }

    // Update the project
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select('id, name, supabase_url')
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
        new_supabase_url: supabase_url,
        has_anon_key: !!supabase_anon_key,
        has_service_key: !!supabase_service_key,
      },
    });

    console.log('Updated project credentials:', project?.name, '→', supabase_url);

    return NextResponse.json({
      success: true,
      project,
      message: `עודכנו פרטי החיבור לפרויקט "${project?.name}"`,
    });
  } catch (error) {
    console.error('Update credentials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
