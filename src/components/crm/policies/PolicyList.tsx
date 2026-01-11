'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Policy, PolicyStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  MoreVertical,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Filter,
  Building2,
  User,
  DollarSign,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

const statusConfig: Record<PolicyStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'פעילה', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  pending: { label: 'ממתינה', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  expired: { label: 'פגה', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'בוטלה', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  renewed: { label: 'חודשה', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
};

const productTypes = [
  'ביטוח חיים',
  'ביטוח בריאות',
  'ביטוח רכב',
  'ביטוח דירה',
  'ביטוח עסק',
  'פנסיה',
  'גמל',
  'השתלמות',
  'אחר',
];

export function PolicyList() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    policies,
    policiesTotal,
    isLoadingPolicies,
    fetchPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
  } = useCRMStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    policy_number: '',
    product_type: '',
    insurance_company: '',
    premium_monthly: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleCreatePolicy = async () => {
    if (!newPolicy.policy_number || !newPolicy.product_type) return;

    await createPolicy({
      contact_id: '', // Will be set when creating from contact context
      policy_number: newPolicy.policy_number,
      policy_type: newPolicy.product_type,
      category: 'life', // Default category
      insurance_company_name: newPolicy.insurance_company || undefined,
      premium_monthly: newPolicy.premium_monthly ? parseFloat(newPolicy.premium_monthly) : undefined,
      start_date: newPolicy.start_date || new Date().toISOString(),
      end_date: newPolicy.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    });

    setNewPolicy({
      policy_number: '',
      product_type: '',
      insurance_company: '',
      premium_monthly: '',
      start_date: '',
      end_date: '',
    });
    setIsCreateDialogOpen(false);
    fetchPolicies();
  };

  const handleDelete = async (policy: Policy) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הפוליסה ${policy.policy_number}?`)) {
      await deletePolicy(policy.id);
      fetchPolicies();
    }
  };

  const filteredPolicies = policies.filter((policy) => {
    if (
      search &&
      !policy.policy_number?.toLowerCase().includes(search.toLowerCase()) &&
      !policy.policy_type?.toLowerCase().includes(search.toLowerCase()) &&
      !policy.insurance_company_name?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (statusFilter !== 'all' && policy.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const isExpiringsSoon = (policy: Policy) => {
    if (!policy.end_date || policy.status !== 'active') return false;
    const endDate = new Date(policy.end_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `₪${amount.toLocaleString()}`;
  };

  // Calculate stats
  const totalPremium = policies
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + (p.premium_monthly || 0), 0);

  const expiringCount = policies.filter(isExpiringsSoon).length;

  if (isLoadingPolicies && policies.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">פוליסות</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              פוליסה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>הוספת פוליסה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>מספר פוליסה *</Label>
                <Input
                  value={newPolicy.policy_number}
                  onChange={(e) => setNewPolicy({ ...newPolicy, policy_number: e.target.value })}
                  placeholder="מספר הפוליסה"
                />
              </div>
              <div>
                <Label>סוג מוצר *</Label>
                <Select
                  value={newPolicy.product_type}
                  onValueChange={(value) => setNewPolicy({ ...newPolicy, product_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג מוצר" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>חברת ביטוח</Label>
                <Input
                  value={newPolicy.insurance_company}
                  onChange={(e) =>
                    setNewPolicy({ ...newPolicy, insurance_company: e.target.value })
                  }
                  placeholder="שם החברה"
                />
              </div>
              <div>
                <Label>פרמיה חודשית (₪)</Label>
                <Input
                  type="number"
                  value={newPolicy.premium_monthly}
                  onChange={(e) =>
                    setNewPolicy({ ...newPolicy, premium_monthly: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך התחלה</Label>
                  <Input
                    type="date"
                    value={newPolicy.start_date}
                    onChange={(e) => setNewPolicy({ ...newPolicy, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>תאריך סיום</Label>
                  <Input
                    type="date"
                    value={newPolicy.end_date}
                    onChange={(e) => setNewPolicy({ ...newPolicy, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ביטול
                </Button>
                <Button
                  onClick={handleCreatePolicy}
                  disabled={!newPolicy.policy_number || !newPolicy.product_type}
                >
                  יצירה
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{policies.length}</div>
                <div className="text-sm text-gray-500">סה״כ פוליסות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {policies.filter((p) => p.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">פעילות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalPremium)}</div>
                <div className="text-sm text-gray-500">פרמיה חודשית</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={expiringCount > 0 ? 'border-orange-300 bg-orange-50/50' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{expiringCount}</div>
                <div className="text-sm text-gray-500">לחידוש בקרוב</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי מספר פוליסה, מוצר, חברה..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as PolicyStatus | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Policies Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">מספר פוליסה</TableHead>
              <TableHead className="text-right">מוצר</TableHead>
              <TableHead className="text-right">חברה</TableHead>
              <TableHead className="text-right">פרמיה</TableHead>
              <TableHead className="text-right">תוקף</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPolicies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  לא נמצאו פוליסות
                </TableCell>
              </TableRow>
            ) : (
              filteredPolicies.map((policy) => {
                const StatusIcon = statusConfig[policy.status].icon;
                const expiringSoon = isExpiringsSoon(policy);
                return (
                  <TableRow
                    key={policy.id}
                    className={`hover:bg-gray-50 ${expiringSoon ? 'bg-orange-50/50' : ''}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {policy.policy_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{policy.policy_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {policy.insurance_company_name ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          {policy.insurance_company_name}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(policy.premium_monthly)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(policy.start_date)}</div>
                        <div className="text-gray-500">עד {formatDate(policy.end_date)}</div>
                      </div>
                      {expiringSoon && (
                        <div className="flex items-center gap-1 text-orange-600 text-xs mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          פג בקרוב
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[policy.status].color}>
                        <StatusIcon className="h-3 w-3 ml-1" />
                        {statusConfig[policy.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>צפייה</DropdownMenuItem>
                          <DropdownMenuItem>עריכה</DropdownMenuItem>
                          {policy.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => updatePolicy(policy.id, { status: 'renewed' })}
                            >
                              <RefreshCw className="h-4 w-4 ml-2" />
                              סמן כחודש
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(policy)}
                          >
                            מחיקה
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
