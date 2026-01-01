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
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Side: Back Button + Breadcrumbs/Title */}
        <div className="flex items-center gap-4">
          {/* Back Button */}
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4" />
              חזור
            </Button>
          )}

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/projects"
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>דשבורד</span>
              </Link>
              {breadcrumbs.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-white font-medium">{item.label}</span>
                  )}
                </div>
              ))}
            </nav>
          ) : (
            /* Fallback to Title & Subtitle */
            <div className="flex items-center gap-4">
              {title && (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-white">{title}</h1>
                  {subtitle && (
                    <span className="text-sm text-slate-400">/ {subtitle}</span>
                  )}
                </div>
              )}
              {selectedProject && !breadcrumbs && (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                  {selectedProject.name}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Search & Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="חיפוש..."
              className="w-64 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
            />
          </div>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-slate-400 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-emerald-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10 border-2 border-slate-700">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    alt={user?.email || ''}
                  />
                  <AvatarFallback className="bg-slate-800 text-emerald-400">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-slate-800 border-slate-700"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal" dir="rtl">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white">
                    {user?.user_metadata?.full_name || 'משתמש'}
                  </p>
                  <p className="text-xs leading-none text-slate-400">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem asChild className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer">
                <Link href="/settings">
                  <User className="ml-2 h-4 w-4" />
                  הגדרות
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
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
