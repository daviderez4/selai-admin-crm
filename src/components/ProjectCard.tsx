'use client';

import { Database, ExternalLink, MoreVertical, Trash2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const urlHost = new URL(project.supabase_url).host;

  return (
    <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors" dir="rtl">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Database className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{project.name}</h3>
            <p className="text-xs text-slate-400">{urlHost}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
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
      </CardHeader>
      <CardContent>
        {project.description && (
          <p className="text-sm text-slate-400 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-slate-600 text-slate-400">
            {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: he })}
          </Badge>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => onConnect(project)}
          >
            התחבר
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
