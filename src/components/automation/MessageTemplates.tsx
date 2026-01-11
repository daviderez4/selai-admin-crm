'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Phone,
  Mail,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Star,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface MessageTemplate {
  id: string;
  project_id: string | null;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email';
  category: string | null;
  template_text: string;
  placeholders: string[];
  email_subject: string | null;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  created_at: string;
}

interface MessageTemplatesProps {
  projectId: string;
  onSelectTemplate?: (template: MessageTemplate) => void;
  selectionMode?: boolean;
  channelFilter?: 'whatsapp' | 'sms' | 'email';
}

const CHANNEL_ICONS = {
  whatsapp: MessageSquare,
  sms: Phone,
  email: Mail,
};

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'אימייל',
};

const CHANNEL_COLORS = {
  whatsapp: 'bg-green-100 text-green-700 border-green-200',
  sms: 'bg-blue-100 text-blue-700 border-blue-200',
  email: 'bg-purple-100 text-purple-700 border-purple-200',
};

const CATEGORY_OPTIONS = [
  { value: 'status_update', label: 'עדכון סטטוס' },
  { value: 'reminder', label: 'תזכורת' },
  { value: 'welcome', label: 'ברוכים הבאים' },
  { value: 'follow_up', label: 'מעקב' },
  { value: 'general', label: 'כללי' },
];

