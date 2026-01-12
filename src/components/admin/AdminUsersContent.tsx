'use client';

import { useState, useEffect } from 'react';
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
  Mail,
  Phone,
  Building,
  UserCog,
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
  mobile: string;
  id_number: string;
  requested_role: 'agent' | 'supervisor';
  supervisor_id?: string;
  supervisor_name?: string;
  status: 'pending' | 'approved' | 'rejected';
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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('users');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    mobile: '',
    role: 'agent' as SystemRole,
    supervisor_id: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockSupervisors: UserProfile[] = [
        {
          id: 'sup1',
          full_name: 'משה כהן',
          email: 'moshe@sela.co.il',
          role: 'supervisor',
          is_active: true,
          is_verified: true,
          registration_status: 'approved',
          created_at: '2024-01-01',
        },
        {
          id: 'sup2',
          full_name: 'רחל לוי',
          email: 'rachel@sela.co.il',
          role: 'supervisor',
          is_active: true,
          is_verified: true,
          registration_status: 'approved',
          created_at: '2024-01-15',
        },
      ];

      setSupervisors(mockSupervisors);

      setUsers([
        ...mockSupervisors,
        {
          id: '1',
          full_name: 'דוד אדמין',
          email: 'admin@sela.co.il',
          role: 'admin',
          is_active: true,
          is_verified: true,
          registration_status: 'approved',
          last_login_at: new Date().toISOString(),
          created_at: '2024-01-01',
        },
        {
          id: '2',
          full_name: 'יוסי מנהל',
          email: 'manager@sela.co.il',
          role: 'manager',
          is_active: true,
          is_verified: true,
          registration_status: 'approved',
          created_at: '2024-02-01',
        },
        {
          id: '3',
          full_name: 'ישראל ישראלי',
          email: 'israel@example.com',
          mobile: '050-1234567',
          role: 'agent',
          supervisor_id: 'sup1',
          supervisor_name: 'משה כהן',
          is_active: true,
          is_verified: true,
          registration_status: 'approved',
          last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          created_at: '2024-03-01',
        },
        {
          id: '4',
          full_name: 'שרה כהן',
          email: 'sarah@example.com',
          mobile: '050-2345678',
          role: 'agent',
          supervisor_id: 'sup1',
          supervisor_name: 'משה כהן',
          is_active: true,
          is_verified: true,
          registration_status: 'approved',
          created_at: '2024-03-15',
        },
      ]);

      setRequests([
        {
          id: 'req1',
          full_name: 'יעקב מזרחי',
          email: 'yaakov@example.com',
          mobile: '050-5678901',
          id_number: '123456789',
          requested_role: 'agent',
          supervisor_id: 'sup1',
          supervisor_name: 'משה כהן',
          status: 'pending',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'req2',
          full_name: 'מירי גולן',
          email: 'miri@example.com',
          mobile: '050-6789012',
          id_number: '234567890',
          requested_role: 'supervisor',
          status: 'pending',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email) {
      toast.error('יש למלא שם ואימייל');
      return;
    }

    setIsCreating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('המשתמש נוצר בהצלחה');
      setCreateDialogOpen(false);
      setNewUser({ full_name: '', email: '', mobile: '', role: 'agent', supervisor_id: '' });
      fetchData();
    } catch (error) {
      toast.error('שגיאה ביצירת המשתמש');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      toast.success('הבקשה אושרה');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error('שגיאה באישור הבקשה');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      toast.success('הבקשה נדחתה');
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error('שגיאה בדחיית הבקשה');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
      toast.success(currentStatus ? 'המשתמש הושבת' : 'המשתמש הופעל');
    } catch (error) {
      toast.error('שגיאה בעדכון הסטטוס');
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
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          משתמש חדש
        </Button>
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
          <TabsTrigger value="users">משתמשים ({users.length})</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            בקשות הרשמה
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="mr-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
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
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 ml-2" />
                              עריכה
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
                            <DropdownMenuItem className="text-red-600">
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
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-orange-100 text-orange-700">
                            {request.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{request.full_name}</p>
                            <Badge className={ROLE_COLORS[request.requested_role]}>
                              {getRoleInfo(request.requested_role).labelHe}
                            </Badge>
                          </div>
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
                            ת.ז: {request.id_number}
                            {request.supervisor_name && ` | מפקח: ${request.supervisor_name}`}
                            {' | '}
                            נשלח: {new Date(request.created_at).toLocaleDateString('he-IL')}
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
    </div>
  );
}
