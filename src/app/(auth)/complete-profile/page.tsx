'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Complete Profile Page - Redirects to signup
 * This page is kept for backwards compatibility
 * The new flow uses /signup for registration
 */
export default function CompleteProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/signup');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
