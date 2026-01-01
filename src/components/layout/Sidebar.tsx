'use client';

import Link from 'next/link';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/authStore';
import { useProjectsStore } from '@/lib/stores/projectsStore';
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
  const { signOut, user } = useAuthStore();
  const { selectedProject } = useProjectsStore();
  const [collapsed, setCollapsed] = useState(false);

  const projectId = params?.id as string;

  // Main navigation items (always visible)
  const mainNavItems: NavItem[] = [
    {
      id: 'home',
      title: 'דשבורד ראשי',
      href: '/projects',
      icon: Home,
      alwaysShow: true,
    },
  ];

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
      icon: BarChart3,
      requiresProject: true,
    },
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

  // System navigation items
  const systemNavItems: NavItem[] = [
    {
      id: 'users',
      title: 'משתמשים',
      href: '/users',
      icon: Users,
    },
    {
      id: 'audit',
      title: 'לוג פעולות',
      href: '/audit',
      icon: FileText,
    },
    {
      id: 'settings',
      title: 'הגדרות מערכת',
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
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && (
          <span className="flex-1">{item.title}</span>
        )}
        {!collapsed && item.badge && (
          <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="left" className="bg-slate-800 text-white border-slate-700">
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
          'flex flex-col h-screen bg-slate-900 border-l border-slate-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
        dir="rtl"
      >
        {/* Logo - Clickable to go home */}
        <Link
          href="/projects"
          className="flex items-center justify-between h-16 px-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl">ס</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white leading-tight">סלע דשבורדים</span>
                <span className="text-xs text-slate-400">Sela Dashboards</span>
              </div>
            )}
          </div>
        </Link>

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 -left-3 h-6 w-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white z-10"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <div className="flex-1 py-4 px-2 overflow-y-auto">
          {/* Main Navigation */}
          <nav className="space-y-1">
            {mainNavItems.map(renderNavItem)}
          </nav>

          {/* Project Navigation */}
          {projectNavItems.length > 0 && (
            <>
              <div className="my-4">
                <Separator className="bg-slate-800" />
              </div>
              {!collapsed && (
                <div className="px-3 mb-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {selectedProject?.name || 'פרויקט'}
                  </p>
                </div>
              )}
              <nav className="space-y-1">
                {projectNavItems.map(renderNavItem)}
              </nav>
            </>
          )}

          {/* System Navigation */}
          <div className="my-4">
            <Separator className="bg-slate-800" />
          </div>
          {!collapsed && (
            <div className="px-3 mb-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                מערכת
              </p>
            </div>
          )}
          <nav className="space-y-1">
            {systemNavItems.map(renderNavItem)}
          </nav>
        </div>

        <Separator className="bg-slate-800" />

        {/* User section */}
        <div className="p-4">
          {!collapsed && user && (
            <div className="mb-3 px-3">
              <p className="text-xs text-slate-500">מחובר כ:</p>
              <p className="text-sm text-white truncate">{user.email}</p>
            </div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-slate-800 text-white border-slate-700">
                יציאה
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 ml-2" />
              יציאה
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
