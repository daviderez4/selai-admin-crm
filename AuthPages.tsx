'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// ============================================
// MODERN LOGIN PAGE
// ============================================
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState<'agent' | 'client'>('agent');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      // Redirect based on login type
      if (loginType === 'agent') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/portal';
      }
    }, 1500);
  };

  const handleGoogleLogin = () => {
    // Implement Google OAuth
    console.log('Google login');
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <span className="text-slate-800 font-bold text-xl">SelaiOS</span>
              <span className="text-slate-400 text-xs block">InsuranceAI System</span>
            </div>
          </Link>

          <h1 className="text-3xl font-bold text-slate-800 mb-2">ברוכים הבאים</h1>
          <p className="text-slate-500 mb-8">התחבר לחשבון שלך כדי להמשיך</p>

          {/* Login Type Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1.5 mb-8">
            <button
              onClick={() => setLoginType('agent')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginType === 'agent'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              סוכן / מנהל
            </button>
            <button
              onClick={() => setLoginType('client')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginType === 'client'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              לקוח
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-slate-50 focus:bg-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">סיסמה</label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  שכחת סיסמה?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-slate-50 focus:bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-l from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  מתחבר...
                </span>
              ) : (
                'התחבר'
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400">או התחבר עם</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3.5 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 flex items-center justify-center gap-3 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-slate-700">Google</span>
          </button>

          <p className="text-center text-sm text-slate-500 mt-8">
            אין לך חשבון?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              הרשם עכשיו
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="relative text-center z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30">
            <span className="text-white font-bold text-4xl">S</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">SelaiOS</h2>
          <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
            פלטפורמת ה-AI המתקדמת לניהול סוכנויות ביטוח.
            שילוב של סוכנים וירטואליים, אוטומציה ודאטה בזמן אמת.
          </p>

          <div className="mt-12 flex items-center justify-center gap-10">
            <div className="text-center">
              <p className="text-4xl font-bold text-white">410+</p>
              <p className="text-sm text-slate-400 mt-1">סוכנים</p>
            </div>
            <div className="w-px h-12 bg-slate-700"></div>
            <div className="text-center">
              <p className="text-4xl font-bold text-white">50K+</p>
              <p className="text-sm text-slate-400 mt-1">פוליסות</p>
            </div>
            <div className="w-px h-12 bg-slate-700"></div>
            <div className="text-center">
              <p className="text-4xl font-bold text-white">99.9%</p>
              <p className="text-sm text-slate-400 mt-1">זמינות</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// REGISTER PAGE
// ============================================
export function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'agent',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    
    setIsLoading(true);
    // Simulate registration
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = '/complete-profile';
    }, 1500);
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <span className="text-slate-800 font-bold text-xl">SelaiOS</span>
              <span className="text-slate-400 text-xs block">InsuranceAI System</span>
            </div>
          </Link>

          <h1 className="text-3xl font-bold text-slate-800 mb-2">צור חשבון חדש</h1>
          <p className="text-slate-500 mb-8">הצטרף למאות סוכנים שכבר משתמשים ב-SELAI</p>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">שם מלא</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white"
                    placeholder="ישראל ישראלי"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">אימייל</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">טלפון</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white"
                    placeholder="050-1234567"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">סיסמה</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-slate-400 mt-1">לפחות 8 תווים</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">אימות סיסמה</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">סוג משתמש</label>
                  <select
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 focus:bg-white"
                  >
                    <option value="agent">סוכן ביטוח</option>
                    <option value="supervisor">מפקח</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-4 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
                >
                  חזור
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 bg-gradient-to-l from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
              >
                {isLoading ? 'נרשם...' : step === 1 ? 'המשך' : 'צור חשבון'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              התחבר
            </Link>
          </p>

          <p className="text-center text-xs text-slate-400 mt-6">
            בהרשמה אתה מאשר את{' '}
            <Link href="/terms" className="underline">תנאי השימוש</Link>
            {' '}ו
            <Link href="/privacy" className="underline">מדיניות הפרטיות</Link>
          </p>
        </div>
      </div>

      {/* Right Side - Visual (same as login) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative text-center z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30">
            <span className="text-white font-bold text-4xl">S</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">הצטרף אלינו</h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            הפוך לסוכן ביטוח חכם עם כלי AI מתקדמים
          </p>

          <div className="mt-12 space-y-4 text-right">
            {[
              'דשבורד אישי בזמן אמת',
              'ניהול לידים ועסקאות',
              'אוטומציה של משימות',
              'בוט WhatsApp חכם',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FORGOT PASSWORD PAGE
// ============================================
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Link href="/" className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
          </Link>

          {isSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">נשלח בהצלחה!</h1>
              <p className="text-slate-500 mb-6">
                שלחנו לך מייל עם הוראות לאיפוס הסיסמה
              </p>
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                חזור להתחברות
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">שכחת סיסמה?</h1>
              <p className="text-slate-500 mb-8 text-center">
                הזן את האימייל שלך ונשלח לך קישור לאיפוס
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">אימייל</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-l from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? 'שולח...' : 'שלח קישור לאיפוס'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                <Link href="/login" className="text-blue-600 hover:underline">
                  חזור להתחברות
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
};
