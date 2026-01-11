'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Campaign, CampaignStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  MoreVertical,
  Users,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  MessageSquare,
  Mail,
  Phone,
  Target,
  TrendingUp,
  Eye,
  Play,
  Pause,
} from 'lucide-react';

const statusConfig: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-700', icon: Clock },
  scheduled: { label: 'מתוזמן', color: 'bg-blue-100 text-blue-700', icon: Clock },
  active: { label: 'פעיל', color: 'bg-green-100 text-green-700', icon: Play },
  paused: { label: 'מושהה', color: 'bg-yellow-100 text-yellow-700', icon: Pause },
  completed: { label: 'הושלם', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const campaignTypes = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'sms', label: 'SMS', icon: Phone },
  { value: 'email', label: 'אימייל', icon: Mail },
];

export function CampaignList() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    campaigns,
    campaignsTotal,
    isLoadingCampaigns,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  } = useCRMStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'whatsapp' as string,
    scheduled_at: '',
  });

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) return;

    await createCampaign({
      name: newCampaign.name,
      description: newCampaign.description || undefined,
      campaign_type: newCampaign.campaign_type as Campaign['campaign_type'],
      status: 'draft',
      scheduled_at: newCampaign.scheduled_at
        ? new Date(newCampaign.scheduled_at).toISOString()
        : undefined,
    });

    setNewCampaign({
      name: '',
      description: '',
      campaign_type: 'whatsapp',
      scheduled_at: '',
    });
    setIsCreateDialogOpen(false);
    fetchCampaigns();
  };

  const handleDelete = async (campaign: Campaign) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הקמפיין "${campaign.name}"?`)) {
      await deleteCampaign(campaign.id);
      fetchCampaigns();
    }
  };

  const handleStatusChange = async (campaign: Campaign, newStatus: CampaignStatus) => {
    await updateCampaign(campaign.id, { status: newStatus });
    fetchCampaigns();
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (search && !campaign.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && campaign.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getDeliveryRate = (campaign: Campaign) => {
    if (!campaign.total_recipients || campaign.total_recipients === 0) return 0;
    return Math.round(((campaign.delivered_count || 0) / campaign.total_recipients) * 100);
  };

  const getOpenRate = (campaign: Campaign) => {
    if (!campaign.delivered_count || campaign.delivered_count === 0) return 0;
    return Math.round(((campaign.read_count || 0) / campaign.delivered_count) * 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoadingCampaigns && campaigns.length === 0) {
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
        <h2 className="text-2xl font-bold">קמפיינים</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              קמפיין חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>יצירת קמפיין חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>שם הקמפיין *</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="שם הקמפיין"
                />
              </div>
              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="תיאור הקמפיין..."
                  rows={3}
                />
              </div>
              <div>
                <Label>סוג קמפיין</Label>
                <Select
                  value={newCampaign.campaign_type}
                  onValueChange={(value) =>
                    setNewCampaign({ ...newCampaign, campaign_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תזמון (אופציונלי)</Label>
                <Input
                  type="datetime-local"
                  value={newCampaign.scheduled_at}
                  onChange={(e) => setNewCampaign({ ...newCampaign, scheduled_at: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleCreateCampaign} disabled={!newCampaign.name}>
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
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <div className="text-sm text-gray-500">סה״כ קמפיינים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">פעילים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + (c.total_recipients || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">נמענים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0
                    ? Math.round(
                        campaigns.reduce((sum, c) => sum + getOpenRate(c), 0) / campaigns.length
                      )
                    : 0}
                  %
                </div>
                <div className="text-sm text-gray-500">שיעור פתיחה ממוצע</div>
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
            placeholder="חיפוש קמפיינים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as CampaignStatus | 'all')}
        >
          <SelectTrigger className="w-[150px]">
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

      {/* Campaign List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>אין קמפיינים להצגה</p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => {
            const StatusIcon = statusConfig[campaign.status].icon;
            const TypeIcon =
              campaignTypes.find((t) => t.value === campaign.campaign_type)?.icon || MessageSquare;
            return (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{campaign.name}</CardTitle>
                        <Badge className={`text-xs ${statusConfig[campaign.status].color}`}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {statusConfig[campaign.status].label}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 ml-2" />
                          צפייה
                        </DropdownMenuItem>
                        {campaign.status === 'draft' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(campaign, 'active')}
                          >
                            <Play className="h-4 w-4 ml-2" />
                            הפעלה
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(campaign, 'paused')}
                          >
                            <Pause className="h-4 w-4 ml-2" />
                            השהייה
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'paused' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(campaign, 'active')}
                          >
                            <Play className="h-4 w-4 ml-2" />
                            המשך
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(campaign)}
                        >
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    {/* Recipients */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        נמענים
                      </span>
                      <span className="font-medium">
                        {(campaign.total_recipients || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Delivery Progress */}
                    {campaign.total_recipients && campaign.total_recipients > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500">שיעור מסירה</span>
                          <span className="font-medium">{getDeliveryRate(campaign)}%</span>
                        </div>
                        <Progress value={getDeliveryRate(campaign)} className="h-2" />
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {(campaign.sent_count || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">נשלחו</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {(campaign.delivered_count || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">נמסרו</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {(campaign.read_count || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">נפתחו</div>
                      </div>
                    </div>

                    {/* Dates */}
                    {campaign.scheduled_at && (
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        <Clock className="h-3 w-3 inline ml-1" />
                        מתוזמן: {formatDate(campaign.scheduled_at)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
