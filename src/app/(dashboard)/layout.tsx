'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/lib/stores/authStore';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { useUserPreferencesStore } from '@/lib/stores/userPreferencesStore';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { fetchUser, isAuthenticated, isLoading, requires2FA, user } = useAuthStore();
  const { fetchProjects, projects, connectToProject } = useProjectsStore();
  const { defaultProjectId, loadFromSupabase, setDefaultProject } = useUserPreferencesStore();
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && requires2FA) {
      router.push('/verify');
    } else if (!isLoading && isAuthenticated) {
      fetchProjects();
      // Load user preferences from Supabase
      if (user?.id) {
        loadFromSupabase(user.id);
      }
    }
  }, [isLoading, isAuthenticated, requires2FA, router, fetchProjects, user?.id, loadFromSupabase]);

  // Auto-load default project on login (only on main dashboard)
  useEffect(() => {
    if (
      !hasAutoLoaded &&
      isAuthenticated &&
      projects.length > 0 &&
      pathname === '/' &&
      defaultProjectId
    ) {
      const defaultProject = projects.find(p => p.id === defaultProjectId);
      if (defaultProject) {
        setHasAutoLoaded(true);
        connectToProject(defaultProject);
        router.push(`/projects/${defaultProjectId}`);
      }
    }
  }, [hasAutoLoaded, isAuthenticated, projects, pathname, defaultProjectId, connectToProject, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/sela-logo.png"
            alt="סלע ביטוח"
            width={180}
            height={180}
            className="animate-pulse"
            priority
          />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <p className="text-slate-400 text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-900" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
