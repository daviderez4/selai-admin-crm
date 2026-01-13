'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2
} from 'lucide-react';

interface Supervisor {
  id: string;
  full_name: string;
  email: string;
}

interface SelaMatch {
  found: boolean;
  confidence: number;
  method: string;
  data: Record<string, unknown>;
}

export default function AgentRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selaMatch, setSelaMatch] = useState<SelaMatch | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const requestedRole = roleParam || 'agent';
  const roleLabel = requestedRole === 'supervisor' ? 'מפקח / מנהל צוות' :
                    requestedRole === 'client' ? 'לקוח' : 'סוכן ביטוח';

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    national_id: '',
    license_number: '',
    requested_supervisor_id: '',
    company_name: '',
    notes: ''
  });

  // Fetch supervisors on mount
  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/users/supervisors');
      const data = await res.json();
      if (data.supervisors) {
        setSupervisors(data.supervisors);
      }
    } catch (err) {
      console.error('Error fetching supervisors:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const checkSelaDatabase = async () => {
    if (!formData.national_id && !formData.license_number) {
      return;
    }

    setChecking(true);
    try {
      // This would be a separate API call to check Sela DB
      // For now, we'll do it during submission
      setSelaMatch(null);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requested_role: requestedRole
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בשליחת הבקשה');
      }

      if (data.sela_match) {
        setSelaMatch(data.sela_match);
      }

      setSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/register/pending');
      }, 3000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאה בשליחת הבקשה';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">הבקשה נשלחה בהצלחה!</h2>
          <p className="text-slate-400 mb-4">בקשת ההרשמה שלך נקלטה במערכת וממתינה לאישור.</p>

          {selaMatch?.found && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-400 text-sm">
                ✅ נמצאה התאמה במאגר סוכני סלע ({selaMatch.confidence}% התאמה)
              </p>
            </div>
          )}

          <p className="text-slate-500 text-sm">מעביר לדף ההמתנה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4" dir="rtl">
      <div className="w-full max-w-2xl mx-auto">
        {/* Back Link */}
        <Link href="/register" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה לבחירת סוג חשבון
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">הרשמה כ{roleLabel}</h1>
          <p className="text-slate-400">מלא את הפרטים להגשת בקשת הרשמה</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-blue-500' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">פרטים אישיים</h3>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <User className="w-4 h-4 inline ml-2" />
                  שם מלא *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הכנס שם מלא"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Mail className="w-4 h-4 inline ml-2" />
                  אימייל *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Phone className="w-4 h-4 inline ml-2" />
                  טלפון נייד *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="050-0000000"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.full_name || !formData.email || !formData.phone}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                המשך
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">פרטי רישום</h3>

              {/* National ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <CreditCard className="w-4 h-4 inline ml-2" />
                  תעודת זהות
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="national_id"
                    value={formData.national_id}
                    onChange={handleChange}
                    onBlur={checkSelaDatabase}
                    maxLength={9}
                    dir="ltr"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                    placeholder="000000000"
                  />
                  {checking && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">לצורך אימות מול מאגר סוכני סלע</p>
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <FileText className="w-4 h-4 inline ml-2" />
                  מספר רישיון סוכן
                </label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleChange}
                  onBlur={checkSelaDatabase}
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="L-00000000"
                />
              </div>

              {/* Supervisor Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Users className="w-4 h-4 inline ml-2" />
                  מפקח / מנהל
                </label>
                <select
                  name="requested_supervisor_id"
                  value={formData.requested_supervisor_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- בחר מפקח --</option>
                  {supervisors.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.full_name} ({sup.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  הערות נוספות
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="הערות או מידע נוסף..."
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  חזור
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    'שלח בקשת הרשמה'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
