'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User, Phone, Mail, CreditCard, Building2, UserCog,
  CheckCircle, Edit2, Loader2, Shield, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ExternalAgentData {
  id: string;
  full_name: string;
  email: string;
  mobile_phone: string;
  id_number: string;
  license_number: string | null;
  supervisor_name: string | null;
  business_unit: string | null;
}

interface RegistrationRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_number: string;
  requested_role: string;
  matched_external_id: string | null;
}

export default function VerifyProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [regRequest, setRegRequest] = useState<RegistrationRequest | null>(null);
  const [agentData, setAgentData] = useState<ExternalAgentData | null>(null);

  const [editedData, setEditedData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      router.push('/login');
      return;
    }

    // Get registration request
    const { data: request } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (!request) {
      router.push('/signup');
      return;
    }

    if (request.status !== 'approved') {
      router.push('/pending-approval');
      return;
    }

    setRegRequest(request);
    setEditedData({
      full_name: request.full_name || '',
      phone: request.phone || '',
      email: request.email || '',
    });

    // If matched to external agent, fetch their data
    if (request.matched_external_id) {
      const { data: agent } = await supabase
        .from('external_agents')
        .select(`
          id,
          full_name,
          email,
          mobile_phone,
          id_number,
          license_number,
          supervisor_id,
          business_unit_id
        `)
        .eq('id', request.matched_external_id)
        .single();

      if (agent) {
        // Get supervisor name
        let supervisorName = null;
        if (agent.supervisor_id) {
          const { data: supervisor } = await supabase
            .from('supervisors')
            .select('name')
            .eq('id', agent.supervisor_id)
            .single();
          supervisorName = supervisor?.name || null;
        }

        // Get business unit name
        let businessUnitName = null;
        if (agent.business_unit_id) {
          const { data: bu } = await supabase
            .from('business_units')
            .select('name')
            .eq('id', agent.business_unit_id)
            .single();
          businessUnitName = bu?.name || null;
        }

        setAgentData({
          id: agent.id,
          full_name: agent.full_name,
          email: agent.email || '',
          mobile_phone: agent.mobile_phone || '',
          id_number: agent.id_number || '',
          license_number: agent.license_number,
          supervisor_name: supervisorName,
          business_unit: businessUnitName,
        });

        // Pre-fill with agent data
        setEditedData({
          full_name: agent.full_name || request.full_name || '',
          phone: agent.mobile_phone?.replace(/[-\s]/g, '') || request.phone || '',
          email: agent.email || request.email || '',
        });
      }
    }

    setIsLoading(false);
  };

  const handleConfirm = async () => {
    if (!regRequest) return;

    setIsSaving(true);

    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        toast.error('לא מחובר');
        router.push('/login');
        return;
      }

      // Check if user already exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', regRequest.email)
        .single();

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: editedData.full_name,
            phone: editedData.phone,
            is_registered: true,
          })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;
      } else {
        // User should have been created by approve_registration RPC
        // If not, we need to handle this case
        toast.error('שגיאה: המשתמש לא נמצא. פנה למנהל המערכת.');
        return;
      }

      // Mark external agent as onboarded
      if (agentData?.id) {
        await supabase
          .from('external_agents')
          .update({
            onboarded_to_app: true,
            onboarded_at: new Date().toISOString(),
          })
          .eq('id', agentData.id);
      }

      toast.success('הפרטים אושרו בהצלחה!');
      router.push('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('שגיאה בשמירת הפרטים');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
        <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 p-4 py-8" dir="rtl">
      <div className="fixed top-6 left-6">
        <Image src="/sela-logo.png" alt="סלע ביטוח" width={120} height={120} priority />
      </div>

      <Card className="w-full max-w-xl bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <Shield className="h-10 w-10 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">אימות פרטים</CardTitle>
          <CardDescription className="text-slate-500">
            חשבונך אושר! אנא אמת את הפרטים הבאים לפני כניסה למערכת
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Agent Data from SELAI */}
          {agentData && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <h3 className="text-sm font-medium text-indigo-700 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                פרטים מתוך מאגר סלע
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-indigo-500">שם מלא:</span>
                  <p className="text-slate-800 font-medium">{agentData.full_name}</p>
                </div>
                <div>
                  <span className="text-indigo-500">ת.ז.:</span>
                  <p className="text-slate-800 font-medium">***{agentData.id_number?.slice(-4)}</p>
                </div>
                {agentData.mobile_phone && (
                  <div>
                    <span className="text-indigo-500">טלפון:</span>
                    <p className="text-slate-800 font-medium">{agentData.mobile_phone}</p>
                  </div>
                )}
                {agentData.license_number && (
                  <div>
                    <span className="text-indigo-500">מספר רישיון:</span>
                    <p className="text-slate-800 font-medium">{agentData.license_number}</p>
                  </div>
                )}
                {agentData.supervisor_name && (
                  <div>
                    <span className="text-indigo-500">מפקח:</span>
                    <p className="text-slate-800 font-medium">{agentData.supervisor_name}</p>
                  </div>
                )}
                {agentData.business_unit && (
                  <div>
                    <span className="text-indigo-500">יחידה עסקית:</span>
                    <p className="text-slate-800 font-medium">{agentData.business_unit}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!agentData && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">
                  לא נמצאו פרטים תואמים במאגר סלע. הפרטים יעודכנו ידנית על ידי המנהל.
                </p>
              </div>
            </div>
          )}

          {/* Editable User Data */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">הפרטים שלך</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-indigo-600 hover:text-indigo-700"
              >
                <Edit2 className="h-4 w-4 ml-1" />
                {isEditing ? 'בטל עריכה' : 'ערוך'}
              </Button>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label className="text-slate-700">שם מלא</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    value={editedData.full_name}
                    onChange={(e) => setEditedData({ ...editedData, full_name: e.target.value })}
                    disabled={!isEditing}
                    className="pr-11 h-12 bg-white border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-slate-700">טלפון</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    value={editedData.phone}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="pr-11 h-12 bg-white border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-slate-700">אימייל</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    value={editedData.email}
                    onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                    disabled={!isEditing}
                    className="pr-11 h-12 bg-white border-slate-200 disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>
              </div>

              {/* ID Number (read-only) */}
              <div className="space-y-2">
                <Label className="text-slate-700">תעודת זהות</Label>
                <div className="relative">
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    value={regRequest?.id_number ? `***${regRequest.id_number.slice(-4)}` : ''}
                    disabled
                    className="pr-11 h-12 bg-slate-50 border-slate-200 text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={isSaving}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-lg shadow-lg shadow-emerald-600/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin ml-2" />
                שומר...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 ml-2" />
                אשר פרטים והמשך
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
