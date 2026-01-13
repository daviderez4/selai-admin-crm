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
  Target,
  UserCheck,
  Briefcase,
  Calendar,
  MessageSquare,
  Settings,
  FileText,
  Bot,
  Link2,
  BarChart3,
  PieChart,
  ClipboardList,
  Building,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ProjectCard } from '@/components/ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUserPreferencesStore } from '@/lib/stores/userPreferencesStore';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { DASHBOARD_TYPES } from '@/lib/dashboardTypes';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { SystemRole } from '@/types/permissions';
import { ROLE_CONFIGS, getRoleInfo } from '@/types/permissions';

interface AppModule {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bgColor: string;
  category: string;
  roles: SystemRole[];
  badge?: string;
  badgeColor?: string;
}

interface QuickStat {
  label: string;
  value: number | string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { projects, isLoadingProjects, connectToProject, deleteProject, fetchProjects } =
    useProjectsStore();
  const { user } = useAuthStore();
  const { setDefaultProject, defaultProjectId } = useUserPreferencesStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userRole, setUserRole] = useState<SystemRole>('agent');
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: string;
    title: string;
    time: string;
    icon: React.ComponentType<{ className?: string }>;
  }>>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
  }>>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Load user role and stats
  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // Get user role from users table
        const { data: userData } = await supabase
          .from('users')
          .select('user_type, role')
          .eq('email', authUser.email)
          .single();

        if (userData) {
          setUserRole((userData.user_type as SystemRole) || 'agent');
        }

        // Load quick stats based on role
        await loadQuickStats(supabase, (userData?.user_type as SystemRole) || 'agent');
      }
      setIsLoadingStats(false);
    };

    loadUserData();
  }, []);

  const loadQuickStats = async (supabase: ReturnType<typeof createClient>, role: SystemRole) => {
    try {
      // Get counts for different entities
      const [leadsResult, dealsResult, tasksResult, contactsResult] = await Promise.all([
        supabase.from('crm_leads').select('id', { count: 'exact', head: true }),
        supabase.from('crm_deals').select('id', { count: 'exact', head: true }),
        supabase.from('crm_tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
      ]);

      const stats: QuickStat[] = [
        { label: 'לידים פעילים', value: leadsResult.count || 0, icon: Target, change: '+12%', changeType: 'up' },
        { label: 'עסקאות פתוחות', value: dealsResult.count || 0, icon: Briefcase, change: '+5%', changeType: 'up' },
        { label: 'משימות ממתינות', value: tasksResult.count || 0, icon: ClipboardList },
        { label: 'אנשי קשר', value: contactsResult.count || 0, icon: Users, change: '+8%', changeType: 'up' },
      ];

      setQuickStats(stats);

      // Load recent tasks
      const { data: tasks } = await supabase
        .from('crm_tasks')
        .select('id, title, due_date, priority')
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(5);

      if (tasks) {
        setUpcomingTasks(tasks.map(t => ({
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          priority: t.priority,
        })));
      }

      // Set recent activity (mock for now - would come from audit logs)
      setRecentActivity([
        { type: 'lead', title: 'ליד חדש התקבל: יעקב כהן', time: 'לפני 5 דקות', icon: Target },
        { type: 'deal', title: 'עסקה עודכנה: פוליסת בריאות משפחתית', time: 'לפני 15 דקות', icon: Briefcase },
        { type: 'task', title: 'משימה הושלמה: התקשר ללקוח', time: 'לפני שעה', icon: CheckCircle2 },
        { type: 'message', title: 'הודעת WhatsApp חדשה', time: 'לפני 2 שעות', icon: MessageSquare },
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // App modules configuration based on roles
  const appModules: AppModule[] = [
    // Activity Center
    {
      id: 'dashboard',
      name: 'לוח בקרה',
      description: 'סקירה כללית של הפעילות',
      icon: LayoutDashboard,
      href: defaultProjectId ? `/projects/${defaultProjectId}` : '/projects',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      category: 'מרכז הפעילות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },
    {
      id: 'tasks',
      name: 'משימות',
      description: 'ניהול משימות יומיות',
      icon: ClipboardList,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/tasks` : '/projects',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      category: 'מרכז הפעילות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
      badge: upcomingTasks.length > 0 ? `${upcomingTasks.length}` : undefined,
      badgeColor: 'bg-orange-500',
    },
    {
      id: 'calendar',
      name: 'יומן',
      description: 'פגישות ואירועים',
      icon: Calendar,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/calendar` : '/projects',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      category: 'מרכז הפעילות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },
    {
      id: 'messages',
      name: 'הודעות',
      description: 'תקשורת עם לקוחות',
      icon: MessageSquare,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/messages` : '/projects',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      category: 'מרכז הפעילות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },

    // Sales & Leads
    {
      id: 'leads',
      name: 'לידים',
      description: 'ניהול לידים חדשים',
      icon: Target,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/leads` : '/projects',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      category: 'לידים ומכירות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },
    {
      id: 'deals',
      name: 'עסקאות',
      description: 'מעקב אחר עסקאות',
      icon: Briefcase,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/deals` : '/projects',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      category: 'לידים ומכירות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },
    {
      id: 'contacts',
      name: 'אנשי קשר',
      description: 'מאגר אנשי קשר',
      icon: Users,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/contacts` : '/projects',
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      category: 'לידים ומכירות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },
    {
      id: 'campaigns',
      name: 'קמפיינים',
      description: 'שיווק והפצה',
      icon: Mail,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/campaigns` : '/projects',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      category: 'לידים ומכירות',
      roles: ['admin', 'manager', 'supervisor'],
    },

    // Client Management
    {
      id: 'policies',
      name: 'פוליסות',
      description: 'ניהול פוליסות ביטוח',
      icon: Shield,
      href: defaultProjectId ? `/projects/${defaultProjectId}/crm/policies` : '/projects',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      category: 'ניהול לקוחות',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },
    {
      id: 'reports',
      name: 'דוחות',
      description: 'ניתוח והפקת דוחות',
      icon: BarChart3,
      href: defaultProjectId ? `/projects/${defaultProjectId}/reports` : '/projects',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      category: 'ניהול לקוחות',
      roles: ['admin', 'manager', 'supervisor'],
    },

    // Automation & AI
    {
      id: 'automation',
      name: 'אוטומציה',
      description: 'תבניות והגדרות',
      icon: Bot,
      href: defaultProjectId ? `/projects/${defaultProjectId}/automation` : '/projects',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      category: 'אוטומציה',
      roles: ['admin', 'manager', 'supervisor'],
    },
    {
      id: 'integrations',
      name: 'אינטגרציות',
      description: 'חיבורים חיצוניים',
      icon: Link2,
      href: '/settings',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      category: 'אוטומציה',
      roles: ['admin', 'manager', 'supervisor', 'agent'],
    },

    // Admin
    {
      id: 'admin',
      name: 'ניהול מערכת',
      description: 'הגדרות ומשתמשים',
      icon: Settings,
      href: '/admin',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      category: 'ניהול',
      roles: ['admin'],
    },
    {
      id: 'team',
      name: 'הצוות שלי',
      description: 'ניהול סוכנים',
      icon: UserCheck,
      href: '/supervisor',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      category: 'ניהול',
      roles: ['admin', 'manager', 'supervisor'],
    },
    {
      id: 'hierarchy',
      name: 'מבנה ארגוני',
      description: 'היררכיית הארגון',
      icon: Building,
      href: '/hierarchy',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      category: 'ניהול',
      roles: ['admin', 'manager'],
    },
  ];

  // Filter modules based on user role
  const filteredModules = appModules.filter(module => module.roles.includes(userRole));

  // Group modules by category
  const modulesByCategory = filteredModules.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, AppModule[]>);

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

  const handleProjectCreated = async (project: { id: string; name: string }) => {
    await fetchProjects();
    toast.success(`הפרויקט "${project.name}" נוצר בהצלחה`);
    router.push(`/projects/${project.id}`);
  };

  const roleInfo = getRoleInfo(userRole);

  return (
    <div className="flex flex-col h-full">
      <Header title="דף הבית" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Image
                src="/sela-logo.png"
                alt="סלע סוכנות לביטוח"
                width={80}
                height={80}
                className="h-16 w-16 object-contain bg-white rounded-lg p-2"
                priority
              />
              <div>
                <h1 className="text-2xl font-bold">
                  שלום, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'משתמש'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-white/20 text-white border-white/30">
                    {roleInfo.labelHe}
                  </Badge>
                  <span className="text-blue-100 text-sm">מערכת ניהול סלע</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Admin Quick Access */}
              {userRole === 'admin' && (
                <Button
                  onClick={() => router.push('/admin')}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Shield className="h-4 w-4 ml-2" />
                  פאנל ניהול
                </Button>
              )}
              <div className="text-left hidden md:block">
                <p className="text-blue-100 text-xs">Selaboard v0.2.0</p>
                <p className="text-white/80 text-sm">
                  {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoadingStats ? (
            [1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-white">
                <CardContent className="pt-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-8 bg-slate-200 rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            quickStats.map((stat) => (
              <Card key={stat.label} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                      {stat.change && (
                        <p className={`text-xs mt-1 ${
                          stat.changeType === 'up' ? 'text-green-600' :
                          stat.changeType === 'down' ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {stat.change}
                        </p>
                      )}
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <stat.icon className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* App Modules Grid */}
        <div className="space-y-6">
          {Object.entries(modulesByCategory).map(([category, modules]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                {category}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => router.push(module.href)}
                    className="relative group p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all text-right"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${module.bgColor}`}>
                      <module.icon className={`h-5 w-5 ${module.color}`} />
                    </div>
                    <h3 className="font-medium text-slate-800 text-sm">{module.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{module.description}</p>
                    {module.badge && (
                      <span className={`absolute top-2 left-2 text-xs font-bold text-white px-1.5 py-0.5 rounded-full ${module.badgeColor}`}>
                        {module.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Upcoming Tasks */}
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-500" />
                משימות קרובות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingTasks.length > 0 ? (
                upcomingTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'high' || task.priority === 'critical' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                      }`} />
                      <span className="text-sm text-slate-700 line-clamp-1">{task.title}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('he-IL') : '-'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">אין משימות ממתינות</p>
              )}
              {upcomingTasks.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-blue-600"
                  onClick={() => router.push(defaultProjectId ? `/projects/${defaultProjectId}/crm/tasks` : '/projects')}
                >
                  הצג את כל המשימות
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                פעילות אחרונה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentActivity.slice(0, 4).map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <activity.icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{activity.title}</p>
                    <p className="text-xs text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Create */}
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-500" />
                יצירה מהירה
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(defaultProjectId ? `/projects/${defaultProjectId}/crm/leads` : '/projects')}
              >
                <Target className="h-4 w-4 ml-2 text-red-500" />
                ליד חדש
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(defaultProjectId ? `/projects/${defaultProjectId}/crm/contacts/new` : '/projects')}
              >
                <Users className="h-4 w-4 ml-2 text-blue-500" />
                איש קשר
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(defaultProjectId ? `/projects/${defaultProjectId}/crm/tasks` : '/projects')}
              >
                <ClipboardList className="h-4 w-4 ml-2 text-orange-500" />
                משימה
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(defaultProjectId ? `/projects/${defaultProjectId}/crm/calendar` : '/projects')}
              >
                <Calendar className="h-4 w-4 ml-2 text-purple-500" />
                פגישה
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section (Collapsible for admins) */}
        {(userRole === 'admin' || userRole === 'manager') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-slate-400" />
                פרויקטים
              </h2>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 ml-2" />
                פרויקט חדש
              </Button>
            </div>

            {isLoadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white">
                    <CardContent className="pt-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.slice(0, 6).map((project) => (
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
              <Card className="bg-white border-dashed">
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">אין פרויקטים עדיין</h3>
                  <p className="text-slate-500 mb-4">צור פרויקט חדש להתחיל</p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    צור פרויקט
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
