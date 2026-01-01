'use client';

import { cn } from '@/lib/utils';

interface QuickView {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

interface QuickViewsProps {
  views: QuickView[];
  activeView: string;
  onViewChange: (viewId: string) => void;
}

export function QuickViews({ views, activeView, onViewChange }: QuickViewsProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700" dir="rtl">
      <span className="text-slate-400 text-sm px-2">תצוגות:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
              activeView === view.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            )}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
            {view.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeView === view.id
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'bg-slate-700 text-slate-400'
              )}>
                {view.count.toLocaleString('he-IL')}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
