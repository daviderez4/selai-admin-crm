'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, Mail, Phone, User, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  is_approved: boolean;
  user_type: string;
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
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

    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email, phone, is_approved, user_type, is_profile_complete')
      .eq('auth_id', authUser.id)
      .single();

    if (!profile) {
      router.push('/complete-profile');
      return;
    }

    if (!profile.is_profile_complete) {
      router.push('/complete-profile');
      return;
    }

    if (profile.is_approved) {
      router.push('/');
      return;
    }

    setUser({
      full_name: profile.full_name || '',
      email: profile.email || authUser.email || '',
      phone: profile.phone || '',
      is_approved: profile.is_approved,
      user_type: profile.user_type,
    });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40">
        <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40 p-4"
      dir="rtl"
    >
      <div className="fixed top-6 left-6">
        <Image
          src="/sela-logo.png"
          alt="סלע ביטוח"
          width={140}
          height={140}
          priority
        />
      </div>

      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">ממתין לאישור</CardTitle>
          <CardDescription className="text-slate-300">
            הבקשה שלך התקבלה בהצלחה!
            <br />
            מנהל המערכת יבדוק את הפרטים ויאשר את החשבון שלך בהקדם.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User Details */}
          <div className="p-4 bg-white/10 rounded-xl space-y-3">
            <h3 className="text-sm font-medium text-slate-300 mb-2">פרטים שנשלחו:</h3>

            <div className="flex items-center gap-3 text-white">
              <User className="h-4 w-4 text-slate-400" />
              <span>{user?.full_name}</span>
            </div>

            <div className="flex items-center gap-3 text-white">
              <Mail className="h-4 w-4 text-slate-400" />
              <span>{user?.email}</span>
            </div>

            {user?.phone && (
              <div className="flex items-center gap-3 text-white">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>

          {/* Info Message */}
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
            <p className="text-sm text-emerald-200 text-center">
              תקבל התראה באימייל כאשר החשבון יאושר
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
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
              className="w-full text-slate-400 hover:text-white hover:bg-white/10"
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
