'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('יש למלא את כל השדות');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('אימייל או סיסמה שגויים');
        } else {
          toast.error(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Check user profile and redirect accordingly
        const { data: userProfile } = await supabase
          .from('users')
          .select('is_profile_complete, is_approved, user_type')
          .eq('auth_id', data.user.id)
          .single();

        if (userProfile) {
          if (!userProfile.is_profile_complete) {
            router.push('/complete-profile');
          } else if (!userProfile.is_approved) {
            router.push('/pending-approval');
          } else {
            router.push('/');
          }
        } else {
          // New user - redirect to complete profile
          router.push('/complete-profile');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google login error:', err);
      toast.error('שגיאה בהתחברות עם Google');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40 p-4"
      dir="rtl"
    >
      {/* לוגו בצד שמאל למעלה */}
      <div className="fixed top-6 left-6">
        <Image
          src="/sela-logo.png"
          alt="סלע ביטוח"
          width={180}
          height={180}
          priority
        />
      </div>

      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <span className="text-3xl font-bold text-white">סלע דשבורדים</span>
          </div>
          <p className="text-slate-300">התחבר לניהול הפרויקטים שלך</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                אימייל
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-300 focus:border-emerald-400"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                סיסמה
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 bg-white/20 border-white/30 text-white placeholder:text-slate-300 focus:border-emerald-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  מתחבר...
                </>
              ) : (
                'התחבר'
              )}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-slate-400">או</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            התחבר עם Google
          </Button>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-slate-400">
              אין לך חשבון?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                הירשם עכשיו
              </Link>
            </p>
            <p className="text-sm text-slate-500">
              שכחת סיסמה?{' '}
              <button className="text-emerald-500 hover:text-emerald-400">
                לחץ כאן
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
