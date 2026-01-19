'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  GitBranch,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileCode,
  Wrench,
  Sparkles,
  Bug
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';

interface VersionData {
  version: string;
  commit_hash: string;
  deployed_at: string | null;
  environment: string;
  pending_changes: number;
  changes?: ChangeLog[];
}

interface ChangeLog {
  id: string;
  change_type: string;
  category: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  deployed_at: string | null;
  commit_hash: string;
}

const changeTypeIcons: Record<string, React.ReactNode> = {
  feature: <Sparkles className="h-3 w-3 text-green-500" />,
  fix: <Bug className="h-3 w-3 text-red-500" />,
  refactor: <Wrench className="h-3 w-3 text-blue-500" />,
  migration: <FileCode className="h-3 w-3 text-purple-500" />,
  config: <FileCode className="h-3 w-3 text-gray-500" />,
};

const changeTypeLabels: Record<string, string> = {
  feature: 'תכונה חדשה',
  fix: 'תיקון',
  refactor: 'שיפור',
  migration: 'מיגרציה',
  config: 'הגדרות',
};

export function VersionIndicator() {
  const [versionData, setVersionData] = useState<VersionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { isAdmin } = useAuthStore();

  const fetchVersion = async (includeChanges = false) => {
    try {
      const url = includeChanges ? '/api/version?changes=true' : '/api/version';
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setVersionData(result.data);
      }
    } catch (error) {
      console.error('Error fetching version:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVersion();
  }, []);

  // Fetch with changes when popover opens
  useEffect(() => {
    if (isOpen && !versionData?.changes) {
      fetchVersion(true);
    }
  }, [isOpen]);

  const handleMarkDeployed = async () => {
    try {
      const response = await fetch('/api/version', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_deployed' })
      });

      if (response.ok) {
        fetchVersion(true);
      }
    } catch (error) {
      console.error('Error marking deployed:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  const hasPendingChanges = (versionData?.pending_changes || 0) > 0;
  const shortHash = versionData?.commit_hash?.substring(0, 7) || 'unknown';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs gap-1.5 ${
            hasPendingChanges
              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <GitBranch className="h-3 w-3" />
          <span>v{versionData?.version || '1.0.0'}</span>
          {hasPendingChanges && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-amber-100 text-amber-700">
              {versionData?.pending_changes}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" dir="rtl">
        <div className="space-y-3">
          {/* Version Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-800">גרסת מערכת</h4>
              <p className="text-xs text-slate-500">
                {versionData?.environment === 'production' ? 'פרודקשן' : versionData?.environment}
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {shortHash}
            </Badge>
          </div>

          {/* Version Info */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">גרסה</span>
              <span className="font-medium">{versionData?.version || '1.0.0'}</span>
            </div>
            {versionData?.deployed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">עודכן</span>
                <span className="text-xs text-slate-500">
                  {new Date(versionData.deployed_at).toLocaleString('he-IL')}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">שינויים ממתינים</span>
              {hasPendingChanges ? (
                <Badge className="bg-amber-100 text-amber-700 border-0">
                  <AlertCircle className="h-3 w-3 ml-1" />
                  {versionData?.pending_changes}
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                  הכל מעודכן
                </Badge>
              )}
            </div>
          </div>

          {/* Recent Changes */}
          {versionData?.changes && versionData.changes.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-slate-700">שינויים אחרונים</h5>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {versionData.changes.slice(0, 5).map((change) => (
                  <div
                    key={change.id}
                    className={`p-2 rounded-lg text-sm ${
                      change.status === 'pending'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {changeTypeIcons[change.change_type] || <FileCode className="h-3 w-3" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{change.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] h-4">
                            {changeTypeLabels[change.change_type] || change.change_type}
                          </Badge>
                          {change.category && (
                            <span className="text-[10px] text-slate-500">{change.category}</span>
                          )}
                          {change.status === 'pending' && (
                            <Badge className="text-[10px] h-4 bg-amber-100 text-amber-700 border-0">
                              ממתין
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin() && hasPendingChanges && (
            <div className="pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={handleMarkDeployed}
              >
                <CheckCircle2 className="h-3 w-3 ml-1" />
                סמן הכל כמעודכן
              </Button>
            </div>
          )}

          {/* Refresh */}
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-xs text-slate-500"
            onClick={() => fetchVersion(true)}
          >
            <RefreshCw className="h-3 w-3 ml-1" />
            רענן
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
