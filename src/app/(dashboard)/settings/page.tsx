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
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-white">פרופיל</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              נהל את פרטי החשבון שלך
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">אימייל</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-slate-900 border-slate-700 text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">שם מלא</Label>
              <Input
                placeholder="הזן שם מלא"
                defaultValue={user?.user_metadata?.full_name || ''}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <Button className="bg-emerald-500 hover:bg-emerald-600">
              <Check className="h-4 w-4 ml-2" />
              שמור שינויים
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-white">אבטחה</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              הגדרות אבטחה וגישה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 2FA Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">אימות דו-שלבי (2FA)</Label>
                  <p className="text-sm text-slate-400">
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
                      className="w-24 bg-slate-900 border-slate-700 text-white text-center"
                    />
                    <Button
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      onClick={handleDisable2FA}
                      disabled={is2FALoading}
                    >
                      {is2FALoading ? 'מבטל...' : 'בטל'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={handleSetup2FA}
                  >
                    <Shield className="h-4 w-4 ml-2" />
                    הפעל
                  </Button>
                )}
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Change Password */}
            <div className="space-y-4">
              <Label className="text-white">שינוי סיסמה</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">סיסמה חדשה</Label>
                  <Input
                    type="password"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">אימות סיסמה</Label>
                  <Input
                    type="password"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>
              <Button variant="outline" className="border-slate-700 text-slate-300">
                עדכן סיסמה
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-white">תצוגה</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              התאם את מראה המערכת
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">עיצוב</Label>
                <p className="text-sm text-slate-400">בחר את העיצוב המועדף</p>
              </div>
              <Select
                value={settings?.theme || 'dark'}
                onValueChange={(value) => handleThemeChange(value as 'dark' | 'light' | 'system')}
              >
                <SelectTrigger className="w-32 bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="dark" className="text-white focus:bg-slate-700">
                    כהה
                  </SelectItem>
                  <SelectItem value="light" className="text-white focus:bg-slate-700">
                    בהיר
                  </SelectItem>
                  <SelectItem value="system" className="text-white focus:bg-slate-700">
                    מערכת
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-slate-700" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">שפה</Label>
                <p className="text-sm text-slate-400">בחר את שפת הממשק</p>
              </div>
              <Select
                value={settings?.language || 'he'}
                onValueChange={(value) => handleLanguageChange(value as 'he' | 'en')}
              >
                <SelectTrigger className="w-32 bg-slate-900 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="he" className="text-white focus:bg-slate-700">
                    עברית
                  </SelectItem>
                  <SelectItem value="en" className="text-white focus:bg-slate-700">
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
