'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  Database,
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectWithStatus {
  id: string;
  name: string;
  description?: string;
  supabase_url: string;
  table_name: string;
  data_type?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  is_configured: boolean;
  connection_last_tested: string | null;
  connection_error: string | null;
  created_at: string;
  member_count: number;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<ProjectWithStatus | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_key: '',
    table_name: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects');
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setProjects(data.projects || []);
    } catch (error) {
      toast.error('שגיאה בטעינת הפרויקטים');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (projectId: string) => {
    setTestingId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/test-connection`, {
        method: 'POST',
      });
      const result = await res.json();

      if (result.success) {
        toast.success(`חיבור תקין! ${result.tableExists ? `נמצאו ${result.rowCount || 0} רשומות` : 'הטבלה לא קיימת'}`);
      } else {
        toast.error(`חיבור נכשל: ${result.error}`);
      }

      // Refresh list
      fetchProjects();
    } catch (error) {
      toast.error('שגיאה בבדיקת החיבור');
    } finally {
      setTestingId(null);
    }
  };

  const openEditDialog = (project: ProjectWithStatus) => {
    setEditProject(project);
    setEditForm({
      supabase_url: project.supabase_url,
      supabase_anon_key: '', // Don't show existing keys
      supabase_service_key: '',
      table_name: project.table_name || 'master_data',
    });
    setShowKeys(false);
  };

  const saveCredentials = async () => {
    if (!editProject) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${editProject.id}/update-credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_url: editForm.supabase_url,
          supabase_anon_key: editForm.supabase_anon_key || undefined,
          supabase_service_key: editForm.supabase_service_key || undefined,
          table_name: editForm.table_name,
          test_connection: true,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || 'שגיאה בעדכון');
        return;
      }

      if (result.connection_test?.success) {
        toast.success('פרטי החיבור עודכנו והחיבור נבדק בהצלחה');
      } else if (result.connection_test) {
        toast.warning(`פרטי החיבור עודכנו אך החיבור נכשל: ${result.connection_test.error}`);
      } else {
        toast.success('פרטי החיבור עודכנו');
      }

      setEditProject(null);
      fetchProjects();
    } catch (error) {
      toast.error('שגיאה בעדכון פרטי החיבור');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (configured: boolean) => {
    return configured
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'לא נבדק';
    return new Date(dateStr).toLocaleString('he-IL');
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[{ label: 'ניהול' }, { label: 'ניהול פרויקטים' }]} />

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">ניהול חיבורי מסדי נתונים</h1>
              <p className="text-slate-400 mt-1">
                הגדרת והקצאת מסדי נתונים לכל פרויקט
              </p>
            </div>
            <Button variant="outline" onClick={fetchProjects} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
              רענון
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">סה"כ פרויקטים</p>
                    <p className="text-2xl font-bold text-white">{projects.length}</p>
                  </div>
                  <Database className="h-8 w-8 text-slate-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">מוגדרים</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {projects.filter(p => p.is_configured).length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">לא מוגדרים</p>
                    <p className="text-2xl font-bold text-red-400">
                      {projects.filter(p => !p.is_configured).length}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-slate-400">טוען...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-slate-400">לא נמצאו פרויקטים</div>
            ) : (
              projects.map((project) => (
                <Card key={project.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {project.is_configured ? (
                          <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <h3 className="font-semibold text-white text-lg">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                              {project.supabase_url}
                            </code>
                            <span className="text-slate-500">→</span>
                            <code className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                              {project.table_name || 'master_data'}
                            </code>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.member_count} משתמשים
                            </span>
                            <span>•</span>
                            <span>נבדק: {formatDate(project.connection_last_tested)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <Badge
                            variant="outline"
                            className={getStatusColor(project.is_configured)}
                          >
                            {project.is_configured ? 'מוגדר' : 'לא מוגדר'}
                          </Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testConnection(project.id)}
                            disabled={testingId === project.id}
                            title="בדיקת חיבור"
                          >
                            {testingId === project.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Database className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(project)}
                            title="עריכת פרטי חיבור"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/projects/${project.id}`, '_blank')}
                            title="פתיחת הפרויקט"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {project.connection_error && (
                      <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-sm text-red-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          {project.connection_error}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onOpenChange={() => setEditProject(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-white">עריכת פרטי חיבור: {editProject?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              עדכון פרטי ההתחברות למסד הנתונים של הפרויקט
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Supabase URL</Label>
              <Input
                value={editForm.supabase_url}
                onChange={(e) => setEditForm(f => ({ ...f, supabase_url: e.target.value }))}
                placeholder="https://xxxxx.supabase.co"
                dir="ltr"
                className="mt-1 bg-slate-800 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Anon Key (השאר ריק לשמירת הקיים)</Label>
              <Input
                value={editForm.supabase_anon_key}
                onChange={(e) => setEditForm(f => ({ ...f, supabase_anon_key: e.target.value }))}
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                className="mt-1 bg-slate-800 border-slate-600 text-white"
                placeholder="eyJhbGc..."
              />
            </div>

            <div>
              <Label className="text-slate-300">Service Key (השאר ריק לשמירת הקיים)</Label>
              <Input
                value={editForm.supabase_service_key}
                onChange={(e) => setEditForm(f => ({ ...f, supabase_service_key: e.target.value }))}
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                className="mt-1 bg-slate-800 border-slate-600 text-white"
                placeholder="eyJhbGc..."
              />
            </div>

            <div>
              <Label className="text-slate-300">שם הטבלה</Label>
              <Input
                value={editForm.table_name}
                onChange={(e) => setEditForm(f => ({ ...f, table_name: e.target.value }))}
                className="mt-1 bg-slate-800 border-slate-600 text-white"
                placeholder="master_data"
              />
            </div>

            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="text-slate-400"
              >
                {showKeys ? <EyeOff className="h-4 w-4 ml-2" /> : <Eye className="h-4 w-4 ml-2" />}
                {showKeys ? 'הסתר מפתחות' : 'הצג מפתחות'}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
              <Button variant="outline" onClick={() => setEditProject(null)}>
                ביטול
              </Button>
              <Button onClick={saveCredentials} disabled={saving}>
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                ) : null}
                שמור ובדוק חיבור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