export function MessageTemplates({
  projectId,
  onSelectTemplate,
  selectionMode = false,
  channelFilter,
}: MessageTemplatesProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    channel: 'whatsapp' as 'whatsapp' | 'sms' | 'email',
    category: 'general',
    template_text: '',
    email_subject: '',
    is_default: false,
  });

  // Preview state
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, [projectId, channelFilter]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let url = `/api/projects/${projectId}/message-templates?active=true`;
      if (channelFilter) {
        url += `&channel=${channelFilter}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setTemplates(result.templates || []);
      } else {
        toast.error('שגיאה בטעינת התבניות');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('שגיאה בטעינת התבניות');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      channel: channelFilter || 'whatsapp',
      category: 'general',
      template_text: '',
      email_subject: '',
      is_default: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      channel: template.channel,
      category: template.category || 'general',
      template_text: template.template_text,
      email_subject: template.email_subject || '',
      is_default: template.is_default,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.template_text) {
      toast.error('נא למלא שם ותוכן לתבנית');
      return;
    }

    setSaving(true);
    try {
      const url = editingTemplate
        ? `/api/projects/${projectId}/message-templates/${editingTemplate.id}`
        : `/api/projects/${projectId}/message-templates`;

      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingTemplate ? 'התבנית עודכנה' : 'התבנית נוצרה בהצלחה');
        setDialogOpen(false);
        fetchTemplates();
      } else {
        const error = await response.json();
        toast.error(error.error || 'שגיאה בשמירת התבנית');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('שגיאה בשמירת התבנית');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('האם למחוק את התבנית?')) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/message-templates/${templateId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('התבנית נמחקה');
        fetchTemplates();
      } else {
        toast.error('שגיאה במחיקת התבנית');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('שגיאה במחיקת התבנית');
    }
  };

  const copyTemplate = async (template: MessageTemplate) => {
    await navigator.clipboard.writeText(template.template_text);
    setCopiedId(template.id);
    toast.success('הועתק ללוח');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Extract placeholders from current template text
  const extractedPlaceholders = formData.template_text.match(/\{([^}]+)\}/g)?.map(m => m.slice(1, -1)) || [];

  // Generate preview with sample data
  const generatePreview = (text: string) => {
    let preview = text;
    extractedPlaceholders.forEach(placeholder => {
      const value = previewData[placeholder] || `[${placeholder}]`;
      preview = preview.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
    });
    return preview;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      {!selectionMode && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">תבניות הודעה</h3>
          <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 ml-2" />
            תבנית חדשה
          </Button>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => {
          const Icon = CHANNEL_ICONS[template.channel];
          const isGlobal = !template.project_id;

          return (
            <Card
              key={template.id}
              className={`bg-white border-slate-200 hover:border-blue-300 transition-all cursor-pointer ${
                selectionMode ? 'hover:shadow-md' : ''
              }`}
              onClick={() => selectionMode && onSelectTemplate?.(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${CHANNEL_COLORS[template.channel]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-slate-800">
                        {template.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CHANNEL_LABELS[template.channel]}
                        </Badge>
                        {template.is_default && (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                            <Star className="h-3 w-3 ml-1" />
                            ברירת מחדל
                          </Badge>
                        )}
                        {isGlobal && (
                          <Badge variant="outline" className="text-xs text-slate-500">
                            גלובלי
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-slate-600 line-clamp-3 mb-3" dir="rtl">
                  {template.template_text}
                </p>

                {/* Placeholders */}
                {template.placeholders.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.placeholders.map(p => (
                      <span
                        key={p}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                      >
                        {`{${p}}`}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {!selectionMode && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyTemplate(template);
                      }}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {copiedId === template.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>

                    {!isGlobal && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(template);
                          }}
                          className="text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template.id);
                          }}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <span className="text-xs text-slate-400 mr-auto">
                      {template.usage_count} שימושים
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {templates.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>אין תבניות הודעה</p>
            {!selectionMode && (
              <Button
                variant="link"
                onClick={openCreateDialog}
                className="mt-2 text-blue-600"
              >
                צור תבנית ראשונה
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'עריכת תבנית' : 'תבנית הודעה חדשה'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>שם התבנית</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="לדוגמה: עדכון סטטוס תהליך"
              />
            </div>

            {/* Channel & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ערוץ</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(v: 'whatsapp' | 'sms' | 'email') =>
                    setFormData({ ...formData, channel: v })
                  }
                  disabled={!!editingTemplate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">אימייל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>קטגוריה</Label>
                <Select
                  value={formData.category}
                  onValueChange={v => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email Subject */}
            {formData.channel === 'email' && (
              <div className="space-y-2">
                <Label>נושא המייל</Label>
                <Input
                  value={formData.email_subject}
                  onChange={e => setFormData({ ...formData, email_subject: e.target.value })}
                  placeholder="נושא ההודעה"
                />
              </div>
            )}

            {/* Template Text */}
            <div className="space-y-2">
              <Label>תוכן ההודעה</Label>
              <Textarea
                value={formData.template_text}
                onChange={e => setFormData({ ...formData, template_text: e.target.value })}
                placeholder={`שלום {שם_לקוח}, זוהי הודעה מסוכנות הביטוח...\n\nהשתמש ב-{שם_שדה} כדי להוסיף משתנים דינמיים`}
                rows={5}
              />
              <p className="text-xs text-slate-500">
                טיפ: השתמש ב-{'{'}שם_שדה{'}'} כדי להוסיף נתונים דינמיים מהרשומה
              </p>
            </div>

            {/* Detected Placeholders */}
            {extractedPlaceholders.length > 0 && (
              <div className="space-y-2">
                <Label>משתנים שזוהו</Label>
                <div className="flex flex-wrap gap-2">
                  {extractedPlaceholders.map(p => (
                    <Badge key={p} variant="outline" className="text-sm">
                      {`{${p}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Section */}
            {formData.template_text && extractedPlaceholders.length > 0 && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label>תצוגה מקדימה (הכנס ערכים לדוגמה)</Label>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {extractedPlaceholders.map(p => (
                    <Input
                      key={p}
                      placeholder={p}
                      value={previewData[p] || ''}
                      onChange={e =>
                        setPreviewData({ ...previewData, [p]: e.target.value })
                      }
                      className="text-sm"
                    />
                  ))}
                </div>

                <div className="p-3 bg-white rounded border border-slate-200 text-sm whitespace-pre-wrap">
                  {generatePreview(formData.template_text)}
                </div>
              </div>
            )}

            {/* Is Default */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-600">
                הגדר כתבנית ברירת מחדל עבור {CHANNEL_LABELS[formData.channel]}
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editingTemplate ? 'שמור שינויים' : 'צור תבנית'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
