import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '../supabase/client';
import type { User, UserSettings } from '@/types';

export type UserType = 'admin' | 'manager' | 'supervisor' | 'agent' | 'client' | 'pending' | 'guest';

export interface UserRecord {
  id: string;
  auth_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  user_type: UserType;
  supervisor_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  userRecord: UserRecord | null;
  settings: UserSettings | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requires2FA: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setUserRecord: (record: UserRecord | null) => void;
  setSettings: (settings: UserSettings | null) => void;
  setLoading: (loading: boolean) => void;
  setRequires2FA: (requires: boolean) => void;
  fetchUser: () => Promise<void>;
  fetchUserRecord: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;

  // Role helpers
  isAdmin: () => boolean;
  isManager: () => boolean;
  isSupervisor: () => boolean;
  isAgent: () => boolean;
  canAccessProjects: () => boolean;
  canManageUsers: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userRecord: null,
      settings: null,
      isLoading: true,
      isAuthenticated: false,
      requires2FA: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setUserRecord: (userRecord) => {
        set({ userRecord });
      },

      setSettings: (settings) => {
        set({ settings });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setRequires2FA: (requires2FA) => {
        set({ requires2FA });
      },

      fetchUser: async () => {
        const supabase = createClient();
        set({ isLoading: true });

        try {
          const { data: { user }, error } = await supabase.auth.getUser();

          if (error || !user) {
            set({ user: null, userRecord: null, isAuthenticated: false, isLoading: false });
            return;
          }

          set({
            user: {
              id: user.id,
              email: user.email!,
              created_at: user.created_at,
              user_metadata: user.user_metadata,
            },
            isAuthenticated: true,
            isLoading: false,
          });

          // Fetch user record from users table
          await get().fetchUserRecord();

          // Fetch settings after getting user
          await get().fetchSettings();
        } catch (error) {
          console.error('Error fetching user:', error);
          set({ user: null, userRecord: null, isAuthenticated: false, isLoading: false });
        }
      },

      fetchUserRecord: async () => {
        const { user } = get();
        if (!user) return;

        const supabase = createClient();

        try {
          // Try to find by auth_id first
          let data = null;

          const { data: byAuthId } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .maybeSingle();

          if (byAuthId) {
            data = byAuthId;
          } else {
            // If not found by auth_id, try by email
            const { data: byEmail } = await supabase
              .from('users')
              .select('*')
              .eq('email', user.email?.toLowerCase() || '')
              .maybeSingle();

            data = byEmail;
          }

          if (data) {
            set({ userRecord: data as UserRecord });

            // If auth_id not set, update it
            if (!data.auth_id && user.id) {
              await supabase
                .from('users')
                .update({ auth_id: user.id })
                .eq('id', data.id);
            }
          } else {
            // Don't auto-create user records - users must go through registration
            console.log('No user record found for', user.email);
            set({ userRecord: null });
          }
        } catch (error) {
          console.error('Error fetching user record:', error);
        }
      },

      fetchSettings: async () => {
        const { user } = get();
        if (!user) return;

        const supabase = createClient();

        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          // Handle table not existing or other errors gracefully
          if (error) {
            // PGRST116 = no rows, 42P01 = table doesn't exist, PGRST204 = column not found
            if (!['PGRST116', '42P01', 'PGRST204'].includes(error.code || '')) {
              console.error('Error fetching settings:', error);
            }
            // Set default settings in memory even if DB fails
            set({
              settings: {
                id: 'temp',
                user_id: user.id,
                two_factor_enabled: false,
                theme: 'dark',
                language: 'he',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as UserSettings,
            });
            return;
          }

          if (data) {
            set({ settings: data });
          } else {
            // Try to create default settings
            const { data: newSettings, error: createError } = await supabase
              .from('user_settings')
              .insert({
                user_id: user.id,
                two_factor_enabled: false,
                theme: 'dark',
                language: 'he',
              })
              .select()
              .maybeSingle();

            if (!createError && newSettings) {
              set({ settings: newSettings });
            } else {
              // Set default settings in memory if insert fails
              set({
                settings: {
                  id: 'temp',
                  user_id: user.id,
                  two_factor_enabled: false,
                  theme: 'dark',
                  language: 'he',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                } as UserSettings,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching settings:', error);
          // Set default settings in memory
          set({
            settings: {
              id: 'temp',
              user_id: user.id,
              two_factor_enabled: false,
              theme: 'dark',
              language: 'he',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as UserSettings,
          });
        }
      },

      signOut: async () => {
        const supabase = createClient();

        try {
          await supabase.auth.signOut();
          set({
            user: null,
            userRecord: null,
            settings: null,
            isAuthenticated: false,
            requires2FA: false,
          });
        } catch (error) {
          console.error('Error signing out:', error);
        }
      },

      updateSettings: async (updates) => {
        const { user, settings } = get();
        if (!user || !settings) return;

        const supabase = createClient();

        try {
          const { data, error } = await supabase
            .from('user_settings')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .select()
            .single();

          if (error) {
            console.error('Error updating settings:', error);
            return;
          }

          set({ settings: data });
        } catch (error) {
          console.error('Error updating settings:', error);
        }
      },

      // Role helper methods
      isAdmin: () => get().userRecord?.user_type === 'admin',
      isManager: () => get().userRecord?.user_type === 'manager',
      isSupervisor: () => get().userRecord?.user_type === 'supervisor',
      isAgent: () => get().userRecord?.user_type === 'agent',

      // Only admin and manager can access projects
      canAccessProjects: () => {
        const userType = get().userRecord?.user_type;
        return userType === 'admin' || userType === 'manager';
      },

      // Only admin can manage users
      canManageUsers: () => get().userRecord?.user_type === 'admin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist these fields
        requires2FA: state.requires2FA,
      }),
    }
  )
);
