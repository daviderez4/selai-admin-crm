'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Settings,
  ChevronDown,
  LayoutDashboard,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardRenderer } from '@/components/DashboardRenderer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { SmartDashboardTemplate } from '@/types/dashboard';

export default function DashboardViewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<SmartDashboardTemplate | null>(null);
  const [templates, setTemplates] = useState<SmartDashboardTemplate[]>([]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all templates for switcher
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/smart-templates`);
      if (response.ok) {
        const result = await response.json();
        setTemplates(result.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, [projectId]);

  // Fetch specific template
  const fetchTemplate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/smart-templates`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const result = await response.json();
      const allTemplates = result.templates || [];
      setTemplates(allTemplates);

      const found = allTemplates.find((t: SmartDashboardTemplate) => t.id === templateId);
      if (!found) {
        throw new Error('Template not found');
      }

      setTemplate(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, templateId]);

  // Fetch data from table
  const fetchData = useCallback(async () => {
    if (!template?.tableName) return;

    setIsLoadingData(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/data?table=${encodeURIComponent(template.tableName)}&limit=1000`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [projectId, template?.tableName]);

  // Initial load
  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  // Load data when template is available
  useEffect(() => {
    if (template) {
      fetchData();
    }
  }, [template, fetchData]);

  // Handle refresh
  const handleRefresh = () => {
    fetchData();
    toast.success('הנתונים רועננו');
  };

  // Handle template switch
  const handleTemplateSwitch = (newTemplateId: string) => {
    router.push(`/projects/${projectId}/dashboard/${newTemplateId}`);
  };

  // Handle edit
  const handleEdit = () => {
    router.push(`/projects/${projectId}/dashboard-builder?templateId=${templateId}`);
  };

  // Handle export
  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!template || data.length === 0) return;

    const visibleColumns = template.fieldSelection
      .filter(f => f.visible)
      .sort((a, b) => a.order - b.order);

    if (format === 'csv') {
      const headers = visibleColumns.map(c => c.customLabel || c.name).join(',');
      const rows = data.map(row =>
        visibleColumns.map(c => {
          const val = row[c.name];
          const strVal = val === null || val === undefined ? '' : String(val);
          return strVal.includes(',') ? `"${strVal}"` : strVal;
        }).join(',')
      );

      const csv = [headers, ...rows].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('הקובץ יוצא בהצלחה');
    } else {
      toast.info('ייצוא Excel יהיה זמין בקרוב');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center px-6" dir="rtl">
          <h1 className="text-xl font-semibold text-white">טוען דשבורד...</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">טוען דשבורד...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !template) {
    return (
      <div className="flex flex-col h-full bg-slate-900">
        <div className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center px-6" dir="rtl">
          <h1 className="text-xl font-semibold text-white">שגיאה</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-white text-lg mb-2">לא ניתן לטעון את הדשבורד</p>
            <p className="text-slate-400 mb-4">{error || 'Template not found'}</p>
            <Button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה לפרויקט
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Custom Header with Actions */}
      <div className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between px-6" dir="rtl">
        {/* Title */}
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-5 w-5 text-emerald-500" />
          <h1 className="text-xl font-semibold text-white">{template.name}</h1>
          <Badge variant="outline" className="border-slate-600 text-slate-400">
            {template.tableName}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Template Switcher */}
          {templates.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300">
                  <LayoutDashboard className="h-4 w-4 ml-2" />
                  החלף תבנית
                  <ChevronDown className="h-4 w-4 mr-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700" align="end">
                {templates.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => handleTemplateSwitch(t.id)}
                    className={`text-slate-300 focus:bg-slate-700 ${
                      t.id === templateId ? 'bg-emerald-500/10 text-emerald-400' : ''
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 ml-2" />
                    {t.name}
                    {t.isDefault && (
                      <Badge className="mr-2 bg-blue-500/20 text-blue-400 text-xs">
                        ברירת מחדל
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={() => router.push(`/projects/${projectId}/import`)}
                  className="text-slate-300 focus:bg-slate-700"
                >
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  ייבוא נוסף
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Edit Button */}
          <Button
            variant="outline"
            onClick={handleEdit}
            className="border-slate-700 text-slate-300"
          >
            <Settings className="h-4 w-4 ml-2" />
            ערוך
          </Button>

          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="border-slate-700 text-slate-300"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה לפרויקט
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoadingData ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">טוען נתונים...</p>
            </div>
          </div>
        ) : (
          <DashboardRenderer
            template={template}
            data={data}
            isLoading={isLoadingData}
            onRefresh={handleRefresh}
            onEditTemplate={handleEdit}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  );
}
