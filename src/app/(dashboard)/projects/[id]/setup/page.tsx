'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProjectSetupWizard } from '@/components/insurance';
import type { ProjectConfiguration } from '@/lib/project-analyzer';

export default function ProjectSetupPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const handleComplete = (config: ProjectConfiguration) => {
    // Navigate to the insurance dashboard
    router.push(`/projects/${projectId}/insurance-dashboard`);
  };

  const handleCancel = () => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <ProjectSetupWizard
      projectId={projectId}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
