'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { InsuranceDashboard } from '@/components/insurance';
import type { ProjectConfiguration } from '@/lib/project-analyzer';

export default function InsuranceDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [config, setConfig] = useState<ProjectConfiguration | null>(null);

  // Load saved configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem(`project_config_${projectId}`);
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch {
        // Invalid config, will use defaults
      }
    }
  }, [projectId]);

  const handleSetupClick = () => {
    router.push(`/projects/${projectId}/setup`);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <Header title="דשבורד ביטוח" />

      <div className="flex-1 p-6 overflow-auto">
        <InsuranceDashboard
          projectId={projectId}
          config={config}
          onSetupClick={handleSetupClick}
        />
      </div>
    </div>
  );
}
