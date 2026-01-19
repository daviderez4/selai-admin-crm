'use client';

import { useState, useEffect } from 'react';
import {
  Users, UserCheck, Shield, Building2, Search,
  ChevronDown, ChevronRight, Phone, Mail, User,
  RefreshCw, BadgeCheck, UserX, UserPlus, Link2,
  Copy, Check, Trash2, Clock, Loader2, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'used' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
  agent_id?: string;
}

// Registered user from users table
interface RegisteredUser {
  id: string;
  auth_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  user_type: 'admin' | 'manager' | 'supervisor' | 'agent';
  supervisor_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  supervisor_name?: string | null;
  manager_name?: string | null;
}

export default function HierarchyPage() {
  const { profile, isAdmin: isAdminUserStore, canManageUsers } = useUserStore();
  const { userRecord, isAdmin: isAdminAuth } = useAuthStore();

  // Check admin from both stores - authStore (users table) or userStore (SELAI)
  const isAdmin = () => isAdminAuth() || isAdminUserStore();

  // Only registered users (with auth_id) from the users table
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const [expandedSupervisors, setExpandedSupervisors] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalManagers: 0,
    totalSupervisors: 0,
    totalAgents: 0,
    totalRegistered: 0
  });

  // Invite dialog state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'agent',
    agent_id: ''
  });
  const [isInviting, setIsInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('hierarchy');

  useEffect(() => {
    fetchData();
    fetchInvitations();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Fetch ONLY registered users (with auth_id) from users table
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, auth_id, email, full_name, phone, user_type, supervisor_id, manager_id, is_active, is_approved, created_at')
        .not('auth_id', 'is', null) // Only registered users
        .eq('is_active', true)
        .order('user_type')
        .order('full_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error('שגיאה בטעינת המשתמשים');
        return;
      }

      // Create a map for looking up names
      const userMap = new Map(allUsers?.map(u => [u.id, u]) || []);

      // Add supervisor and manager names
      const usersWithNames: RegisteredUser[] = (allUsers || []).map(u => ({
        ...u,
        supervisor_name: u.supervisor_id ? userMap.get(u.supervisor_id)?.full_name || null : null,
        manager_name: u.manager_id ? userMap.get(u.manager_id)?.full_name || null : null,
      }));

      setRegisteredUsers(usersWithNames);

      // Calculate stats from registered users only
      const admins = usersWithNames.filter(u => u.user_type === 'admin');
      const managers = usersWithNames.filter(u => u.user_type === 'manager');
      const supervisors = usersWithNames.filter(u => u.user_type === 'supervisor');
      const agents = usersWithNames.filter(u => u.user_type === 'agent');

      setStats({
        totalAdmins: admins.length,
        totalManagers: managers.length,
        totalSupervisors: supervisors.length,
        totalAgents: agents.length,
        totalRegistered: usersWithNames.length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/invitations');
      const data = await res.json();
      if (data.success) {
        setInvitations(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleCreateInvite = async () => {
    if (!inviteData.email) {
      toast.error('יש להזין אימייל');
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedLink(data.data.invite_link);
        toast.success('קישור הזמנה נוצר בהצלחה!');
        fetchInvitations();
      } else {
        if (data.setup_required) {
          toast.error('יש להגדיר את טבלת ההזמנות בסופאבייס');
        } else {
          toast.error(data.error || 'שגיאה ביצירת ההזמנה');
        }
      }
    } catch (error) {
      toast.error('שגיאה ביצירת ההזמנה');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('הקישור הועתק!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteInvitation = async (token: string) => {
    if (!confirm('האם למחוק את ההזמנה?')) return;

    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('ההזמנה נמחקה');
        fetchInvitations();
      }
    } catch (error) {
      toast.error('שגיאה במחיקת ההזמנה');
    }
  };

  const resetInviteForm = () => {
    setInviteData({ email: '', role: 'agent', agent_id: '' });
    setGeneratedLink('');
    setCopied(false);
  };

  const toggleManager = (managerId: string) => {
    const newExpanded = new Set(expandedManagers);
    if (newExpanded.has(managerId)) {
      newExpanded.delete(managerId);
    } else {
      newExpanded.add(managerId);
    }
    setExpandedManagers(newExpanded);
  };

  const toggleSupervisor = (supervisorId: string) => {
    const newExpanded = new Set(expandedSupervisors);
    if (newExpanded.has(supervisorId)) {
      newExpanded.delete(supervisorId);
    } else {
      newExpanded.add(supervisorId);
    }
    setExpandedSupervisors(newExpanded);
  };

  // Get users by role
  const admins = registeredUsers.filter(u => u.user_type === 'admin');
  const managers = registeredUsers.filter(u => u.user_type === 'manager');
  const supervisors = registeredUsers.filter(u => u.user_type === 'supervisor');
  const agents = registeredUsers.filter(u => u.user_type === 'agent');

  // Get supervisors under a manager
  const getSupervisorsForManager = (managerId: string) => {
    return supervisors.filter(s => s.manager_id === managerId);
  };

  // Get agents under a supervisor
  const getAgentsForSupervisor = (supervisorId: string) => {
    return agents.filter(a => a.supervisor_id === supervisorId);
  };

  // Filter by search term
  const filteredUsers = registeredUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check permissions - allow admin, manager or supervisor
  const canView = isAdmin() ||
    userRecord?.user_type === 'manager' ||
    userRecord?.user_type === 'supervisor' ||
    profile?.role === 'supervisor';

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-[60vh]" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">אין הרשאה</h2>
            <p className="text-slate-500">אין לך הרשאה לצפות בדף זה</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">היררכיה ארגונית</h1>
          <p className="text-slate-500">מפקחים, סוכנים ומבנה הארגון</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          {isAdmin() && (
            <Button
              onClick={() => { resetInviteForm(); setIsInviteOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <UserPlus className="h-4 w-4 ml-2" />
              הזמן משתמש
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Only registered users */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">מנהלים</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalAdmins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">מנהלי צוות</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalManagers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">מפקחים</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalSupervisors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">סוכנים</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BadgeCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">סה"כ רשומים</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalRegistered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="חפש מפקח או סוכן..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10 bg-white"
        />
      </div>

      {/* Hierarchy View - Only Registered Users */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="h-5 w-5 text-blue-600" />
            מבנה ארגוני - משתמשים רשומים בלבד
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : registeredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchTerm ? 'לא נמצאו תוצאות' : 'אין משתמשים רשומים במערכת'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Admins Section */}
              {admins.length > 0 && (
                <div className="p-4 bg-amber-50/50">
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    מנהלי מערכת ({admins.length})
                  </h3>
                  <div className="space-y-2">
                    {admins.filter(a =>
                      a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      a.email.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-100 rounded-full">
                            <Crown className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-800">{admin.full_name}</p>
                            <p className="text-sm text-slate-500">{admin.email}</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 border-0">מנהל</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Managers Section */}
              {managers.length > 0 && (
                <div className="p-4">
                  <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    מנהלי צוות ({managers.length})
                  </h3>
                  <div className="space-y-2">
                    {managers.filter(m =>
                      m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      m.email.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((manager) => {
                      const managerSupervisors = getSupervisorsForManager(manager.id);
                      const isExpanded = expandedManagers.has(manager.id);

                      return (
                        <div key={manager.id} className="bg-slate-50 rounded-lg overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition-colors"
                            onClick={() => toggleManager(manager.id)}
                          >
                            <div className="flex items-center gap-3">
                              {managerSupervisors.length > 0 ? (
                                isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-slate-400" />
                                )
                              ) : (
                                <div className="w-5" />
                              )}
                              <div className="p-2 bg-indigo-100 rounded-full">
                                <Building2 className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-slate-800">{manager.full_name}</p>
                                <p className="text-sm text-slate-500">{manager.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {managerSupervisors.length} מפקחים
                              </Badge>
                            </div>
                          </button>

                          {/* Supervisors under Manager */}
                          {isExpanded && managerSupervisors.length > 0 && (
                            <div className="pr-8 pb-2 space-y-1">
                              {managerSupervisors.map((supervisor) => (
                                <div key={supervisor.id} className="flex items-center justify-between p-2 mx-2 bg-white rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-purple-100 rounded-full">
                                      <Shield className="h-3 w-3 text-purple-600" />
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-slate-700">{supervisor.full_name}</p>
                                      <p className="text-xs text-slate-500">{supervisor.email}</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                    {getAgentsForSupervisor(supervisor.id).length} סוכנים
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Supervisors Section (without manager) */}
              {supervisors.filter(s => !s.manager_id).length > 0 && (
                <div className="p-4">
                  <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    מפקחים ({supervisors.length})
                  </h3>
                  <div className="space-y-2">
                    {supervisors.filter(s =>
                      !s.manager_id &&
                      (s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.email.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((supervisor) => {
                      const supervisorAgents = getAgentsForSupervisor(supervisor.id);
                      const isExpanded = expandedSupervisors.has(supervisor.id);

                      return (
                        <div key={supervisor.id} className="bg-slate-50 rounded-lg overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition-colors"
                            onClick={() => toggleSupervisor(supervisor.id)}
                          >
                            <div className="flex items-center gap-3">
                              {supervisorAgents.length > 0 ? (
                                isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-slate-400" />
                                )
                              ) : (
                                <div className="w-5" />
                              )}
                              <div className="p-2 bg-purple-100 rounded-full">
                                <Shield className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-slate-800">{supervisor.full_name}</p>
                                <p className="text-sm text-slate-500">{supervisor.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {supervisorAgents.length} סוכנים
                              </Badge>
                            </div>
                          </button>

                          {/* Agents under Supervisor */}
                          {isExpanded && supervisorAgents.length > 0 && (
                            <div className="pr-8 pb-2 space-y-1">
                              {supervisorAgents.map((agent) => (
                                <div key={agent.id} className="flex items-center justify-between p-2 mx-2 bg-white rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 rounded-full">
                                      <User className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-slate-700">{agent.full_name}</p>
                                      <p className="text-xs text-slate-500">{agent.email}</p>
                                    </div>
                                  </div>
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">סוכן</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Agents Section (without supervisor) */}
              {agents.filter(a => !a.supervisor_id).length > 0 && (
                <div className="p-4">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    סוכנים ללא מפקח ({agents.filter(a => !a.supervisor_id).length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {agents.filter(a =>
                      !a.supervisor_id &&
                      (a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      a.email.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-full">
                            <User className="h-3 w-3 text-blue-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">{agent.full_name}</p>
                            <p className="text-xs text-slate-500">{agent.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Role Badge */}
      {profile && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {profile.role === 'admin' ? (
                    <Shield className="h-5 w-5 text-purple-600" />
                  ) : profile.role === 'supervisor' ? (
                    <Shield className="h-5 w-5 text-blue-600" />
                  ) : (
                    <User className="h-5 w-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-600">מחובר כ:</p>
                  <p className="font-medium text-slate-800">{profile.full_name}</p>
                </div>
              </div>
              <Badge className={`${
                profile.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : profile.role === 'supervisor'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-700'
              } border-0`}>
                {profile.role === 'admin' ? 'מנהל מערכת' :
                 profile.role === 'supervisor' ? 'מפקח' : 'סוכן'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations Card */}
      {isAdmin() && invitations.filter(i => i.status === 'pending').length > 0 && (
        <Card className="bg-white border-slate-200">
          <CardHeader className="border-b border-slate-100 py-3">
            <CardTitle className="flex items-center gap-2 text-sm text-slate-700">
              <Clock className="h-4 w-4 text-amber-500" />
              הזמנות ממתינות ({invitations.filter(i => i.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {invitations.filter(i => i.status === 'pending').map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-100 rounded-full">
                      <Mail className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{inv.email}</p>
                      <p className="text-xs text-slate-500">
                        {inv.role === 'admin' ? 'מנהל' : inv.role === 'supervisor' ? 'מפקח' : 'סוכן'}
                        {' • '}
                        פג תוקף: {new Date(inv.expires_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                        await navigator.clipboard.writeText(`${baseUrl}/register?token=${inv.token}`);
                        toast.success('הקישור הועתק!');
                      }}
                      className="h-7 px-2 text-slate-500 hover:text-slate-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteInvitation(inv.token)}
                      className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={(open) => { setIsInviteOpen(open); if (!open) resetInviteForm(); }}>
        <DialogContent className="bg-white border-slate-200 max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              הזמנת משתמש חדש
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!generatedLink ? (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-700">אימייל</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    className="bg-white border-slate-300"
                    disabled={isInviting}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">תפקיד</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
                    disabled={isInviting}
                  >
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">מנהל מערכת</SelectItem>
                      <SelectItem value="supervisor">מפקח</SelectItem>
                      <SelectItem value="agent">סוכן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inviteData.agent_id && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <Link2 className="h-4 w-4 inline ml-1" />
                      ההזמנה מקושרת לסוכן קיים במערכת
                    </p>
                  </div>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleCreateInvite}
                  disabled={isInviting || !inviteData.email}
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      יוצר הזמנה...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 ml-2" />
                      צור קישור הזמנה
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-700 mb-2 font-medium">קישור ההזמנה נוצר בהצלחה!</p>
                  <p className="text-xs text-emerald-600 mb-3">שלח את הקישור למשתמש כדי שיוכל להירשם:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={generatedLink}
                      readOnly
                      className="bg-white text-xs flex-1"
                      dir="ltr"
                    />
                    <Button
                      size="sm"
                      variant={copied ? "default" : "outline"}
                      onClick={handleCopyLink}
                      className={copied ? "bg-emerald-600" : ""}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { resetInviteForm(); }}
                  >
                    הזמנה נוספת
                  </Button>
                  <Button
                    className="flex-1 bg-slate-800"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    סיום
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
