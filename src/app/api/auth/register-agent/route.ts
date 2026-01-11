import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface RegisterAgentRequest {
  full_name: string;
  email: string;
  mobile: string;
  id_number: string;
  supervisor_id: string;
  requested_role: 'agent' | 'supervisor';
}

/**
 * POST /api/auth/register-agent
 * Submit a registration request for an agent
 * Public endpoint (no auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegisterAgentRequest = await request.json();
    const { full_name, email, mobile, id_number, supervisor_id, requested_role } = body;

    // Validation
    if (!full_name || !email || !mobile || !id_number) {
      return NextResponse.json(
        { error: 'כל השדות הם חובה' },
        { status: 400 }
      );
    }

    if (requested_role === 'agent' && !supervisor_id) {
      return NextResponse.json(
        { error: 'יש לבחור מפקח' },
        { status: 400 }
      );
    }

    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'כתובת אימייל לא תקינה' },
        { status: 400 }
      );
    }

    // Israeli ID validation (9 digits)
    if (!/^[0-9]{9}$/.test(id_number)) {
      return NextResponse.json(
        { error: 'תעודת זהות חייבת להכיל 9 ספרות' },
        { status: 400 }
      );
    }

    // Phone validation (Israeli mobile)
    const cleanPhone = mobile.replace(/\D/g, '');
    if (!/^0[0-9]{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'מספר טלפון לא תקין' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists in registration_requests
    const { data: existingRequest } = await supabase
      .from('registration_requests')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'כבר קיימת בקשת הרשמה ממתינה עם אימייל זה' },
          { status: 400 }
        );
      }
      if (existingRequest.status === 'rejected') {
        return NextResponse.json(
          { error: 'בקשת ההרשמה עם אימייל זה נדחתה. אנא פנה למנהל.' },
          { status: 400 }
        );
      }
    }

    // Check if email already exists in user_profiles
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'משתמש עם אימייל זה כבר קיים במערכת' },
        { status: 400 }
      );
    }

    // Check if ID number already exists
    const { data: existingId } = await supabase
      .from('registration_requests')
      .select('id')
      .eq('id_number', id_number)
      .eq('status', 'pending')
      .single();

    if (existingId) {
      return NextResponse.json(
        { error: 'כבר קיימת בקשת הרשמה ממתינה עם תעודת זהות זו' },
        { status: 400 }
      );
    }

    // Verify supervisor exists (if agent)
    if (requested_role === 'agent') {
      const { data: supervisor, error: supervisorError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', supervisor_id)
        .eq('role', 'supervisor')
        .eq('is_active', true)
        .single();

      if (!supervisor) {
        // Try legacy supervisors table
        const { data: legacySupervisor } = await supabase
          .from('supervisors')
          .select('id')
          .eq('id', supervisor_id)
          .eq('is_active', true)
          .single();

        if (!legacySupervisor) {
          return NextResponse.json(
            { error: 'המפקח שנבחר אינו פעיל או לא קיים' },
            { status: 400 }
          );
        }
      }
    }

    // Create registration request
    const { data: registrationRequest, error: insertError } = await supabase
      .from('registration_requests')
      .insert({
        email: email.toLowerCase(),
        full_name,
        id_number,
        mobile: cleanPhone,
        requested_role,
        supervisor_id: requested_role === 'agent' ? supervisor_id : null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'שגיאה ביצירת בקשת ההרשמה' },
        { status: 500 }
      );
    }

    // TODO: Send notification email to supervisor/admin

    return NextResponse.json({
      success: true,
      message: 'בקשת ההרשמה נשלחה בהצלחה',
      requestId: registrationRequest.id,
    });
  } catch (error) {
    console.error('Register agent error:', error);
    return NextResponse.json(
      { error: 'שגיאה בשליחת בקשת ההרשמה' },
      { status: 500 }
    );
  }
}
