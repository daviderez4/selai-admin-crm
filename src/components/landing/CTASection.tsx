'use client';

import Link from 'next/link';

export function CTASection() {
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
          <Link href="/register" className="px-8 py-4 bg-white text-blue-600 rounded-xl font-medium hover:bg-gray-100 transition-colors">
            התחל תקופת ניסיון
          </Link>
          <Link href="/portal" className="px-8 py-4 border-2 border-white text-white rounded-xl font-medium hover:bg-white/10 transition-colors">
            כניסה לפורטל לקוחות
          </Link>
        </div>
      </div>
    </section>
  );
}
