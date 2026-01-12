import {
  Navbar,
  HeroSection,
  FeaturesSection,
  StatsSection,
  CTASection,
  Footer,
} from '@/components/landing';

export default function HomePage() {
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
