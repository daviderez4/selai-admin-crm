import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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

    const { name, supabase_url, supabase_anon_key, service_key, description } = await request.json();

    if (!name || !supabase_url || !supabase_anon_key || !service_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate Supabase URL format
    try {
      new URL(supabase_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Supabase URL' },
        { status: 400 }
      );
    }

    // Encrypt the service key
    const encryptedKey = encrypt(service_key);

    // Create the project - using actual column names from database
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        supabase_url,
        supabase_anon_key,
        supabase_service_key: encryptedKey,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      // Check if it's a missing table/column error
      if (projectError.code === 'PGRST204' || projectError.code === '42P01') {
        return NextResponse.json(
          { error: 'Database tables not configured. Please run schema.sql in Supabase SQL Editor.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create project: ${projectError.message}` },
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
        { error: 'Failed to grant access' },
        { status: 500 }
      );
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: project.id,
      action: 'create_project',
      details: { project_name: name },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
