'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Partner credentials - change these as needed
const PARTNER_USERNAME = 'partner';
const PARTNER_PASSWORD = 'Sela2024!';

export default function PartnerLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if already authenticated - only run on client
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('partner_auth');
      const authTime = sessionStorage.getItem('partner_auth_time');
      if (auth === 'true' && authTime) {
        const elapsed = Date.now() - parseInt(authTime);
        if (elapsed < 24 * 60 * 60 * 1000) {
          setIsAuthenticated(true);
        }
      }
    }
  }, []);

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && mounted) {
      window.location.href = '/projects';
    }
  }, [isAuthenticated, mounted]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (username === PARTNER_USERNAME && password === PARTNER_PASSWORD) {
      sessionStorage.setItem('partner_auth', 'true');
      sessionStorage.setItem('partner_auth_time', Date.now().toString());
      setIsAuthenticated(true);
    } else {
      setError('שם משתמש או סיסמה שגויים');
    }
    setIsLoading(false);
  };

  // Show loading until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} className="animate-pulse" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
        <div className="text-center">
          <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} className="mx-auto animate-pulse mb-4" />
          <p className="text-white text-lg">מעביר לדשבורד...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4" dir="rtl">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/sela-logo.png"
              alt="סלע ביטוח"
              width={120}
              height={120}
              className="rounded"
            />
          </div>
          <CardTitle className="text-2xl text-white">פורטל שותפים</CardTitle>
          <CardDescription className="text-slate-400">
            הזינו את פרטי ההתחברות שקיבלתם
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-200">שם משתמש</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pr-10 bg-slate-700 border-slate-600 text-white"
                  placeholder="הזינו שם משתמש"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">סיסמה</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 bg-slate-700 border-slate-600 text-white"
                  placeholder="הזינו סיסמה"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
