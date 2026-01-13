import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();
    const { action, rejection_reason, reviewer_notes } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get reviewer info
    const { data: reviewer } = await supabase
      .from('users')
      .select('id, user_type, full_name')
      .eq('auth_id', user.id)
      .single();

    if (!reviewer || !['admin', 'manager', 'supervisor'].includes(reviewer.user_type)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get registration request
    const { data: registration, error: fetchError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.status !== 'pending') {
      return NextResponse.json({ error: 'Registration already processed' }, { status: 400 });
    }

    // Handle rejection
    if (action === 'reject') {
      const { error: rejectError } = await supabase
        .from('registration_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes,
          rejection_reason
        })
        .eq('id', id);

      if (rejectError) {
        return NextResponse.json({ error: rejectError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // Handle approval - Create user account
    if (action === 'approve') {
      // Create user record
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: registration.email,
          full_name: registration.full_name,
          phone: registration.phone,
          national_id: registration.national_id,
          license_number: registration.license_number,
          user_type: registration.requested_role,
          supervisor_id: registration.requested_supervisor_id,
          manager_id: registration.requested_manager_id,
          sela_agent_id: registration.sela_match_id,
          sela_data: registration.sela_match_data,
          verification_status: registration.sela_match_found ? 'verified' : 'pending',
          approved_by: reviewer.id,
          approved_at: new Date().toISOString(),
          is_active: true,
          is_profile_complete: false,
          portal_access: registration.requested_role === 'client'
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }

      // Create contact record for CRM
      const contactData: Record<string, unknown> = {
        full_name: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        contact_type: registration.requested_role === 'client' ? 'client' : 'team_member',
        status: 'active',
        user_id: newUser.id,
        notes: `נוצר אוטומטית מבקשת הרשמה. תפקיד: ${registration.requested_role}`
      };

      // Add to supervisor's contacts if agent
      if (registration.requested_role === 'agent' && registration.requested_supervisor_id) {
        contactData.assigned_to = registration.requested_supervisor_id;
      }

      // Add to agent's contacts if client
      if (registration.requested_role === 'client' && registration.agent_id) {
        contactData.assigned_to = registration.agent_id;
      }

      const { data: contact, error: contactError } = await supabase
        .from('crm_contacts')
        .insert(contactData)
        .select()
        .single();

      if (contactError) {
        console.error('Error creating contact:', contactError);
        // Don't fail the whole operation, just log it
      }

      // Update registration request
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({
          status: 'approved',
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes,
          created_user_id: newUser.id
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating registration:', updateError);
      }

      // Send welcome message (if user_messages table exists)
      try {
        await supabase.from('user_messages').insert({
          from_user_id: reviewer.id,
          to_user_id: newUser.id,
          subject: 'ברוכים הבאים ל-SELAI!',
          content: `שלום ${registration.full_name},\n\nבקשת ההרשמה שלך אושרה בהצלחה.\nכעת תוכל להתחבר למערכת ולהשלים את הפרופיל שלך.\n\nבברכה,\n${reviewer.full_name}`,
          message_type: 'system'
        });
      } catch {
        // Ignore if messages table doesn't exist
      }

      return NextResponse.json({
        success: true,
        status: 'approved',
        user: newUser,
        contact
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
