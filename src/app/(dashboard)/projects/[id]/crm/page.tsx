'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Target,
  TrendingUp,
  CheckSquare,
  Calendar,
  MessageSquare,
  FileText,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function CRMDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { dashboardStats, isLoadingStats, fetchDashboardStats } = useCRMStore();

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (isLoadingStats && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const quickActions = [
    {
      title: 'אנשי קשר',
      description: 'ניהול אנשי קשר ולקוחות',
      icon: Users,
      href: `/projects/${projectId}/crm/contacts`,
      color: 'bg-blue-500',
      stats: dashboardStats?.contacts.total || 0,
    },
    {
      title: 'לידים',
      description: 'לוח לידים וניהול משפך מכירות',
      icon: Target,
      href: `/projects/${projectId}/crm/leads`,
      color: 'bg-purple-500',
      stats: dashboardStats?.leads.total || 0,
    },
    {
      title: 'עסקאות',
      description: 'צינור עסקאות ומעקב',
      icon: TrendingUp,
      href: `/projects/${projectId}/crm/deals`,
      color: 'bg-green-500',
      stats: dashboardStats?.deals.total || 0,
    },
    {
      title: 'משימות',
      description: 'ניהול משימות ופעולות',
      icon: CheckSquare,
      href: `/projects/${projectId}/crm/tasks`,
      color: 'bg-yellow-500',
      stats: dashboardStats?.tasks.total || 0,
    },
    {
      title: 'יומן',
      description: 'פגישות ותזכורות',
      icon: Calendar,
      href: `/projects/${projectId}/crm/calendar`,
      color: 'bg-red-500',
      stats: dashboardStats?.meetings.upcoming || 0,
    },
    {
      title: 'הודעות',
      description: 'תקשורת עם לקוחות',
      icon: MessageSquare,
      href: `/projects/${projectId}/crm/messages`,
      color: 'bg-indigo-500',
      stats: 0,
    },
    {
      title: 'פוליסות',
      description: 'ניהול פוליסות וחידושים',
      icon: FileText,
      href: `/projects/${projectId}/crm/policies`,
      color: 'bg-cyan-500',
      stats: dashboardStats?.policies.total || 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">CRM</h1>
        <p className="text-gray-500 mt-1">מערכת ניהול קשרי לקוחות</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats?.contacts.total || 0}
            </div>
            <div className="text-sm text-gray-500">אנשי קשר</div>
            {dashboardStats?.contacts.changePercent !== 0 && (
              <div
                className={`text-xs mt-1 ${
                  (dashboardStats?.contacts.changePercent || 0) > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {(dashboardStats?.contacts.changePercent ?? 0) > 0 ? '+' : ''}
                {dashboardStats?.contacts.changePercent ?? 0}% מהחודש שעבר
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {dashboardStats?.leads.new || 0}
            </div>
            <div className="text-sm text-gray-500">לידים חדשים</div>
            <div className="text-xs mt-1 text-gray-400">
              {dashboardStats?.leads.conversionRate || 0}% המרה
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              ₪{(dashboardStats?.deals.totalValue || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">ערך עסקאות פתוחות</div>
            <div className="text-xs mt-1 text-gray-400">
              {dashboardStats?.deals.open || 0} עסקאות
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {dashboardStats?.tasks.overdue || 0}
            </div>
            <div className="text-sm text-gray-500">משימות באיחור</div>
            <div className="text-xs mt-1 text-gray-400">
              {dashboardStats?.tasks.dueToday || 0} להיום
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.title}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => router.push(action.href)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <ArrowLeft className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-lg mt-2">{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{action.description}</p>
                {action.stats > 0 && (
                  <div className="mt-2 text-2xl font-bold text-primary">
                    {action.stats.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upcoming Tasks & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              משימות להיום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <CheckSquare className="h-12 w-12 mx-auto opacity-50 mb-2" />
              <p>טען משימות מעמוד המשימות</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push(`/projects/${projectId}/crm/tasks`)}
              >
                צפה במשימות
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              פגישות קרובות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto opacity-50 mb-2" />
              <p>טען פגישות מהיומן</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push(`/projects/${projectId}/crm/calendar`)}
              >
                צפה ביומן
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
