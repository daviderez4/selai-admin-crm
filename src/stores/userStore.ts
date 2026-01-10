import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole, HubUserProfile, Supervisor, ExternalAgent } from '@/types';

interface UserState {
  // User profile with role
  profile: HubUserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Hierarchy data (for supervisors and admins)
  supervisors: Supervisor[];
  agents: ExternalAgent[];

  // Filtered data based on role
  myAgents: ExternalAgent[]; // For supervisors - their agents
  mySupervisor: Supervisor | null; // For agents - their supervisor

  // Actions
  setProfile: (profile: HubUserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Fetch profile from SELAI
  fetchProfile: (email: string) => Promise<void>;

  // Fetch hierarchy data
  fetchHierarchy: () => Promise<void>;

  // Clear all data (logout)
  clear: () => void;

  // Helper getters
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  isAgent: () => boolean;
  canManageUsers: () => boolean;
  canImportData: () => boolean;
  canViewAllAgents: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      error: null,
      supervisors: [],
      agents: [],
      myAgents: [],
      mySupervisor: null,

      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      fetchProfile: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/auth/selai-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch profile');
          }

          if (data.data.profile) {
            set({
              profile: data.data.profile as HubUserProfile,
              isLoading: false
            });

            // Fetch hierarchy data after profile is set
            await get().fetchHierarchy();
          } else {
            // Hub-only user (no SELAI profile) - set default admin profile
            set({
              profile: {
                id: '',
                email,
                full_name: email.split('@')[0],
                role: 'admin',
                can_manage_users: true,
                can_import_data: true,
                can_export_data: true,
                can_view_all_agents: true,
                two_factor_enabled: false,
                theme: 'light',
                language: 'he',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Fetch profile error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch profile',
            isLoading: false
          });
        }
      },

      fetchHierarchy: async () => {
        const { profile } = get();
        if (!profile) return;

        try {
          const params = new URLSearchParams();

          if (profile.role === 'supervisor' && profile.supervisor_id) {
            params.set('role', 'supervisor');
            params.set('supervisor_id', profile.supervisor_id);
          } else if (profile.role === 'agent' && profile.external_agent_id) {
            params.set('role', 'agent');
            params.set('agent_id', profile.external_agent_id);
          }

          const response = await fetch(`/api/selai/hierarchy?${params}`);
          const data = await response.json();

          if (data.success) {
            const { supervisors, agents } = data.data;

            set({
              supervisors: supervisors || [],
              agents: agents || []
            });

            // Set role-specific data
            if (profile.role === 'supervisor' && profile.supervisor_id) {
              const myAgents = (agents || []).filter(
                (a: ExternalAgent) => a.supervisor_id === profile.supervisor_id
              );
              set({ myAgents });
            } else if (profile.role === 'agent' && profile.supervisor_id) {
              const mySupervisor = (supervisors || []).find(
                (s: Supervisor) => s.id === profile.supervisor_id
              );
              set({ mySupervisor: mySupervisor || null });
            }
          }
        } catch (error) {
          console.error('Fetch hierarchy error:', error);
        }
      },

      clear: () => set({
        profile: null,
        isLoading: false,
        error: null,
        supervisors: [],
        agents: [],
        myAgents: [],
        mySupervisor: null
      }),

      // Helper methods
      isAdmin: () => get().profile?.role === 'admin',
      isSupervisor: () => get().profile?.role === 'supervisor',
      isAgent: () => get().profile?.role === 'agent',
      canManageUsers: () => get().profile?.can_manage_users ?? false,
      canImportData: () => get().profile?.can_import_data ?? false,
      canViewAllAgents: () => get().profile?.can_view_all_agents ?? false,
    }),
    {
      name: 'user-store',
      partialize: (state) => ({
        profile: state.profile
      }),
    }
  )
);
