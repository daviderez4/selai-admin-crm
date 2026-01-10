'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, ExternalLink, MoreVertical, Trash2, Settings, ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProjectStats {
  records: number | null;
  tables: number | null;
  lastImport: string | null;
  isConfigured: boolean;
  error?: string;
}

interface ProjectCardProps {
  project: Project;
  onConnect: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onSettings: (project: Project) => void;
}

export function ProjectCard({
  project,
  onConnect,
  onDelete,
  onSettings,
}: ProjectCardProps) {
  const [stats, setStats] = useState<ProjectStats>({
    records: null,
    tables: null,
    lastImport: null,
    isConfigured: project.is_configured ?? false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/master-data`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            records: data.stats?.total || 0,
            tables: 1, // master_data table
            lastImport: null, // Would need to fetch from import_history
            isConfigured: true,
          });
        }
      } catch (error) {
        // Ignore errors - stats are optional
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [project.id]);

  let urlHost = '';
  try {
    if (project.supabase_url) urlHost = new URL(project.supabase_url).host;
  } catch { urlHost = 'לא מוגדר'; }

  const formatNumber = (num: number | null): string => {
    if (num === null) return '-';
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card
      className="bg-white border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-150 overflow-hidden"
      dir="rtl"
    >
      {/* Top accent - thin line */}
      <div className="h-0.5 bg-blue-600" />

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center">
              <Database className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800">{project.name}</h3>
              <p className="text-[10px] text-slate-400">{urlHost}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-white border-slate-200 shadow-lg">
              <DropdownMenuItem
                className="text-xs text-slate-600 focus:bg-slate-50 cursor-pointer"
                onClick={() => onSettings(project)}
              >
                <Settings className="ml-2 h-3.5 w-3.5" />
                הגדרות
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs text-slate-600 focus:bg-slate-50 cursor-pointer"
                onClick={() => window.open(project.supabase_url, '_blank')}
              >
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
                פתח בסופהבייס
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                className="text-xs text-red-500 focus:bg-red-50 cursor-pointer"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="ml-2 h-3.5 w-3.5" />
                מחק פרויקט
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Stats Row - Horizontal */}
        <div className="flex items-center gap-4 py-2.5 px-3 bg-slate-50 rounded-md mb-3">
          <div className="flex-1 text-center border-l border-slate-200">
            <p className={cn(
              'text-base font-semibold tabular-nums',
              loading ? 'text-slate-300' : 'text-slate-800'
            )}>
              {loading ? '-' : formatNumber(stats.records)}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">רשומות</p>
          </div>
          <div className="flex-1 text-center border-l border-slate-200">
            <p className={cn(
              'text-base font-semibold tabular-nums',
              loading ? 'text-slate-300' : 'text-slate-800'
            )}>
              {loading ? '-' : formatNumber(stats.tables)}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">טבלאות</p>
          </div>
          <div className="flex-1 text-center">
            <p className={cn(
              'text-base font-semibold tabular-nums',
              loading ? 'text-slate-300' : 'text-slate-800'
            )}>
              {stats.lastImport || '-'}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">עדכון</p>
          </div>
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: he })}
          </span>
          <Button
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onConnect(project)}
          >
            פתח
            <ArrowLeft className="h-3 w-3 mr-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
