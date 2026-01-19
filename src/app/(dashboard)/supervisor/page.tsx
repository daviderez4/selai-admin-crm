/**
 * @feature HIER-SUP-PAGE-001
 * @module Hierarchy
 * @description Supervisor dashboard - view team, agents under supervision
 * @related HIER-AGT-003, HIER-SUP-001, HIER-AGT-001
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Search,
  Bell,
  CheckCircle,
  CheckCircle2,
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
  Briefcase,
  RefreshCw,
  Eye,
  MessageSquare,
  Calendar,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  user_type: string;
  status: 'active' | 'inactive';
  supervisor_id: string | null;
  supervisor_name: string | null;
  manager_id: string | null;
  manager_name: string | null;
  is_registered: boolean;
  totalContacts: number;
  totalLeads: number;
  openDeals: number;
  wonDeals: number;
  monthlyTarget: number;
  monthlyAchieved: number;
  lastActivity?: string;
}

// Keep old interface for backward compatibility
interface Agent extends TeamMember {}

interface PendingRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  id_number: string | null;
  requested_role: string;
  status: string;
  matched_external_id: string | null;
  match_score: number | null;
  created_at: string;
}

interface TeamStats {
  totalMembers: number;
  totalAgents: number;
  totalSupervisors: number;
  totalManagers: number;
  activeAgents: number;
  totalContacts: number;
  totalLeads: number;
  openDeals: number;
  wonDeals: number;
  totalPolicies: number;
  pendingRequests: number;
}

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDetailOpen, setAgentDetailOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const supabase = createClient();

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      // Get current user's ID from users table
      const { data: currentUser } = await supabase
        .from('users')
        .select('id, user_type')
        .eq('email', authUser.email)
        .single();

      if (!currentUser) {
        toast.error('לא נמצא משתמש');
        return;
      }

      const currentUserId = currentUser.id;
      const isAdminUser = currentUser.user_type === 'admin';
      const isManagerUser = currentUser.user_type === 'manager';
      const isSupervisorUser = currentUser.user_type === 'supervisor';

      // Fetch ALL team members with their relationships
      // Admin sees everyone, Manager sees their supervisors+agents, Supervisor sees their agents
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          phone,
          user_type,
          is_active,
          auth_id,
          supervisor_id,
          manager_id
        `)
        .in('user_type', ['manager', 'supervisor', 'agent'])
        .eq('is_active', true)
        .order('user_type');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Build a lookup map for supervisor/manager names
      const userMap = new Map<string, { full_name: string; user_type: string }>();
      (allUsers || []).forEach(u => {
        userMap.set(u.id, { full_name: u.full_name, user_type: u.user_type });
      });

      // Filter based on role and add relationship names
      let filteredUsers = allUsers || [];

      if (isManagerUser) {
        // Manager sees their assigned supervisors and those supervisors' agents
        const { data: assignedSupervisors } = await supabase
          .from('manager_supervisor_assignments')
          .select('supervisor_id')
          .eq('manager_id', currentUserId);

        const supervisorIds = (assignedSupervisors || []).map(s => s.supervisor_id);
        filteredUsers = filteredUsers.filter(u =>
          supervisorIds.includes(u.id) || // The supervisor themselves
          supervisorIds.includes(u.supervisor_id) // Agents under these supervisors
        );
      } else if (isSupervisorUser) {
        // Supervisor sees only their agents
        filteredUsers = filteredUsers.filter(u => u.supervisor_id === currentUserId);
      }
      // Admin sees everyone (no filter needed)

      // Transform to TeamMember format with relationship names
      const teamMembersData = filteredUsers.map(u => ({
        id: u.id,
        full_name: u.full_name || 'ללא שם',
        email: u.email || '',
        phone: u.phone,
        user_type: u.user_type,
        status: (u.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
        supervisor_id: u.supervisor_id,
        supervisor_name: u.supervisor_id ? userMap.get(u.supervisor_id)?.full_name || null : null,
        manager_id: u.manager_id,
        manager_name: u.manager_id ? userMap.get(u.manager_id)?.full_name || null : null,
        is_registered: !!u.auth_id,
      }));

      // Fetch pending registration requests based on role
      let requestsQuery = supabase
        .from('registration_requests')
        .select('*')
        .in('status', ['pending', 'needs_review'])
        .order('created_at', { ascending: false });

      if (!isAdminUser && !isManagerUser) {
        // Supervisors only see requests assigned to them
        requestsQuery = requestsQuery.eq('supervisor_id', currentUserId);
      }
      // Admins and managers see ALL pending requests

      const { data: requestsData, error: requestsError } = await requestsQuery;

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      }

      // For each team member, get their stats
      const membersWithStats: TeamMember[] = [];
      for (const member of teamMembersData) {
        // Get contacts count
        const { count: contactsCount } = await supabase
          .from('crm_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', member.id);

        // Get leads count
        const { count: leadsCount } = await supabase
          .from('crm_leads')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', member.id);

        // Get open deals count
        const { count: openDealsCount } = await supabase
          .from('crm_deals')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', member.id)
          .not('status', 'in', '("won","lost")');

        // Get won deals count
        const { count: wonDealsCount } = await supabase
          .from('crm_deals')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', member.id)
          .eq('status', 'won');

        membersWithStats.push({
          ...member,
          totalContacts: contactsCount || 0,
          totalLeads: leadsCount || 0,
          openDeals: openDealsCount || 0,
          wonDeals: wonDealsCount || 0,
          monthlyTarget: 50000,
          monthlyAchieved: (wonDealsCount || 0) * 5000,
        });
      }

      // Count by user type
      const totalManagers = membersWithStats.filter(m => m.user_type === 'manager').length;
      const totalSupervisors = membersWithStats.filter(m => m.user_type === 'supervisor').length;
      const totalAgents = membersWithStats.filter(m => m.user_type === 'agent').length;

      console.log('Team members found:', membersWithStats.length, membersWithStats);

      setAgents(membersWithStats);
      setPendingRequests(requestsData || []);

      // Calculate team totals
      const teamStats: TeamStats = {
        totalMembers: membersWithStats.length,
        totalManagers,
        totalSupervisors,
        totalAgents,
        activeAgents: membersWithStats.filter(a => a.status === 'active').length,
        totalContacts: membersWithStats.reduce((sum, a) => sum + a.totalContacts, 0),
        totalLeads: membersWithStats.reduce((sum, a) => sum + a.totalLeads, 0),
        openDeals: membersWithStats.reduce((sum, a) => sum + a.openDeals, 0),
        wonDeals: membersWithStats.reduce((sum, a) => sum + a.wonDeals, 0),
        totalPolicies: 0,
        pendingRequests: requestsData?.length || 0,
      };

      // Get total policies
      const allMemberIds = membersWithStats.map(a => a.id);
      if (allMemberIds.length > 0) {
        const { count: policiesCount } = await supabase
          .from('crm_policies')
          .select('*', { count: 'exact', head: true })
          .in('agent_id', allMemberIds);

        teamStats.totalPolicies = policiesCount || 0;
      }

      setStats(teamStats);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success('הנתונים עודכנו');
  };

  const handleApproveRequest = async (request: PendingRequest) => {
    const supabase = createClient();

    try {
      // Update registration request status
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // The actual user creation is handled by the admin panel
      // Here we just update the status

      toast.success('הבקשה אושרה בהצלחה');
      setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      if (stats) {
        setStats({ ...stats, pendingRequests: stats.pendingRequests - 1 });
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('שגיאה באישור הבקשה');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('registration_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('הבקשה נדחתה');
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      if (stats) {
        setStats({ ...stats, pendingRequests: stats.pendingRequests - 1 });
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('שגיאה בדחיית הבקשה');
    }
  };

  const handleViewAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setAgentDetailOpen(true);
  };

  const filteredAgents = agents.filter(agent =>
    agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="הצוות שלי" />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="הצוות שלי" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              הצוות שלי
            </h1>
            <p className="text-muted-foreground">ניהול וצפייה בחברי הצוות - מנהלים, מפקחים וסוכנים</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {pendingRequests.length} בקשות ממתינות
              </Badge>
            )}
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              רענן
            </Button>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats?.totalMembers}</p>
                  <p className="text-xs text-blue-600">חברי צוות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats?.totalManagers}</p>
                  <p className="text-xs text-purple-600">מנהלים</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{stats?.totalSupervisors}</p>
                  <p className="text-xs text-indigo-600">מפקחים</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats?.totalAgents}</p>
                  <p className="text-xs text-green-600">סוכנים</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-700">{stats?.totalLeads}</p>
                  <p className="text-xs text-orange-600">לידים</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500 rounded-lg">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-700">{stats?.openDeals}</p>
                  <p className="text-xs text-cyan-600">עסקאות פתוחות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{stats?.wonDeals}</p>
                  <p className="text-xs text-emerald-600">עסקאות שנסגרו</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink-700">{stats?.pendingRequests}</p>
                  <p className="text-xs text-pink-600">בקשות</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
            <TabsTrigger value="performance">ביצועים</TabsTrigger>
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

            {/* Team Members Table */}
            {filteredAgents.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>שם</TableHead>
                        <TableHead>תפקיד</TableHead>
                        <TableHead>מפקח</TableHead>
                        <TableHead>מנהל</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead className="text-center">לידים</TableHead>
                        <TableHead className="text-center">עסקאות</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((member) => {
                        const userTypeLabels: Record<string, { label: string; color: string }> = {
                          manager: { label: 'מנהל', color: 'bg-purple-100 text-purple-700' },
                          supervisor: { label: 'מפקח', color: 'bg-blue-100 text-blue-700' },
                          agent: { label: 'סוכן', color: 'bg-green-100 text-green-700' },
                        };
                        const typeInfo = userTypeLabels[member.user_type] || { label: member.user_type, color: 'bg-gray-100 text-gray-700' };

                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className={typeInfo.color}>
                                    {member.full_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{member.full_name}</p>
                                    {member.is_registered ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="משתמש רשום" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-amber-500" aria-label="לא רשום" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={typeInfo.color}>
                                {typeInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {member.supervisor_name ? (
                                <span className="text-sm">{member.supervisor_name}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {member.manager_name ? (
                                <span className="text-sm">{member.manager_name}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                {member.status === 'active' ? 'פעיל' : 'לא פעיל'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{member.totalLeads}</TableCell>
                            <TableCell className="text-center font-medium text-green-600">{member.wonDeals}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAgent(member)}
                              >
                                <Eye className="h-4 w-4 ml-1" />
                                צפה
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">אין חברי צוות</h3>
                  <p className="text-muted-foreground">
                    חברי צוות שמשויכים אליך יופיעו כאן
                  </p>
                </CardContent>
              </Card>
            )}
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
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-orange-100 text-orange-700">
                                {request.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-lg">{request.full_name}</p>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {request.email}
                                </span>
                                {request.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {request.phone}
                                  </span>
                                )}
                                {request.id_number && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    ת.ז: {request.id_number}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {request.matched_external_id ? (
                                  <Badge className="bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3 ml-1" />
                                    נמצאה התאמה ({request.match_score}%)
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700">
                                    <AlertCircle className="h-3 w-3 ml-1" />
                                    דורש בדיקה
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 ml-1" />
                                  {new Date(request.created_at).toLocaleDateString('he-IL')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectRequest(request.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <UserX className="h-4 w-4 ml-1" />
                              דחה
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <UserCheck className="h-4 w-4 ml-1" />
                              אשר
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    ביצועים לפי סוכן
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredAgents.length > 0 ? (
                    <div className="space-y-4">
                      {filteredAgents
                        .sort((a, b) => b.wonDeals - a.wonDeals)
                        .slice(0, 5)
                        .map((agent, idx) => (
                          <div key={agent.id} className="flex items-center gap-4">
                            <span className="text-lg font-bold text-muted-foreground w-6">
                              {idx + 1}
                            </span>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {agent.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{agent.full_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{agent.wonDeals} עסקאות</span>
                                <span>•</span>
                                <span>{agent.totalLeads} לידים</span>
                              </div>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-green-600">
                                ₪{agent.monthlyAchieved.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">אין נתונים להצגה</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    סיכום צוותי
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">סך עסקאות שנסגרו</span>
                      <span className="text-2xl font-bold text-blue-700">{stats?.wonDeals}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">סך הכנסות</span>
                      <span className="text-2xl font-bold text-green-700">
                        ₪{(stats?.wonDeals || 0) * 5000}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">ממוצע לידים לסוכן</span>
                      <span className="text-2xl font-bold text-orange-700">
                        {stats?.totalAgents ? Math.round((stats.totalLeads || 0) / stats.totalAgents) : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Agent Detail Dialog */}
      <Dialog open={agentDetailOpen} onOpenChange={setAgentDetailOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {selectedAgent?.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-xl">{selectedAgent?.full_name}</span>
                <Badge
                  variant={selectedAgent?.status === 'active' ? 'default' : 'secondary'}
                  className="mr-2"
                >
                  {selectedAgent?.status === 'active' ? 'פעיל' : 'לא פעיל'}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{selectedAgent?.email}</span>
              </div>
              {selectedAgent?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedAgent?.phone}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">{selectedAgent?.totalContacts}</p>
                <p className="text-xs text-blue-600">אנשי קשר</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-700">{selectedAgent?.totalLeads}</p>
                <p className="text-xs text-orange-600">לידים</p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-cyan-700">{selectedAgent?.openDeals}</p>
                <p className="text-xs text-cyan-600">עסקאות פתוחות</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{selectedAgent?.wonDeals}</p>
                <p className="text-xs text-green-600">עסקאות שנסגרו</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>התקדמות יעד חודשי</span>
                <span className="font-medium">
                  ₪{selectedAgent?.monthlyAchieved.toLocaleString()} / ₪{selectedAgent?.monthlyTarget.toLocaleString()}
                </span>
              </div>
              <Progress
                value={
                  selectedAgent?.monthlyTarget
                    ? Math.round((selectedAgent.monthlyAchieved / selectedAgent.monthlyTarget) * 100)
                    : 0
                }
                className="h-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentDetailOpen(false)}>
              סגור
            </Button>
            <Button onClick={() => {
              // Navigate to agent's CRM view
              setAgentDetailOpen(false);
            }}>
              <MessageSquare className="h-4 w-4 ml-2" />
              שלח הודעה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
