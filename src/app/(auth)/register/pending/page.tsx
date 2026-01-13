'use client';

import Link from 'next/link';
import { Clock, Mail, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <Clock className="w-12 h-12 text-amber-400" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">בקשתך נקלטה בהצלחה</h1>
        <p className="text-slate-400 text-lg mb-8">
          בקשת ההרשמה שלך ממתינה לאישור מנהל המערכת
        </p>

        {/* Status Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">מה הלאה?</h3>
          <div className="space-y-4 text-right">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">הבקשה שלך נבדקת על ידי צוות המערכת</p>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">תקבל הודעה במייל כאשר הבקשה תאושר</p>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">ייתכן שניצור איתך קשר לאימות פרטים</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
          <p className="text-blue-400 text-sm">
            שאלות? צור קשר: support@selai.app
          </p>
        </div>

        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
