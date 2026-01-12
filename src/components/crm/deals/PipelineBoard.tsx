'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Deal, DealStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreVertical,
  Loader2,
  GripVertical,
  TrendingUp,
  Banknote,
} from 'lucide-react';

const statusConfig: Record<
  DealStatus,
  { label: string; color: string; bgColor: string; probability: number }
> = {
  discovery: {
    label: 'גילוי',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    probability: 10,
  },
  proposal: {
    label: 'הצעה',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    probability: 30,
  },
  negotiation: {
    label: 'משא ומתן',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    probability: 60,
  },
  contract_sent: {
    label: 'חוזה נשלח',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    probability: 80,
  },
  won: {
    label: 'נסגר',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    probability: 100,
  },
  lost: {
    label: 'אבוד',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    probability: 0,
  },
};

// Active pipeline stages (not won/lost)
const pipelineStatuses: DealStatus[] = [
  'discovery',
  'proposal',
  'negotiation',
  'contract_sent',
];

export function PipelineBoard() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    dealsByStatus,
    dealsTotal,
    isLoadingDeals,
    fetchDealsByStatus,
    updateDeal,
  } = useCRMStore();

  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    fetchDealsByStatus();
  }, [fetchDealsByStatus]);

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: DealStatus) => {
    if (draggedDeal && draggedDeal.status !== status) {
      await updateDeal(draggedDeal.id, { status });
      await fetchDealsByStatus();
    }
    setDraggedDeal(null);
  };

  if (isLoadingDeals && !dealsByStatus) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate weighted pipeline value
  const weightedValue = pipelineStatuses.reduce((acc, status) => {
    const deals = dealsByStatus?.[status] || [];
    const statusProbability = statusConfig[status].probability / 100;
    return (
      acc +
      deals.reduce((sum, deal) => sum + deal.amount * statusProbability, 0)
    );
  }, 0);

  // Calculate pipeline stats from dealsByStatus
  const totalDeals = Object.values(dealsByStatus || {}).reduce((sum, deals) => sum + (deals?.length || 0), 0);
  const totalValue = Object.values(dealsByStatus || {}).reduce(
    (sum, deals) => sum + (deals?.reduce((s, d) => s + d.amount, 0) || 0), 0
  );
  const wonValue = (dealsByStatus?.won || []).reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">עסקאות</h2>
        <Button onClick={() => router.push(`/projects/${projectId}/crm/deals/new`)}>
          <Plus className="h-4 w-4 ml-2" />
          עסקה חדשה
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {totalDeals}
                </div>
                <div className="text-sm text-gray-500">סה״כ עסקאות</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ₪{totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">ערך כולל</div>
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
                  ₪{weightedValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">ערך משוקלל</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ₪{wonValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">עסקאות סגורות</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineStatuses.map((status) => {
          const config = statusConfig[status];
          const deals = dealsByStatus?.[status] || [];
          const stageValue = deals.reduce((sum, d) => sum + d.amount, 0);

          return (
            <div
              key={status}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status)}
            >
              <Card className={`${config.bgColor} border-none`}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium ${config.color}`}>
                    <div className="flex items-center justify-between">
                      <span>
                        {config.label}
                        <Badge variant="secondary" className="mr-2">
                          {deals.length}
                        </Badge>
                      </span>
                      <span className="text-xs opacity-70">
                        {config.probability}%
                      </span>
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      ₪{stageValue.toLocaleString()}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 min-h-[400px]">
                  {deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      projectId={projectId}
                      onDragStart={() => handleDragStart(deal)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Won/Lost Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              <div className="flex items-center justify-between">
                <span>
                  עסקאות שנסגרו
                  <Badge className="mr-2 bg-green-100 text-green-700">
                    {dealsByStatus?.won?.length || 0}
                  </Badge>
                </span>
                <span>
                  ₪
                  {(
                    dealsByStatus?.won?.reduce((sum, d) => sum + d.amount, 0) || 0
                  ).toLocaleString()}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(dealsByStatus?.won || []).slice(0, 5).map((deal) => (
                <Badge key={deal.id} variant="secondary" className="text-xs">
                  {deal.title} - ₪{deal.amount.toLocaleString()}
                </Badge>
              ))}
              {(dealsByStatus?.won?.length || 0) > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{(dealsByStatus?.won?.length || 0) - 5} נוספות
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              <div className="flex items-center justify-between">
                <span>
                  עסקאות שאבדו
                  <Badge className="mr-2 bg-red-100 text-red-700">
                    {dealsByStatus?.lost?.length || 0}
                  </Badge>
                </span>
                <span>
                  ₪
                  {(
                    dealsByStatus?.lost?.reduce((sum, d) => sum + d.amount, 0) || 0
                  ).toLocaleString()}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(dealsByStatus?.lost || []).slice(0, 5).map((deal) => (
                <Badge key={deal.id} variant="secondary" className="text-xs">
                  {deal.title}
                </Badge>
              ))}
              {(dealsByStatus?.lost?.length || 0) > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{(dealsByStatus?.lost?.length || 0) - 5} נוספות
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DealCard({
  deal,
  projectId,
  onDragStart,
}: {
  deal: Deal;
  projectId: string;
  onDragStart: () => void;
}) {
  const router = useRouter();
  const { deleteDeal } = useCRMStore();

  const handleDelete = async () => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את העסקה ${deal.title}?`)) {
      await deleteDeal(deal.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white rounded-lg p-3 shadow-sm border cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/projects/${projectId}/crm/deals/${deal.id}`)}
          >
            <div className="font-medium text-sm">{deal.title}</div>
            {deal.contact && (
              <div className="text-xs text-gray-500">
                {(deal.contact as { full_name?: string })?.full_name}
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => router.push(`/projects/${projectId}/crm/deals/${deal.id}`)}
            >
              צפייה
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/projects/${projectId}/crm/deals/${deal.id}/edit`)
              }
            >
              עריכה
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
              מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2">
        <div className="text-lg font-bold text-primary">
          ₪{deal.amount.toLocaleString()}
        </div>
        {deal.product_type && (
          <Badge variant="outline" className="text-xs mt-1">
            {deal.product_type}
          </Badge>
        )}
      </div>

      {deal.insurance_company_name && (
        <div className="mt-2 text-xs text-gray-500">
          {deal.insurance_company_name}
        </div>
      )}

      {deal.expected_close_date && (
        <div className="mt-2 text-xs text-gray-500">
          תאריך סגירה צפוי:{' '}
          {new Date(deal.expected_close_date).toLocaleDateString('he-IL')}
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">סיכוי סגירה</span>
          <span className="font-medium">{deal.probability}%</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${deal.probability}%` }}
          />
        </div>
      </div>
    </div>
  );
}
