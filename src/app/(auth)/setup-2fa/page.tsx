'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { use2FA } from '@/lib/hooks/use2FA';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from 'sonner';

export default function Setup2FAPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const { qrCodeUrl, secret, isLoading, error, generateSecret, enable2FA } = use2FA();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user && !qrCodeUrl) {
      generateSecret();
    }
  }, [user, qrCodeUrl, generateSecret]);

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success('הקוד הועתק');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('יש להזין קוד בן 6 ספרות');
      return;
    }

    const success = await enable2FA(code);

    if (success) {
      toast.success('אימות דו-שלבי הופעל בהצלחה');
      router.push('/');
    } else {
      toast.error(error || 'קוד שגוי, נסה שוב');
    }
  };

  const handleSkip = () => {
    router.push('/');
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
            <CardTitle className="text-xl text-white">הגדרת אימות דו-שלבי</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            סרוק את הברקוד באפליקציית האימות שלך (Google Authenticator, Authy וכו')
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* QR Code */}
          {qrCodeUrl ? (
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-slate-700 rounded-lg animate-pulse" />
            </div>
          )}

          {/* Manual Secret */}
          {secret && (
            <div className="space-y-2">
              <Label className="text-slate-300">או הזן את הקוד ידנית:</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-slate-900 rounded text-emerald-400 text-sm font-mono break-all">
                  {secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-slate-700 text-slate-300"
                  onClick={handleCopySecret}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Verification Code */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-slate-300">
              הזן את הקוד מהאפליקציה:
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
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleVerify}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  מאמת...
                </>
              ) : (
                'אמת והפעל'
              )}
            </Button>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-700"
              onClick={handleSkip}
            >
              דלג
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            שמור את הקוד הסודי במקום בטוח. לא תוכל לראות אותו שוב.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
