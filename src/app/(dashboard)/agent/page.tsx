'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Plus,
  ArrowLeft,
  Loader2,
  UserPlus,
  Banknote,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

interface AgentStats {
  totalClients: number;
  totalLeads: number;
  openDeals: number;
  pendingTasks: number;
  upcomingMeetings: number;
  unreadMessages: number;
  monthlyTarget: number;
  monthlyAchieved: number;
  totalPolicies: number;
  totalPremium: number;
}

interface RecentActivity {
  id: string;
  type: 'lead' | 'deal' | 'task' | 'meeting' | 'policy';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  relatedTo?: string;
}

export default function AgentDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [agentProfile, setAgentProfile] = useState<{
    full_name: string;
    supervisor_name?: string;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch real profile data from API
      const profileResponse = await fetch('/api/agent/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setAgentProfile({
          full_name: profileData.profile?.full_name || 'סוכן',
          supervisor_name: profileData.supervisor?.full_name,
        });
      } else {
        // Fallback to default
        setAgentProfile({
          full_name: 'סוכן',
          supervisor_name: undefined,
        });
      }

      setStats({
        totalClients: 45,
        totalLeads: 12,
        openDeals: 8,
        pendingTasks: 5,
        upcomingMeetings: 3,
        unreadMessages: 2,
        monthlyTarget: 50000,
        monthlyAchieved: 32500,
        totalPolicies: 78,
        totalPremium: 125000,
      });

      setRecentActivity([
        {
          id: '1',
          type: 'lead',
          title: 'ליד חדש - דוד לוי',
          description: 'התקבל ליד חדש מהאתר',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'new',
        },
        {
          id: '2',
          type: 'deal',
          title: 'עסקה התקדמה - שרה כהן',
          description: 'הועבר לשלב חתימה',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          status: 'signing',
        },
        {
          id: '3',
          type: 'policy',
          title: 'פוליסה חדשה אושרה',
          description: 'ביטוח חיים - משה אברהם',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

      setUpcomingTasks([
        {
          id: '1',
          title: 'להתקשר ללקוח - דוד לוי',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          relatedTo: 'ליד חדש',
        },
        {
          id: '2',
          title: 'לשלוח הצעה - שרה כהן',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          relatedTo: 'עסקה פתוחה',
        },
        {
          id: '3',
          title: 'מעקב חידוש פוליסה',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'low',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'לפני פחות משעה';
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    return `לפני ${diffDays} ימים`;
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 0) return 'באיחור!';
    if (diffHours < 1) return 'בקרוב';
    if (diffHours < 24) return `עוד ${diffHours} שעות`;
    if (diffDays === 1) return 'מחר';
    return `עוד ${diffDays} ימים`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead': return <Target className="h-4 w-4 text-blue-600" />;
      case 'deal': return <Briefcase className="h-4 w-4 text-green-600" />;
      case 'task': return <CheckCircle className="h-4 w-4 text-purple-600" />;
      case 'meeting': return <Calendar className="h-4 w-4 text-orange-600" />;
      case 'policy': return <FileText className="h-4 w-4 text-cyan-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const targetProgress = stats ? Math.round((stats.monthlyAchieved / stats.monthlyTarget) * 100) : 0;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">שלום, {agentProfile?.full_name || 'סוכן'}</h1>
          <p className="text-muted-foreground">
            מפקח: {agentProfile?.supervisor_name || 'לא משויך'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 ml-2" />
            הזמן לקוח
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 ml-2" />
            ליד חדש
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalClients}</p>
                <p className="text-xs text-muted-foreground">לקוחות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalLeads}</p>
                <p className="text-xs text-muted-foreground">לידים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.openDeals}</p>
                <p className="text-xs text-muted-foreground">עסקאות פתוחות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalPolicies}</p>
                <p className="text-xs text-muted-foreground">פוליסות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Clock className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingTasks}</p>
                <p className="text-xs text-muted-foreground">משימות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.unreadMessages}</p>
                <p className="text-xs text-muted-foreground">הודעות</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Target */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            יעד חודשי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              ₪{stats?.monthlyAchieved?.toLocaleString()} מתוך ₪{stats?.monthlyTarget?.toLocaleString()}
            </span>
            <span className="text-sm font-medium">{targetProgress}%</span>
          </div>
          <Progress value={targetProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            נותרו ₪{((stats?.monthlyTarget || 0) - (stats?.monthlyAchieved || 0)).toLocaleString()} להשלמת היעד
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                משימות קרובות
              </CardTitle>
              <Button variant="ghost" size="sm">
                כל המשימות
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>אין משימות ממתינות</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.relatedTo && (
                        <p className="text-xs text-muted-foreground">{task.relatedTo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                        {formatDueDate(task.dueDate)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                פעילות אחרונה
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>אין פעילות אחרונה</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="p-2 bg-background rounded-full">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">פעולות מהירות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Target className="h-6 w-6" />
              <span>ליד חדש</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>לקוח חדש</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Calendar className="h-6 w-6" />
              <span>קבע פגישה</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <MessageSquare className="h-6 w-6" />
              <span>שלח הודעה</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
