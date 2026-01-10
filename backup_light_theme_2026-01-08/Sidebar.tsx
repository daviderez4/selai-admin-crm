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
        <div className="p-2 border-t border-slate-100">
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
      </aside>
    </TooltipProvider>
  );
}
