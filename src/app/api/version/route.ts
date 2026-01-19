/**
 * Version API
 * Get current app version and change logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get current version and recent changes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includeChanges = searchParams.get('changes') === 'true';

    // Get current version
    const { data: version, error: versionError } = await supabase
      .from('app_versions')
      .select('*')
      .eq('is_current', true)
      .eq('environment', 'production')
      .single();

    if (versionError && versionError.code !== 'PGRST116') {
      console.error('Error fetching version:', versionError);
    }

    let changes = [];
    if (includeChanges) {
      const { data: changeData } = await supabase
        .from('change_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      changes = changeData || [];
    }

    // Get pending changes count
    const { count: pendingCount } = await supabase
      .from('change_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      success: true,
      data: {
        version: version?.version || '1.0.0',
        commit_hash: version?.commit_hash || 'unknown',
        deployed_at: version?.deployed_at || null,
        environment: version?.environment || 'production',
        pending_changes: pendingCount || 0,
        changes: includeChanges ? changes : undefined
      }
    });

  } catch (error) {
    console.error('Version API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      version: '1.0.0' // Fallback version
    }, { status: 500 });
  }
}

// POST - Add new change log (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRecord } = await supabase
      .from('users')
      .select('user_type')
      .eq('auth_id', user.id)
      .single();

    if (!userRecord || userRecord.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      change_type,
      category,
      title,
      description,
      files_changed,
      commit_hash,
      commit_message,
      requires_migration,
      migration_script
    } = body;

    if (!change_type || !title) {
      return NextResponse.json({
        error: 'change_type and title are required'
      }, { status: 400 });
    }

    // Get current version ID
    const { data: currentVersion } = await supabase
      .from('app_versions')
      .select('id')
      .eq('is_current', true)
      .eq('environment', 'production')
      .single();

    // Insert change log
    const { data: changeLog, error } = await supabase
      .from('change_logs')
      .insert({
        version_id: currentVersion?.id,
        change_type,
        category,
        title,
        description,
        files_changed,
        commit_hash,
        commit_message,
        requires_migration: requires_migration || false,
        migration_script,
        status: 'pending',
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating change log:', error);
      return NextResponse.json({ error: 'Failed to create change log' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: changeLog
    });

  } catch (error) {
    console.error('Version POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update version / mark changes as deployed (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify current user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('user_type')
      .eq('auth_id', user.id)
      .single();

    if (!userRecord || userRecord.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, version, commit_hash, notes, change_ids } = body;

    if (action === 'set_version') {
      // Mark old versions as not current
      await supabase
        .from('app_versions')
        .update({ is_current: false })
        .eq('is_current', true)
        .eq('environment', 'production');

      // Insert new version
      const { data: newVersion, error } = await supabase
        .from('app_versions')
        .insert({
          version,
          commit_hash,
          environment: 'production',
          is_current: true,
          notes,
          deployed_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error setting version:', error);
        return NextResponse.json({ error: 'Failed to set version' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: newVersion
      });

    } else if (action === 'mark_deployed') {
      // Mark specific changes as deployed
      const { error } = await supabase
        .from('change_logs')
        .update({
          status: 'deployed',
          deployed_at: new Date().toISOString()
        })
        .in('id', change_ids || []);

      if (error) {
        console.error('Error marking deployed:', error);
        return NextResponse.json({ error: 'Failed to mark deployed' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Changes marked as deployed'
      });

    } else if (action === 'mark_all_deployed') {
      // Mark all pending changes as deployed
      const { error } = await supabase
        .from('change_logs')
        .update({
          status: 'deployed',
          deployed_at: new Date().toISOString()
        })
        .eq('status', 'pending');

      if (error) {
        console.error('Error marking all deployed:', error);
        return NextResponse.json({ error: 'Failed to mark deployed' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'All pending changes marked as deployed'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Version PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
