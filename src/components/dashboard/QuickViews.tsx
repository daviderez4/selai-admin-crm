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
    <div className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm" dir="rtl">
      <span className="text-slate-500 text-sm px-2 font-medium">תצוגות:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
              activeView === view.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
            {view.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-normal',
                activeView === view.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-100 text-slate-500'
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
