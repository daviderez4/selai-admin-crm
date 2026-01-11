'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Search,
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  Loader2,
  UserCheck,
  UserX,
  ChevronLeft,
  BarChart3,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface Agent {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  status: 'active' | 'inactive';
  totalClients: number;
  totalLeads: number;
  openDeals: number;
  monthlyTarget: number;
  monthlyAchieved: number;
  lastActivity?: string;
}

interface PendingRequest {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  id_number: string;
  created_at: string;
}

interface TeamStats {
  totalAgents: number;
  activeAgents: number;
  totalClients: number;
  totalLeads: number;
  openDeals: number;
  teamTarget: number;
  teamAchieved: number;
  pendingRequests: number;
}

export default function SupervisorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // In production, this would fetch from /api/supervisor/dashboard
      await new Promise(resolve => setTimeout(resolve, 500));

      setStats({
        totalAgents: 12,
        activeAgents: 10,
        totalClients: 450,
        totalLeads: 85,
        openDeals: 32,
        teamTarget: 500000,
        teamAchieved: 325000,
        pendingRequests: 3,
      });

      setAgents([
        {
          id: '1',
          full_name: 'ישראל ישראלי',
          email: 'israel@example.com',
          mobile: '050-1234567',
          status: 'active',
          totalClients: 45,
          totalLeads: 12,
          openDeals: 5,
          monthlyTarget: 50000,
          monthlyAchieved: 42000,
          lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          full_name: 'שרה כהן',
          email: 'sarah@example.com',
          mobile: '050-2345678',
          status: 'active',
          totalClients: 38,
          totalLeads: 8,
          openDeals: 3,
          monthlyTarget: 45000,
          monthlyAchieved: 38000,
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          full_name: 'דוד לוי',
          email: 'david@example.com',
          mobile: '050-3456789',
          status: 'active',
          totalClients: 52,
          totalLeads: 15,
          openDeals: 7,
          monthlyTarget: 55000,
          monthlyAchieved: 51000,
          lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: '4',
          full_name: 'רחל אברהם',
          email: 'rachel@example.com',
          mobile: '050-4567890',
          status: 'inactive',
          totalClients: 25,
          totalLeads: 3,
          openDeals: 1,
          monthlyTarget: 40000,
          monthlyAchieved: 15000,
        },
      ]);

      setPendingRequests([
        {
          id: '1',
          full_name: 'יעקב מזרחי',
          email: 'yaakov@example.com',
          mobile: '050-5678901',
          id_number: '123456789',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          full_name: 'מירי גולן',
          email: 'miri@example.com',
          mobile: '050-6789012',
          id_number: '234567890',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      // In production, this would call /api/supervisor/approve-request
      toast.success('הבקשה אושרה בהצלחה');
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error('שגיאה באישור הבקשה');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      // In production, this would call /api/supervisor/reject-request
      toast.success('הבקשה נדחתה');
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error('שגיאה בדחיית הבקשה');
    }
  };

  const formatLastActivity = (dateStr?: string) => {
    if (!dateStr) return 'לא פעיל';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 5) return 'מחובר עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    return 'לא פעיל';
  };

  const filteredAgents = agents.filter(agent =>
    agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const teamProgress = stats ? Math.round((stats.teamAchieved / stats.teamTarget) * 100) : 0;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">פורטל מפקח</h1>
          <p className="text-muted-foreground">ניהול צוות הסוכנים שלך</p>
        </div>
        {pendingRequests.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            {pendingRequests.length} בקשות ממתינות
          </Badge>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalAgents}</p>
                <p className="text-xs text-muted-foreground">סוכנים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeAgents}</p>
                <p className="text-xs text-muted-foreground">פעילים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalClients}</p>
                <p className="text-xs text-muted-foreground">לקוחות צוות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
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
              <div className="p-2 bg-cyan-100 rounded-lg">
                <FileText className="h-5 w-5 text-cyan-600" />
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
              <div className="p-2 bg-pink-100 rounded-lg">
                <Clock className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingRequests}</p>
                <p className="text-xs text-muted-foreground">בקשות</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Target */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            יעד צוותי חודשי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              ₪{stats?.teamAchieved?.toLocaleString()} מתוך ₪{stats?.teamTarget?.toLocaleString()}
            </span>
            <span className="text-sm font-medium">{teamProgress}%</span>
          </div>
          <Progress value={teamProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">סקירת סוכנים</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            בקשות הרשמה
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports">דוחות</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש סוכן..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Agents Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>סוכן</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead className="text-center">לקוחות</TableHead>
                    <TableHead className="text-center">לידים</TableHead>
                    <TableHead className="text-center">עסקאות</TableHead>
                    <TableHead>התקדמות יעד</TableHead>
                    <TableHead>פעילות אחרונה</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => {
                    const progress = Math.round((agent.monthlyAchieved / agent.monthlyTarget) * 100);
                    return (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {agent.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{agent.full_name}</p>
                              <p className="text-xs text-muted-foreground">{agent.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                            {agent.status === 'active' ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{agent.totalClients}</TableCell>
                        <TableCell className="text-center">{agent.totalLeads}</TableCell>
                        <TableCell className="text-center">{agent.openDeals}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2 w-20" />
                            <span className="text-sm">{progress}%</span>
                            {progress >= 100 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : progress < 50 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${
                            formatLastActivity(agent.lastActivity) === 'מחובר עכשיו'
                              ? 'text-green-600 font-medium'
                              : 'text-muted-foreground'
                          }`}>
                            {formatLastActivity(agent.lastActivity)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            צפה
                            <ChevronLeft className="h-4 w-4 mr-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>בקשות הרשמה ממתינות</CardTitle>
              <CardDescription>
                סוכנים שנרשמו ובחרו אותך כמפקח שלהם
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>אין בקשות ממתינות</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-orange-100 text-orange-700">
                            {request.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.full_name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {request.mobile}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ת.ז: {request.id_number} | נשלח: {new Date(request.created_at).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectRequest(request.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserX className="h-4 w-4 ml-1" />
                          דחה
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="h-4 w-4 ml-1" />
                          אשר
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">דוחות צוות</h3>
              <p className="text-muted-foreground mb-4">
                צפה בדוחות ביצועים, מגמות ויעדים של הצוות
              </p>
              <Button>
                צפה בדוחות
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
