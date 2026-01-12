'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, UserType, AuthState, CompleteProfileData } from '@/types/auth';
import { useRouter } from 'next/navigation';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeProfile: (data: CompleteProfileData) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: UserType[]) => boolean;
  canAccess: (requiredRoles: UserType[]) => boolean;
  supabase: typeof supabase;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });
  const router = useRouter();

  // Fetch user from our users table by auth_id
  const fetchUser = useCallback(async (authId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user:', error);
        return null;
      }
      return data as User | null;
    } catch (err) {
      console.error('fetchUser error:', err);
      return null;
    }
  }, []);

  // Create a new user record in our users table
  const createUserRecord = useCallback(async (authUser: { id: string; email?: string }): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_id: authUser.id,
          email: authUser.email || '',
          user_type: 'pending',
          is_active: false,
          is_profile_complete: false,
          is_approved: false,
          has_portal_access: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user record:', error);
        return null;
      }
      return data as User;
    } catch (err) {
      console.error('createUserRecord error:', err);
      return null;
    }
  }, []);

  // Log auth event
  const logAuthEvent = useCallback(async (userId: string | null, eventType: string, eventData?: Record<string, unknown>) => {
    try {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      });
    } catch (err) {
      console.error('Error logging auth event:', err);
    }
  }, []);

  // Main function to refresh user state
  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
        return;
      }

      let user = await fetchUser(session.user.id);

      // If user doesn't exist in our table, create them
      if (!user) {
        user = await createUserRecord(session.user);
      }

      setState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
        error: null,
      });

      // Handle redirects based on user state
      if (user && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const authPaths = ['/login', '/register', '/auth/callback'];

        if (!user.is_profile_complete && !currentPath.includes('/complete-profile')) {
          router.push('/complete-profile');
        } else if (user.is_profile_complete && !user.is_approved && !currentPath.includes('/pending-approval')) {
          router.push('/pending-approval');
        } else if (user.is_approved && authPaths.some(p => currentPath.includes(p))) {
          router.push('/');
        }
      }
    } catch (err) {
      console.error('refreshUser error:', err);
      setState(prev => ({ ...prev, isLoading: false, error: 'שגיאה בטעינת המשתמש' }));
    }
  }, [fetchUser, createUserRecord, router]);

  // Initialize auth state and listen for changes
  useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUser();
        if (session?.user) {
          await logAuthEvent(null, 'sign_in', { auth_id: session.user.id });
        }
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser, logAuthEvent]);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState(prev => ({ ...prev, isLoading: false, error: translateAuthError(error.message) }));
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setState(prev => ({ ...prev, isLoading: false, error: translateAuthError(error.message) }));
      throw error;
    }
  };

  // Sign up with email/password
  const signUp = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setState(prev => ({ ...prev, isLoading: false, error: translateAuthError(error.message) }));
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    if (state.user) {
      await logAuthEvent(state.user.id, 'sign_out');
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Complete user profile
  const completeProfile = async (data: CompleteProfileData) => {
    if (!state.user) throw new Error('No user logged in');

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          national_id: data.national_id,
          company_name: data.company_name,
          license_number: data.license_number,
          supervisor_id: data.supervisor_id,
          is_profile_complete: true,
        })
        .eq('id', state.user.id);

      if (updateError) throw updateError;

      // Create approval request
      const { error: approvalError } = await supabase
        .from('approval_requests')
        .insert({
          user_id: state.user.id,
          requested_role: data.user_type,
          requested_supervisor_id: data.supervisor_id,
          status: 'pending',
        });

      if (approvalError) throw approvalError;

      await logAuthEvent(state.user.id, 'profile_completed', { requested_role: data.user_type });
      await refreshUser();
      router.push('/pending-approval');
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message || 'שגיאה בשמירת הפרופיל' }));
      throw err;
    }
  };

  // Check if user has one of the specified roles
  const hasRole = (roles: UserType[]): boolean => {
    return state.user ? roles.includes(state.user.user_type) : false;
  };

  // Check if user can access (approved and has role)
  const canAccess = (requiredRoles: UserType[]): boolean => {
    if (!state.user) return false;
    if (!state.user.is_active) return false;
    if (!state.user.is_approved) return false;
    return requiredRoles.includes(state.user.user_type);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        completeProfile,
        refreshUser,
        hasRole,
        canAccess,
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Helper function to translate auth errors to Hebrew
function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'אימייל או סיסמה שגויים',
    'Email not confirmed': 'האימייל לא אומת. בדוק את תיבת הדואר שלך',
    'User already registered': 'משתמש כבר רשום עם אימייל זה',
    'Password should be at least 6 characters': 'הסיסמה צריכה להיות לפחות 6 תווים',
    'Unable to validate email address: invalid format': 'פורמט אימייל לא תקין',
    'Signup requires a valid password': 'נדרשת סיסמה תקינה',
  };

  return translations[message] || message;
}
