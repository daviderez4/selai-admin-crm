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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan';
  trend?: string;
}

function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500/30 to-blue-600/10 text-blue-400',
    emerald: 'from-emerald-500/30 to-emerald-600/10 text-emerald-400',
    amber: 'from-amber-500/30 to-amber-600/10 text-amber-400',
    purple: 'from-purple-500/30 to-purple-600/10 text-purple-400',
    cyan: 'from-cyan-500/30 to-cyan-600/10 text-cyan-400',
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-slate-600 transition-all duration-300">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={cn('w-14 h-14 bg-gradient-to-br rounded-xl flex items-center justify-center', colorClasses[color])}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && (
              <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
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
  color: 'cyan' | 'green' | 'purple' | 'amber';
}

function QuickLink({ href, icon: Icon, title, description, color }: QuickLinkProps) {
  const colorClasses = {
    cyan: 'hover:border-cyan-500/50 group-hover:from-cyan-500/20 group-hover:to-cyan-600/5',
    green: 'hover:border-emerald-500/50 group-hover:from-emerald-500/20 group-hover:to-emerald-600/5',
    purple: 'hover:border-purple-500/50 group-hover:from-purple-500/20 group-hover:to-purple-600/5',
    amber: 'hover:border-amber-500/50 group-hover:from-amber-500/20 group-hover:to-amber-600/5',
  };

  const iconColors = {
    cyan: 'text-cyan-400 bg-cyan-500/20',
    green: 'text-emerald-400 bg-emerald-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
  };

  return (
    <Link
      href={href}
      className={cn(
        'group block p-5 bg-gradient-to-br from-slate-800/50 to-slate-900 border border-slate-700 rounded-xl transition-all duration-300',
        colorClasses[color]
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconColors[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1 group-hover:text-white/90">{title}</h3>
          <p className="text-slate-400 text-sm">{description}</p>
        </div>
        <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Database className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-2">הפרויקט לא נמצא</p>
          <p className="text-slate-500 text-sm mb-4">ID: {projectId}</p>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="border-slate-700 text-slate-300"
          >
            חזור לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Database className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">טוען פרויקט...</p>
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

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Project Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedProject.name}</h1>
              <p className="text-slate-400">{selectedProject.description || 'פרויקט Supabase'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
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
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="סה״כ רשומות"
              value={stats ? formatNumber(stats.totalRecords) : '-'}
              icon={FileText}
              color="blue"
            />
            <StatCard
              title="צבירה צפויה"
              value={stats ? `₪${formatNumber(stats.totalAccumulation)}` : '-'}
              icon={DollarSign}
              color="emerald"
            />
            <StatCard
              title="מטפלים"
              value={stats?.handlers || '-'}
              icon={Users}
              color="amber"
            />
            <StatCard
              title="עדכון אחרון"
              value={stats ? formatDate(stats.lastUpdate) : '-'}
              icon={Clock}
              color="purple"
            />
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickLink
              href={`/projects/${projectId}/data`}
              icon={BarChart3}
              title="תצוגת נתונים"
              description="צפה בנתונים עם פילטרים וסיכומים"
              color="cyan"
            />
            <QuickLink
              href={`/projects/${projectId}/import`}
              icon={Upload}
              title="ייבוא נתונים"
              description="העלה קובץ אקסל חדש"
              color="green"
            />
            <QuickLink
              href={`/projects/${projectId}/dashboard-builder`}
              icon={Layout}
              title="בונה דשבורד"
              description="צור דשבורדים מותאמים"
              color="purple"
            />
          </div>

          {/* Recent Activity */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                פעילות אחרונה
              </CardTitle>
              {stats && stats.recentImports.length > 0 && (
                <Badge variant="outline" className="border-slate-600 text-slate-400">
                  {stats.recentImports.length} ייבואים אחרונים
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stats && stats.recentImports.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentImports.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                    >
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Upload className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{item.file_name}</p>
                        <p className="text-slate-500 text-xs">
                          {item.rows_imported.toLocaleString('he-IL')} שורות יובאו
                        </p>
                      </div>
                      <div className="text-left">
                        <Badge
                          className={cn(
                            'text-xs',
                            item.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          )}
                        >
                          {item.status === 'completed' ? 'הושלם' : item.status}
                        </Badge>
                        <p className="text-slate-500 text-xs mt-1">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">אין פעילות אחרונה</p>
                  <Link href={`/projects/${projectId}/import`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-slate-700 text-slate-300"
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
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-slate-400 text-sm">מחובר ל-Supabase</span>
                </div>
                <code className="text-xs text-slate-500 bg-slate-900/50 px-3 py-1 rounded">
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
