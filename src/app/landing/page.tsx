import {
  Navbar,
  HeroSection,
  FeaturesSection,
  StatsSection,
  CTASection,
  Footer,
} from '@/components/landing';

export const metadata = {
  title: 'SelaiOS - מערכת AI לניהול סוכנויות ביטוח',
  description: 'פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח. שילוב של סוכנים וירטואליים, אוטומציה ודאטה בזמן אמת.',
};

export default function LandingPage() {
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
