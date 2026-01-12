import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    if (data.user) {
      // Check if user exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, is_profile_complete, is_approved')
        .eq('auth_id', data.user.id)
        .single();

      if (!existingUser) {
        // Create new user record
        await supabase.from('users').insert({
          auth_id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          avatar_url: data.user.user_metadata?.avatar_url,
          user_type: 'pending',
          is_active: false,
          is_profile_complete: false,
          is_approved: false,
        });

        // Redirect to complete profile
        return NextResponse.redirect(`${origin}/complete-profile`);
      }

      // Existing user - check status and redirect accordingly
      if (!existingUser.is_profile_complete) {
        return NextResponse.redirect(`${origin}/complete-profile`);
      }

      if (!existingUser.is_approved) {
        return NextResponse.redirect(`${origin}/pending-approval`);
      }

      // Fully approved user - go to dashboard
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // No code or error - redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
