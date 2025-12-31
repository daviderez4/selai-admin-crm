'use client';

import { useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { AuditLog } from '@/components/AuditLog';
import { Button } from '@/components/ui/button';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import { toast } from 'sonner';

export default function AuditPage() {
  const { fetchProjects } = useProjectsStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleExport = () => {
    toast.success('ייצוא הלוג החל');
    // In production, implement CSV/Excel export
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="לוג פעולות" />

      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">היסטוריית פעולות</h2>
            <p className="text-slate-400">צפה בכל הפעולות שבוצעו במערכת</p>
          </div>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 ml-2" />
            ייצוא CSV
          </Button>
        </div>

        {/* Audit Log Component */}
        <AuditLog />
      </div>
    </div>
  );
}
