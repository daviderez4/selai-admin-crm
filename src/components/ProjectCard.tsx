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
      className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden group"
      dir="rtl"
    >
      {/* Color accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 group-hover:from-cyan-400 group-hover:to-emerald-400 transition-colors" />

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Database className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{project.name}</h3>
              <p className="text-xs text-slate-500">{urlHost}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
                onClick={() => onSettings(project)}
              >
                <Settings className="ml-2 h-4 w-4" />
                הגדרות
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
                onClick={() => window.open(project.supabase_url, '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                פתח בסופהבייס
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                מחק פרויקט
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-slate-400 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className={cn(
              'text-lg font-bold',
              loading ? 'text-slate-600' : 'text-white'
            )}>
              {loading ? '-' : formatNumber(stats.records)}
            </p>
            <p className="text-xs text-slate-500">רשומות</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className={cn(
              'text-lg font-bold',
              loading ? 'text-slate-600' : 'text-white'
            )}>
              {loading ? '-' : formatNumber(stats.tables)}
            </p>
            <p className="text-xs text-slate-500">טבלאות</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2 text-center">
            <p className={cn(
              'text-lg font-bold',
              loading ? 'text-slate-600' : 'text-white'
            )}>
              {stats.lastImport || '-'}
            </p>
            <p className="text-xs text-slate-500">ייבוא אחרון</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
          <span>נוצר: {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: he })}</span>
        </div>

        {/* Connect Button */}
        <Button
          className="w-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-0"
          onClick={() => onConnect(project)}
        >
          התחבר
          <ArrowLeft className="h-4 w-4 mr-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
