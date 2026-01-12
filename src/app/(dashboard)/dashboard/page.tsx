'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Database,
  Plus,
  Activity,
  Users,
  TrendingUp,
  Wallet,
  Shield,
  Receipt,
  LayoutDashboard,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUserPreferencesStore } from '@/lib/stores/userPreferencesStore';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { DASHBOARD_TYPES } from '@/lib/dashboardTypes';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoadingProjects, connectToProject, deleteProject } =
    useProjectsStore();
  const { user } = useAuthStore();
  const { setDefaultProject } = useUserPreferencesStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleConnect = async (project: typeof projects[0]) => {
    await connectToProject(project);
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

  const { fetchProjects } = useProjectsStore();

  const handleProjectCreated = async (project: { id: string; name: string }) => {
    console.log('=== handleProjectCreated called ===');
    console.log('Project received:', project);
    console.log('Redirecting to:', `/projects/${project.id}`);

    // Refresh projects list first so the project page can find it
    await fetchProjects();

    toast.success(`הפרויקט "${project.name}" נוצר בהצלחה`);
    router.push(`/projects/${project.id}`);
  };

  // Group projects by type
  const projectsByType = projects.reduce((acc, project) => {
    const type = (project as { data_type?: string }).data_type || 'custom';
    if (!acc[type]) acc[type] = [];
    acc[type].push(project);
    return acc;
  }, {} as Record<string, typeof projects>);

  // Stats cards data - unified blue accent for professional look
  const stats = [
    {
      title: 'פרויקטים',
      value: projects.length,
      icon: Database,
    },
    {
      title: 'פעילות היום',
      value: '24',
      icon: Activity,
    },
    {
      title: 'משתמשים פעילים',
      value: '12',
      icon: Users,
    },
    {
      title: 'שאילתות השבוע',
      value: '1,234',
      icon: TrendingUp,
    },
  ];

  // Dashboard type icons
  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    accumulation: Wallet,
    insurance: Shield,
    commissions: Receipt,
    sahbak: TrendingUp,
    custom: LayoutDashboard,
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="דף הבית" />

      <div className="flex-1 p-6 space-y-8 overflow-auto">
        {/* Welcome Header with Big Logo */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Big Sela Logo */}
              <Image
                src="/sela-logo-full.png"
                alt="סלע סוכנות לביטוח"
                width={160}
                height={80}
                className="h-16 w-auto object-contain"
                priority
              />
              <div className="border-r border-slate-200 h-12 mx-2" />
              <div>
                <h1 className="text-xl font-semibold text-slate-800">
                  שלום, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'משתמש'}
                </h1>
                <p className="text-sm text-slate-500">מערכת ניהול דשבורדים מרכזית</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Selaboard</p>
              <p className="text-sm font-medium text-slate-600">גרסה 1.0</p>
            </div>
          </div>
        </div>

        {/* Quick Stats - Enterprise KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              {/* Top accent border */}
              <div className="h-0.5 bg-blue-600" />
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stat.value}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <stat.icon className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dashboard Types Quick Links */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">סוגי דשבורדים</h2>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 shadow-sm"
            >
              <Plus className="h-4 w-4 ml-2" />
              פרויקט חדש
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.values(DASHBOARD_TYPES).map((type) => {
              const Icon = type.icon;
              const count = projectsByType[type.id]?.length || 0;

              return (
                <button
                  key={type.id}
                  onClick={() => count > 0 ? null : setIsCreateOpen(true)}
                  className={`relative p-4 rounded-lg border transition-all duration-150 text-right ${
                    count > 0
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-sm hover:shadow'
                      : 'border-dashed border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center mb-3 bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <h3 className="font-medium text-slate-700 text-sm">{type.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{type.description}</p>
                  {count > 0 && (
                    <span className="absolute top-3 left-3 text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">הפרויקטים שלי</h2>
            <span className="text-sm text-slate-400">{projects.length} פרויקטים</span>
          </div>

          {isLoadingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-white border-slate-200">
                  <CardContent className="pt-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-8 bg-slate-200 rounded w-1/3" />
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
            <Card className="bg-white border-slate-200 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-2xl">S</span>
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">ברוכים הבאים ל-Selaboard</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  צרו את הפרויקט הראשון שלכם ותתחילו לנהל ולנתח נתונים בקלות
                </p>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-md"
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

      {/* New Project Modal */}
      <NewProjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
