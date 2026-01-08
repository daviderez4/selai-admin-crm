import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/server';
import crypto from 'crypto';

// Create a new public share
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, templateId, password, expiresInDays = 30, name } = body;

    if (!projectId || !templateId || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');

    // Hash the password
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const supabase = await createClient();

    // First check if table exists, if not create it
    const { error: tableCheckError } = await supabase
      .from('public_shares')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === '42P01') {
      // Table doesn't exist - it should be created via SQL migration
      return NextResponse.json(
        { error: 'Public shares table not configured. Please run the migration.' },
        { status: 500 }
      );
    }

    // Insert the share
    const { data, error } = await supabase
      .from('public_shares')
      .insert({
        share_token: shareToken,
        project_id: projectId,
        template_id: templateId,
        password_hash: passwordHash,
        name: name || 'שיתוף דשבורד',
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        view_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating share:', error);
      return NextResponse.json(
        { error: 'Failed to create share' },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareToken}`;

    return NextResponse.json({
      success: true,
      share: {
        id: data.id,
        token: shareToken,
        url: shareUrl,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in POST /api/public-shares:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get all shares for the current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('public_shares')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shares:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({ shares: data || [] });
  } catch (error) {
    console.error('Error in GET /api/public-shares:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
