'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from 'sonner';

export default function VerifyPage() {
  const router = useRouter();
  const { setRequires2FA } = useAuthStore();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('יש להזין קוד בן 6 ספרות');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'קוד שגוי');
        setIsLoading(false);
        return;
      }

      setRequires2FA(false);
      toast.success('אימות הצליח');
      router.push('/');
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('שגיאה באימות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-emerald-500" />
            <CardTitle className="text-xl text-white">אימות דו-שלבי</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            הזן את הקוד מאפליקציית האימות שלך
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Code Input */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-slate-300">
              קוד אימות
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus:border-emerald-500"
              disabled={isLoading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) {
                  handleVerify();
                }
              }}
            />
          </div>

          {/* Verify Button */}
          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleVerify}
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                מאמת...
              </>
            ) : (
              'אמת'
            )}
          </Button>

          {/* Back to Login */}
          <div className="text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowRight className="h-4 w-4" />
              חזור להתחברות
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            לא מצליח לגשת לאפליקציית האימות?{' '}
            <button className="text-emerald-500 hover:text-emerald-400">
              צור קשר
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
