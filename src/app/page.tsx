import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  Navbar,
  HeroSection,
  FeaturesSection,
  StatsSection,
  CTASection,
  Footer,
} from '@/components/landing';

export default async function HomePage() {
  // Check if user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If logged in, check if user exists in users table and redirect appropriately
  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, user_type, is_active, is_approved')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (userProfile && userProfile.is_active && userProfile.is_approved) {
      // Redirect based on user type
      switch (userProfile.user_type) {
        case 'admin':
        case 'manager':
          redirect('/admin');
          break;
        case 'supervisor':
          redirect('/supervisor');
          break;
        case 'agent':
          redirect('/agent');
          break;
        case 'client':
          redirect('/portal');
          break;
        default:
          redirect('/dashboard');
      }
    }
  }

  // Show landing page for non-authenticated users
  return (
    <main className="bg-white">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </main>
  );
}
