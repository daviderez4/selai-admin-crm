'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Building,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface RegistrationRequest {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  id_number?: string;
  national_id?: string;
  license_number?: string;
  requested_role: string;
  company_name?: string;
  notes?: string;
  status: 'pending' | 'needs_review' | 'approved' | 'rejected';
  admin_notes?: string;
  match_score?: number;
  sela_match_found?: boolean;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  needs_review: { label: 'דורש בדיקה', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  approved: { label: 'אושר', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'נדחה', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const roleLabels: Record<string, string> = {
  agent: 'סוכן',
  supervisor: 'מפקח',
  manager: 'מנהל',
  admin: 'אדמין',
  client: 'לקוח',
};

export default function AdminRegistrationsContent() {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      let query = supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('שגיאה בטעינת בקשות הרשמה');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const filteredRegistrations = registrations.filter((reg) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reg.full_name?.toLowerCase().includes(search) ||
      reg.email?.toLowerCase().includes(search) ||
      reg.phone?.includes(search)
    );
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const supabase = createClient();

      // Update registration status
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Create user in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          email: selectedRequest.email,
          full_name: selectedRequest.full_name,
          phone: selectedRequest.phone,
          user_type: assignedRole || selectedRequest.requested_role,
          is_active: true,
          is_approved: true,
          approved_at: new Date().toISOString(),
        });

      if (userError) {
        console.error('Error creating user:', userError);
        // Don't fail the whole operation if user creation fails
        toast.warning('בקשה אושרה אך יצירת המשתמש נכשלה - יש ליצור ידנית');
      } else {
        toast.success(`${selectedRequest.full_name} אושר בהצלחה!`);
      }

      setShowApproveDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
      setAssignedRole('');
      fetchRegistrations();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('שגיאה באישור הבקשה');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('registration_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('הבקשה נדחתה');
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRegistrations();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('שגיאה בדחיית הבקשה');
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: registrations.length,
    pending: registrations.filter((r) => r.status === 'pending').length,
    needsReview: registrations.filter((r) => r.status === 'needs_review').length,
    approved: registrations.filter((r) => r.status === 'approved').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">סה"כ</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <UserPlus className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">ממתינים</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">דורשים בדיקה</p>
                <p className="text-2xl font-bold text-orange-700">{stats.needsReview}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">אושרו</p>
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">נדחו</p>
                <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">בקשות הרשמה</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchRegistrations}>
              <RefreshCw className="h-4 w-4 ml-2" />
              רענן
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, אימייל או טלפון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="pending">ממתינים</SelectItem>
                <SelectItem value="needs_review">דורשים בדיקה</SelectItem>
                <SelectItem value="approved">אושרו</SelectItem>
                <SelectItem value="rejected">נדחו</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <UserPlus className="h-12 w-12 mb-2 opacity-50" />
              <p>אין בקשות הרשמה</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם מלא</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>טלפון</TableHead>
                  <TableHead>תפקיד מבוקש</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((reg) => {
                  const StatusIcon = statusConfig[reg.status].icon;
                  return (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.full_name}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell dir="ltr">{reg.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabels[reg.requested_role] || reg.requested_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[reg.status].color}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {statusConfig[reg.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {format(new Date(reg.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </TableCell>
                      <TableCell>
                        {reg.status === 'pending' || reg.status === 'needs_review' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedRequest(reg);
                                setAssignedRole(reg.requested_role);
                                setShowApproveDialog(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 ml-1" />
                              אשר
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedRequest(reg);
                                setShowRejectDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 ml-1" />
                              דחה
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">טופל</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>אישור בקשת הרשמה</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="font-medium">{selectedRequest.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span>{selectedRequest.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span dir="ltr">{selectedRequest.phone}</span>
                </div>
                {selectedRequest.company_name && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-500" />
                    <span>{selectedRequest.company_name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">תפקיד שיוקצה</label>
                <Select value={assignedRole} onValueChange={setAssignedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תפקיד" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">סוכן</SelectItem>
                    <SelectItem value="supervisor">מפקח</SelectItem>
                    <SelectItem value="manager">מנהל</SelectItem>
                    <SelectItem value="admin">אדמין</SelectItem>
                    <SelectItem value="client">לקוח</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">הערות (אופציונלי)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="הערות לרישום..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'מאשר...' : 'אשר הרשמה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>דחיית בקשת הרשמה</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="text-slate-600">
                האם אתה בטוח שברצונך לדחות את בקשת ההרשמה של{' '}
                <span className="font-medium">{selectedRequest.full_name}</span>?
              </p>

              <div>
                <label className="text-sm font-medium mb-2 block">סיבת הדחייה</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="נא לציין את סיבת הדחייה..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing}
              variant="destructive"
            >
              {processing ? 'דוחה...' : 'דחה בקשה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
