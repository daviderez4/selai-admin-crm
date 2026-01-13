import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch all registration requests (for admin)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // Get current user to check permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role
    const { data: currentUser } = await supabase
      .from('users')
      .select('user_type, id')
      .eq('auth_id', user.id)
      .single();

    if (!currentUser || !['admin', 'manager', 'supervisor'].includes(currentUser.user_type)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query based on role
    let query = supabase
      .from('registration_requests')
      .select(`
        *,
        reviewer:reviewed_by(full_name, email),
        supervisor:requested_supervisor_id(full_name, email),
        manager:requested_manager_id(full_name, email)
      `)
      .order('created_at', { ascending: false });

    // Filter by status if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Supervisors only see agent requests assigned to them
    if (currentUser.user_type === 'supervisor') {
      query = query.eq('requested_supervisor_id', currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching registrations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ registrations: data || [] });
  } catch (error) {
    console.error('Registration GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit new registration request (PUBLIC - no auth required)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      full_name,
      email,
      phone,
      national_id,
      license_number,
      requested_role,
      requested_supervisor_id,
      requested_manager_id,
      company_name,
      notes
    } = body;

    // Validate required fields
    if (!full_name || !email || !phone || !requested_role) {
      return NextResponse.json({
        error: 'חסרים שדות חובה: שם מלא, אימייל, טלפון, תפקיד'
      }, { status: 400 });
    }

    // Validate role
    const validRoles = ['agent', 'supervisor', 'manager', 'client'];
    if (!validRoles.includes(requested_role)) {
      return NextResponse.json({
        error: 'תפקיד לא חוקי'
      }, { status: 400 });
    }

    // Check if email already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({
        error: 'האימייל כבר רשום במערכת'
      }, { status: 400 });
    }

    // Check if pending request exists
    const { data: existingRequest } = await supabase
      .from('registration_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json({
        error: 'בקשת הרשמה כבר קיימת עבור אימייל זה'
      }, { status: 400 });
    }

    // For agents - try to match against Sela database
    let selaMatch = null;
    let matchConfidence = 0;
    let matchMethod = null;

    if (requested_role === 'agent' && (national_id || license_number)) {
      // Search by national_id first
      if (national_id) {
        const { data: matchByNationalId } = await supabase
          .from('custom_data')
          .select('*')
          .or(`"מזהה בעל רישיון".eq.${national_id},"מזהה בעל רישיון".ilike.%${national_id}%`)
          .limit(1)
          .single();

        if (matchByNationalId) {
          selaMatch = matchByNationalId;
          matchConfidence = 90;
          matchMethod = 'national_id';
        }
      }

      // If not found, try license number
      if (!selaMatch && license_number) {
        const { data: matchByLicense } = await supabase
          .from('custom_data')
          .select('*')
          .or(`"מספר רישיון".eq.${license_number},"מספר רישיון".ilike.%${license_number}%`)
          .limit(1)
          .single();

        if (matchByLicense) {
          selaMatch = matchByLicense;
          matchConfidence = 80;
          matchMethod = 'license';
        }
      }

      // If still not found, try fuzzy name match
      if (!selaMatch && full_name) {
        const { data: matchByName } = await supabase
          .from('custom_data')
          .select('*')
          .ilike('"שם בעל רישיון"', `%${full_name}%`)
          .limit(5);

        if (matchByName && matchByName.length > 0) {
          selaMatch = matchByName[0];
          matchConfidence = 50;
          matchMethod = 'name';
        }
      }
    }

    // Prepare insert data - only include non-empty fields
    const insertData: Record<string, unknown> = {
      full_name,
      email,
      phone,
      requested_role,
      status: 'pending'
    };

    // Add optional fields only if they have values
    if (national_id) insertData.national_id = national_id;
    if (license_number) insertData.license_number = license_number;
    if (requested_supervisor_id) insertData.requested_supervisor_id = requested_supervisor_id;
    if (requested_manager_id) insertData.requested_manager_id = requested_manager_id;
    if (company_name) insertData.company_name = company_name;
    if (notes) insertData.notes = notes;

    // Add Sela match data if found
    if (selaMatch) {
      insertData.sela_match_found = true;
      insertData.sela_match_id = selaMatch.id;
      insertData.sela_match_data = selaMatch;
      insertData.match_confidence = matchConfidence;
      insertData.match_method = matchMethod;
    }

    // Create registration request
    const { data: registration, error } = await supabase
      .from('registration_requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating registration:', error);

      // Check for common errors
      if (error.code === '42501') {
        return NextResponse.json({
          error: 'שגיאת הרשאות - פנה למנהל המערכת (RLS policy issue)'
        }, { status: 403 });
      }
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'בקשה עם אימייל זה כבר קיימת'
        }, { status: 400 });
      }
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'שגיאה בנתונים - מפקח או מנהל לא נמצא'
        }, { status: 400 });
      }

      return NextResponse.json({
        error: `שגיאה בשמירת הבקשה: ${error.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      registration,
      sela_match: selaMatch ? {
        found: true,
        confidence: matchConfidence,
        method: matchMethod,
        data: selaMatch
      } : { found: false }
    });

  } catch (error) {
    console.error('Registration POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: `שגיאה בשליחת הבקשה: ${message}`
    }, { status: 500 });
  }
}
