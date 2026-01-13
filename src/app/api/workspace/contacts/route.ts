import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET /api/workspace/contacts - List contacts for current user
export async function GET(request: NextRequest) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    // Build query
    let query = supabase
      .from('workspace_contacts')
      .select('*', { count: 'exact' })
      .eq('owner_id', userProfile.id);

    // Apply filters
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,id_number.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: contacts, count, error } = await query;

    if (error) {
      // If table doesn't exist, return empty list
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: {
            contacts: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          },
          message: 'טבלת אנשי קשר לא קיימת - יש ליצור אותה'
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        contacts: contacts || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Workspace contacts GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/workspace/contacts - Create new contact
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const {
      full_name,
      email,
      phone,
      phone2,
      id_number,
      status = 'prospect',
      source,
      notes
    } = body;

    if (!full_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'שם מלא הוא שדה חובה' },
        { status: 400 }
      );
    }

    // Create contact
    const { data: contact, error } = await adminClient
      .from('workspace_contacts')
      .insert({
        owner_id: userProfile.id,
        full_name: full_name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        phone2: phone2?.trim() || null,
        id_number: id_number?.trim() || null,
        status,
        source: source?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);

      // If table doesn't exist, provide helpful message
      if (error.code === '42P01') {
        return NextResponse.json(
          { success: false, error: 'טבלת אנשי קשר לא קיימת - יש להריץ את הסקריפט ליצירת הטבלה' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'שגיאה ביצירת איש קשר' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Workspace contacts POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
