'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DashboardRenderer } from '@/components/DashboardRenderer';
import { toast } from 'sonner';
import type { SmartDashboardTemplate } from '@/types/dashboard';

type ShareState = 'loading' | 'password' | 'authenticated' | 'error' | 'expired';

export default function PublicSharePage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<ShareState>('loading');
  const [shareName, setShareName] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string>('');

  // Dashboard data after authentication
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [template, setTemplate] = useState<SmartDashboardTemplate | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Check share validity
  useEffect(() => {
    const checkShare = async () => {
      try {
        const response = await fetch(`/api/public-shares/${token}`);
        const result = await response.json();

        if (!response.ok) {
          if (response.status === 410) {
            setState('expired');
            setError(result.error || 'השיתוף פג תוקף');
          } else {
            setState('error');
            setError(result.error || 'שיתוף לא נמצא');
          }
          return;
        }

        setShareName(result.name);
        setState('password');
      } catch {
        setState('error');
        setError('שגיאה בטעינת השיתוף');
      }
    };

    checkShare();
  }, [token]);

  // Authenticate with password
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error('יש להזין סיסמה');
      return;
    }

    setIsAuthenticating(true);

    try {
      const response = await fetch(`/api/public-shares/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('סיסמה שגויה');
        } else {
          toast.error(result.error || 'שגיאה באימות');
        }
        setIsAuthenticating(false);
        return;
      }

      setSessionToken(result.sessionToken);
      setShareName(result.shareName);
      setState('authenticated');
      toast.success('התחברת בהצלחה');
    } catch {
      toast.error('שגיאה באימות');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Load dashboard data after authentication
  const loadDashboardData = useCallback(async () => {
    if (!sessionToken) return;

    setIsLoadingData(true);

    try {
      const response = await fetch(
        `/api/public-shares/${token}/data?session=${sessionToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to load data');
      }

      const result = await response.json();
      setTemplate(result.template);
      setData(result.data || []);
    } catch {
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoadingData(false);
    }
  }, [token, sessionToken]);

  useEffect(() => {
    if (state === 'authenticated' && sessionToken) {
      loadDashboardData();
    }
  }, [state, sessionToken, loadDashboardData]);

  // Handle refresh
  const handleRefresh = () => {
    loadDashboardData();
    toast.success('הנתונים רועננו');
  };

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/sela-logo.png"
            alt="סלע ביטוח"
            width={150}
            height={150}
            className="animate-pulse"
            priority
          />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error' || state === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" dir="rtl">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">
              {state === 'expired' ? 'השיתוף פג תוקף' : 'שגיאה'}
            </h1>
            <p className="text-slate-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password entry state
  if (state === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 p-4" dir="rtl">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center pb-2">
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              <Image
                src="/sela-logo.png"
                alt="סלע ביטוח"
                width={100}
                height={100}
                priority
              />
              <span className="text-xl font-bold text-white">{shareName}</span>
            </div>
            <p className="text-slate-400">הזן סיסמה כדי לצפות בדשבורד</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  disabled={isAuthenticating}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    מתחבר...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 ml-2" />
                    כניסה לדשבורד
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - show dashboard
  if (state === 'authenticated') {
    if (isLoadingData || !template) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <p className="text-slate-400">טוען דשבורד...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col" dir="rtl">
        {/* Header */}
        <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/sela-logo.png"
              alt="סלע ביטוח"
              width={40}
              height={40}
            />
            <h1 className="text-xl font-semibold text-white">{shareName}</h1>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            className="border-slate-700 text-slate-300"
          >
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן
          </Button>
        </div>

        {/* Dashboard */}
        <div className="flex-1 overflow-hidden">
          <DashboardRenderer
            template={template}
            data={data}
            isLoading={isLoadingData}
            onRefresh={handleRefresh}
            isPublicView={true}
          />
        </div>
      </div>
    );
  }

  return null;
}
