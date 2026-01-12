'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, Mail, Phone, User, LogOut, RefreshCw, CheckCircle2 } from 'lucide-react';
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
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const [request, setRequest] = useState<RegistrationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      router.push('/login');
      return;
    }

    // Check registration_requests table
    const { data: regRequest } = await supabase
      .from('registration_requests')
      .select('id, full_name, email, phone, status, requested_role, matched_external_id')
      .eq('email', authUser.email)
      .single();

    if (!regRequest) {
      // No registration request found
      router.push('/signup');
      return;
    }

    if (regRequest.status === 'approved') {
      toast.success('החשבון אושר! מעביר לאימות פרטים...');
      router.push('/verify-profile');
      return;
    }

    if (regRequest.status === 'rejected') {
      toast.error('בקשת ההרשמה נדחתה');
      await supabase.auth.signOut();
      router.push('/login');
      return;
    }

    setRequest(regRequest);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkStatus();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
        <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4" dir="rtl">
      <div className="fixed top-6 left-6">
        <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} priority />
      </div>

      <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">ממתין לאישור</CardTitle>
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
              <span>{request?.full_name}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-700">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{request?.email}</span>
            </div>

            {request?.phone && (
              <div className="flex items-center gap-3 text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{request.phone}</span>
              </div>
            )}

            {request?.matched_external_id && (
              <div className="mt-2 p-2 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-700">נמצאה התאמה במאגר סלע</p>
              </div>
            )}
          </div>

          {/* Info Message */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-700 text-center">
                תקבל התראה באימייל כאשר החשבון יאושר
              </p>
            </div>
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

            <Button
              variant="ghost"
              className="w-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 ml-2" />
              התנתק
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
