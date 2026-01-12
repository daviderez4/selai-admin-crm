'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserType } from '@/types/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserType[];
  requireApproval?: boolean;
  fallbackUrl?: string;
}

interface UserState {
  id: string;
  user_type: UserType;
  is_active: boolean;
  is_profile_complete: boolean;
  is_approved: boolean;
}

export default function ProtectedRoute({
  children,
  allowedRoles = ['agent', 'supervisor', 'admin'],
  requireApproval = true,
  fallbackUrl = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push(fallbackUrl);
        return;
      }

      // Get user profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, user_type, is_active, is_profile_complete, is_approved')
        .eq('auth_id', authUser.id)
        .single();

      if (error || !profile) {
        // No profile - redirect to complete profile
        router.push('/complete-profile');
        return;
      }

      setUser(profile);

      // Check if profile is complete
      if (!profile.is_profile_complete) {
        router.push('/complete-profile');
        return;
      }

      // Check if approved (if required)
      if (requireApproval && !profile.is_approved) {
        router.push('/pending-approval');
        return;
      }

      // Check role access
      if (!allowedRoles.includes(profile.user_type)) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      setHasAccess(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      router.push(fallbackUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
          <p className="text-slate-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">אין הרשאה</h1>
          <p className="text-gray-600 mb-6">אין לך הרשאה לצפות בדף זה</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              חזור
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              לדף הבית
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// HOC version for wrapping pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    allowedRoles?: UserType[];
    requireApproval?: boolean;
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute
        allowedRoles={options?.allowedRoles}
        requireApproval={options?.requireApproval}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
