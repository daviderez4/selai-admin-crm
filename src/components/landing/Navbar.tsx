'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
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
          <Image
            src="/sela-logo.png"
            alt="סלע ביטוח"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <div>
            <span className="font-bold text-slate-800 text-lg">SelaiOS</span>
            <span className="text-slate-400 text-xs block">INSURANCE AI SYSTEM</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-slate-600 hover:text-slate-800 text-sm">
            יכולות
          </Link>
          <Link href="#stats" className="text-slate-600 hover:text-slate-800 text-sm">
            נתונים
          </Link>
          <Link href="/portal" className="text-slate-600 hover:text-slate-800 text-sm">
            פורטל לקוחות
          </Link>
        </div>

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
