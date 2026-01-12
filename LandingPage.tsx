'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================
// NAVBAR COMPONENT
// ============================================
function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-slate-800 text-lg">SelaiOS</span>
            <span className="text-slate-400 text-xs block">INSURANCEAI SYSTEM</span>
          </div>
        </Link>

        {/* Login Button */}
        <Link
          href="/login"
          className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <span>כניסה למערכת</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}

// ============================================
// HERO SECTION
// ============================================
function HeroSection() {
  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-50 to-white relative overflow-hidden" dir="rtl">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}></div>
        {/* Vertical Lines */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="absolute top-0 h-full w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent"
            style={{ left: `${12.5 * (i + 1)}%` }}
          ></div>
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side - Text Content */}
          <div className="text-right">
            {/* Version Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full mb-8 shadow-sm">
              <span className="text-slate-500 text-sm font-medium">SELAIOS V1.0</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 text-sm">AI AGENT SWARM ACTIVE</span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-slate-800 block">SelaiOS</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-violet-600 block">
                InsuranceAI
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-violet-600 to-purple-600 block">
                System
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg text-slate-500 mb-8 leading-relaxed max-w-lg">
              פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח.
              <br />
              שילוב של סוכנים וירטואליים, אוטומציה ודאטה בזמן אמת.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-10">
              <Link
                href="/features"
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span>System Specs</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <span>Initialize Agent</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </Link>
            </div>

            {/* Tech Badges */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-500">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>Real-time Latency</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-500">
                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>LLM Powered</span>
              </div>
            </div>
          </div>

          {/* Right Side - Feature Cards */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {/* Communication Card */}
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
                iconBg="bg-cyan-50"
                title="Communication"
                subtitle="Omnichannel"
              />

              {/* Data Sync Card */}
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                }
                iconBg="bg-emerald-50"
                title="Data Sync"
                subtitle="Bi-directional"
              />

              {/* Core Card - Full Width */}
              <div className="col-span-2">
                <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-lg">SelaiOS Core</h3>
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      </div>
                      <p className="text-slate-400 text-sm">...Syncing with CRM database</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Card */}
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                iconBg="bg-slate-100"
                title="Security"
                subtitle="AES-256"
              />

              {/* AI Card */}
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
                iconBg="bg-purple-50"
                title="Generative AI"
                subtitle="GPT-4o / Claude"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Feature Card Component
function FeatureCard({ icon, iconBg, title, subtitle }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

// ============================================
// FEATURES SECTION
// ============================================
function FeaturesSection() {
  const features = [
    {
      icon: '🤖',
      title: 'סוכן AI אוטונומי',
      description: 'סוכן וירטואלי שעובד 24/7, מנתח נתונים ומנהל תקשורת אוטומטית',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '📊',
      title: 'דשבורד בזמן אמת',
      description: 'צפייה מיידית בלידים, עסקאות, פוליסות ועמלות במקום אחד',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: '💬',
      title: 'WhatsApp Bot חכם',
      description: 'בוט שעונה ללקוחות, מתאם פגישות ושולח תזכורות',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: '📁',
      title: 'ניהול מסמכים AI',
      description: 'סריקה אוטומטית, חילוץ נתונים ושמירה מאורגנת',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: '🔒',
      title: 'אבטחה מקסימלית',
      description: 'הצפנת נתונים, RLS, audit logs ותאימות רגולטורית',
      gradient: 'from-slate-600 to-slate-800',
    },
    {
      icon: '📈',
      title: 'אנליטיקס מתקדם',
      description: 'דוחות חכמים, תחזיות AI וניתוח פערי כיסוי',
      gradient: 'from-indigo-500 to-purple-500',
    },
  ];

  return (
    <section className="py-24 bg-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-medium text-sm uppercase tracking-wider">יכולות המערכת</span>
          <h2 className="text-4xl font-bold text-slate-800 mt-4">
            כל מה שצריך לסוכנות ביטוח חכמה
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="group p-8 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all">
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-2xl mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// STATS SECTION
// ============================================
function StatsSection() {
  const stats = [
    { value: '410+', label: 'סוכנים פעילים', icon: '👥' },
    { value: '50K+', label: 'פוליסות מנוהלות', icon: '📋' },
    { value: '99.9%', label: 'זמינות מערכת', icon: '⚡' },
    { value: '70%', label: 'חיסכון בזמן', icon: '⏱️' },
  ];

  return (
    <section className="py-20 bg-slate-800" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTA SECTION
// ============================================
function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 to-purple-700" dir="rtl">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          מוכנים להפוך לסוכנות חכמה?
        </h2>
        <p className="text-xl text-blue-100 mb-10">
          הצטרפו למאות סוכנים שכבר משתמשים ב-SELAI
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="px-8 py-4 bg-white text-blue-600 rounded-xl font-medium hover:bg-gray-100">
            התחל תקופת ניסיון
          </Link>
          <Link href="/contact" className="px-8 py-4 border-2 border-white text-white rounded-xl font-medium hover:bg-white/10">
            תאם שיחת הדגמה
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-white font-bold text-xl">SelaiOS</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} SELAI. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN LANDING PAGE
// ============================================
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
