'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /projects to dashboard
export default function ProjectsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-slate-400">מעביר לדף הראשי...</div>
    </div>
  );
}
