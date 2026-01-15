/**
 * @feature AUTH-REG-005
 * @module Authentication
 * @description Admin approval/rejection of registration requests
 * @related AUTH-REG-001, AUTH-REG-004
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { decryptPassword } from '@/app/api/auth/register-request/route';

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

    if (!['pending', 'needs_review'].includes(registration.status)) {
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

    // Handle approval - Create auth user and user record
    if (action === 'approve') {
      const adminClient = createAdminClient();
      let authUserId: string | null = null;

      // Step 1: Check if auth user already exists
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(
        u => u.email?.toLowerCase() === registration.email.toLowerCase()
      );

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
        // Make sure email is confirmed for existing users
        if (!existingAuthUser.email_confirmed_at) {
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            email_confirm: true,
          });
        }
      } else {
        // Step 2: Create auth user with stored password
        if (!registration.encrypted_password) {
          return NextResponse.json({
            error: 'No password stored for this registration. User must re-register.'
          }, { status: 400 });
        }

        const password = decryptPassword(registration.encrypted_password);

        const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
          email: registration.email.toLowerCase(),
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: registration.full_name,
            phone: registration.phone,
          }
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          return NextResponse.json({
            error: `Failed to create auth user: ${authError.message}`
          }, { status: 500 });
        }

        authUserId = newAuthUser.user.id;
      }

      // Step 3: Check if user record exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', registration.email.toLowerCase())
        .maybeSingle();

      // Step 3.5: Validate supervisor_id exists in users table (if provided)
      let validSupervisorId = null;
      const requestedSupervisorId = registration.requested_supervisor_id || registration.supervisor_id;
      if (requestedSupervisorId) {
        const { data: supervisorExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', requestedSupervisorId)
          .maybeSingle();

        if (supervisorExists) {
          validSupervisorId = requestedSupervisorId;
        } else {
          console.log(`Supervisor ${requestedSupervisorId} not found in users table, skipping assignment`);
        }
      }

      // Step 3.6: Validate manager_id exists in users table (if provided)
      let validManagerId = null;
      if (registration.requested_manager_id) {
        const { data: managerExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', registration.requested_manager_id)
          .maybeSingle();

        if (managerExists) {
          validManagerId = registration.requested_manager_id;
        }
      }

      let newUser;
      let userError;

      if (existingUser) {
        // Update existing user record
        const { data, error } = await supabase
          .from('users')
          .update({
            auth_id: authUserId,
            full_name: registration.full_name,
            phone: registration.phone,
            id_number: registration.id_number || registration.national_id,
            license_number: registration.license_number,
            user_type: registration.requested_role || 'agent',
            supervisor_id: validSupervisorId,
            manager_id: validManagerId,
            approved_by: reviewer.id,
            approved_at: new Date().toISOString(),
            is_active: true,
            is_approved: true,
          })
          .eq('id', existingUser.id)
          .select()
          .single();
        newUser = data;
        userError = error;
      } else {
        // Create new user record
        const { data, error } = await supabase
          .from('users')
          .insert({
            auth_id: authUserId,
            email: registration.email.toLowerCase(),
            full_name: registration.full_name,
            phone: registration.phone,
            id_number: registration.id_number || registration.national_id,
            license_number: registration.license_number,
            user_type: registration.requested_role || 'agent',
            supervisor_id: validSupervisorId,
            manager_id: validManagerId,
            approved_by: reviewer.id,
            approved_at: new Date().toISOString(),
            is_active: true,
            is_approved: true,
          })
          .select()
          .single();
        newUser = data;
        userError = error;
      }

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

      // Update registration request (clear password for security)
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({
          status: 'approved',
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes,
          created_user_id: newUser.id,
          encrypted_password: null, // Clear password after use
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
