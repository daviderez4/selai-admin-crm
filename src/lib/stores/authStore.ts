import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '../supabase/client';
import type { User, UserSettings } from '@/types';

interface AuthState {
  user: User | null;
  settings: UserSettings | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requires2FA: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSettings: (settings: UserSettings | null) => void;
  setLoading: (loading: boolean) => void;
  setRequires2FA: (requires: boolean) => void;
  fetchUser: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      settings: null,
      isLoading: true,
      isAuthenticated: false,
      requires2FA: false,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
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
            set({ user: null, isAuthenticated: false, isLoading: false });
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

          // Fetch settings after getting user
          await get().fetchSettings();
        } catch (error) {
          console.error('Error fetching user:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
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
