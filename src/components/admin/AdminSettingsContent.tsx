'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Users,
  Mail,
  Bell,
  Palette,
  Database,
  Lock,
  RefreshCw,
  Plus,
  Trash2,
  Crown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// System admins - these emails always have admin access
const SYSTEM_ADMINS = [
  'davide@selam.co.il',
  'itayn@selam.co.il',
];

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminSettingsContent() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Settings states
  const [settings, setSettings] = useState({
    allowPublicRegistration: true,
    requireEmailVerification: true,
    autoApproveAgents: false,
    enableNotifications: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('user_type', ['admin', 'manager'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('שגיאה בטעינת רשימת מנהלים');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('נא להזין כתובת אימייל');
      return;
    }

    setAddingAdmin(true);
    const supabase = createClient();

    try {
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, user_type')
        .eq('email', newAdminEmail.trim().toLowerCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        // Update existing user to admin
        const { error: updateError } = await supabase
          .from('users')
          .update({ user_type: 'admin' })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;
        toast.success(`${newAdminEmail} הוגדר כמנהל`);
      } else {
        // Create new admin user
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            email: newAdminEmail.trim().toLowerCase(),
            user_type: 'admin',
            is_active: true,
            is_approved: true,
          });

        if (insertError) throw insertError;
        toast.success(`${newAdminEmail} נוסף כמנהל חדש`);
      }

      setNewAdminEmail('');
      fetchAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('שגיאה בהוספת מנהל');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (SYSTEM_ADMINS.includes(admin.email.toLowerCase())) {
      toast.error('לא ניתן להסיר מנהל מערכת ראשי');
      return;
    }

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('users')
        .update({ user_type: 'agent' })
        .eq('id', admin.id);

      if (error) throw error;
      toast.success(`${admin.email} הוסר מרשימת המנהלים`);
      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('שגיאה בהסרת מנהל');
    }
  };

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success('ההגדרה עודכנה');
  };

  return (
    <div className="p-6 space-y-6">
      {/* System Admins Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Crown className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>מנהלי מערכת</CardTitle>
              <CardDescription>ניהול הרשאות אדמין למשתמשים</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Admins Notice */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900">מנהלי מערכת ראשיים</p>
                <p className="text-sm text-purple-700 mt-1">
                  המשתמשים הבאים מוגדרים כמנהלי מערכת ראשיים ולא ניתן להסיר אותם:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SYSTEM_ADMINS.map((email) => (
                    <Badge key={email} className="bg-purple-600 text-white">
                      <Crown className="h-3 w-3 ml-1" />
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Add New Admin */}
          <div className="flex gap-2">
            <Input
              placeholder="הזן אימייל של מנהל חדש..."
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="flex-1"
              type="email"
            />
            <Button onClick={handleAddAdmin} disabled={addingAdmin}>
              <Plus className="h-4 w-4 ml-2" />
              {addingAdmin ? 'מוסיף...' : 'הוסף מנהל'}
            </Button>
          </div>

          <Separator />

          {/* Admins List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-slate-500">מנהלים פעילים</h4>
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-slate-500 text-center py-4">אין מנהלים רשומים</p>
            ) : (
              <div className="space-y-2">
                {admins.map((admin) => {
                  const isSystemAdmin = SYSTEM_ADMINS.includes(admin.email.toLowerCase());
                  return (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isSystemAdmin ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          {isSystemAdmin ? (
                            <Crown className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Users className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{admin.full_name || admin.email}</p>
                          <p className="text-sm text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={admin.user_type === 'admin' ? 'default' : 'secondary'}>
                          {admin.user_type === 'admin' ? 'אדמין' : 'מנהל'}
                        </Badge>
                        {!isSystemAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveAdmin(admin)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registration Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>הגדרות הרשמה</CardTitle>
              <CardDescription>שליטה בתהליך ההרשמה למערכת</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">אפשר הרשמה ציבורית</p>
              <p className="text-sm text-slate-500">משתמשים יכולים להירשם בעצמם</p>
            </div>
            <Switch
              checked={settings.allowPublicRegistration}
              onCheckedChange={(v) => handleSettingChange('allowPublicRegistration', v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">דרוש אימות אימייל</p>
              <p className="text-sm text-slate-500">משתמשים חייבים לאמת את האימייל שלהם</p>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(v) => handleSettingChange('requireEmailVerification', v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">אישור אוטומטי לסוכנים</p>
              <p className="text-sm text-slate-500">סוכנים מאושרים אוטומטית אם נמצאה התאמה</p>
            </div>
            <Switch
              checked={settings.autoApproveAgents}
              onCheckedChange={(v) => handleSettingChange('autoApproveAgents', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Lock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle>הגדרות מערכת</CardTitle>
              <CardDescription>הגדרות כלליות של המערכת</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">הפעל התראות</p>
              <p className="text-sm text-slate-500">שליחת התראות למנהלים על פעילות חדשה</p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(v) => handleSettingChange('enableNotifications', v)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="font-medium text-red-900">מצב תחזוקה</p>
              </div>
              <p className="text-sm text-red-700">רק מנהלים יכולים להיכנס למערכת</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => handleSettingChange('maintenanceMode', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
