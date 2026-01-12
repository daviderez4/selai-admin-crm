'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/sela-logo.png"
                alt="סלע ביטוח"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-white font-bold text-xl">SelaiOS</span>
            </div>
            <p className="text-slate-400 mb-6 max-w-md">
              פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח. שילוב של סוכנים וירטואליים, אוטומציה ודאטה בזמן אמת.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">קישורים מהירים</h4>
            <ul className="space-y-2">
              <li><Link href="/login" className="hover:text-white transition-colors">כניסה למערכת</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">הרשמה</Link></li>
              <li><Link href="/portal" className="hover:text-white transition-colors">פורטל לקוחות</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">יצירת קשר</h4>
            <ul className="space-y-2">
              <li>support@selai.co.il</li>
              <li>03-1234567</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">&copy; {new Date().getFullYear()} SELAI. כל הזכויות שמורות.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link>
            <Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
