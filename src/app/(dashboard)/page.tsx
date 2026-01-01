'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        {/* Hero Section with Logo */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-800/80 to-slate-900 border border-slate-700 p-8">
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            {/* Logo */}
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20">
              <span className="text-white font-bold text-4xl">ס</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-2">סלע דשבורדים</h1>
            <p className="text-slate-400 mb-1">Sela Dashboards</p>
            <p className="text-slate-500 text-sm max-w-md">
              מערכת ניהול דשבורדים מרכזית לסלע ביטוח - ניהול, מעקב ודיווח על נתוני צבירה, ביטוח ועמלות
            </p>

            {/* Welcome */}
            <div className="mt-6 pt-6 border-t border-slate-700/50 w-full max-w-md">
              <p className="text-slate-400">
                שלום, <span className="text-white font-medium">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'משתמש'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors"
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dashboard Types Quick Links */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">סוגי דשבורדים</h2>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
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
                  className={`relative p-4 rounded-xl border transition-all text-right group ${
                    count > 0
                      ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      : 'border-dashed border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br ${type.gradientFrom} ${type.gradientTo}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-sm">{type.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                  {count > 0 && (
                    <Badge
                      className={`absolute top-3 left-3 bg-${type.color}-500/20 text-${type.color}-400 border-0`}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">הפרויקטים שלי</h2>
            <span className="text-sm text-slate-500">{projects.length} פרויקטים</span>
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
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">ס</span>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">ברוכים הבאים לסלע דשבורדים</h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                  צרו את הפרויקט הראשון שלכם ותתחילו לנהל ולנתח נתונים בקלות
                </p>
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
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
