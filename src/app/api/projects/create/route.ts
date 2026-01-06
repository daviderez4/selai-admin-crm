import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Central Supabase URL - default for projects without external Supabase
const CENTRAL_SUPABASE_URL = process.env.CENTRAL_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
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
      // External Supabase credentials (optional)
      supabase_url,
      supabase_anon_key,
      supabase_service_key,
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Determine the Supabase URL and keys
    let finalSupabaseUrl: string;
    let finalAnonKey: string;
    let encryptedServiceKey: string;

    // Check if external Supabase credentials were provided
    if (supabase_url && supabase_anon_key) {
      // Use external Supabase credentials
      finalSupabaseUrl = supabase_url;
      finalAnonKey = supabase_anon_key;

      // Encrypt the service key if provided, otherwise use anon key as fallback
      if (supabase_service_key) {
        encryptedServiceKey = encrypt(supabase_service_key);
      } else {
        // Use anon key as service key (limited access)
        encryptedServiceKey = encrypt(supabase_anon_key);
      }

      console.log('Creating project with EXTERNAL Supabase:', finalSupabaseUrl);
    } else {
      // Use Central Supabase - get credentials from existing project
      const { data: existingProject } = await supabase
        .from('projects')
        .select('supabase_url, supabase_anon_key, supabase_service_key')
        .limit(1)
        .single();

      if (existingProject) {
        finalSupabaseUrl = CENTRAL_SUPABASE_URL;
        finalAnonKey = existingProject.supabase_anon_key;
        encryptedServiceKey = existingProject.supabase_service_key;
      } else {
        // First project with no external credentials - use env vars
        const centralServiceKey = process.env.CENTRAL_SUPABASE_SERVICE_KEY;
        if (!centralServiceKey) {
          return NextResponse.json(
            { error: 'No existing project found. Please provide Supabase credentials or configure CENTRAL_SUPABASE_SERVICE_KEY.' },
            { status: 400 }
          );
        }
        finalSupabaseUrl = CENTRAL_SUPABASE_URL;
        finalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        encryptedServiceKey = encrypt(centralServiceKey);
      }

      console.log('Creating project with CENTRAL Supabase:', finalSupabaseUrl);
    }

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        supabase_url: finalSupabaseUrl,
        supabase_anon_key: finalAnonKey,
        supabase_service_key: encryptedServiceKey,
        description,
        table_name: table_name || 'master_data',
        data_type: data_type || 'custom',
        icon: icon || 'layout-dashboard',
        color: color || 'slate',
        created_by: user.id,
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
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
      details: {
        project_name: name,
        table_name: table_name || 'master_data',
        supabase_url: finalSupabaseUrl,
        is_external: !!(supabase_url && supabase_anon_key),
      },
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
