'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  User, Phone, CreditCard, Mail, Lock, Eye, EyeOff,
  Loader2, CheckCircle, Users, Shield, UserCog, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Supervisor {
  id: string;
  name: string;
  agents_count: number;
}

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    national_id: '',
    email: '',
    password: '',
    confirmPassword: '',
    user_type: '',
    supervisor_id: '',
  });

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const response = await fetch('/api/selai/supervisors');
      const data = await response.json();
      if (data.success && data.data?.supervisors) {
        setSupervisors(data.data.supervisors);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const validateIsraeliId = (id: string): boolean => {
    if (!/^\d{9}$/.test(id)) return false;
    const digits = id.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let num = digits[i] * ((i % 2) + 1);
      if (num > 9) num -= 9;
      sum += num;
    }
    return sum % 10 === 0;
  };

  const validatePhone = (phone: string): boolean => {
    return /^0[0-9]{8,9}$/.test(phone);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.full_name.trim()) {
      toast.error('נא להזין שם מלא');
      return;
    }

    if (!formData.phone) {
      toast.error('נא להזין מספר טלפון');
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('מספר טלפון לא תקין (יש להזין 9-10 ספרות החל מ-0)');
      return;
    }

    if (!formData.national_id) {
      toast.error('נא להזין תעודת זהות');
      return;
    }

    if (!validateIsraeliId(formData.national_id)) {
      toast.error('תעודת זהות לא תקינה');
      return;
    }

    if (!formData.email) {
      toast.error('נא להזין כתובת אימייל');
      return;
    }

    if (!validateEmail(formData.email)) {
      toast.error('כתובת אימייל לא תקינה');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('סיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }

    // If role is agent, supervisor is required
    if (formData.user_type === 'agent' && !formData.supervisor_id) {
      toast.error('סוכן חייב לבחור מפקח');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          phone: formData.phone,
          national_id: formData.national_id,
          email: formData.email.trim(),
          password: formData.password,
          user_type: formData.user_type || 'agent',
          supervisor_id: formData.supervisor_id || null,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'Email already registered') {
          toast.error('כתובת האימייל כבר רשומה במערכת');
        } else {
          toast.error(data.error || 'שגיאה בהרשמה');
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.success('ההרשמה בוצעה בהצלחה!');

      // Redirect to pending approval
      setTimeout(() => {
        router.push('/pending-approval');
      }, 2000);

    } catch (err: any) {
      console.error('Signup error:', err);
      toast.error('שגיאה בהרשמה. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4" dir="rtl">
        <div className="fixed top-6 left-6">
          <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} priority />
        </div>

        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">ההרשמה הושלמה!</h2>
            <p className="text-slate-600 mb-6">
              הבקשה שלך נשלחה לאישור מנהל המערכת.
              <br />
              תקבל הודעה באימייל כאשר החשבון יאושר.
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4 py-8" dir="rtl">
      {/* Logo */}
      <div className="fixed top-6 left-6 z-10">
        <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} priority />
      </div>

      <Card className="w-full max-w-lg bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold text-slate-800">הרשמה לסלע</CardTitle>
          <CardDescription className="text-slate-500 text-base">
            מלא את הפרטים להצטרפות למערכת
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-slate-700 font-medium">
                שם מלא <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pr-11 h-12 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  placeholder="ישראל ישראלי"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700 font-medium">
                סלולרי <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className="pr-11 h-12 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  placeholder="0501234567"
                  maxLength={10}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* National ID */}
            <div className="space-y-2">
              <Label htmlFor="national_id" className="text-slate-700 font-medium">
                תעודת זהות <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="national_id"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className="pr-11 h-12 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  placeholder="123456789"
                  maxLength={9}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                אימייל <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pr-11 h-12 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Role Selection - Optional */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                תפקיד <span className="text-slate-400 text-sm font-normal">(אופציונלי)</span>
              </Label>
              <Select
                value={formData.user_type}
                onValueChange={(value) => setFormData({ ...formData, user_type: value, supervisor_id: '' })}
                disabled={isLoading}
              >
                <SelectTrigger className="h-12 bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20">
                  <SelectValue placeholder="בחר תפקיד (לא חובה)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>סוכן</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="supervisor">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-indigo-600" />
                      <span>מפקח</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-indigo-600" />
                      <span>מנהל</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Supervisor Selection - Required for agents */}
            {formData.user_type === 'agent' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-slate-700 font-medium">
                  מפקח אחראי <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.supervisor_id}
                  onValueChange={(value) => setFormData({ ...formData, supervisor_id: value })}
                  disabled={isLoading || loadingSupervisors}
                >
                  <SelectTrigger className="h-12 bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20">
                    <SelectValue placeholder={loadingSupervisors ? 'טוען מפקחים...' : 'בחר מפקח'} />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.length === 0 ? (
                      <SelectItem value="" disabled>אין מפקחים זמינים</SelectItem>
                    ) : (
                      supervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Divider */}
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400">הגדרת סיסמה</span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                סיסמה <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-11 pl-11 h-12 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  placeholder="לפחות 6 תווים"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                אימות סיסמה <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pr-11 h-12 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  placeholder="הזן שוב את הסיסמה"
                  disabled={isLoading}
                />
              </div>
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  הסיסמאות אינן תואמות
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-lg transition-all duration-200 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin ml-2" />
                  שולח בקשה...
                </>
              ) : (
                'שלח לאישור'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              כבר יש לך חשבון?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                התחבר כאן
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
