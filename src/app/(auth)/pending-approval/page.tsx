'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Mail, Phone, User, RefreshCw, CheckCircle2, ArrowRight, LogIn, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface RegistrationRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: 'pending' | 'needs_review' | 'approved' | 'rejected';
  requested_role: string;
  matched_external_id: string | null;
  match_score: number;
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [request, setRequest] = useState<RegistrationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get email from URL params or localStorage
    const urlEmail = searchParams.get('email');
    const storedEmail = localStorage.getItem('pending_registration_email');
    const emailToUse = urlEmail || storedEmail;

    if (emailToUse) {
      setEmail(emailToUse);
      localStorage.setItem('pending_registration_email', emailToUse);
      checkStatus(emailToUse);
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  const checkStatus = async (checkEmail: string) => {
    try {
      const supabase = createClient();

      // Check registration_requests table by email
      const { data: regRequest, error } = await supabase
        .from('registration_requests')
        .select('id, full_name, email, phone, status, requested_role, matched_external_id, match_score')
        .eq('email', checkEmail.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching request:', error);
        setIsLoading(false);
        return;
      }

      if (!regRequest) {
        // No registration request found
        toast.error('לא נמצאה בקשת הרשמה');
        setIsLoading(false);
        return;
      }

      if (regRequest.status === 'approved') {
        toast.success('החשבון אושר! כעת תוכל להתחבר');
        localStorage.removeItem('pending_registration_email');
        router.push('/login');
        return;
      }

      if (regRequest.status === 'rejected') {
        // Keep the request data to show rejection UI with re-register option
        setRequest(regRequest);
        setIsLoading(false);
        return;
      }

      setRequest(regRequest);
      setIsLoading(false);
    } catch (err) {
      console.error('Error checking status:', err);
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!email) return;
    setIsRefreshing(true);
    await checkStatus(email);
    setIsRefreshing(false);
    if (request?.status === 'pending' || request?.status === 'needs_review') {
      toast.info('עדיין ממתין לאישור...');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
        <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No email provided - show message
  if (!email || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4" dir="rtl">
        <div className="fixed top-6 left-6">
          <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} priority />
        </div>

        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <Mail className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">לא נמצאה בקשה</h2>
            <p className="text-slate-500 mb-6">
              אין בקשת הרשמה פתוחה עבורך.
            </p>
            <div className="space-y-3">
              <Link href="/signup">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <ArrowRight className="h-4 w-4 ml-2" />
                  הירשם למערכת
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <LogIn className="h-4 w-4 ml-2" />
                  התחבר
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle rejected status - show special UI with re-register option
  if (request.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 p-4" dir="rtl">
        <div className="fixed top-6 left-6">
          <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} priority />
        </div>

        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-red-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-800">בקשת ההרשמה נדחתה</CardTitle>
            <CardDescription className="text-red-600">
              לצערנו, בקשת ההרשמה שלך לא אושרה.
              <br />
              תוכל לנסות להירשם שוב עם פרטים מעודכנים.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* User Details */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 mb-2">פרטים שנשלחו:</h3>

              <div className="flex items-center gap-3 text-slate-700">
                <User className="h-4 w-4 text-slate-400" />
                <span>{request.full_name}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{request.email}</span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              <span className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-600">
                נדחה
              </span>
            </div>

            {/* Info Message */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-700 text-center">
                אם אתה סבור שיש טעות, פנה למנהל המערכת או נסה להירשם שוב
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Link href="/register" className="block">
                <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <RotateCcw className="h-4 w-4 ml-2" />
                  הירשם שוב
                </Button>
              </Link>

              <Link href="/login" className="block">
                <Button
                  variant="ghost"
                  className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                >
                  <LogIn className="h-4 w-4 ml-2" />
                  חזור להתחברות
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusText = request.status === 'needs_review'
    ? 'ממתין לבדיקה'
    : 'ממתין לאישור';

  const statusColor = request.status === 'needs_review'
    ? 'bg-orange-100 text-orange-600'
    : 'bg-amber-100 text-amber-600';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4" dir="rtl">
      <div className="fixed top-6 left-6">
        <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} priority />
      </div>

      <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`w-20 h-20 rounded-full ${statusColor} flex items-center justify-center`}>
              <Clock className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">{statusText}</CardTitle>
          <CardDescription className="text-slate-500">
            הבקשה שלך התקבלה בהצלחה!
            <br />
            מנהל המערכת יבדוק את הפרטים ויאשר את החשבון שלך בהקדם.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User Details */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 mb-2">פרטים שנשלחו:</h3>

            <div className="flex items-center gap-3 text-slate-700">
              <User className="h-4 w-4 text-slate-400" />
              <span>{request.full_name}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{request.email}</span>
            </div>

            {request.phone && (
              <div className="flex items-center gap-3 text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{request.phone}</span>
              </div>
            )}

            {request.matched_external_id && (
              <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm text-emerald-700">נמצאה התאמה במאגר סלע ({request.match_score}%)</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>

          {/* Info Message */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700 text-center">
              כאשר החשבון יאושר, תוכל להתחבר עם האימייל והסיסמה שהזנת בהרשמה
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full h-12 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  בודק...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  בדוק סטטוס
                </>
              )}
            </Button>

            <Link href="/login" className="block">
              <Button
                variant="ghost"
                className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                <LogIn className="h-4 w-4 ml-2" />
                חזור להתחברות
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
