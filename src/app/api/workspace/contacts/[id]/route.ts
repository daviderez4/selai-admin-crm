import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET /api/workspace/contacts/[id] - Get single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    let userProfile = null;

    const { data: byAuthId } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      userProfile = byAuthId;
    } else {
      const { data: byEmail } = await supabase
        .from('users')
        .select('id, user_type')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();
      userProfile = byEmail;
    }

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // Get contact
    const { data: contact, error } = await supabase
      .from('workspace_contacts')
      .select('*')
      .eq('id', contactId)
      .eq('owner_id', userProfile.id)
      .single();

    if (error || !contact) {
      return NextResponse.json(
        { success: false, error: 'איש קשר לא נמצא' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Workspace contact GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

// PATCH /api/workspace/contacts/[id] - Update contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    let userProfile = null;

    const { data: byAuthId } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      userProfile = byAuthId;
    } else {
      const { data: byEmail } = await supabase
        .from('users')
        .select('id, user_type')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();
      userProfile = byEmail;
    }

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from('workspace_contacts')
      .select('id')
      .eq('id', contactId)
      .eq('owner_id', userProfile.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'איש קשר לא נמצא או אין הרשאה' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedFields = ['full_name', 'email', 'phone', 'phone2', 'id_number', 'status', 'source', 'notes', 'tags', 'custom_fields'];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'אין שדות לעדכון' },
        { status: 400 }
      );
    }

    const { data: contact, error } = await adminClient
      .from('workspace_contacts')
      .update(updateData)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return NextResponse.json(
        { success: false, error: 'שגיאה בעדכון איש קשר' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Workspace contact PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspace/contacts/[id] - Delete contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    let userProfile = null;

    const { data: byAuthId } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (byAuthId) {
      userProfile = byAuthId;
    } else {
      const { data: byEmail } = await supabase
        .from('users')
        .select('id, user_type')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle();
      userProfile = byEmail;
    }

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // Check ownership before delete
    const { data: existing } = await supabase
      .from('workspace_contacts')
      .select('id')
      .eq('id', contactId)
      .eq('owner_id', userProfile.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'איש קשר לא נמצא או אין הרשאה' },
        { status: 404 }
      );
    }

    const { error } = await adminClient
      .from('workspace_contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error('Error deleting contact:', error);
      return NextResponse.json(
        { success: false, error: 'שגיאה במחיקת איש קשר' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'איש קשר נמחק בהצלחה'
    });

  } catch (error) {
    console.error('Workspace contact DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
