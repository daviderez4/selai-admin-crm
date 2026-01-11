'use client';

import { useState } from 'react';
import {
  MessageCircle,
  Download,
  RefreshCcw,
  X,
  FileSpreadsheet,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  template_text: string;
  placeholders?: string[];
}

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedRows: Set<number>;
  data: Record<string, unknown>[];
  rowIdKey?: string;
  templates: MessageTemplate[];
  onClearSelection: () => void;
  onSendWhatsApp: (templateId: string, records: Record<string, unknown>[]) => void;
  onExport: (format: 'excel' | 'whatsapp-ready') => void;
  onUpdateStatus?: (status: string) => void;
  loading?: boolean;
  className?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedRows,
  data,
  rowIdKey = 'id',
  templates,
  onClearSelection,
  onSendWhatsApp,
  onExport,
  onUpdateStatus,
  loading = false,
  className,
}: BulkActionsToolbarProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const whatsappTemplates = templates.filter(t => t.channel === 'whatsapp');

  // Get selected records from data
  const getSelectedRecords = () => {
    return data.filter(row => selectedRows.has(row[rowIdKey] as number));
  };

  const handleSendWhatsApp = () => {
    if (!selectedTemplate) return;
    const records = getSelectedRecords();
    onSendWhatsApp(selectedTemplate, records);
  };

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm',
        className
      )}
      dir="rtl"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Selection info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-blue-700">
            <Users className="h-5 w-5" />
            <span className="font-bold text-lg">
              {selectedCount.toLocaleString('he-IL')}
            </span>
            <span className="text-sm">רשומות נבחרו</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <X className="h-4 w-4 ml-1" />
            בטל בחירה
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* WhatsApp Action */}
          {whatsappTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-48 bg-white border-blue-200">
                  <SelectValue placeholder="בחר תבנית הודעה" />
                </SelectTrigger>
                <SelectContent>
                  {whatsappTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSendWhatsApp}
                disabled={!selectedTemplate || loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <MessageCircle className="h-4 w-4 ml-2" />
                )}
                שלח WhatsApp
              </Button>
            </div>
          )}

          {/* Export Actions */}
          <div className="flex items-center gap-2 border-r border-blue-200 pr-3 mr-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('excel')}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              ייצא Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('whatsapp-ready')}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 ml-2" />
              ייצא לוואטסאפ
            </Button>
          </div>

          {/* Status Update */}
          {onUpdateStatus && (
            <div className="flex items-center gap-2 border-r border-blue-200 pr-3 mr-1">
              <Select onValueChange={onUpdateStatus}>
                <SelectTrigger className="w-40 bg-white border-blue-200">
                  <SelectValue placeholder="עדכן סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="בטיפול">בטיפול</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                  <SelectItem value="ממתין">ממתין</SelectItem>
                  <SelectItem value="בוטל">בוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper hook for managing bulk actions state
export function useBulkActions() {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const clearSelection = () => setSelectedRows(new Set());

  const selectRow = (id: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (ids: number[]) => {
    setSelectedRows(new Set(ids));
  };

  return {
    selectedRows,
    setSelectedRows,
    selectedCount: selectedRows.size,
    clearSelection,
    selectRow,
    selectAll,
    loading,
    setLoading,
  };
}

export default BulkActionsToolbar;
