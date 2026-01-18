/**
 * @feature ADMIN-PERM-001
 * @module Admin
 * @description Admin panel for managing user permissions
 * Allows admins to view and modify permissions for any user
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Users,
  Search,
  Settings,
  Eye,
  EyeOff,
  Edit,
  Save,
  X,
  Loader2,
  Crown,
  Building2,
  UserCog,
  User,
  UserCircle,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface UserWithPermissions {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  user_type: 'admin' | 'manager' | 'supervisor' | 'agent' | 'client';
  supervisor_id: string | null;
  supervisor_name?: string;
  agent_id: string | null;
  agent_name?: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  // Permissions (from user_permissions or null for template default)
  permissions?: UserPermissions | null;
}

interface UserPermissions {
  can_view_all_users: boolean | null;
  can_view_team_users: boolean | null;
  can_manage_users: boolean | null;
  can_approve_registrations: boolean | null;
  can_view_all_contacts: boolean | null;
  can_view_team_contacts: boolean | null;
  can_edit_contacts: boolean | null;
  can_delete_contacts: boolean | null;
  can_view_financial_data: boolean | null;
  can_view_team_financial: boolean | null;
  can_export_financial: boolean | null;
  can_manage_projects: boolean | null;
  can_view_all_projects: boolean | null;
  can_import_data: boolean | null;
  can_export_data: boolean | null;
  can_access_admin_panel: boolean | null;
  can_modify_permissions: boolean | null;
  can_view_audit_logs: boolean | null;
}

interface PermissionTemplate {
  role: string;
  description: string;
  can_view_all_users: boolean;
  can_view_team_users: boolean;
  can_manage_users: boolean;
  can_approve_registrations: boolean;
  can_view_all_contacts: boolean;
  can_view_team_contacts: boolean;
  can_edit_contacts: boolean;
  can_delete_contacts: boolean;
  can_view_financial_data: boolean;
  can_view_team_financial: boolean;
  can_export_financial: boolean;
  can_manage_projects: boolean;
  can_view_all_projects: boolean;
  can_import_data: boolean;
  can_export_data: boolean;
  can_access_admin_panel: boolean;
  can_modify_permissions: boolean;
  can_view_audit_logs: boolean;
}

const ROLE_INFO = {
  admin: { icon: Crown, color: 'text-red-600 bg-red-100', label: 'אדמין', level: 100 },
  manager: { icon: Building2, color: 'text-purple-600 bg-purple-100', label: 'מנהל', level: 80 },
  supervisor: { icon: UserCog, color: 'text-blue-600 bg-blue-100', label: 'מפקח', level: 60 },
  agent: { icon: User, color: 'text-green-600 bg-green-100', label: 'סוכן', level: 40 },
  client: { icon: UserCircle, color: 'text-gray-600 bg-gray-100', label: 'לקוח', level: 20 },
};

const PERMISSION_GROUPS = [
  {
    title: 'צפייה במשתמשים',
    icon: Users,
    permissions: [
      { key: 'can_view_all_users', label: 'צפייה בכל המשתמשים', description: 'גישה לרשימת כל המשתמשים במערכת' },
      { key: 'can_view_team_users', label: 'צפייה בצוות', description: 'גישה לצוות תחת הניהול שלו' },
    ],
  },
  {
    title: 'ניהול משתמשים',
    icon: Settings,
    permissions: [
      { key: 'can_manage_users', label: 'ניהול משתמשים', description: 'יכולת לערוך פרטי משתמשים' },
      { key: 'can_approve_registrations', label: 'אישור הרשמות', description: 'יכולת לאשר בקשות הרשמה' },
    ],
  },
  {
    title: 'אנשי קשר ו-CRM',
    icon: Users,
    permissions: [
      { key: 'can_view_all_contacts', label: 'צפייה בכל אנשי הקשר', description: 'גישה לכל אנשי הקשר במערכת' },
      { key: 'can_view_team_contacts', label: 'צפייה באנשי קשר של הצוות', description: 'גישה לאנשי קשר של הצוות' },
      { key: 'can_edit_contacts', label: 'עריכת אנשי קשר', description: 'יכולת לערוך אנשי קשר' },
      { key: 'can_delete_contacts', label: 'מחיקת אנשי קשר', description: 'יכולת למחוק אנשי קשר' },
    ],
  },
  {
    title: 'נתונים פיננסיים',
    icon: Shield,
    permissions: [
      { key: 'can_view_financial_data', label: 'צפייה בנתונים פיננסיים', description: 'גישה לכל הנתונים הפיננסיים' },
      { key: 'can_view_team_financial', label: 'צפייה בנתוני צוות', description: 'גישה לנתונים פיננסיים של הצוות' },
      { key: 'can_export_financial', label: 'ייצוא נתונים פיננסיים', description: 'יכולת לייצא נתונים פיננסיים' },
    ],
  },
  {
    title: 'פרויקטים',
    icon: Building2,
    permissions: [
      { key: 'can_manage_projects', label: 'ניהול פרויקטים', description: 'יכולת ליצור ולערוך פרויקטים' },
      { key: 'can_view_all_projects', label: 'צפייה בכל הפרויקטים', description: 'גישה לכל הפרויקטים' },
      { key: 'can_import_data', label: 'ייבוא נתונים', description: 'יכולת לייבא קבצים' },
      { key: 'can_export_data', label: 'ייצוא נתונים', description: 'יכולת לייצא נתונים' },
    ],
  },
  {
    title: 'מערכת',
    icon: Shield,
    permissions: [
      { key: 'can_access_admin_panel', label: 'גישה לפאנל ניהול', description: 'גישה לממשק הניהול' },
      { key: 'can_modify_permissions', label: 'שינוי הרשאות', description: 'יכולת לשנות הרשאות משתמשים' },
      { key: 'can_view_audit_logs', label: 'צפייה ביומן פעילות', description: 'גישה ללוג הפעולות' },
    ],
  },
];

export default function AdminPermissionsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<UserPermissions | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    setIsLoading(true);

    try {
      // Check if current user is admin
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('user_type')
        .eq('auth_id', authUser.id)
        .single();

      if (currentUser?.user_type !== 'admin') {
        toast.error('אין לך הרשאות לדף זה');
        router.push('/');
        return;
      }

      // Fetch all users with their permissions
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id, email, full_name, phone, user_type,
          supervisor_id, agent_id, is_active, is_approved, created_at
        `)
        .order('user_type')
        .order('full_name');

      if (usersError) throw usersError;

      // Fetch permission templates
      const { data: templatesData } = await supabase
        .from('permission_templates')
        .select('*');

      // Fetch user permissions overrides
      const { data: permissionsData } = await supabase
        .from('user_permissions')
        .select('*');

      // Build permissions map
      const permissionsMap = new Map();
      permissionsData?.forEach(p => {
        permissionsMap.set(p.user_id, p);
      });

      // Get supervisor and agent names
      const supervisorIds = usersData?.map(u => u.supervisor_id).filter(Boolean) || [];
      const agentIds = usersData?.map(u => u.agent_id).filter(Boolean) || [];
      const allIds = [...new Set([...supervisorIds, ...agentIds])];

      let namesMap = new Map();
      if (allIds.length > 0) {
        const { data: namesData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', allIds);

        namesData?.forEach(n => namesMap.set(n.id, n.full_name));
      }

      // Combine data
      const enrichedUsers: UserWithPermissions[] = (usersData || []).map(u => ({
        ...u,
        supervisor_name: u.supervisor_id ? namesMap.get(u.supervisor_id) : undefined,
        agent_name: u.agent_id ? namesMap.get(u.agent_id) : undefined,
        permissions: permissionsMap.get(u.id) || null,
      }));

      setUsers(enrichedUsers);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditUser = (user: UserWithPermissions) => {
    setSelectedUser(user);
    // Get template defaults for this user's role
    const template = templates.find(t => t.role === user.user_type);

    // Merge template with user overrides
    setEditingPermissions({
      can_view_all_users: user.permissions?.can_view_all_users ?? null,
      can_view_team_users: user.permissions?.can_view_team_users ?? null,
      can_manage_users: user.permissions?.can_manage_users ?? null,
      can_approve_registrations: user.permissions?.can_approve_registrations ?? null,
      can_view_all_contacts: user.permissions?.can_view_all_contacts ?? null,
      can_view_team_contacts: user.permissions?.can_view_team_contacts ?? null,
      can_edit_contacts: user.permissions?.can_edit_contacts ?? null,
      can_delete_contacts: user.permissions?.can_delete_contacts ?? null,
      can_view_financial_data: user.permissions?.can_view_financial_data ?? null,
      can_view_team_financial: user.permissions?.can_view_team_financial ?? null,
      can_export_financial: user.permissions?.can_export_financial ?? null,
      can_manage_projects: user.permissions?.can_manage_projects ?? null,
      can_view_all_projects: user.permissions?.can_view_all_projects ?? null,
      can_import_data: user.permissions?.can_import_data ?? null,
      can_export_data: user.permissions?.can_export_data ?? null,
      can_access_admin_panel: user.permissions?.can_access_admin_panel ?? null,
      can_modify_permissions: user.permissions?.can_modify_permissions ?? null,
      can_view_audit_logs: user.permissions?.can_view_audit_logs ?? null,
    });
    setDialogOpen(true);
  };

  const getEffectiveValue = (key: string): boolean => {
    if (!selectedUser) return false;
    const template = templates.find(t => t.role === selectedUser.user_type);
    const override = editingPermissions?.[key as keyof UserPermissions];
    if (override !== null && override !== undefined) {
      return override;
    }
    return template?.[key as keyof PermissionTemplate] as boolean || false;
  };

  const handlePermissionChange = (key: string, value: boolean | null) => {
    if (!editingPermissions) return;
    setEditingPermissions({
      ...editingPermissions,
      [key]: value,
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || !editingPermissions) return;

    const supabase = createClient();
    setIsSaving(true);

    try {
      // Upsert user permissions
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: selectedUser.id,
          ...editingPermissions,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast.success('ההרשאות נשמרו בהצלחה');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('שגיאה בשמירת ההרשאות');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('users')
        .update({ user_type: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      toast.success('התפקיד עודכן בהצלחה');
      fetchData();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('שגיאה בעדכון התפקיד');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.user_type === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="ניהול הרשאות" />
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="ניהול הרשאות" />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              פאנל ניהול הרשאות
            </h1>
            <p className="text-muted-foreground">
              צפה ונהל הרשאות לכל המשתמשים במערכת
            </p>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(ROLE_INFO).map(([role, info]) => {
            const count = users.filter(u => u.user_type === role).length;
            const Icon = info.icon;
            return (
              <Card key={role} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setRoleFilter(role)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${info.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{info.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
              <SelectValue placeholder="כל התפקידים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התפקידים</SelectItem>
              {Object.entries(ROLE_INFO).map(([role, info]) => (
                <SelectItem key={role} value={role}>{info.label}</SelectItem>
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
                  <TableHead>ממונה</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>הרשאות מותאמות</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const roleInfo = ROLE_INFO[user.user_type];
                  const RoleIcon = roleInfo?.icon || User;
                  const hasCustomPermissions = user.permissions !== null;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={roleInfo?.color || 'bg-gray-100'}>
                              {user.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.user_type}
                          onValueChange={(value) => handleChangeRole(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <div className="flex items-center gap-2">
                              <RoleIcon className={`h-4 w-4 ${roleInfo?.color.split(' ')[0]}`} />
                              <span>{roleInfo?.label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_INFO).map(([role, info]) => {
                              const Icon = info.icon;
                              return (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${info.color.split(' ')[0]}`} />
                                    <span>{info.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.supervisor_name && (
                          <span className="text-sm">{user.supervisor_name}</span>
                        )}
                        {user.agent_name && (
                          <span className="text-sm">{user.agent_name}</span>
                        )}
                        {!user.supervisor_name && !user.agent_name && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_active ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              פעיל
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              לא פעיל
                            </Badge>
                          )}
                          {user.is_approved && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasCustomPermissions ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <Settings className="h-3 w-3 ml-1" />
                            מותאם
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">ברירת מחדל</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4 ml-1" />
                          ערוך
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Permissions Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={ROLE_INFO[selectedUser?.user_type || 'agent']?.color}>
                  {selectedUser?.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedUser?.full_name}</span>
                <Badge variant="outline" className="mr-2">
                  {ROLE_INFO[selectedUser?.user_type || 'agent']?.label}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              עריכת הרשאות - ערכים ריקים ישתמשו בברירת המחדל של התפקיד
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {PERMISSION_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.title} className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <GroupIcon className="h-4 w-4 text-muted-foreground" />
                    {group.title}
                  </h3>
                  <div className="space-y-2 pr-6">
                    {group.permissions.map((perm) => {
                      const key = perm.key as keyof UserPermissions;
                      const template = templates.find(t => t.role === selectedUser?.user_type);
                      const templateValue = template?.[key as keyof PermissionTemplate] as boolean;
                      const currentValue = editingPermissions?.[key];
                      const effectiveValue = currentValue !== null ? currentValue : templateValue;

                      return (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{perm.label}</p>
                            <p className="text-xs text-muted-foreground">{perm.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Template default indicator */}
                            <div className="text-xs text-muted-foreground">
                              ברירת מחדל:
                              {templateValue ? (
                                <Check className="inline h-3 w-3 mr-1 text-green-600" />
                              ) : (
                                <X className="inline h-3 w-3 mr-1 text-red-600" />
                              )}
                            </div>
                            {/* Override toggle */}
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={effectiveValue || false}
                                onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                              />
                              {currentValue !== null && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handlePermissionChange(key, null)}
                                  title="אפס לברירת מחדל"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  שמור הרשאות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
