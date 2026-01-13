'use client';

import { useState, useEffect } from 'react';
import { Users, Shield, Mail, MoreVertical, Trash2, Edit, Loader2, RefreshCw, UserX, UserCheck, Phone, CreditCard } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  id_number?: string;
  user_type: string;
  supervisor_id?: string;
  manager_id?: string;
  is_active: boolean;
  is_approved: boolean;
  created_at?: string;
}

const userTypeLabels: Record<string, string> = {
  admin: 'מנהל מערכת',
  manager: 'מנהל',
  supervisor: 'מפקח',
  agent: 'סוכן',
  client: 'לקוח',
};

const userTypeColors: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-600 border-purple-200',
  manager: 'bg-blue-50 text-blue-600 border-blue-200',
  supervisor: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  agent: 'bg-green-50 text-green-600 border-green-200',
  client: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserType, setCurrentUserType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({ user_type: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setCurrentUserId(data.currentUserId || '');
      setCurrentUserType(data.currentUserType || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      toast.error('שגיאה בטעינת משתמשים');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSuspendUser = async (userId: string, isActive: boolean) => {
    const action = isActive ? 'suspend' : 'activate';
    const confirmMsg = isActive ? 'האם להשהות את המשתמש?' : 'האם להפעיל את המשתמש?';

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      toast.success(data.message || 'המשתמש עודכן בהצלחה');
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון המשתמש');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש "${userName}"? פעולה זו בלתי הפיכה.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      toast.success('המשתמש נמחק בהצלחה');
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה במחיקת המשתמש');
    }
  };

  const handleUpdateRole = async () => {
    if (!editUser) return;

    setIsUpdating(true);

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editUser.id,
          action: 'update_role',
          data: { user_type: editData.user_type }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      toast.success('התפקיד עודכן בהצלחה');
      setIsEditOpen(false);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון התפקיד');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setEditData({ user_type: user.user_type });
    setIsEditOpen(true);
  };

  const canModifyUser = (targetUserType: string): boolean => {
    const hierarchy: Record<string, number> = {
      admin: 100,
      manager: 80,
      supervisor: 60,
      agent: 40,
      client: 20,
    };
    const currentLevel = hierarchy[currentUserType] || 0;
    const targetLevel = hierarchy[targetUserType] || 0;
    return currentLevel > targetLevel;
  };

  const getAvailableRoles = (): string[] => {
    const hierarchy: Record<string, number> = {
      admin: 100,
      manager: 80,
      supervisor: 60,
      agent: 40,
      client: 20,
    };
    const currentLevel = hierarchy[currentUserType] || 0;

    return Object.entries(hierarchy)
      .filter(([, level]) => level < currentLevel)
      .map(([role]) => role);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="ניהול משתמשים" />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">משתמשים</h2>
            <p className="text-slate-500">ניהול משתמשים וסטטוס חשבונות</p>
          </div>
          <Button
            variant="outline"
            className="border-slate-200"
            onClick={fetchUsers}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Users Table */}
        {!isLoading && users.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700 text-right">משתמש</TableHead>
                    <TableHead className="text-slate-700 text-right">פרטים</TableHead>
                    <TableHead className="text-slate-700 text-right">תפקיד</TableHead>
                    <TableHead className="text-slate-700 text-right">סטטוס</TableHead>
                    <TableHead className="text-slate-700 text-right w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={`border-slate-200 ${!user.is_active ? 'opacity-50' : ''}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-slate-100 text-blue-600 text-sm">
                              {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-slate-800">
                              {user.full_name || 'ללא שם'}
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                          {user.id === currentUserId && (
                            <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">
                              אתה
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {user.phone && (
                            <div className="flex items-center gap-1 text-slate-600 text-sm">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {user.id_number && (
                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                              <CreditCard className="h-3 w-3" />
                              {user.id_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={userTypeColors[user.user_type]}>
                          {userTypeLabels[user.user_type] || user.user_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={user.is_active
                            ? 'bg-green-50 text-green-600 border-green-200'
                            : 'bg-red-50 text-red-600 border-red-200'}>
                            {user.is_active ? 'פעיל' : 'מושהה'}
                          </Badge>
                          {!user.is_approved && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                              ממתין לאישור
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.id !== currentUserId && canModifyUser(user.user_type) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-500">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-slate-200">
                              <DropdownMenuItem
                                className="text-slate-700 focus:bg-slate-100 cursor-pointer"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4 ml-2" />
                                שנה תפקיד
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={user.is_active
                                  ? "text-amber-600 focus:bg-amber-50 cursor-pointer"
                                  : "text-green-600 focus:bg-green-50 cursor-pointer"}
                                onClick={() => handleSuspendUser(user.id, user.is_active)}
                              >
                                {user.is_active ? (
                                  <>
                                    <UserX className="h-4 w-4 ml-2" />
                                    השהה משתמש
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 ml-2" />
                                    הפעל משתמש
                                  </>
                                )}
                              </DropdownMenuItem>
                              {currentUserType === 'admin' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:bg-red-50 cursor-pointer"
                                    onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                  >
                                    <Trash2 className="h-4 w-4 ml-2" />
                                    מחק משתמש
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && users.length === 0 && !error && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">אין משתמשים</h3>
              <p className="text-slate-500">אשר בקשות הרשמה כדי להוסיף משתמשים למערכת</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Role Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-white border-slate-200" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-slate-800">
                שינוי תפקיד - {editUser?.full_name || editUser?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-700">תפקיד נוכחי</Label>
                <Badge variant="outline" className={userTypeColors[editUser?.user_type || '']}>
                  {userTypeLabels[editUser?.user_type || ''] || editUser?.user_type}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">תפקיד חדש</Label>
                <Select value={editData.user_type} onValueChange={(value) => setEditData({ user_type: value })}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="בחר תפקיד" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {getAvailableRoles().map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        className="text-slate-800 focus:bg-slate-100"
                      >
                        {userTypeLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleUpdateRole}
                disabled={isUpdating || editData.user_type === editUser?.user_type}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    מעדכן...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 ml-2" />
                    עדכן תפקיד
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
