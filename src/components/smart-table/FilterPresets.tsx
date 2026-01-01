'use client';

import { useState, useEffect } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  Share2,
  Check,
  History,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ActiveFilter } from '@/lib/utils/columnAnalyzer';
import { filtersToUrlParams } from '@/lib/utils/columnAnalyzer';

interface FilterPreset {
  id: string;
  name: string;
  filters: ActiveFilter[];
  globalSearch?: string;
  createdAt: string;
}

interface FilterPresetsProps {
  projectId: string;
  tableName: string;
  currentFilters: ActiveFilter[];
  globalSearch?: string;
  onLoadPreset: (filters: ActiveFilter[], globalSearch?: string) => void;
}

const STORAGE_KEY = 'filter_presets';
const SEARCH_HISTORY_KEY = 'search_history';
const MAX_SEARCH_HISTORY = 5;

export function FilterPresets({
  projectId,
  tableName,
  currentFilters,
  globalSearch,
  onLoadPreset,
}: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [copied, setCopied] = useState(false);

  const storageKey = `${STORAGE_KEY}_${projectId}_${tableName}`;
  const historyKey = `${SEARCH_HISTORY_KEY}_${projectId}_${tableName}`;

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPresets(JSON.parse(stored));
      }

      const history = localStorage.getItem(historyKey);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey, historyKey]);

  // Save presets to localStorage
  const savePresets = (newPresets: FilterPreset[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newPresets));
    } catch {
      toast.error('שגיאה בשמירת הפריסט');
    }
  };

  // Add to search history
  useEffect(() => {
    if (globalSearch && globalSearch.trim()) {
      const search = globalSearch.trim();
      const updated = [search, ...searchHistory.filter(s => s !== search)].slice(0, MAX_SEARCH_HISTORY);
      setSearchHistory(updated);
      try {
        localStorage.setItem(historyKey, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
    }
  }, [globalSearch, historyKey]);

  // Save new preset
  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error('נא להזין שם לפריסט');
      return;
    }

    const newPreset: FilterPreset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      filters: currentFilters,
      globalSearch,
      createdAt: new Date().toISOString(),
    };

    savePresets([newPreset, ...presets]);
    setNewPresetName('');
    setIsSaveDialogOpen(false);
    toast.success('הפריסט נשמר בהצלחה');
  };

  // Delete preset
  const handleDeletePreset = (id: string) => {
    savePresets(presets.filter(p => p.id !== id));
    toast.success('הפריסט נמחק');
  };

  // Share preset (copy URL)
  const handleShare = () => {
    const params = filtersToUrlParams(currentFilters, globalSearch);
    const url = `${window.location.origin}${window.location.pathname}?${params}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('הקישור הועתק ללוח');
    }).catch(() => {
      toast.error('שגיאה בהעתקת הקישור');
    });
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem(historyKey);
    toast.success('היסטוריית החיפוש נמחקה');
  };

  const hasActiveFilters = currentFilters.length > 0 || (globalSearch && globalSearch.trim());

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="border-slate-700">
            <Bookmark className="h-4 w-4 ml-1" />
            פריסטים
            {presets.length > 0 && (
              <span className="mr-1 text-xs text-slate-400">({presets.length})</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 p-0 bg-slate-800 border-slate-700"
        >
          {/* Actions */}
          <div className="p-3 border-b border-slate-700">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setIsSaveDialogOpen(true);
                }}
                disabled={!hasActiveFilters}
                className="flex-1 border-slate-600"
              >
                <Plus className="h-3 w-3 ml-1" />
                שמור פריסט
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={!hasActiveFilters}
                className="border-slate-600"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Share2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Presets List */}
          {presets.length > 0 && (
            <div className="p-2 border-b border-slate-700">
              <div className="text-xs text-slate-400 px-2 mb-1">פריסטים שמורים</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className="group flex items-center gap-2 p-2 rounded hover:bg-slate-700 cursor-pointer"
                    onClick={() => {
                      onLoadPreset(preset.filters, preset.globalSearch);
                      setIsOpen(false);
                      toast.success(`נטען: ${preset.name}`);
                    }}
                  >
                    <Bookmark className="h-3 w-3 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{preset.name}</div>
                      <div className="text-xs text-slate-500">
                        {preset.filters.length} פילטרים
                        {preset.globalSearch && ' + חיפוש'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 mb-1">
                <div className="text-xs text-slate-400">היסטוריית חיפוש</div>
                <button
                  onClick={clearHistory}
                  className="text-xs text-slate-500 hover:text-red-400"
                >
                  נקה
                </button>
              </div>
              <div className="space-y-1">
                {searchHistory.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onLoadPreset([], search);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-700 text-left"
                  >
                    <History className="h-3 w-3 text-slate-500 shrink-0" />
                    <span className="text-sm text-slate-300 truncate">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {presets.length === 0 && searchHistory.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              אין פריסטים שמורים
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle>שמור פריסט</DialogTitle>
            <DialogDescription>
              שמור את הפילטרים הנוכחיים לשימוש עתידי
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400">שם הפריסט</label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="לדוגמה: תהליכים פתוחים"
                className="mt-1 bg-slate-900 border-slate-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset();
                }}
                autoFocus
              />
            </div>
            <div className="text-sm text-slate-400">
              <div>הפילטרים שיישמרו:</div>
              <ul className="mt-1 text-xs space-y-1">
                {currentFilters.map((f, i) => (
                  <li key={i}>• {f.column}</li>
                ))}
                {globalSearch && <li>• חיפוש: "{globalSearch}"</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSavePreset} className="bg-emerald-500 hover:bg-emerald-600">
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
