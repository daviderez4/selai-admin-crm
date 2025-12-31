'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/stores/authStore';
import { useState } from 'react';

const navItems = [
  {
    title: 'דשבורד',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'פרויקטים',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    title: 'משתמשים',
    href: '/users',
    icon: Users,
  },
  {
    title: 'לוג פעולות',
    href: '/audit',
    icon: FileText,
  },
  {
    title: 'הגדרות',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
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
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Database className="h-8 w-8 text-emerald-500" />
              <span className="text-xl font-bold text-white">SELAI</span>
            </div>
          )}
          {collapsed && <Database className="h-8 w-8 text-emerald-500 mx-auto" />}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

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
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="left" className="bg-slate-800 text-white border-slate-700">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

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
