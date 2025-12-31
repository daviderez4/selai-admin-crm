import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '../supabase/client';
import type { ProjectPreferences } from '@/types';

const STORAGE_KEY = 'user-preferences';

interface UserPreferencesState {
  // Default project
  defaultProjectId: string | null;

  // Per-project preferences
  projectPreferences: Record<string, ProjectPreferences>;

  // Loading state
  isLoading: boolean;

  // Actions
  setDefaultProject: (projectId: string | null) => Promise<void>;
  getProjectPreferences: (projectId: string) => ProjectPreferences;
  updateProjectPreferences: (projectId: string, updates: Partial<ProjectPreferences>) => void;
  setVisibleColumns: (projectId: string, tableName: string, columns: string[]) => void;
  setColumnOrder: (projectId: string, tableName: string, order: string[]) => void;
  setFilters: (projectId: string, tableName: string, filters: Record<string, unknown>) => void;
  setLastSelectedTable: (projectId: string, tableName: string) => void;
  syncToSupabase: () => Promise<void>;
  loadFromSupabase: (userId: string) => Promise<void>;
}

const getDefaultPreferences = (projectId: string): ProjectPreferences => ({
  project_id: projectId,
  visible_columns: [],
  column_order: [],
  filters: {},
  page_size: 50,
});

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      defaultProjectId: null,
      projectPreferences: {},
      isLoading: false,

      setDefaultProject: async (projectId) => {
        set({ defaultProjectId: projectId });

        // Sync to Supabase
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from('user_settings')
            .update({
              default_project_id: projectId,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }
      },

      getProjectPreferences: (projectId) => {
        const { projectPreferences } = get();
        return projectPreferences[projectId] || getDefaultPreferences(projectId);
      },

      updateProjectPreferences: (projectId, updates) => {
        set((state) => ({
          projectPreferences: {
            ...state.projectPreferences,
            [projectId]: {
              ...getDefaultPreferences(projectId),
              ...state.projectPreferences[projectId],
              ...updates,
            },
          },
        }));
      },

      setVisibleColumns: (projectId, tableName, columns) => {
        const key = `${projectId}:${tableName}`;
        set((state) => {
          const currentPrefs = state.projectPreferences[key] || getDefaultPreferences(key);
          return {
            projectPreferences: {
              ...state.projectPreferences,
              [key]: {
                ...currentPrefs,
                visible_columns: columns,
              },
            },
          };
        });
      },

      setColumnOrder: (projectId, tableName, order) => {
        const key = `${projectId}:${tableName}`;
        set((state) => {
          const currentPrefs = state.projectPreferences[key] || getDefaultPreferences(key);
          return {
            projectPreferences: {
              ...state.projectPreferences,
              [key]: {
                ...currentPrefs,
                column_order: order,
              },
            },
          };
        });
      },

      setFilters: (projectId, tableName, filters) => {
        const key = `${projectId}:${tableName}`;
        set((state) => {
          const currentPrefs = state.projectPreferences[key] || getDefaultPreferences(key);
          return {
            projectPreferences: {
              ...state.projectPreferences,
              [key]: {
                ...currentPrefs,
                filters,
              },
            },
          };
        });
      },

      setLastSelectedTable: (projectId, tableName) => {
        set((state) => {
          const currentPrefs = state.projectPreferences[projectId] || getDefaultPreferences(projectId);
          return {
            projectPreferences: {
              ...state.projectPreferences,
              [projectId]: {
                ...currentPrefs,
                last_selected_table: tableName,
              },
            },
          };
        });
      },

      syncToSupabase: async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { defaultProjectId, projectPreferences } = get();

        // Save preferences to user_settings as JSON
        await supabase
          .from('user_settings')
          .update({
            default_project_id: defaultProjectId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        // Save project preferences to a separate table or as JSONB
        // For now, we rely on localStorage for project preferences
      },

      loadFromSupabase: async (userId) => {
        set({ isLoading: true });

        const supabase = createClient();

        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('default_project_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (!error && data?.default_project_id) {
            set({ defaultProjectId: data.default_project_id });
          }
        } catch (error) {
          console.error('Error loading preferences from Supabase:', error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        defaultProjectId: state.defaultProjectId,
        projectPreferences: state.projectPreferences,
      }),
    }
  )
);
