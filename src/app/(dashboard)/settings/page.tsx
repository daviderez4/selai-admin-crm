'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Shield, Moon, Globe, User, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/lib/stores/authStore';
import { use2FA } from '@/lib/hooks/use2FA';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const { user, settings, updateSettings } = useAuthStore();
  const { isSetup: is2FAEnabled, disable2FA, isLoading: is2FALoading } = use2FA();

  const [disableCode, setDisableCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleThemeChange = async (theme: 'dark' | 'light' | 'system') => {
    await updateSettings({ theme });
    toast.success('העיצוב עודכן');
  };

  const handleLanguageChange = async (language: 'he' | 'en') => {
    await updateSettings({ language });
    toast.success('השפה עודכנה');
  };

  const handleSetup2FA = () => {
    router.push('/setup-2fa');
  };

  const handleDisable2FA = async () => {
    if (!disableCode) {
      toast.error('יש להזין קוד אימות');
      return;
    }

    const success = await disable2FA(disableCode);
    if (success) {
      toast.success('אימות דו-שלבי בוטל');
      setDisableCode('');
    } else {
      toast.error('קוד שגוי');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="הגדרות" />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Profile Settings */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-slate-800">פרופיל</CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              נהל את פרטי החשבון שלך
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">אימייל</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-white border-slate-200 text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">שם מלא</Label>
              <Input
                placeholder="הזן שם מלא"
                defaultValue={user?.user_metadata?.full_name || ''}
                className="bg-white border-slate-200 text-slate-800"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Check className="h-4 w-4 ml-2" />
              שמור שינויים
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-slate-800">אבטחה</CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              הגדרות אבטחה וגישה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 2FA Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-800">אימות דו-שלבי (2FA)</Label>
                  <p className="text-sm text-slate-500">
                    {is2FAEnabled
                      ? 'אימות דו-שלבי מופעל בחשבונך'
                      : 'הוסף שכבת אבטחה נוספת לחשבונך'}
                  </p>
                </div>
                {is2FAEnabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="קוד אימות"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className="w-24 bg-white border-slate-200 text-slate-800 text-center"
                    />
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={handleDisable2FA}
                      disabled={is2FALoading}
                    >
                      {is2FALoading ? 'מבטל...' : 'בטל'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleSetup2FA}
                  >
                    <Shield className="h-4 w-4 ml-2" />
                    הפעל
                  </Button>
                )}
              </div>
            </div>

            <Separator className="bg-slate-200" />

            {/* Change Password */}
            <div className="space-y-4">
              <Label className="text-slate-800">שינוי סיסמה</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-sm">סיסמה חדשה</Label>
                  <Input
                    type="password"
                    className="bg-white border-slate-200 text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-sm">אימות סיסמה</Label>
                  <Input
                    type="password"
                    className="bg-white border-slate-200 text-slate-800"
                  />
                </div>
              </div>
              <Button variant="outline" className="border-slate-200 text-slate-700">
                עדכן סיסמה
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-slate-800">תצוגה</CardTitle>
            </div>
            <CardDescription className="text-slate-500">
              התאם את מראה המערכת
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-800">עיצוב</Label>
                <p className="text-sm text-slate-500">בחר את העיצוב המועדף</p>
              </div>
              <Select
                value={settings?.theme || 'dark'}
                onValueChange={(value) => handleThemeChange(value as 'dark' | 'light' | 'system')}
              >
                <SelectTrigger className="w-32 bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="dark" className="text-slate-800 focus:bg-slate-100">
                    כהה
                  </SelectItem>
                  <SelectItem value="light" className="text-slate-800 focus:bg-slate-100">
                    בהיר
                  </SelectItem>
                  <SelectItem value="system" className="text-slate-800 focus:bg-slate-100">
                    מערכת
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-slate-200" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-800">שפה</Label>
                <p className="text-sm text-slate-500">בחר את שפת הממשק</p>
              </div>
              <Select
                value={settings?.language || 'he'}
                onValueChange={(value) => handleLanguageChange(value as 'he' | 'en')}
              >
                <SelectTrigger className="w-32 bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="he" className="text-slate-800 focus:bg-slate-100">
                    עברית
                  </SelectItem>
                  <SelectItem value="en" className="text-slate-800 focus:bg-slate-100">
                    English
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
