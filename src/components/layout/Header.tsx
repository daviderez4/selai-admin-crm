'use client';

import { Bell, Search, User, Home, ChevronLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/authStore';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
}

export function Header({ title, subtitle, breadcrumbs, showBackButton = false }: HeaderProps) {
  const { user, signOut } = useAuthStore();
  const { selectedProject } = useProjectsStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const initials = user?.email
    ?.split('@')[0]
    ?.slice(0, 2)
    ?.toUpperCase() || 'U';

  return (
    <header className="h-12 border-b border-slate-200 bg-white" dir="rtl">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left Side: Back Button + Breadcrumbs/Title */}
        <div className="flex items-center gap-3">
          {/* Back Button */}
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 h-7 px-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              חזור
            </Button>
          )}

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-1.5 text-xs">
              <Link
                href="/projects"
                className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
              </Link>
              {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <ChevronLeft className="h-3 w-3 text-slate-300" />
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-slate-700 font-medium">{item.label}</span>
                  )}
                </div>
              ))}
            </nav>
          ) : (
            /* Fallback to Title & Subtitle */
            <div className="flex items-center gap-3">
              {title && (
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-medium text-slate-700">{title}</h1>
                  {subtitle && (
                    <span className="text-xs text-slate-400">/ {subtitle}</span>
                  )}
                </div>
              )}
              {selectedProject && !breadcrumbs && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedProject.name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Search with keyboard shortcut hint */}
          <div className="relative hidden md:block">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="חיפוש..."
              className="w-48 h-8 pr-8 pl-12 text-xs bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20"
            />
            <kbd className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-blue-500 rounded-full" />
          </Button>

          {/* User Menu - Compact */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full hover:bg-slate-50"
              >
                <Avatar className="h-7 w-7 border border-slate-200">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    alt={user?.email || ''}
                  />
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 bg-white border-slate-200 shadow-lg"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal py-1.5" dir="rtl">
                <div className="flex flex-col">
                  <p className="text-xs font-medium text-slate-700">
                    {user?.user_metadata?.full_name || 'משתמש'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem asChild className="text-xs text-slate-600 focus:bg-slate-50 cursor-pointer">
                <Link href="/settings">
                  <User className="ml-2 h-3.5 w-3.5" />
                  הגדרות
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                className="text-xs text-red-500 focus:bg-red-50 cursor-pointer"
                onClick={handleSignOut}
              >
                יציאה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
