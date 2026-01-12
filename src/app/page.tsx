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

  // If logged in, check if user exists in users table and redirect to dashboard
  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, role, is_active')
      .eq('email', user.email)
      .single();

    if (userProfile && userProfile.is_active) {
      redirect('/dashboard');
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
