'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Phone, CreditCard, Building2, FileText, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Supervisor {
  id: string;
  full_name: string;
  email: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    national_id: '',
    user_type: 'agent',
    supervisor_id: '',
    company_name: '',
    license_number: '',
  });

  useEffect(() => {
    fetchSupervisors();
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Check if profile already complete
    const { data: profile } = await supabase
      .from('users')
      .select('is_profile_complete, full_name')
      .eq('auth_id', user.id)
      .single();

    if (profile?.is_profile_complete) {
      router.push('/');
    } else if (profile?.full_name) {
      setFormData(prev => ({ ...prev, full_name: profile.full_name }));
    }
  };

  const fetchSupervisors = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('user_type', ['supervisor', 'admin'])
      .eq('is_active', true)
      .eq('is_approved', true);

    if (data) {
      setSupervisors(data);
    }
  };

  const validateIsraeliId = (id: string): boolean => {
    if (!/^\d{9}$/.test(id)) return false;

    const digits = id.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      let num = digits[i] * ((i % 2) + 1);
      if (num > 9) num -= 9;
      sum += num;
    }

    return sum % 10 === 0;
  };

  const validatePhone = (phone: string): boolean => {
    return /^0[0-9]{8,9}$/.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.full_name || !formData.phone || !formData.national_id) {
      toast.error('נא למלא את כל השדות החובה');
      return;
    }

    if (!validatePhone(formData.phone)) {
      toast.error('מספר טלפון לא תקין');
      return;
    }

    if (!validateIsraeliId(formData.national_id)) {
      toast.error('תעודת זהות לא תקינה');
      return;
    }

    if (formData.user_type === 'agent' && !formData.supervisor_id) {
      toast.error('סוכן חייב לבחור מפקח');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('לא מחובר');
        router.push('/login');
        return;
      }

      // Check if user record exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      let userId: string;

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            national_id: formData.national_id,
            company_name: formData.company_name || null,
            license_number: formData.license_number || null,
            supervisor_id: formData.supervisor_id || null,
            is_profile_complete: true,
          })
          .eq('auth_id', user.id);

        if (updateError) throw updateError;
        userId = existingUser.id;
      } else {
        // Create new user record
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            auth_id: user.id,
            email: user.email,
            full_name: formData.full_name,
            phone: formData.phone,
            national_id: formData.national_id,
            company_name: formData.company_name || null,
            license_number: formData.license_number || null,
            supervisor_id: formData.supervisor_id || null,
            user_type: 'pending',
            is_profile_complete: true,
            is_active: false,
            is_approved: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        userId = newUser.id;
      }

      // Create approval request
      const { error: approvalError } = await supabase
        .from('approval_requests')
        .insert({
          user_id: userId,
          requested_role: formData.user_type,
          requested_supervisor_id: formData.supervisor_id || null,
          status: 'pending',
        });

      if (approvalError) {
        console.error('Approval request error:', approvalError);
        // Don't fail if approval request fails
      }

      toast.success('הפרופיל נשמר בהצלחה!');
      router.push('/pending-approval');
    } catch (err: any) {
      console.error('Profile save error:', err);
      toast.error(err.message || 'שגיאה בשמירת הפרופיל');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-500 to-purple-900/40 p-4 py-8"
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

      <Card className="w-full max-w-lg bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-white">השלמת פרופיל</CardTitle>
          <CardDescription className="text-slate-300">
            נא להשלים את הפרטים הבאים כדי להמשיך
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-slate-300">
                שם מלא <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                  placeholder="ישראל ישראלי"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">
                טלפון <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                  placeholder="0501234567"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            {/* National ID */}
            <div className="space-y-2">
              <Label htmlFor="national_id" className="text-slate-300">
                תעודת זהות <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  id="national_id"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                  placeholder="123456789"
                  maxLength={9}
                  required
                />
              </div>
            </div>

            {/* User Type */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                תפקיד <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.user_type}
                onValueChange={(value) => setFormData({ ...formData, user_type: value })}
              >
                <SelectTrigger className="bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">סוכן</SelectItem>
                  <SelectItem value="supervisor">מפקח</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Supervisor Selection (for agents) */}
            {formData.user_type === 'agent' && (
              <div className="space-y-2">
                <Label className="text-slate-300">
                  מפקח <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.supervisor_id}
                  onValueChange={(value) => setFormData({ ...formData, supervisor_id: value })}
                >
                  <SelectTrigger className="bg-white/20 border-white/30 text-white">
                    <SelectValue placeholder="בחר מפקח" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.length === 0 ? (
                      <SelectItem value="" disabled>אין מפקחים זמינים</SelectItem>
                    ) : (
                      supervisors.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.full_name || sup.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name" className="text-slate-300">
                שם חברה / סוכנות
              </Label>
              <div className="relative">
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                  placeholder="סוכנות ביטוח בע״מ"
                />
              </div>
            </div>

            {/* License Number */}
            <div className="space-y-2">
              <Label htmlFor="license_number" className="text-slate-300">
                מספר רישיון סוכן
              </Label>
              <div className="relative">
                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="pr-10 bg-white/20 border-white/30 text-white placeholder:text-slate-400"
                  placeholder="123456"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שומר...
                </>
              ) : (
                'שלח לאישור'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
