'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Mail,
  MessageCircle,
  Clock,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  ArrowDownToLine,
  History,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageTemplates } from '@/components/automation/MessageTemplates';
import { cn } from '@/lib/utils';

interface ScheduledImport {
  id: string;
  email_address: string;
  sender_whitelist: string[];
  subject_pattern: string | null;
  target_table: string;
  import_mode: string;
  data_frequency: string;
  is_active: boolean;
  last_import_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface InboundEmail {
  id: string;
  message_id: string;
  from_email: string;
  subject: string;
  received_at: string;
  attachment_name: string | null;
  status: string;
  error_message: string | null;
}

export default function AutomationPage() {
  const params = useParams();
  const projectId = params.id as string;

  // State
  const [loading, setLoading] = useState(true);
  const [scheduledImports, setScheduledImports] = useState<ScheduledImport[]>([]);
  const [recentEmails, setRecentEmails] = useState<InboundEmail[]>([]);
  const [activeTab, setActiveTab] = useState<'imports' | 'templates' | 'history'>('templates');

  // New import form state
  const [showNewImportForm, setShowNewImportForm] = useState(false);
  const [newImportEmail, setNewImportEmail] = useState('');
  const [newImportSenders, setNewImportSenders] = useState('');
  const [newImportSubject, setNewImportSubject] = useState('');
  const [newImportTable, setNewImportTable] = useState('master_data');
  const [newImportFrequency, setNewImportFrequency] = useState('daily');
  const [savingImport, setSavingImport] = useState(false);

  // Fetch automation settings
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // For now, we'll use mock data since the API endpoints will be created separately
      // In production, these would be real API calls

      // Mock scheduled imports
      setScheduledImports([]);
      setRecentEmails([]);
    } catch (err) {
      console.error('Failed to fetch automation data:', err);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle new scheduled import
  const handleCreateImport = async () => {
    if (!newImportEmail) {
      toast.error('יש להזין כתובת מייל');
      return;
    }

    setSavingImport(true);
    try {
      // API call would go here
      toast.success('הגדרות ייבוא נשמרו בהצלחה');
      setShowNewImportForm(false);
      setNewImportEmail('');
      setNewImportSenders('');
      setNewImportSubject('');
      fetchData();
    } catch (err) {
      toast.error('שגיאה בשמירת הגדרות');
    } finally {
      setSavingImport(false);
    }
  };

  // Handle delete scheduled import
  const handleDeleteImport = async (id: string) => {
    if (!confirm('האם למחוק את הגדרת הייבוא?')) return;

    try {
      // API call would go here
      toast.success('הגדרת הייבוא נמחקה');
      fetchData();
    } catch (err) {
      toast.error('שגיאה במחיקה');
    }
  };

  // Handle toggle import active
  const handleToggleImport = async (id: string, isActive: boolean) => {
    try {
      // API call would go here
      toast.success(isActive ? 'הייבוא הופעל' : 'הייבוא הושהה');
      fetchData();
    } catch (err) {
      toast.error('שגיאה בעדכון');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="אוטומציה"
        subtitle="ייבוא אוטומטי ותבניות הודעה"
      />

      <div className="flex-1 p-6 overflow-auto bg-slate-50/50" dir="rtl">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg w-fit shadow-sm mb-6">
          <Button
            variant={activeTab === 'templates' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('templates')}
            className={cn(
              'gap-2',
              activeTab === 'templates'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            <MessageCircle className="h-4 w-4" />
            תבניות הודעה
          </Button>
          <Button
            variant={activeTab === 'imports' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('imports')}
            className={cn(
              'gap-2',
              activeTab === 'imports'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            <Mail className="h-4 w-4" />
            ייבוא במייל
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className={cn(
              'gap-2',
              activeTab === 'history'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            <History className="h-4 w-4" />
            היסטוריה
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'templates' && (
          <MessageTemplates projectId={projectId} />
        )}

        {activeTab === 'imports' && (
          <div className="space-y-6">
            {/* Email Import Setup */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    ייבוא אוטומטי במייל
                  </CardTitle>
                  <Button
                    onClick={() => setShowNewImportForm(!showNewImportForm)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הגדרה חדשה
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <ArrowDownToLine className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">איך זה עובד?</p>
                      <ol className="list-decimal mr-4 space-y-1 text-blue-700">
                        <li>הגדר כתובת מייל לקבלת דוחות</li>
                        <li>שלח קבצי Excel מהכתובות המורשות</li>
                        <li>המערכת תייבא את הנתונים אוטומטית (מצב תוספתי)</li>
                        <li>תקבל אישור במייל לאחר כל ייבוא</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* New Import Form */}
                {showNewImportForm && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-slate-800 mb-4">הגדרת ייבוא חדש</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-700">כתובת מייל לקבלת דוחות</Label>
                          <Input
                            type="email"
                            placeholder="reports@project.selai.app"
                            value={newImportEmail}
                            onChange={(e) => setNewImportEmail(e.target.value)}
                            className="bg-white border-slate-200"
                          />
                          <p className="text-xs text-slate-500">
                            כתובת ייחודית לפרויקט זה
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700">שולחים מורשים (אופציונלי)</Label>
                          <Input
                            placeholder="email1@company.com, email2@company.com"
                            value={newImportSenders}
                            onChange={(e) => setNewImportSenders(e.target.value)}
                            className="bg-white border-slate-200"
                          />
                          <p className="text-xs text-slate-500">
                            הפרד בפסיקים. השאר ריק לקבלה מכולם.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-700">תדירות צפויה</Label>
                          <Select value={newImportFrequency} onValueChange={setNewImportFrequency}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">יומי</SelectItem>
                              <SelectItem value="weekly">שבועי</SelectItem>
                              <SelectItem value="monthly">חודשי</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700">טבלת יעד</Label>
                          <Select value={newImportTable} onValueChange={setNewImportTable}>
                            <SelectTrigger className="bg-white border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="master_data">master_data</SelectItem>
                              <SelectItem value="insurance_data">insurance_data</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700">תבנית נושא (אופציונלי)</Label>
                          <Input
                            placeholder="דוח*יומי*"
                            value={newImportSubject}
                            onChange={(e) => setNewImportSubject(e.target.value)}
                            className="bg-white border-slate-200"
                          />
                          <p className="text-xs text-slate-500">
                            * = תו כלשהו
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={handleCreateImport}
                          disabled={savingImport}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {savingImport ? (
                            <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <Check className="h-4 w-4 ml-2" />
                          )}
                          שמור
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowNewImportForm(false)}
                          className="border-slate-200"
                        >
                          ביטול
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Imports */}
                {scheduledImports.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="font-medium">אין הגדרות ייבוא</p>
                    <p className="text-sm mt-1">לחץ על "הגדרה חדשה" להתחיל</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledImports.map((imp) => (
                      <div
                        key={imp.id}
                        className={cn(
                          'p-4 border rounded-lg transition-colors',
                          imp.is_active
                            ? 'bg-white border-slate-200'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              imp.is_active ? 'bg-green-500' : 'bg-slate-400'
                            )} />
                            <div>
                              <p className="font-medium text-slate-800">{imp.email_address}</p>
                              <p className="text-sm text-slate-500">
                                {imp.data_frequency === 'daily' && 'יומי'}
                                {imp.data_frequency === 'weekly' && 'שבועי'}
                                {imp.data_frequency === 'monthly' && 'חודשי'}
                                {' • '}
                                טבלה: {imp.target_table}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleImport(imp.id, !imp.is_active)}
                              className="text-slate-500 hover:text-slate-700"
                            >
                              {imp.is_active ? 'השהה' : 'הפעל'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteImport(imp.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {imp.last_error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 inline ml-1" />
                            {imp.last_error}
                          </div>
                        )}
                        {imp.last_import_at && (
                          <p className="text-xs text-slate-400 mt-2">
                            ייבוא אחרון: {new Date(imp.last_import_at).toLocaleString('he-IL')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-600" />
                  היסטוריית מיילים נכנסים
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {recentEmails.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <History className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="font-medium">אין היסטוריה</p>
                    <p className="text-sm mt-1">מיילים נכנסים יופיעו כאן</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800">{email.subject}</p>
                            <p className="text-sm text-slate-500">
                              מ: {email.from_email}
                            </p>
                          </div>
                          <div className="text-left">
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              email.status === 'processed' && 'bg-green-100 text-green-700',
                              email.status === 'pending' && 'bg-amber-100 text-amber-700',
                              email.status === 'error' && 'bg-red-100 text-red-700',
                            )}>
                              {email.status === 'processed' && 'עובד'}
                              {email.status === 'pending' && 'ממתין'}
                              {email.status === 'error' && 'שגיאה'}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(email.received_at).toLocaleString('he-IL')}
                            </p>
                          </div>
                        </div>
                        {email.attachment_name && (
                          <div className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                            <FileSpreadsheet className="h-4 w-4" />
                            {email.attachment_name}
                          </div>
                        )}
                        {email.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {email.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
