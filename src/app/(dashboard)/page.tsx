'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Plus,
  Activity,
  Users,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUserPreferencesStore } from '@/lib/stores/userPreferencesStore';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoadingProjects, connectToProject, createProject, deleteProject } =
    useProjectsStore();
  const { user } = useAuthStore();
  const { setDefaultProject } = useUserPreferencesStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    supabase_url: '',
    supabase_anon_key: '',
    service_key: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleConnect = async (project: typeof projects[0]) => {
    await connectToProject(project);
    // Save as default project for next login
    await setDefaultProject(project.id);
    router.push(`/projects/${project.id}`);
  };

  const handleDelete = async (projectId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את הפרויקט?')) {
      const success = await deleteProject(projectId);
      if (success) {
        toast.success('הפרויקט נמחק בהצלחה');
      } else {
        toast.error('שגיאה במחיקת הפרויקט');
      }
    }
  };

  const handleSettings = (project: typeof projects[0]) => {
    router.push(`/projects/${project.id}?tab=settings`);
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.supabase_url || !newProject.supabase_anon_key || !newProject.service_key) {
      toast.error('יש למלא את כל השדות');
      return;
    }

    setIsCreating(true);

    try {
      const project = await createProject({
        name: newProject.name,
        supabase_url: newProject.supabase_url,
        supabase_anon_key: newProject.supabase_anon_key,
        supabase_service_key: newProject.service_key, // Will be encrypted server-side
        description: newProject.description,
      });

      if (project) {
        toast.success('הפרויקט נוצר בהצלחה');
        setIsCreateOpen(false);
        setNewProject({ name: '', supabase_url: '', supabase_anon_key: '', service_key: '', description: '' });
      } else {
        toast.error('שגיאה ביצירת הפרויקט');
      }
    } catch (err) {
      toast.error('שגיאה ביצירת הפרויקט');
    } finally {
      setIsCreating(false);
    }
  };

  // Stats cards data
  const stats = [
    {
      title: 'פרויקטים',
      value: projects.length,
      icon: Database,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'פעילות היום',
      value: '24',
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'משתמשים פעילים',
      value: '12',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'שאילתות השבוע',
      value: '1,234',
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="דשבורד" />

      <div className="flex-1 p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              שלום, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'משתמש'}
            </h2>
            <p className="text-slate-400">ברוך הבא למערכת ניהול הפרויקטים</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="h-4 w-4 ml-2" />
                פרויקט חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-white">יצירת פרויקט חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">שם הפרויקט</Label>
                  <Input
                    placeholder="לדוגמה: Production DB"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Supabase URL</Label>
                  <Input
                    placeholder="https://xxx.supabase.co"
                    value={newProject.supabase_url}
                    onChange={(e) =>
                      setNewProject({ ...newProject, supabase_url: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Anon Key (Public)</Label>
                  <Input
                    type="password"
                    placeholder="eyJhbGci..."
                    value={newProject.supabase_anon_key}
                    onChange={(e) =>
                      setNewProject({ ...newProject, supabase_anon_key: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500">
                    המפתח הציבורי (anon key) מ-Supabase
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Service Key</Label>
                  <Input
                    type="password"
                    placeholder="eyJhbGci..."
                    value={newProject.service_key}
                    onChange={(e) =>
                      setNewProject({ ...newProject, service_key: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500">
                    המפתח יוצפן ויישמר בצורה מאובטחת
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">תיאור (אופציונלי)</Label>
                  <Input
                    placeholder="תיאור קצר של הפרויקט"
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({ ...newProject, description: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleCreateProject}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                      יוצר...
                    </>
                  ) : (
                    'צור פרויקט'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="bg-slate-800/50 border-slate-700"
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">הפרויקטים שלי</h3>
          </div>

          {isLoadingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-slate-700 rounded w-3/4" />
                      <div className="h-3 bg-slate-700 rounded w-1/2" />
                      <div className="h-8 bg-slate-700 rounded w-1/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onConnect={handleConnect}
                  onDelete={handleDelete}
                  onSettings={handleSettings}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700 border-dashed">
              <CardContent className="py-12 text-center">
                <Database className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">אין עדיין פרויקטים</p>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  צור פרויקט ראשון
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
