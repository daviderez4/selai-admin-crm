'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Shield,
  Moon,
  Globe,
  User,
  Check,
  Calendar,
  MessageCircle,
  Bot,
  Key,
  Link2,
  ExternalLink,
  Plug,
  Smartphone,
  Brain,
  QrCode,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/stores/authStore';
import { use2FA } from '@/lib/hooks/use2FA';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'pending';
  configKey: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, settings, updateSettings } = useAuthStore();
  const { isSetup: is2FAEnabled, disable2FA, isLoading: is2FALoading } = use2FA();

  const [disableCode, setDisableCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Integration states
  const [integrations, setIntegrations] = useState<Record<string, unknown>>({});
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  // Integration form states
  const [googleCalendarKey, setGoogleCalendarKey] = useState('');
  const [calComApiKey, setCalComApiKey] = useState('');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsLoadingIntegrations(true);
    const supabase = createClient();

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (data) {
        setIntegrations(data);
        // Populate form fields
        setGoogleCalendarKey(data.google_calendar_key || '');
        setCalComApiKey(data.cal_com_api_key || '');
        setWhatsappInstanceId(data.whatsapp_instance_id || '');
        setWhatsappToken(data.whatsapp_token || '');
        setOpenaiApiKey(data.openai_api_key || '');
        setAnthropicApiKey(data.anthropic_api_key || '');
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  const saveIntegration = async (key: string, value: string) => {
    const supabase = createClient();

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: authUser.id,
          [key]: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast.success('האינטגרציה נשמרה בהצלחה');
      loadIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('שגיאה בשמירת האינטגרציה');
    }
  };

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

  const getIntegrationStatus = (key: string): 'connected' | 'disconnected' | 'pending' => {
    const value = integrations[key];
    if (value && typeof value === 'string' && value.length > 0) return 'connected';
    return 'disconnected';
  };

  const integrationsList: Integration[] = [
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'סנכרן פגישות ואירועים עם יומן גוגל',
      icon: <Calendar className="h-6 w-6 text-blue-500" />,
      status: getIntegrationStatus('google_calendar_key'),
      configKey: 'google_calendar_key',
    },
    {
      id: 'cal_com',
      name: 'Cal.com',
      description: 'תיאום פגישות אוטומטי עם לקוחות',
      icon: <Calendar className="h-6 w-6 text-purple-500" />,
      status: getIntegrationStatus('cal_com_api_key'),
      configKey: 'cal_com_api_key',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'שלח הודעות ללקוחות דרך וואטסאפ',
      icon: <MessageCircle className="h-6 w-6 text-green-500" />,
      status: getIntegrationStatus('whatsapp_instance_id'),
      configKey: 'whatsapp',
    },
    {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      description: 'בינה מלאכותית לניתוח ותשובות חכמות',
      icon: <Brain className="h-6 w-6 text-teal-500" />,
      status: getIntegrationStatus('openai_api_key'),
      configKey: 'openai_api_key',
    },
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      description: 'מודל שפה מתקדם לניתוח מסמכים',
      icon: <Bot className="h-6 w-6 text-orange-500" />,
      status: getIntegrationStatus('anthropic_api_key'),
      configKey: 'anthropic_api_key',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="אזור אישי והגדרות" />

      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              פרופיל
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="h-4 w-4" />
              אינטגרציות
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              אבטחה
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Moon className="h-4 w-4" />
              תצוגה
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 max-w-3xl">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-slate-800">פרטי חשבון</CardTitle>
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
                <div className="space-y-2">
                  <Label className="text-slate-700">טלפון</Label>
                  <Input
                    placeholder="050-0000000"
                    defaultValue={(user?.user_metadata as Record<string, unknown>)?.phone as string || ''}
                    className="bg-white border-slate-200 text-slate-800"
                    dir="ltr"
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Check className="h-4 w-4 ml-2" />
                  שמור שינויים
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">אינטגרציות וחיבורים</h3>
                <p className="text-sm text-muted-foreground">חבר את החשבון שלך לשירותים חיצוניים</p>
              </div>
              <Button variant="outline" onClick={loadIntegrations} disabled={isLoadingIntegrations}>
                <RefreshCw className={`h-4 w-4 ml-2 ${isLoadingIntegrations ? 'animate-spin' : ''}`} />
                רענן
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationsList.map((integration) => (
                <Card key={integration.id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {integration.icon}
                        <div>
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      <Badge
                        variant={integration.status === 'connected' ? 'default' : 'secondary'}
                        className={integration.status === 'connected' ? 'bg-green-100 text-green-700' : ''}
                      >
                        {integration.status === 'connected' ? (
                          <><CheckCircle2 className="h-3 w-3 ml-1" /> מחובר</>
                        ) : (
                          <><XCircle className="h-3 w-3 ml-1" /> לא מחובר</>
                        )}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedIntegration(integration.id);
                        setConfigDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4 ml-2" />
                      {integration.status === 'connected' ? 'הגדרות' : 'חבר עכשיו'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Models Section */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-slate-800">מודלי בינה מלאכותית</CardTitle>
                </div>
                <CardDescription>
                  הגדר מפתחות API למודלי שפה שונים לשימוש במערכת
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-teal-500" />
                      OpenAI API Key
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        className="bg-white"
                        dir="ltr"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveIntegration('openai_api_key', openaiApiKey)}
                      >
                        שמור
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-orange-500" />
                      Anthropic API Key
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="sk-ant-..."
                        value={anthropicApiKey}
                        onChange={(e) => setAnthropicApiKey(e.target.value)}
                        className="bg-white"
                        dir="ltr"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveIntegration('anthropic_api_key', anthropicApiKey)}
                      >
                        שמור
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6 max-w-3xl">
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
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6 max-w-3xl">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Integration Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration === 'google_calendar' && 'הגדרות Google Calendar'}
              {selectedIntegration === 'cal_com' && 'הגדרות Cal.com'}
              {selectedIntegration === 'whatsapp' && 'הגדרות WhatsApp'}
              {selectedIntegration === 'openai' && 'הגדרות OpenAI'}
              {selectedIntegration === 'anthropic' && 'הגדרות Anthropic'}
            </DialogTitle>
            <DialogDescription>
              הזן את פרטי החיבור לשירות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedIntegration === 'google_calendar' && (
              <>
                <div className="space-y-2">
                  <Label>Google Calendar API Key</Label>
                  <Input
                    placeholder="AIza..."
                    value={googleCalendarKey}
                    onChange={(e) => setGoogleCalendarKey(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-blue-700">
                    ליצירת מפתח API, היכנס ל-
                    <a href="https://console.cloud.google.com" target="_blank" className="underline mr-1">
                      Google Cloud Console
                    </a>
                  </p>
                </div>
              </>
            )}

            {selectedIntegration === 'cal_com' && (
              <>
                <div className="space-y-2">
                  <Label>Cal.com API Key</Label>
                  <Input
                    placeholder="cal_live_..."
                    value={calComApiKey}
                    onChange={(e) => setCalComApiKey(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-sm">
                  <p className="text-purple-700">
                    המפתח נמצא בהגדרות החשבון שלך ב-
                    <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" className="underline mr-1">
                      Cal.com
                    </a>
                  </p>
                </div>
              </>
            )}

            {selectedIntegration === 'whatsapp' && (
              <>
                <div className="space-y-2">
                  <Label>Instance ID (GreenAPI)</Label>
                  <Input
                    placeholder="1101234567"
                    value={whatsappInstanceId}
                    onChange={(e) => setWhatsappInstanceId(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <Input
                    type="password"
                    placeholder="abc123..."
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-sm">
                  <p className="text-green-700">
                    צור חשבון ב-
                    <a href="https://green-api.com" target="_blank" className="underline mr-1">
                      GreenAPI
                    </a>
                    לקבלת פרטי החיבור
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={() => {
              if (selectedIntegration === 'google_calendar') {
                saveIntegration('google_calendar_key', googleCalendarKey);
              } else if (selectedIntegration === 'cal_com') {
                saveIntegration('cal_com_api_key', calComApiKey);
              } else if (selectedIntegration === 'whatsapp') {
                saveIntegration('whatsapp_instance_id', whatsappInstanceId);
                saveIntegration('whatsapp_token', whatsappToken);
              }
              setConfigDialogOpen(false);
            }}>
              <Check className="h-4 w-4 ml-2" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
