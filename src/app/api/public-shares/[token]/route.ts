import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Verify password and get share data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the share
    const { data: share, error } = await supabase
      .from('public_shares')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .single();

    if (error || !share) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share has expired' },
        { status: 410 }
      );
    }

    // Verify password
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    if (passwordHash !== share.password_hash) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Increment view count
    await supabase
      .from('public_shares')
      .update({ view_count: (share.view_count || 0) + 1 })
      .eq('id', share.id);

    // Generate a session token for this share (valid for 4 hours)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpires = new Date();
    sessionExpires.setHours(sessionExpires.getHours() + 4);

    return NextResponse.json({
      success: true,
      projectId: share.project_id,
      templateId: share.template_id,
      shareName: share.name,
      sessionToken,
      sessionExpires: sessionExpires.toISOString(),
    });
  } catch (error) {
    console.error('Error verifying share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get share info (without authentication)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const supabase = await createClient();

    const { data: share, error } = await supabase
      .from('public_shares')
      .select('name, expires_at, is_active')
      .eq('share_token', token)
      .single();

    if (error || !share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    if (!share.is_active) {
      return NextResponse.json(
        { error: 'Share is no longer active' },
        { status: 410 }
      );
    }

    if (new Date(share.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Share has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      name: share.name,
      requiresPassword: true,
    });
  } catch (error) {
    console.error('Error getting share info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
