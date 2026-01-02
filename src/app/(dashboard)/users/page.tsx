'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Shield, Mail, MoreVertical, Trash2, Edit, Loader2, RefreshCw } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface UserProject {
  id: string;
  name: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  projects: UserProject[];
  created_at?: string;
}

interface ManagedProject {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  admin: 'מנהל',
  editor: 'עורך',
  viewer: 'צופה',
};

const roleColors: Record<string, string> = {
  admin: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  editor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [managedProjects, setManagedProjects] = useState<ManagedProject[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'viewer',
    projectIds: [] as string[],
  });
  const [isInviting, setIsInviting] = useState(false);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRole, setEditRole] = useState('viewer');
  const [editProjectId, setEditProjectId] = useState('');

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
      setManagedProjects(data.managedProjects || []);
      setCurrentUserId(data.currentUserId || '');
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

  const handleInvite = async () => {
    if (!inviteData.email) {
      toast.error('יש להזין אימייל');
      return;
    }

    if (inviteData.projectIds.length === 0) {
      toast.error('יש לבחור לפחות פרויקט אחד');
      return;
    }

    setIsInviting(true);

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
          projectIds: inviteData.projectIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      toast.success(data.message || 'הזמנה נשלחה בהצלחה');
      setIsInviteOpen(false);
      setInviteData({ email: '', role: 'viewer', projectIds: [] });
      fetchUsers(); // Refresh list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בשליחת ההזמנה');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateAccess = async () => {
    if (!editUser || !editProjectId) return;

    try {
      const response = await fetch(`/api/users/${editUser.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: editProjectId,
          role: editRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update access');
      }

      toast.success('ההרשאות עודכנו בהצלחה');
      setIsEditOpen(false);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון ההרשאות');
    }
  };

  const handleRemoveAccess = async (userId: string, projectId: string, projectName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך להסיר את הגישה לפרויקט "${projectName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/access?projectId=${projectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove access');
      }

      toast.success('הגישה הוסרה בהצלחה');
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהסרת הגישה');
    }
  };

  const openEditDialog = (user: User) => {
    setEditUser(user);
    if (user.projects.length > 0) {
      setEditProjectId(user.projects[0].id);
      setEditRole(user.projects[0].role);
    }
    setIsEditOpen(true);
  };

  const toggleProjectSelection = (projectId: string) => {
    setInviteData(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }));
  };

  // Get highest role for a user across all projects
  const getUserHighestRole = (user: User): string => {
    const roleOrder = { admin: 3, editor: 2, viewer: 1 };
    let highest = 'viewer';
    user.projects.forEach(p => {
      if (roleOrder[p.role as keyof typeof roleOrder] > roleOrder[highest as keyof typeof roleOrder]) {
        highest = p.role;
      }
    });
    return highest;
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="ניהול משתמשים" />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">משתמשים</h2>
            <p className="text-slate-400">נהל גישה למשתמשים בפרויקטים שלך</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-slate-600"
              onClick={fetchUsers}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
              רענן
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => setIsInviteOpen(true)}
            >
              <Plus className="h-4 w-4 ml-2" />
              הזמן משתמש
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Users Table */}
        {!isLoading && users.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-800/50">
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-300 text-right">משתמש</TableHead>
                    <TableHead className="text-slate-300 text-right">תפקיד</TableHead>
                    <TableHead className="text-slate-300 text-right">פרויקטים</TableHead>
                    <TableHead className="text-slate-300 text-right w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-700 text-emerald-400 text-xs">
                              {user.email.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-500" />
                              <span className="text-white">{user.email}</span>
                            </div>
                            {user.full_name && (
                              <span className="text-slate-400 text-sm">{user.full_name}</span>
                            )}
                          </div>
                          {user.id === currentUserId && (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-xs">
                              אתה
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[getUserHighestRole(user)]}>
                          {roleLabels[getUserHighestRole(user)]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.projects.map((project) => (
                            <Badge
                              key={project.id}
                              variant="outline"
                              className="border-slate-600 text-slate-400 text-xs"
                              title={`${project.name} - ${roleLabels[project.role]}`}
                            >
                              {project.name}
                              <span className="mr-1 text-slate-500">({roleLabels[project.role]})</span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.id !== currentUserId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem
                                className="text-slate-300 focus:bg-slate-700 cursor-pointer"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4 ml-2" />
                                ערוך הרשאות
                              </DropdownMenuItem>
                              {user.projects.map(project => (
                                <DropdownMenuItem
                                  key={project.id}
                                  className="text-red-400 focus:bg-red-500/10 cursor-pointer"
                                  onClick={() => handleRemoveAccess(user.id, project.id, project.name)}
                                >
                                  <Trash2 className="h-4 w-4 ml-2" />
                                  הסר מ-{project.name}
                                </DropdownMenuItem>
                              ))}
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
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">אין משתמשים</h3>
              <p className="text-slate-400 mb-4">הזמן משתמשים לפרויקטים שלך</p>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => setIsInviteOpen(true)}
              >
                <Plus className="h-4 w-4 ml-2" />
                הזמן משתמש
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Invite Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="bg-slate-900 border-slate-700" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-white">הזמנת משתמש חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">אימייל</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, email: e.target.value })
                  }
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">תפקיד</Label>
                <Select
                  value={inviteData.role}
                  onValueChange={(value) =>
                    setInviteData({ ...inviteData, role: value })
                  }
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="admin" className="text-white focus:bg-slate-700">
                      מנהל - גישה מלאה
                    </SelectItem>
                    <SelectItem value="editor" className="text-white focus:bg-slate-700">
                      עורך - קריאה ועריכה
                    </SelectItem>
                    <SelectItem value="viewer" className="text-white focus:bg-slate-700">
                      צופה - קריאה בלבד
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">פרויקטים</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-700">
                  {managedProjects.length === 0 ? (
                    <p className="text-slate-500 text-sm">אין פרויקטים זמינים</p>
                  ) : (
                    managedProjects.map((project) => (
                      <div key={project.id} className="flex items-center gap-2">
                        <Checkbox
                          id={project.id}
                          checked={inviteData.projectIds.includes(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                        />
                        <label
                          htmlFor={project.id}
                          className="text-white text-sm cursor-pointer"
                        >
                          {project.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {inviteData.projectIds.length > 0 && (
                  <p className="text-slate-400 text-xs">
                    נבחרו {inviteData.projectIds.length} פרויקטים
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                onClick={handleInvite}
                disabled={isInviting}
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    שולח...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 ml-2" />
                    שלח הזמנה
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-slate-900 border-slate-700" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-white">
                עריכת הרשאות - {editUser?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">פרויקט</Label>
                <Select value={editProjectId} onValueChange={setEditProjectId}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="בחר פרויקט" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {managedProjects.map((project) => (
                      <SelectItem
                        key={project.id}
                        value={project.id}
                        className="text-white focus:bg-slate-700"
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">תפקיד</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="admin" className="text-white focus:bg-slate-700">
                      מנהל - גישה מלאה
                    </SelectItem>
                    <SelectItem value="editor" className="text-white focus:bg-slate-700">
                      עורך - קריאה ועריכה
                    </SelectItem>
                    <SelectItem value="viewer" className="text-white focus:bg-slate-700">
                      צופה - קריאה בלבד
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                onClick={handleUpdateAccess}
              >
                <Shield className="h-4 w-4 ml-2" />
                עדכן הרשאות
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
