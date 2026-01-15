'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  Users,
  FileText,
  Settings,
  LogOut,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Upload,
  BarChart3,
  Layout,
  Home,
  Building2,
  Shield,
  User,
  Contact,
  Target,
  TrendingUp,
  CheckSquare,
  Calendar,
  MessageSquare,
  Megaphone,
  Activity,
  Workflow,
  PieChart,
  UsersRound,
  AppWindow,
  UserPlus,
  Rocket,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/authStore';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useUserStore } from '@/stores/userStore';
import { useState } from 'react';

interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  alwaysShow?: boolean;
  requiresProject?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const { signOut, user, userRecord, isAdmin: isAdminAuth, isManager, canAccessProjects } = useAuthStore();
  const { selectedProject } = useProjectsStore();
  const { profile, isAdmin, isSupervisor } = useUserStore();
  const [collapsed, setCollapsed] = useState(false);

  const projectId = params?.id as string;

  // Use authStore for role checks (with userRecord from users table)
  // Fall back to userStore.profile if userRecord not available
  const hasAdminAccess = isAdminAuth() || isAdmin();
  const hasProjectAccess = canAccessProjects() || isAdmin(); // admin or manager
  const hasTeamAccess = hasAdminAccess || isSupervisor() || isManager();

  // Get project-specific dashboards based on table_name
  const getProjectDashboards = (): NavItem[] => {
    if (!projectId || !selectedProject) return [];

    const tableName = selectedProject.table_name || '';
    const dashboards: NavItem[] = [];

    // Smart Dashboard - available for ALL project types
    dashboards.push({
      id: 'smart-dashboard',
      title: 'דשבורד חכם',
      href: `/projects/${projectId}/smart-dashboard`,
      icon: Activity,
      requiresProject: true,
    });

    switch (tableName) {
      case 'master_data':
        // מכירות - Sales dashboards
        dashboards.push(
          {
            id: 'sales-dashboard',
            title: 'דשבורד מכירות',
            href: `/projects/${projectId}/sales-dashboard`,
            icon: BarChart3,
            requiresProject: true,
          },
          {
            id: 'reports',
            title: 'דוחות מכירות',
            href: `/projects/${projectId}/reports`,
            icon: FileText,
            requiresProject: true,
          }
        );
        break;
      case 'nifraim':
        // נפרעים dashboard
        dashboards.push({
          id: 'view-dashboard',
          title: 'דשבורד נפרעים',
          href: `/projects/${projectId}/view-dashboard`,
          icon: BarChart3,
          requiresProject: true,
        });
        break;
      case 'gemel':
        // גמל dashboard
        dashboards.push({
          id: 'gemel-dashboard',
          title: 'דשבורד גמל',
          href: `/projects/${projectId}/view-dashboard`,
          icon: BarChart3,
          requiresProject: true,
        });
        break;
      case 'commissions_data':
        // עמלות - Commissions dashboard
        dashboards.push({
          id: 'commission-dashboard',
          title: 'דשבורד עמלות',
          href: `/projects/${projectId}/commission-dashboard`,
          icon: BarChart3,
          requiresProject: true,
        });
        break;
    }

    return dashboards;
  };

  // Check if user is agent or supervisor (needs workspace)
  const needsWorkspace = userRecord?.user_type === 'agent' || userRecord?.user_type === 'supervisor';

  // Main navigation items (always visible)
  const mainNavItems: NavItem[] = [
    {
      id: 'home',
      title: 'דשבורד ראשי',
      href: '/dashboard',
      icon: AppWindow,
      alwaysShow: true,
    },
    // Projects - ONLY for admin and manager (not agents/supervisors)
    ...(hasProjectAccess ? [{
      id: 'projects',
      title: 'פרויקטים',
      href: '/projects',
      icon: FolderKanban,
      alwaysShow: true,
    }] : []),
    // Workspace for agents/supervisors
    ...(needsWorkspace ? [{
      id: 'workspace',
      title: 'אזור עבודה',
      href: '/projects',
      icon: FolderKanban,
      alwaysShow: true,
    }] : []),
    // Supervisor team view - only for supervisors and admins
    ...(hasTeamAccess ? [{
      id: 'my-team',
      title: 'הצוות שלי',
      href: '/supervisor',
      icon: UsersRound,
    }] : []),
    // Reports - for managers and above
    ...(hasTeamAccess ? [{
      id: 'reports',
      title: 'דוחות',
      href: '/reports',
      icon: PieChart,
    }] : []),
    // Workflows - for managers and above
    ...(hasAdminAccess || isManager() ? [{
      id: 'workflows',
      title: 'אוטומציות',
      href: '/workflows',
      icon: Workflow,
    }] : []),
  ];

  // Marketing Studio navigation items
  const marketingNavItems: NavItem[] = [
    {
      id: 'marketing',
      title: 'Marketing Studio',
      href: '/marketing',
      icon: Rocket,
    },
    {
      id: 'campaigns',
      title: 'קמפיינים',
      href: '/marketing/campaigns',
      icon: Megaphone,
    },
    {
      id: 'landing-pages',
      title: 'דפי נחיתה',
      href: '/marketing/landing-pages',
      icon: Layout,
    },
    {
      id: 'marketing-analytics',
      title: 'אנליטיקס',
      href: '/marketing/analytics',
      icon: BarChart3,
    },
    {
      id: 'assets',
      title: 'ספריית מדיה',
      href: '/marketing/assets',
      icon: ImageIcon,
    },
  ];

  // Workspace navigation items (for agents/supervisors)
  const workspaceNavItems: NavItem[] = needsWorkspace ? [
    {
      id: 'contacts',
      title: 'אנשי קשר',
      href: '/workspace/contacts',
      icon: Contact,
    },
    {
      id: 'campaigns',
      title: 'קמפיינים',
      href: '/workspace/campaigns',
      icon: Megaphone,
    },
    {
      id: 'documents',
      title: 'מסמכים',
      href: '/workspace/documents',
      icon: FileText,
    },
  ] : [];

  // Project-specific navigation items
  const projectNavItems: NavItem[] = projectId ? [
    {
      id: 'project-home',
      title: 'דף הפרויקט',
      href: `/projects/${projectId}`,
      icon: FolderKanban,
      requiresProject: true,
    },
    {
      id: 'data',
      title: 'תצוגת נתונים',
      href: `/projects/${projectId}/data`,
      icon: Database,
      requiresProject: true,
    },
    // Add project-specific dashboards based on table_name
    ...getProjectDashboards(),
    {
      id: 'import',
      title: 'ייבוא נתונים',
      href: `/projects/${projectId}/import`,
      icon: Upload,
      requiresProject: true,
    },
    {
      id: 'dashboard-builder',
      title: 'בונה דשבורד',
      href: `/projects/${projectId}/dashboard-builder`,
      icon: Layout,
      requiresProject: true,
    },
    {
      id: 'project-settings',
      title: 'הגדרות פרויקט',
      href: `/projects/${projectId}/settings`,
      icon: Settings,
      requiresProject: true,
    },
  ] : [];

  // CRM Navigation items
  const crmNavItems: NavItem[] = projectId ? [
    {
      id: 'crm',
      title: 'CRM',
      href: `/projects/${projectId}/crm`,
      icon: Contact,
      requiresProject: true,
    },
    {
      id: 'contacts',
      title: 'אנשי קשר',
      href: `/projects/${projectId}/crm/contacts`,
      icon: Users,
      requiresProject: true,
    },
    {
      id: 'leads',
      title: 'לידים',
      href: `/projects/${projectId}/crm/leads`,
      icon: Target,
      requiresProject: true,
    },
    {
      id: 'deals',
      title: 'עסקאות',
      href: `/projects/${projectId}/crm/deals`,
      icon: TrendingUp,
      requiresProject: true,
    },
    {
      id: 'tasks',
      title: 'משימות',
      href: `/projects/${projectId}/crm/tasks`,
      icon: CheckSquare,
      requiresProject: true,
    },
    {
      id: 'calendar',
      title: 'יומן',
      href: `/projects/${projectId}/crm/calendar`,
      icon: Calendar,
      requiresProject: true,
    },
    {
      id: 'messages',
      title: 'הודעות',
      href: `/projects/${projectId}/crm/messages`,
      icon: MessageSquare,
      requiresProject: true,
    },
    {
      id: 'campaigns',
      title: 'קמפיינים',
      href: `/projects/${projectId}/crm/campaigns`,
      icon: Megaphone,
      requiresProject: true,
    },
    {
      id: 'policies',
      title: 'פוליסות',
      href: `/projects/${projectId}/crm/policies`,
      icon: FileText,
      requiresProject: true,
    },
  ] : [];

  // System navigation items - filter based on role
  const systemNavItems: NavItem[] = [
    // Hierarchy page - only for admin and supervisors
    ...(hasTeamAccess ? [{
      id: 'hierarchy',
      title: 'היררכיה ארגונית',
      href: '/hierarchy',
      icon: Building2,
    }] : []),
    // Users - only for admins and managers
    ...(hasAdminAccess || isManager() ? [{
      id: 'users',
      title: 'משתמשים',
      href: '/users',
      icon: Users,
    }] : []),
    // Audit log - only for admins
    ...(hasAdminAccess ? [{
      id: 'audit',
      title: 'לוג פעולות',
      href: '/audit',
      icon: FileText,
    }] : []),
    // RLS Documentation - only for admins
    ...(hasAdminAccess ? [{
      id: 'rls-docs',
      title: 'תיעוד הרשאות',
      href: '/rls-docs',
      icon: Shield,
    }] : []),
    // Admin Panel - only for admins
    ...(hasAdminAccess ? [{
      id: 'admin',
      title: 'פאנל ניהול',
      href: '/admin',
      icon: Activity,
    }] : []),
    // Registration Requests - only for admins
    ...(hasAdminAccess ? [{
      id: 'registrations',
      title: 'בקשות הרשמה',
      href: '/admin/registrations',
      icon: UserPlus,
    }] : []),
    {
      id: 'settings',
      title: 'הגדרות',
      href: '/settings',
      icon: Settings,
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href ||
      (item.href !== '/' && item.href !== '/projects' && pathname.startsWith(item.href));

    const linkContent = (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150',
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
        )}
      >
        {/* Active indicator - thin right border */}
        {isActive && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-l" />
        )}
        <item.icon className={cn(
          "h-4 w-4 flex-shrink-0",
          isActive ? "text-blue-600" : "text-slate-400"
        )} />
        {!collapsed && (
          <span className="flex-1">{item.title}</span>
        )}
        {!collapsed && item.badge && (
          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="left" className="bg-slate-900 text-white border-0 text-xs">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen bg-white border-l border-slate-200 transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}
        dir="rtl"
      >
        {/* Logo - Clickable to go home */}
        <Link
          href="/projects"
          className={cn(
            "flex items-center border-b border-slate-100 hover:bg-slate-50/50 transition-colors",
            collapsed ? "h-14 px-3 justify-center" : "h-16 px-3"
          )}
        >
          {collapsed ? (
            <Image
              src="/sela-logo.png"
              alt="סלע"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <Image
              src="/sela-logo-full.png"
              alt="סלע סוכנות לביטוח"
              width={140}
              height={50}
              className="h-11 w-auto object-contain"
            />
          )}
        </Link>

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 -left-2.5 h-5 w-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 z-10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <div className="flex-1 py-3 px-2 overflow-y-auto">
          {/* Main Navigation */}
          <nav className="space-y-0.5">
            {mainNavItems.map(renderNavItem)}
          </nav>

          {/* Marketing Studio */}
          <div className="my-3">
            <Separator className="bg-slate-100" />
          </div>
          {!collapsed && (
            <div className="px-3 mb-1.5">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                שיווק
              </p>
            </div>
          )}
          <nav className="space-y-0.5">
            {marketingNavItems.map(renderNavItem)}
          </nav>

          {/* Project Navigation */}
          {projectNavItems.length > 0 && (
            <>
              <div className="my-3">
                <Separator className="bg-slate-100" />
              </div>
              {!collapsed && (
                <div className="px-3 mb-1.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {selectedProject?.name || 'פרויקט'}
                  </p>
                </div>
              )}
              <nav className="space-y-0.5">
                {projectNavItems.map(renderNavItem)}
              </nav>
            </>
          )}

          {/* Workspace Navigation - for agents/supervisors */}
          {workspaceNavItems.length > 0 && (
            <>
              <div className="my-3">
                <Separator className="bg-slate-100" />
              </div>
              {!collapsed && (
                <div className="px-3 mb-1.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    אזור עבודה
                  </p>
                </div>
              )}
              <nav className="space-y-0.5">
                {workspaceNavItems.map(renderNavItem)}
              </nav>
            </>
          )}

          {/* CRM Navigation */}
          {crmNavItems.length > 0 && (
            <>
              <div className="my-3">
                <Separator className="bg-slate-100" />
              </div>
              {!collapsed && (
                <div className="px-3 mb-1.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    CRM
                  </p>
                </div>
              )}
              <nav className="space-y-0.5">
                {crmNavItems.map(renderNavItem)}
              </nav>
            </>
          )}

          {/* System Navigation */}
          <div className="my-3">
            <Separator className="bg-slate-100" />
          </div>
          {!collapsed && (
            <div className="px-3 mb-1.5">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                מערכת
              </p>
            </div>
          )}
          <nav className="space-y-0.5">
            {systemNavItems.map(renderNavItem)}
          </nav>
        </div>

        {/* User section */}
        <div className="border-t border-slate-100">
          {/* User Role Badge */}
          {(userRecord || profile) && !collapsed && (
            <div className="p-2 bg-slate-50/50">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className={cn(
                  "p-1.5 rounded-full",
                  (userRecord?.user_type === 'admin' || profile?.role === 'admin') ? 'bg-purple-100' :
                  (userRecord?.user_type === 'manager') ? 'bg-indigo-100' :
                  (userRecord?.user_type === 'supervisor' || profile?.role === 'supervisor') ? 'bg-blue-100' : 'bg-slate-100'
                )}>
                  {(userRecord?.user_type === 'admin' || profile?.role === 'admin') ? (
                    <Shield className="h-3 w-3 text-purple-600" />
                  ) : (userRecord?.user_type === 'manager') ? (
                    <Shield className="h-3 w-3 text-indigo-600" />
                  ) : (userRecord?.user_type === 'supervisor' || profile?.role === 'supervisor') ? (
                    <Shield className="h-3 w-3 text-blue-600" />
                  ) : (
                    <User className="h-3 w-3 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {userRecord?.full_name || profile?.full_name || user?.email}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {userRecord?.user_type === 'admin' || profile?.role === 'admin' ? 'מנהל מערכת' :
                     userRecord?.user_type === 'manager' ? 'מנהל' :
                     userRecord?.user_type === 'supervisor' || profile?.role === 'supervisor' ? 'מפקח' :
                     userRecord?.user_type === 'agent' ? 'סוכן' :
                     userRecord?.user_type === 'client' ? 'לקוח' : 'ממתין לאישור'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="p-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-slate-900 text-white border-0 text-xs">
                  יציאה
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start h-8 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-3.5 w-3.5 ml-2" />
                יציאה
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
