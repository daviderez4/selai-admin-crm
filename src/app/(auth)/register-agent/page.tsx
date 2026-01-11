'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  UserCheck,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Supervisor {
  id: string;
  full_name: string;
  email?: string;
}

export default function RegisterAgentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSupervisors, setIsLoadingSupervisors] = useState(true);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    id_number: '',
    supervisor_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch supervisors on mount
  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const response = await fetch('/api/auth/supervisors');
      if (response.ok) {
        const data = await response.json();
        setSupervisors(data.supervisors || []);
      }
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
    } finally {
      setIsLoadingSupervisors(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'שם מלא הוא שדה חובה';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'אימייל הוא שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'מספר טלפון הוא שדה חובה';
    } else if (!/^0[0-9]{9}$/.test(formData.mobile.replace(/-/g, ''))) {
      newErrors.mobile = 'מספר טלפון לא תקין (10 ספרות)';
    }

    if (!formData.id_number.trim()) {
      newErrors.id_number = 'תעודת זהות היא שדה חובה';
    } else if (!/^[0-9]{9}$/.test(formData.id_number)) {
      newErrors.id_number = 'תעודת זהות חייבת להכיל 9 ספרות';
    }

    if (!formData.supervisor_id) {
      newErrors.supervisor_id = 'יש לבחור מפקח';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requested_role: 'agent',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשליחת הבקשה');
      }

      setSubmitted(true);
      toast.success('הבקשה נשלחה בהצלחה!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליחת הבקשה');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">הבקשה נשלחה בהצלחה!</h2>
            <p className="text-muted-foreground mb-6">
              הבקשה שלך להרשמה כסוכן נשלחה לאישור.
              <br />
              תקבל הודעה באימייל כשהבקשה תאושר.
            </p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                המפקח שבחרת: <strong>{supervisors.find(s => s.id === formData.supervisor_id)?.full_name}</strong>
              </p>
              <Button asChild className="w-full">
                <Link href="/login">
                  חזרה לדף הכניסה
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/sela-logo.png"
              alt="SELA Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="text-2xl">הרשמה כסוכן</CardTitle>
          <CardDescription>
            מלא את הפרטים להרשמה למערכת SELAI
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">שם מלא</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  placeholder="ישראל ישראלי"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`pr-10 ${errors.full_name ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.full_name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.full_name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`pr-10 ${errors.email ? 'border-red-500' : ''}`}
                  dir="ltr"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="mobile">טלפון נייד</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="0501234567"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className={`pr-10 ${errors.mobile ? 'border-red-500' : ''}`}
                  dir="ltr"
                />
              </div>
              {errors.mobile && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.mobile}
                </p>
              )}
            </div>

            {/* ID Number */}
            <div className="space-y-2">
              <Label htmlFor="id_number">תעודת זהות</Label>
              <div className="relative">
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="id_number"
                  placeholder="123456789"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className={`pr-10 ${errors.id_number ? 'border-red-500' : ''}`}
                  dir="ltr"
                />
              </div>
              {errors.id_number && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.id_number}
                </p>
              )}
            </div>

            {/* Supervisor Selection */}
            <div className="space-y-2">
              <Label htmlFor="supervisor">בחירת מפקח</Label>
              <div className="relative">
                <UserCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Select
                  value={formData.supervisor_id}
                  onValueChange={(value) => setFormData({ ...formData, supervisor_id: value })}
                  disabled={isLoadingSupervisors}
                >
                  <SelectTrigger className={`pr-10 ${errors.supervisor_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder={isLoadingSupervisors ? 'טוען מפקחים...' : 'בחר את המפקח שלך'} />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        {supervisor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.supervisor_id && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.supervisor_id}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                בחר את המפקח האחראי עליך. הוא יקבל הודעה על בקשת ההרשמה.
              </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שולח בקשה...
                </>
              ) : (
                'שלח בקשת הרשמה'
              )}
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-muted-foreground">
              כבר יש לך חשבון?{' '}
              <Link href="/login" className="text-primary hover:underline">
                התחבר כאן
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
