'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Mail,
  Phone,
  Building,
  UserCog,
  RefreshCw,
  FileText,
  Clock,
  Key,
  Send,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SystemRole } from '@/types/permissions';
import { ROLE_CONFIGS, getRoleInfo } from '@/types/permissions';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  id_number?: string;
  role: SystemRole;
  supervisor_id?: string;
  supervisor_name?: string;
  handler_name?: string; // שם מטפל לקישור נתונים פיננסיים
  is_active: boolean;
  is_verified: boolean;
  registration_status: 'pending' | 'approved' | 'rejected';
  last_login_at?: string;
  created_at: string;
}

interface RegistrationRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  id_number: string | null;
  requested_role: string;
  supervisor_id?: string;
  supervisor_name?: string;
  status: 'pending' | 'needs_review' | 'approved' | 'rejected';
  matched_external_id: string | null;
  match_score: number | null;
  match_details: Record<string, unknown> | null;
  created_at: string;
}

const ROLE_COLORS: Record<SystemRole, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-blue-100 text-blue-700',
  agent: 'bg-green-100 text-green-700',
  client: 'bg-gray-100 text-gray-700',
};

export default function AdminUsersContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('requests');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserProfile | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    role: 'agent' as SystemRole,
    supervisor_id: '',
    handler_name: '', // שם מטפל - לקישור נתונים פיננסיים מאקסל
  });
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    mobile: '',
    role: 'agent' as SystemRole,
    supervisor_id: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<SystemRole>('agent');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [managers, setManagers] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    try {
      // Fetch registration requests
      const { data: regRequests, error: reqError } = await supabase
        .from('registration_requests')
        .select('*')
        .in('status', ['pending', 'needs_review'])
        .order('created_at', { ascending: false });

      if (reqError) {
        console.error('Error fetching registration requests:', reqError);
      } else {
        setRequests(regRequests || []);
      }

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Fetched users:', usersData?.length, 'users', usersError ? `Error: ${usersError.message}` : '');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error(`שגיאה בטעינת משתמשים: ${usersError.message}`);
      } else if (usersData) {
        // Map to UserProfile format
        // First pass: create user map for supervisor lookups
        const userMap = new Map<string, string>();
        usersData.forEach((u: Record<string, unknown>) => {
          userMap.set(u.id as string, (u.full_name as string) || 'לא צוין');
        });

        const mappedUsers: UserProfile[] = usersData.map((u: Record<string, unknown>) => {
          const supervisorId = u.supervisor_id as string | undefined;
          return {
            id: u.id as string,
            full_name: (u.full_name as string) || 'לא צוין',
            email: (u.email as string) || '',
            mobile: u.phone as string | undefined,
            id_number: u.national_id as string | undefined,
            role: (u.user_type as SystemRole) || (u.role as SystemRole) || 'agent',
            supervisor_id: supervisorId,
            supervisor_name: supervisorId ? userMap.get(supervisorId) : undefined,
            handler_name: u.handler_name as string | undefined, // שם מטפל לקישור נתונים פיננסיים
            is_active: u.is_active as boolean ?? true,
            is_verified: u.is_approved as boolean ?? false,
            registration_status: u.is_approved ? 'approved' : 'pending',
            last_login_at: u.last_login_at as string | undefined,
            created_at: u.created_at as string,
          };
        });

        setUsers(mappedUsers);

        // Extract supervisors and managers
        const supervisorsList = mappedUsers.filter(u => u.role === 'supervisor');
        setSupervisors(supervisorsList);
        const managersList = mappedUsers.filter(u => u.role === 'manager');
        setManagers(managersList);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success('הנתונים עודכנו');
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email) {
      toast.error('יש למלא שם ואימייל');
      return;
    }

    setIsCreating(true);

    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          full_name: newUser.full_name,
          phone: newUser.mobile || null,
          user_type: newUser.role,
          supervisor_id: newUser.supervisor_id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast.success(result.message || 'המשתמש נוצר בהצלחה');
      setCreateDialogOpen(false);
      setNewUser({ full_name: '', email: '', mobile: '', role: 'agent', supervisor_id: '' });
      await fetchData();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת המשתמש');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApproveRequest = async (request: RegistrationRequest) => {
    try {
      // Use the registration approval API that creates auth user
      const response = await fetch(`/api/registration/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve');
      }

      toast.success(`${request.full_name} אושר בהצלחה!`);
      await fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה באישור הבקשה');
    }
  };

  const handleRejectRequest = async (requestId: string, notes?: string) => {
    try {
      const response = await fetch(`/api/registration/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject');
      }

      toast.success('הבקשה נדחתה');
      await fetchData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('שגיאה בדחיית הבקשה');
    }
  };

  const handleOpenEditDialog = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setEditFormData({
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile || '',
      role: user.role,
      supervisor_id: user.supervisor_id || '',
      handler_name: user.handler_name || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUserForEdit) return;

    setIsUpdating(true);

    try {
      // Prepare update data
      const updateData: Record<string, unknown> = {
        full_name: editFormData.full_name,
        phone: editFormData.mobile || null,
        handler_name: editFormData.handler_name || null,
      };

      // Handle supervisor assignment based on role
      if (editFormData.role === 'agent') {
        updateData.supervisor_id = editFormData.supervisor_id || null;
      } else if (editFormData.role === 'supervisor') {
        updateData.manager_id = editFormData.supervisor_id || null;
      }

      // Use API route to bypass RLS
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForEdit.id,
          action: 'update_role',
          data: {
            user_type: editFormData.role,
            ...updateData,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      toast.success('המשתמש עודכן בהצלחה');
      setEditDialogOpen(false);
      setSelectedUserForEdit(null);
      await fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון המשתמש');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // Use API route to bypass RLS
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: currentStatus ? 'suspend' : 'activate',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
      toast.success(currentStatus ? 'המשתמש הושבת' : 'המשתמש הופעל');
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בעדכון הסטטוס');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUserForDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users?userId=${selectedUserForDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setUsers(prev => prev.filter(u => u.id !== selectedUserForDelete.id));
      toast.success('המשתמש נמחק בהצלחה');
      setDeleteDialogOpen(false);
      setSelectedUserForDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה במחיקת המשתמש');
    } finally {
      setIsDeleting(false);
    }
  };

  // Send password reset email
  const handleSendPasswordReset = async () => {
    if (!selectedUserForReset?.email) {
      toast.error('לא נמצא אימייל');
      return;
    }

    setIsSendingReset(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        selectedUserForReset.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (error) throw error;

      toast.success(`נשלח מייל איפוס סיסמה ל-${selectedUserForReset.email}`);
      setResetPasswordDialogOpen(false);
      setSelectedUserForReset(null);
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('שגיאה בשליחת מייל איפוס');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Invite new user by email
  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('נא להזין כתובת אימייל');
      return;
    }

    setIsSendingInvite(true);
    const supabase = createClient();
    const email = inviteEmail.trim().toLowerCase();

    try {
      // First create/update user via API to bypass RLS
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          full_name: email.split('@')[0], // Default name from email
          user_type: inviteRole,
        }),
      });

      if (!userResponse.ok) {
        const result = await userResponse.json();
        console.error('User creation error:', result.error);
      }

      // Send magic link / invite email (this uses auth which works client-side)
      const { error: inviteError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            user_type: inviteRole,
          },
        },
      });

      if (inviteError) throw inviteError;

      toast.success(`הזמנה נשלחה ל-${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('agent');
      await fetchData();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('שגיאה בשליחת הזמנה');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            ניהול משתמשים
          </h2>
          <p className="text-muted-foreground">ניהול משתמשים, תפקידים והרשאות</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
            <Send className="h-4 w-4 ml-2" />
            הזמן משתמש
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            משתמש חדש
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(ROLE_CONFIGS).map(([role, config]) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.labelHe}</p>
                  </div>
                  <Badge className={ROLE_COLORS[role as SystemRole]}>{config.labelHe}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="relative">
            בקשות הרשמה
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">משתמשים ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם או אימייל..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="סנן לפי תפקיד" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התפקידים</SelectItem>
                {Object.entries(ROLE_CONFIGS).map(([role, config]) => (
                  <SelectItem key={role} value={role}>
                    {config.labelHe}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>משתמש</TableHead>
                    <TableHead>תפקיד</TableHead>
                    <TableHead>מפקח</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>כניסה אחרונה</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {user.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[user.role]}>
                          {getRoleInfo(user.role).labelHe}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.supervisor_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'פעיל' : 'מושבת'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString('he-IL')
                          : 'מעולם'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>
                              <Edit className="h-4 w-4 ml-2" />
                              עריכה
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUserForReset(user);
                                setResetPasswordDialogOpen(true);
                              }}
                            >
                              <Key className="h-4 w-4 ml-2" />
                              איפוס סיסמה
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 ml-2" />
                                  השבת
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 ml-2" />
                                  הפעל
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedUserForDelete(user);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>בקשות הרשמה ממתינות</CardTitle>
              <CardDescription>אשר או דחה בקשות של משתמשים חדשים</CardDescription>
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
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {request.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-lg">{request.full_name}</p>
                              <Badge className={ROLE_COLORS[request.requested_role as SystemRole] || 'bg-gray-100 text-gray-700'}>
                                {getRoleInfo(request.requested_role as SystemRole).labelHe}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {request.email}
                              </span>
                              {request.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {request.phone}
                                </span>
                              )}
                              {request.id_number && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-4 w-4" />
                                  ת.ז: {request.id_number}
                                </span>
                              )}
                            </div>
                            {/* Match Status */}
                            <div className="flex items-center gap-2 mt-2">
                              {request.matched_external_id ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 ml-1" />
                                  נמצאה התאמה במאגר ({request.match_score}%)
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                  <AlertCircle className="h-3 w-3 ml-1" />
                                  דורש בדיקה ידנית
                                </Badge>
                              )}
                              {request.status === 'needs_review' && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                  דורש סקירה
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <Badge variant="outline" className="mb-2">
                            <Clock className="h-3 w-3 ml-1" />
                            {new Date(request.created_at).toLocaleDateString('he-IL')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const notes = prompt('סיבת דחייה (אופציונלי):');
                            handleRejectRequest(request.id, notes || undefined);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserX className="h-4 w-4 ml-1" />
                          דחה
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request)}
                          className="bg-emerald-600 hover:bg-emerald-700"
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
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת משתמש חדש</DialogTitle>
            <DialogDescription>
              צור משתמש חדש והגדר את התפקיד שלו במערכת
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שם מלא</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="ישראל ישראלי"
              />
            </div>

            <div className="space-y-2">
              <Label>אימייל</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input
                value={newUser.mobile}
                onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                placeholder="050-1234567"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: SystemRole) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIGS).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      {config.labelHe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newUser.role === 'agent' && (
              <div className="space-y-2">
                <Label>מפקח</Label>
                <Select
                  value={newUser.supervisor_id}
                  onValueChange={(value) => setNewUser({ ...newUser, supervisor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מפקח" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              צור משתמש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              הזמנת משתמש חדש
            </DialogTitle>
            <DialogDescription>
              שלח הזמנה באימייל למשתמש חדש. הוא יקבל לינק להתחברות ויוכל להגדיר סיסמה.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>אימייל</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select
                value={inviteRole}
                onValueChange={(value: SystemRole) => setInviteRole(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIGS).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      {config.labelHe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleInviteUser} disabled={isSendingInvite}>
              {isSendingInvite ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              שלח הזמנה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              עריכת משתמש
            </DialogTitle>
            <DialogDescription>
              עדכן פרטי משתמש, תפקיד ושיוך להיררכיה
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שם מלא</Label>
              <Input
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                placeholder="ישראל ישראלי"
              />
            </div>

            <div className="space-y-2">
              <Label>אימייל</Label>
              <Input
                type="email"
                value={editFormData.email}
                disabled
                className="bg-gray-50"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">לא ניתן לשנות אימייל</p>
            </div>

            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input
                value={editFormData.mobile}
                onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                placeholder="050-1234567"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: SystemRole) => setEditFormData({ ...editFormData, role: value, supervisor_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIGS).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      {config.labelHe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show supervisor selector for agents */}
            {editFormData.role === 'agent' && (
              <div className="space-y-2">
                <Label>מפקח אחראי</Label>
                <Select
                  value={editFormData.supervisor_id || 'none'}
                  onValueChange={(value) => setEditFormData({ ...editFormData, supervisor_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מפקח" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא מפקח</SelectItem>
                    {supervisors.map((sup) => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.full_name} ({sup.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show manager selector for supervisors */}
            {editFormData.role === 'supervisor' && (
              <div className="space-y-2">
                <Label>מנהל אחראי</Label>
                <Select
                  value={editFormData.supervisor_id || 'none'}
                  onValueChange={(value) => setEditFormData({ ...editFormData, supervisor_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מנהל" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא מנהל</SelectItem>
                    {managers.map((mgr) => (
                      <SelectItem key={mgr.id} value={mgr.id}>
                        {mgr.full_name} ({mgr.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Handler name for financial data matching - for agents and supervisors */}
            {(editFormData.role === 'agent' || editFormData.role === 'supervisor') && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  שם מטפל (לקישור נתונים פיננסיים)
                </Label>
                <Input
                  value={editFormData.handler_name}
                  onChange={(e) => setEditFormData({ ...editFormData, handler_name: e.target.value })}
                  placeholder="השם כפי שמופיע בעמודת 'מטפל' באקסל"
                />
                <p className="text-xs text-muted-foreground">
                  השם חייב להתאים בדיוק לשם בעמודת "מטפל" בקבצי האקסל המיובאים
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <CheckCircle className="h-4 w-4 ml-2" />
              )}
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              איפוס סיסמה
            </DialogTitle>
            <DialogDescription>
              שלח מייל עם לינק לאיפוס סיסמה למשתמש
            </DialogDescription>
          </DialogHeader>

          {selectedUserForReset && (
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="font-medium">{selectedUserForReset.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedUserForReset.email}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            המשתמש יקבל אימייל עם לינק לאיפוס הסיסמה שלו.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSendPasswordReset} disabled={isSendingReset}>
              {isSendingReset ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Mail className="h-4 w-4 ml-2" />
              )}
              שלח מייל איפוס
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              מחיקת משתמש
            </DialogTitle>
            <DialogDescription>
              פעולה זו תמחק את המשתמש לצמיתות ולא ניתן לשחזר אותו.
            </DialogDescription>
          </DialogHeader>

          {selectedUserForDelete && (
            <div className="bg-red-50 p-4 rounded-lg space-y-2 border border-red-200">
              <p className="font-medium">{selectedUserForDelete.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedUserForDelete.email}</p>
            </div>
          )}

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 inline ml-1" />
              שים לב: פעולה זו בלתי הפיכה!
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Trash2 className="h-4 w-4 ml-2" />
              )}
              מחק משתמש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
