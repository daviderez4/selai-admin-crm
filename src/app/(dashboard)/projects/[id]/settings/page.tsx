'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Database,
  ArrowRight,
  Save,
  Loader2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  Mail,
  Calendar,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConnectionTestResult {
  success: boolean;
  error?: string;
  tableExists?: boolean;
  rowCount?: number;
}

const AVAILABLE_TABLES = [
  { value: 'master_data', label: 'master_data', description: 'נתוני מכירות / צבירה', icon: '📊' },
  { value: 'insurance_data', label: 'insurance_data', description: 'נתוני ביטוח', icon: '🛡️' },
  { value: 'processes_data', label: 'processes_data', description: 'נתוני תהליכים', icon: '⚙️' },
  { value: 'commissions_data', label: 'commissions_data', description: 'נתוני עמלות', icon: '💵' },
];

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { projects, selectedProject, connectToProject, fetchProjects } = useProjectsStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTestResult | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    table_name: 'master_data',
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_key: '',
    // Update frequency settings
    update_frequency: 'manual' as 'manual' | 'daily' | 'weekly' | 'monthly',
    auto_import_email: '',
    auto_import_enabled: false,
  });

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      let project = projects.find((p) => p.id === projectId);

      if (!project && projects.length >= 0) {
        await fetchProjects();
        const updatedProjects = useProjectsStore.getState().projects;
        project = updatedProjects.find((p) => p.id === projectId);
      }

      if (project) {
        if (!selectedProject || selectedProject.id !== projectId) {
          connectToProject(project);
        }
        setFormData({
          name: project.name || '',
          description: project.description || '',
          table_name: project.table_name || 'master_data',
          supabase_url: project.supabase_url || '',
          supabase_anon_key: project.supabase_anon_key || '',
          supabase_service_key: '', // Don't show encrypted key
          // Update frequency settings
          update_frequency: project.update_frequency || 'manual',
          auto_import_email: project.auto_import_email || '',
          auto_import_enabled: project.auto_import_enabled || false,
        });
      }
      setLoading(false);
    };

    loadProject();
  }, [projectId, projects, selectedProject, connectToProject, fetchProjects]);

  // Test connection (tests the saved credentials in database)
  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);

    try {
      // This tests the saved credentials in the database
      const response = await fetch(`/api/projects/${projectId}/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      setConnectionStatus(result);

      if (result.success) {
        toast.success('החיבור הצליח!');
      } else {
        toast.error(result.error || 'החיבור נכשל');
      }
    } catch (error) {
      toast.error('שגיאה בבדיקת החיבור');
      setConnectionStatus({ success: false, error: 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  // Save settings
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('נא למלא שם פרויקט');
      return;
    }

    if (!formData.supabase_url || !formData.supabase_anon_key) {
      toast.error('נא למלא פרטי חיבור ל-Supabase');
      return;
    }

    setSaving(true);

    try {
      // Use update-credentials endpoint which handles both basic info and credentials
      const payload: Record<string, string | boolean | undefined> = {
        supabase_url: formData.supabase_url,
        supabase_anon_key: formData.supabase_anon_key,
        table_name: formData.table_name,
        test_connection: false, // Don't test on every save
        // Update frequency settings
        update_frequency: formData.update_frequency,
        auto_import_email: formData.auto_import_email || undefined,
        auto_import_enabled: formData.auto_import_enabled,
      };

      // Only include service key if it was changed
      if (formData.supabase_service_key) {
        payload.supabase_service_key = formData.supabase_service_key;
        payload.test_connection = true; // Test when service key changes
      }

      const credResponse = await fetch(`/api/projects/${projectId}/update-credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!credResponse.ok) {
        const error = await credResponse.json();
        throw new Error(error.error || 'Failed to save credentials');
      }

      const credResult = await credResponse.json();

      if (credResult.connection_test && !credResult.connection_test.success) {
        toast.warning(`פרטי החיבור נשמרו, אבל בדיקת החיבור נכשלה: ${credResult.connection_test.error}`);
      } else {
        toast.success('ההגדרות נשמרו בהצלחה');
      }

      await fetchProjects();
      router.push(`/projects/${projectId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-cyan-500 mx-auto mb-4 animate-spin" />
          <p className="text-slate-400">טוען הגדרות...</p>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">הפרויקט לא נמצא</p>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="border-slate-700 text-slate-300"
          >
            חזור לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: selectedProject.name, href: `/projects/${projectId}` },
    { label: 'הגדרות' },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={breadcrumbs} />

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">הגדרות פרויקט</h1>
              <p className="text-slate-500">עדכון פרטי הפרויקט וחיבור למסד הנתונים</p>
            </div>
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" className="text-slate-600 hover:text-slate-800">
                <ArrowRight className="h-4 w-4 ml-2" />
                חזור לפרויקט
              </Button>
            </Link>
          </div>

          {/* Basic Info Card */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800">פרטי הפרויקט</CardTitle>
              <CardDescription className="text-slate-500">שם ותיאור הפרויקט</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700">שם הפרויקט *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="לדוגמה: דשבורד צבירה ראשי"
                  className="bg-white border-slate-300 text-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="תיאור קצר..."
                  className="bg-white border-slate-300 text-slate-800 resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Database Connection Card */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    חיבור למסד הנתונים
                  </CardTitle>
                  <CardDescription className="text-slate-500">פרטי Supabase לפרויקט זה</CardDescription>
                </div>
                {selectedProject.is_configured ? (
                  <Badge className="bg-emerald-100 text-emerald-700">מוגדר</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">לא מוגדר</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supabase URL */}
              <div className="space-y-2">
                <Label htmlFor="supabase_url" className="text-slate-700">Supabase URL *</Label>
                <Input
                  id="supabase_url"
                  value={formData.supabase_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, supabase_url: e.target.value }))}
                  placeholder="https://xxxxx.supabase.co"
                  className="bg-slate-50 border-slate-300 text-slate-800 font-mono text-sm"
                  dir="ltr"
                />
              </div>

              {/* Anon Key */}
              <div className="space-y-2">
                <Label htmlFor="supabase_anon_key" className="text-slate-700">Anon Key *</Label>
                <Input
                  id="supabase_anon_key"
                  value={formData.supabase_anon_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, supabase_anon_key: e.target.value }))}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="bg-slate-50 border-slate-300 text-slate-800 font-mono text-sm"
                  dir="ltr"
                />
              </div>

              {/* Service Key */}
              <div className="space-y-2">
                <Label htmlFor="supabase_service_key" className="text-slate-700">
                  Service Key (להחלפה בלבד)
                </Label>
                <div className="relative">
                  <Input
                    id="supabase_service_key"
                    type={showServiceKey ? 'text' : 'password'}
                    value={formData.supabase_service_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, supabase_service_key: e.target.value }))}
                    placeholder="השאר ריק כדי לשמור את המפתח הקיים"
                    className="bg-slate-50 border-slate-300 text-slate-800 font-mono text-sm pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowServiceKey(!showServiceKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showServiceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  המפתח מוצפן בשמירה. השאר ריק אם אין צורך לשנות.
                </p>
              </div>

              {/* Table Selection */}
              <div className="space-y-2">
                <Label className="text-slate-700">טבלה לאחסון הנתונים</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_TABLES.map(table => (
                    <button
                      key={table.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, table_name: table.value }))}
                      className={cn(
                        'p-3 rounded-lg border transition-all text-right flex items-center gap-2',
                        formData.table_name === table.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <span className="text-lg">{table.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{table.description}</p>
                        <p className="text-xs text-slate-500 font-mono">{table.label}</p>
                      </div>
                      {formData.table_name === table.value && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Connection */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testing || !formData.supabase_url}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        בודק...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 ml-2" />
                        בדוק חיבור
                      </>
                    )}
                  </Button>

                  {connectionStatus && (
                    <div className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg',
                      connectionStatus.success ? 'bg-emerald-50' : 'bg-red-50'
                    )}>
                      {connectionStatus.success ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-emerald-600">
                            החיבור הצליח
                            {connectionStatus.tableExists && ` (${connectionStatus.rowCount?.toLocaleString('he-IL')} שורות)`}
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">
                            {connectionStatus.error || 'החיבור נכשל'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Frequency Card */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                תדירות עדכון נתונים
              </CardTitle>
              <CardDescription className="text-slate-500">
                הגדר כיצד יתעדכנו הנתונים - ידנית או אוטומטית
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Update Frequency Selection */}
              <div className="space-y-2">
                <Label className="text-slate-700">תדירות עדכון</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'manual', label: 'ידני', description: 'עדכון בלחיצה בלבד', icon: '✋' },
                    { value: 'daily', label: 'יומי', description: 'עדכון אוטומטי כל יום', icon: '📆' },
                    { value: 'weekly', label: 'שבועי', description: 'עדכון פעם בשבוע', icon: '📅' },
                    { value: 'monthly', label: 'חודשי', description: 'עדכון פעם בחודש', icon: '🗓️' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        update_frequency: option.value as typeof prev.update_frequency
                      }))}
                      className={cn(
                        'p-3 rounded-lg border transition-all text-right flex items-center gap-2',
                        formData.update_frequency === option.value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{option.label}</p>
                        <p className="text-xs text-slate-500">{option.description}</p>
                      </div>
                      {formData.update_frequency === option.value && (
                        <Check className="h-4 w-4 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Import Email - Only show if not manual */}
              {formData.update_frequency !== 'manual' && (
                <>
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <Label className="text-slate-700">ייבוא אוטומטי ממייל</Label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, auto_import_enabled: !prev.auto_import_enabled }))}
                        className={cn(
                          'w-12 h-6 rounded-full transition-colors relative',
                          formData.auto_import_enabled ? 'bg-emerald-500' : 'bg-slate-300'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                            formData.auto_import_enabled ? 'left-7' : 'left-1'
                          )}
                        />
                      </button>
                    </div>

                    {/* Email Input */}
                    {formData.auto_import_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="auto_import_email" className="text-slate-700">
                          כתובת מייל לניטור
                        </Label>
                        <Input
                          id="auto_import_email"
                          type="email"
                          value={formData.auto_import_email}
                          onChange={(e) => setFormData(prev => ({ ...prev, auto_import_email: e.target.value }))}
                          placeholder="reports@company.com"
                          className="bg-white border-slate-300 text-slate-800"
                          dir="ltr"
                        />
                        <p className="text-xs text-slate-500">
                          קבצי אקסל שיתקבלו לכתובת זו ייובאו אוטומטית לפרויקט
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formData.update_frequency === 'daily' && 'הנתונים יתעדכנו מדי יום בשעה 06:00'}
                      {formData.update_frequency === 'weekly' && 'הנתונים יתעדכנו כל יום ראשון בשעה 06:00'}
                      {formData.update_frequency === 'monthly' && 'הנתונים יתעדכנו ב-1 לכל חודש בשעה 06:00'}
                    </p>
                  </div>
                </>
              )}

              {formData.update_frequency === 'manual' && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-600 text-sm">
                    במצב ידני, עליך לייבא קבצים דרך מסך הייבוא בכל פעם שתרצה לעדכן נתונים
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}`)}
              className="border-slate-300 text-slate-700"
            >
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  שמור הגדרות
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
