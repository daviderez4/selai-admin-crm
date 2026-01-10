'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Database,
  Upload,
  RefreshCw,
  Settings,
  BarChart3,
  Layout,
  Users,
  DollarSign,
  Clock,
  FileText,
  ArrowLeft,
  TrendingUp,
  Activity,
  ChevronLeft,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectStats {
  totalRecords: number;
  totalAccumulation: number;
  handlers: number;
  supervisors: number;
  lastUpdate: string | null;
  recentImports: {
    id: string;
    file_name: string;
    rows_imported: number;
    created_at: string;
    status: string;
  }[];
}

// Navigation tabs for project
interface NavTab {
  id: string;
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
            {trend && (
              <p className={cn(
                'text-xs flex items-center gap-1 mt-1.5',
                trendUp ? 'text-emerald-600' : 'text-red-500'
              )}>
                <TrendingUp className={cn('h-3 w-3', !trendUp && 'rotate-180')} />
                {trend}
              </p>
            )}
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickLinkProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

function QuickLink({ href, icon: Icon, title, description }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group block p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
          <Icon className="h-5 w-5 text-slate-500 group-hover:text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-800 group-hover:text-blue-700">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        <ArrowLeft className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
      </div>
    </Link>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toLocaleString('he-IL');
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProjectHomePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { projects, selectedProject, connectToProject, fetchProjects } = useProjectsStore();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Navigation tabs
  const navTabs: NavTab[] = [
    { id: 'dashboard', label: 'דשבורד', href: `/projects/${projectId}` },
    { id: 'data', label: 'תצוגת נתונים', href: `/projects/${projectId}/data` },
    { id: 'import', label: 'ייבוא נתונים', href: `/projects/${projectId}/import` },
    { id: 'dashboard-builder', label: 'בונה דשבורד', href: `/projects/${projectId}/dashboard-builder` },
    { id: 'settings', label: 'הגדרות', href: `/projects/${projectId}/settings` },
  ];

  // Find and connect to project
  useEffect(() => {
    const findAndConnect = async () => {
      let project = projects.find((p) => p.id === projectId);

      // If project not found in store, try to refresh
      if (!project && projects.length >= 0) {
        console.log('Project not in store, refreshing...');
        await fetchProjects();
        // Re-check after refresh
        const updatedProjects = useProjectsStore.getState().projects;
        project = updatedProjects.find((p) => p.id === projectId);
      }

      if (project) {
        if (!selectedProject || selectedProject.id !== projectId) {
          connectToProject(project);
        }
        setProjectNotFound(false);
      } else {
        console.error('Project not found:', projectId);
        setProjectNotFound(true);
      }
    };

    findAndConnect();
  }, [projectId, projects, selectedProject, connectToProject, fetchProjects]);

  // Fetch project stats
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [dataRes, historyRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/master-data`),
        fetch(`/api/projects/${projectId}/import-history`),
      ]);

      const dataResult = await dataRes.json();
      const historyResult = await historyRes.json();

      if (dataRes.ok && dataResult.stats) {
        setStats({
          totalRecords: dataResult.stats.total || 0,
          totalAccumulation: dataResult.stats.totalAccumulation || 0,
          handlers: dataResult.stats.uniqueHandlers || 0,
          supervisors: dataResult.stats.uniqueSupervisors || 0,
          lastUpdate: historyResult.history?.[0]?.created_at || null,
          recentImports: historyResult.history?.slice(0, 5) || [],
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (projectNotFound) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center">
          <Database className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-2">הפרויקט לא נמצא</p>
          <p className="text-slate-500 text-sm mb-4">ID: {projectId}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="border-slate-300 text-slate-600"
          >
            חזור לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center">
          <Database className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { label: selectedProject.name },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={breadcrumbs} />

      {/* Horizontal Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6" dir="rtl">
        <nav className="flex items-center gap-1 -mb-px">
          {navTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                tab.id === activeTab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-6 overflow-auto bg-slate-50/50" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Project Header - Clean & Professional */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">{selectedProject.name}</h1>
              <p className="text-sm text-slate-500">{selectedProject.description || 'פרויקט Supabase'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white"
                onClick={fetchStats}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
                רענן
              </Button>
              <Link href={`/projects/${projectId}/settings`}>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-slate-200 text-slate-600 hover:bg-slate-100 bg-white"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards with Emoji Icons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="סה״כ רשומות"
              value={stats ? formatNumber(stats.totalRecords) : '-'}
              icon="📊"
            />
            <StatCard
              title="צבירה צפויה"
              value={stats ? `₪${formatNumber(stats.totalAccumulation)}` : '-'}
              icon="💰"
              trend="+12.5%"
              trendUp={true}
            />
            <StatCard
              title="מטפלים"
              value={stats?.handlers || '-'}
              icon="👥"
            />
            <StatCard
              title="עדכון אחרון"
              value={stats ? formatDate(stats.lastUpdate) : '-'}
              icon="🕐"
            />
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickLink
              href={`/projects/${projectId}/data`}
              icon={BarChart3}
              title="תצוגת נתונים"
              description="צפה בנתונים עם פילטרים וסיכומים"
            />
            <QuickLink
              href={`/projects/${projectId}/import`}
              icon={Upload}
              title="ייבוא נתונים"
              description="העלה קובץ אקסל חדש"
            />
            <QuickLink
              href={`/projects/${projectId}/dashboard-builder`}
              icon={Layout}
              title="בונה דשבורד"
              description="צור דשבורדים מותאמים"
            />
          </div>

          {/* Recent Activity */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-lg">📋</span>
                פעילות אחרונה
              </CardTitle>
              {stats && stats.recentImports.length > 0 && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                  {stats.recentImports.length} ייבואים
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stats && stats.recentImports.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentImports.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-lg transition-colors',
                        index % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                      )}
                    >
                      <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Upload className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{item.file_name}</p>
                        <p className="text-xs text-slate-400">
                          {item.rows_imported.toLocaleString('he-IL')} שורות יובאו
                        </p>
                      </div>
                      <div className="text-left">
                        <Badge
                          className={cn(
                            'text-xs font-normal',
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          )}
                        >
                          {item.status === 'completed' ? 'הושלם' : item.status}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-slate-500 mb-2">אין פעילות אחרונה</p>
                  <Link href={`/projects/${projectId}/import`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      ייבא נתונים ראשונים
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Info */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm text-slate-600">מחובר ל-Supabase</span>
                </div>
                <code className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md">
                  {selectedProject.supabase_url}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
