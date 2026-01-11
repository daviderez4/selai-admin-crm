'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Lead, LeadStatus, Priority } from '@/types/crm';
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
  Phone,
  Mail,
  User,
  Loader2,
  GripVertical,
} from 'lucide-react';

const statusConfig: Record<
  LeadStatus,
  { label: string; color: string; bgColor: string }
> = {
  new: { label: 'חדש', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  assigned: { label: 'הוקצה', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  contacted: { label: 'נוצר קשר', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  qualified: { label: 'מוסמך', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  proposal: { label: 'הצעה', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  negotiation: { label: 'משא ומתן', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  converted: { label: 'הומר', color: 'text-green-700', bgColor: 'bg-green-50' },
  lost: { label: 'אבוד', color: 'text-red-700', bgColor: 'bg-red-50' },
  archived: { label: 'בארכיון', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

const priorityColors: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const priorityLabels: Record<Priority, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  critical: 'קריטית',
};

// Only show active statuses in kanban (not archived)
const kanbanStatuses: LeadStatus[] = [
  'new',
  'assigned',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
];

export function LeadBoard() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { leadsByStatus, isLoadingLeads, fetchLeadsByStatus, updateLead } = useCRMStore();
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeadsByStatus();
  }, [fetchLeadsByStatus]);

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: LeadStatus) => {
    if (draggedLead && draggedLead.status !== status) {
      await updateLead(draggedLead.id, { status });
      await fetchLeadsByStatus();
    }
    setDraggedLead(null);
  };

  if (isLoadingLeads && !leadsByStatus) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">לידים</h2>
        <Button onClick={() => router.push(`/projects/${projectId}/crm/leads/new`)}>
          <Plus className="h-4 w-4 ml-2" />
          ליד חדש
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanStatuses.map((status) => {
          const config = statusConfig[status];
          const leads = leadsByStatus?.[status] || [];

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
                    {config.label}
                    <Badge variant="secondary" className="mr-2">
                      {leads.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 min-h-[400px]">
                  {leads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      projectId={projectId}
                      onDragStart={() => handleDragStart(lead)}
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
              לידים שהומרו
              <Badge className="mr-2 bg-green-100 text-green-700">
                {leadsByStatus?.converted?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(leadsByStatus?.converted || []).slice(0, 5).map((lead) => (
                <Badge key={lead.id} variant="secondary" className="text-xs">
                  {lead.name}
                </Badge>
              ))}
              {(leadsByStatus?.converted?.length || 0) > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{(leadsByStatus?.converted?.length || 0) - 5} נוספים
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              לידים שאבדו
              <Badge className="mr-2 bg-red-100 text-red-700">
                {leadsByStatus?.lost?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(leadsByStatus?.lost || []).slice(0, 5).map((lead) => (
                <Badge key={lead.id} variant="secondary" className="text-xs">
                  {lead.name}
                </Badge>
              ))}
              {(leadsByStatus?.lost?.length || 0) > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{(leadsByStatus?.lost?.length || 0) - 5} נוספים
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  projectId,
  onDragStart,
}: {
  lead: Lead;
  projectId: string;
  onDragStart: () => void;
}) {
  const router = useRouter();
  const { deleteLead } = useCRMStore();

  const handleDelete = async () => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הליד ${lead.name}?`)) {
      await deleteLead(lead.id);
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
            onClick={() => router.push(`/projects/${projectId}/crm/leads/${lead.id}`)}
          >
            <div className="font-medium text-sm">{lead.name}</div>
            {lead.company && (
              <div className="text-xs text-gray-500">{lead.company}</div>
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
              onClick={() => router.push(`/projects/${projectId}/crm/leads/${lead.id}`)}
            >
              צפייה
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/projects/${projectId}/crm/leads/${lead.id}/edit`)
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

      <div className="mt-2 space-y-1">
        {lead.phone && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Mail className="h-3 w-3" />
            {lead.email}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Badge className={`text-xs ${priorityColors[lead.priority]}`}>
          {priorityLabels[lead.priority]}
        </Badge>
        {lead.estimated_value && (
          <span className="text-xs text-gray-500">
            ₪{lead.estimated_value.toLocaleString()}
          </span>
        )}
      </div>

      {lead.interested_in && lead.interested_in.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.interested_in.slice(0, 2).map((interest) => (
            <Badge key={interest} variant="outline" className="text-xs">
              {interest}
            </Badge>
          ))}
          {lead.interested_in.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{lead.interested_in.length - 2}
            </Badge>
          )}
        </div>
      )}

      {lead.score > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">ציון</span>
            <span className="font-medium">{lead.score}</span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(lead.score, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
