'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  User, Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2,
  Phone, CreditCard, Search, Link2, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface InvitationData {
  email: string;
  role: string;
  agent_id?: string;
}

interface MatchedAgent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_number: string;
  is_active: boolean;
  onboarded_to_app: boolean;
  supervisor: { id: string; name: string } | null;
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Token-based registration states
  const [isValidating, setIsValidating] = useState(!!token);
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  // Identity verification states
  const [activeTab, setActiveTab] = useState<string>(token ? 'invite' : 'verify');
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchedAgent, setMatchedAgent] = useState<MatchedAgent | null>(null);
  const [matchConfidence, setMatchConfidence] = useState<string>('');

  // Registration form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`);
      const data = await response.json();

      if (data.valid) {
        setIsValid(true);
        setInvitationData(data.data);
        setEmail(data.data.email);
      } else {
        setIsValid(false);
        setErrorMessage(data.error || 'הזמנה לא תקינה');
      }
    } catch (error) {
      setIsValid(false);
      setErrorMessage('שגיאה באימות ההזמנה');
    } finally {
      setIsValidating(false);
    }
  };

  const handleVerifyIdentity = async () => {
    if (!idNumber && !phoneNumber) {
      toast.error('יש להזין תעודת זהות או מספר טלפון');
      return;
    }

    setIsSearching(true);
    setMatchedAgent(null);

    try {
      const response = await fetch('/api/auth/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_number: idNumber || undefined,
          phone: phoneNumber || undefined
        })
      });

      const data = await response.json();

      if (data.found) {
        setMatchedAgent(data.agent);
        setMatchConfidence(data.match_confidence);
        setFullName(data.agent.full_name);
        if (data.agent.email) {
          setEmail(data.agent.email);
        }
        toast.success('נמצא סוכן תואם במערכת!');
      } else {
        toast.error('לא נמצא סוכן תואם במערכת. פנה למנהל המערכת.');
      }
    } catch (error) {
      toast.error('שגיאה בחיפוש');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('יש להזין שם מלא');
      return;
    }

    if (!email.trim()) {
      toast.error('יש להזין אימייל');
      return;
    }

    if (password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }

    setIsSubmitting(true);

    try {
      // If we have a token, use the invitation flow
      if (token && invitationData) {
        const response = await fetch(`/api/invitations/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password,
            full_name: fullName.trim()
          })
        });

        const data = await response.json();

        if (data.success) {
          setIsSuccess(true);
          toast.success('החשבון נוצר בהצלחה!');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          toast.error(data.error || 'שגיאה ביצירת החשבון');
        }
      }
      // If we verified identity, use that flow
      else if (matchedAgent) {
        // First create account via Supabase
        const response = await fetch('/api/auth/register-with-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            agent_id: matchedAgent.id
          })
        });

        const data = await response.json();

        if (data.success) {
          setIsSuccess(true);
          toast.success('החשבון נוצר וקושר לסוכן בהצלחה!');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          toast.error(data.error || 'שגיאה ביצירת החשבון');
        }
      }
    } catch (error) {
      toast.error('שגיאה ביצירת החשבון');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'מנהל מערכת';
      case 'supervisor': return 'מפקח';
      case 'agent': return 'סוכן';
      default: return role;
    }
  };

  // Loading state (for token validation)
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-400 mx-auto mb-4" />
            <p className="text-white">מאמת את ההזמנה...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid invitation (only if token was provided)
  if (token && !isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40 p-4" dir="rtl">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">הזמנה לא תקינה</h2>
            <p className="text-slate-300 mb-6">{errorMessage}</p>
            <Button
              onClick={() => router.push('/login')}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              חזרה לדף ההתחברות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40 p-4" dir="rtl">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">החשבון נוצר בהצלחה!</h2>
            <p className="text-slate-300 mb-4">מעביר אותך לדף ההתחברות...</p>
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main registration form
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40 p-4"
      dir="rtl"
    >
      {/* Logo */}
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
            <span className="text-3xl font-bold text-white">הרשמה לסלע דשבורדים</span>
          </div>
          {token && invitationData ? (
            <p className="text-slate-300">
              הוזמנת להצטרף כ<span className="text-emerald-400 font-medium">{getRoleLabel(invitationData.role)}</span>
            </p>
          ) : (
            <p className="text-slate-300">התחבר עם החשבון שיצרת באפליקציה</p>
          )}
        </CardHeader>

        <CardContent>
          {/* If no token, show identity verification first */}
          {!token && !matchedAgent && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30 mb-4">
                <p className="text-sm text-blue-200">
                  <UserCheck className="h-4 w-4 inline ml-1" />
                  נרשמת באפליקציית סלע? הזן את פרטי הזיהוי שלך כדי לחבר את החשבונות
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">תעודת זהות</Label>
                <div className="relative">
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    type="text"
                    placeholder="123456789"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                    className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                    maxLength={9}
                    disabled={isSearching}
                  />
                </div>
              </div>

              <div className="text-center text-slate-400 text-sm">או</div>

              <div className="space-y-2">
                <Label className="text-slate-300">מספר טלפון</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    type="tel"
                    placeholder="050-1234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                    disabled={isSearching}
                  />
                </div>
              </div>

              <Button
                onClick={handleVerifyIdentity}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isSearching || (!idNumber && !phoneNumber)}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    מחפש...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 ml-2" />
                    חפש את החשבון שלי
                  </>
                )}
              </Button>

              <div className="text-center pt-4 border-t border-white/20 mt-4">
                <p className="text-sm text-slate-400">
                  יש לך קישור הזמנה?{' '}
                  <button
                    className="text-emerald-400 hover:text-emerald-300"
                    onClick={() => router.push('/login')}
                  >
                    התחבר כאן
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Matched agent info */}
          {matchedAgent && !token && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                  <span className="font-medium text-emerald-300">נמצא חשבון תואם!</span>
                </div>
                <div className="text-sm text-slate-300 space-y-1">
                  <p><strong>שם:</strong> {matchedAgent.full_name}</p>
                  {matchedAgent.phone && <p><strong>טלפון:</strong> {matchedAgent.phone}</p>}
                  {matchedAgent.supervisor && <p><strong>מפקח:</strong> {matchedAgent.supervisor.name}</p>}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">אימייל</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">סיסמה</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="לפחות 6 תווים"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 pl-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">אימות סיסמה</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="הזן שוב"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      יוצר חשבון...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 ml-2" />
                      צור חשבון וחבר לסוכן
                    </>
                  )}
                </Button>
              </form>

              <Button
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
                onClick={() => {
                  setMatchedAgent(null);
                  setIdNumber('');
                  setPhoneNumber('');
                }}
              >
                חפש מחדש
              </Button>
            </div>
          )}

          {/* Token-based registration form */}
          {token && isValid && invitationData && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">אימייל</Label>
                <Input
                  type="email"
                  value={invitationData.email}
                  readOnly
                  className="bg-white/10 border-white/30 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">שם מלא</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    type="text"
                    placeholder="שם מלא"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="לפחות 6 תווים"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 pl-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">אימות סיסמה</Label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="הזן שוב"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                  disabled={isSubmitting}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-xs">הסיסמאות אינן תואמות</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    יוצר חשבון...
                  </>
                ) : (
                  'צור חשבון'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              כבר יש לך חשבון?{' '}
              <button
                className="text-emerald-400 hover:text-emerald-300"
                onClick={() => router.push('/login')}
              >
                התחבר כאן
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
