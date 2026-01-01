import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Central Supabase URL - ALL projects use this
const CENTRAL_SUPABASE_URL = process.env.CENTRAL_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

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
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Get credentials from ANY existing project (they all use the same Supabase)
    const { data: existingProject } = await supabase
      .from('projects')
      .select('supabase_url, supabase_anon_key, supabase_service_key')
      .limit(1)
      .single();

    // Determine the Supabase URL and keys
    let finalSupabaseUrl = CENTRAL_SUPABASE_URL;
    let finalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    let encryptedServiceKey = '';

    if (existingProject) {
      // Use credentials from existing project (already encrypted)
      finalSupabaseUrl = CENTRAL_SUPABASE_URL; // Always use central URL!
      finalAnonKey = existingProject.supabase_anon_key;
      encryptedServiceKey = existingProject.supabase_service_key;
    } else {
      // First project - need to provide credentials via API or env
      return NextResponse.json(
        { error: 'No existing project found. Please create the first project with full credentials.' },
        { status: 400 }
      );
    }

    console.log('Creating project with central Supabase:', finalSupabaseUrl);

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
