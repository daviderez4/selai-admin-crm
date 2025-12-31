'use client';

import { useState } from 'react';
import { Users, Plus, Shield, Mail, MoreVertical, Trash2, Edit } from 'lucide-react';
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
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { toast } from 'sonner';

// Mock users data - in production, fetch from Supabase
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    role: 'admin',
    projects: ['Production', 'Staging'],
    lastActive: '2024-01-15T10:30:00',
    twoFactorEnabled: true,
  },
  {
    id: '2',
    email: 'developer@example.com',
    role: 'editor',
    projects: ['Production'],
    lastActive: '2024-01-15T09:15:00',
    twoFactorEnabled: false,
  },
  {
    id: '3',
    email: 'viewer@example.com',
    role: 'viewer',
    projects: ['Production', 'Staging', 'Development'],
    lastActive: '2024-01-14T16:45:00',
    twoFactorEnabled: true,
  },
];

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
  const { projects } = useProjectsStore();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'viewer',
    projects: [] as string[],
  });
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteData.email) {
      toast.error('יש להזין אימייל');
      return;
    }

    setIsInviting(true);

    try {
      // In production, send invite via API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('הזמנה נשלחה בהצלחה');
      setIsInviteOpen(false);
      setInviteData({ email: '', role: 'viewer', projects: [] });
    } catch (err) {
      toast.error('שגיאה בשליחת ההזמנה');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (confirm('האם אתה בטוח שברצונך להסיר את המשתמש?')) {
      toast.success('המשתמש הוסר בהצלחה');
    }
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
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={() => setIsInviteOpen(true)}
          >
            <Plus className="h-4 w-4 ml-2" />
            הזמן משתמש
          </Button>
        </div>

        {/* Users Table */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-800/50">
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300 text-right">משתמש</TableHead>
                  <TableHead className="text-slate-300 text-right">תפקיד</TableHead>
                  <TableHead className="text-slate-300 text-right">פרויקטים</TableHead>
                  <TableHead className="text-slate-300 text-right">2FA</TableHead>
                  <TableHead className="text-slate-300 text-right">פעילות אחרונה</TableHead>
                  <TableHead className="text-slate-300 text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.id} className="border-slate-700">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-700 text-emerald-400 text-xs">
                            {user.email.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <span className="text-white">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.projects.map((project) => (
                          <Badge
                            key={project}
                            variant="outline"
                            className="border-slate-600 text-slate-400 text-xs"
                          >
                            {project}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.twoFactorEnabled ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          <Shield className="h-3 w-3 ml-1" />
                          מופעל
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-600 text-slate-500">
                          לא מופעל
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(user.lastActive).toLocaleDateString('he-IL')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem className="text-slate-300 focus:bg-slate-700 cursor-pointer">
                            <Edit className="h-4 w-4 ml-2" />
                            ערוך הרשאות
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:bg-red-500/10 cursor-pointer"
                            onClick={() => handleRemoveUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            הסר משתמש
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
                <Select>
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="בחר פרויקטים" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {projects.map((project) => (
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
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                onClick={handleInvite}
                disabled={isInviting}
              >
                {isInviting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
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
      </div>
    </div>
  );
}
