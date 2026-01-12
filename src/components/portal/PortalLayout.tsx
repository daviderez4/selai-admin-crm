'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const portalLinks = [
  { href: '/portal', label: 'סקירה כללית', icon: '🏠' },
  { href: '/portal/policies', label: 'הפוליסות שלי', icon: '📋' },
  { href: '/portal/documents', label: 'מסמכים', icon: '📁' },
  { href: '/portal/messages', label: 'הודעות', icon: '💬' },
  { href: '/portal/claims', label: 'תביעות', icon: '📝' },
  { href: '/portal/profile', label: 'פרופיל', icon: '👤' },
];

interface PortalLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    agent: {
      name: string;
      phone: string;
      email: string;
    };
  };
}

export function PortalLayout({ children, user }: PortalLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const defaultUser = user || {
    name: 'אורח',
    email: '',
    agent: {
      name: 'ישראל ישראלי',
      phone: '050-1234567',
      email: 'agent@selai.co.il'
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/portal" className="flex items-center gap-3">
              <Image
                src="/sela-logo.png"
                alt="סלע ביטוח"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <div>
                <span className="text-slate-800 font-bold">SelaiOS</span>
                <span className="text-slate-400 text-xs block">פורטל לקוחות</span>
              </div>
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden sm:block">שלום, {defaultUser.name}</span>
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
                התנתק
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="space-y-1 sticky top-24">
              {portalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    pathname === link.href
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Agent Card */}
            <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-xs text-slate-400 mb-2">הסוכן שלי</p>
              <p className="font-medium text-slate-800">{defaultUser.agent.name}</p>
              <p className="text-sm text-blue-600">{defaultUser.agent.phone}</p>
            </div>
          </aside>

          {/* Mobile Sidebar */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
              <aside className="absolute right-0 top-0 h-full w-72 bg-white p-6 shadow-xl">
                <nav className="space-y-1">
                  {portalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                        pathname === link.href
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600'
                      }`}
                    >
                      <span className="text-xl">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </nav>
              </aside>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
