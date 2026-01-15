/**
 * @feature PROJ-LIST-001
 * @module Projects
 * @description Projects state management - list, select, connect to project DBs
 * @related PROJ-VIEW-001, PROJ-DATA-001
 */
import { create } from 'zustand';
import { createClient } from '../supabase/client';
import type { Project, TableInfo, TableRow, PaginatedResponse } from '@/types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface ProjectsState {
  // Projects list
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProject: Project | null;

  // Connected client for selected project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectClient: ReturnType<typeof createSupabaseClient<any>> | null;

  // Table data
  tables: TableInfo[];
  selectedTable: string | null;
  tableData: TableRow[];
  tableDataPagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  isLoadingTables: boolean;
  isLoadingData: boolean;

  // Actions
  fetchProjects: () => Promise<void>;
  selectProject: (project: Project | null) => void;
  connectToProject: (project: Project) => Promise<void>;
  fetchTables: () => Promise<void>;
  selectTable: (tableName: string | null) => void;
  fetchTableData: (tableName: string, page?: number, pageSize?: number) => Promise<void>;
  insertRow: (tableName: string, data: Record<string, unknown>) => Promise<boolean>;
  updateRow: (tableName: string, id: string | number, data: Record<string, unknown>) => Promise<boolean>;
  deleteRow: (tableName: string, id: string | number) => Promise<boolean>;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'service_key_encrypted'>) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoadingProjects: false,
  selectedProject: null,
  projectClient: null,
  tables: [],
  selectedTable: null,
  tableData: [],
  tableDataPagination: {
    page: 1,
    pageSize: 50,
    total: 0,
  },
  isLoadingTables: false,
  isLoadingData: false,

  fetchProjects: async () => {
    const supabase = createClient();
    set({ isLoadingProjects: true });

    try {
      // First check if user has permission to view projects (admin/manager only)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ projects: [], isLoadingProjects: false });
        return;
      }

      // Get user's profile to check user_type
      let userProfile = null;

      const { data: byAuthId } = await supabase
        .from('users')
        .select('user_type')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (byAuthId) {
        userProfile = byAuthId;
      } else {
        const { data: byEmail } = await supabase
          .from('users')
          .select('user_type')
          .eq('email', user.email?.toLowerCase() || '')
          .maybeSingle();
        userProfile = byEmail;
      }

      // Only admin and manager can access projects
      if (!userProfile || !['admin', 'manager'].includes(userProfile.user_type)) {
        console.log('User does not have permission to view projects - user_type:', userProfile?.user_type);
        set({ projects: [], isLoadingProjects: false });
        return;
      }

      // Get projects the user has access to
      const { data: accessData, error: accessError } = await supabase
        .from('user_project_access')
        .select('project_id');

      if (accessError) {
        // Handle table not existing gracefully
        if (['42P01', 'PGRST204'].includes(accessError.code || '')) {
          console.warn('user_project_access table not found - run schema.sql');
        } else {
          console.error('Error fetching project access:', accessError);
        }
        set({ projects: [], isLoadingProjects: false });
        return;
      }

      const projectIds = (accessData || []).map(a => a.project_id);

      if (projectIds.length === 0) {
        set({ projects: [], isLoadingProjects: false });
        return;
      }

      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        set({ isLoadingProjects: false });
        return;
      }

      set({ projects: projects || [], isLoadingProjects: false });
    } catch (error) {
      console.error('Error fetching projects:', error);
      set({ isLoadingProjects: false });
    }
  },

  selectProject: (project) => {
    set({
      selectedProject: project,
      tables: [],
      selectedTable: null,
      tableData: [],
      projectClient: null,
    });
  },

  connectToProject: async (project) => {
    try {
      // Check if this is a local project (no external Supabase connection)
      const isLocalProject = !project.supabase_url || project.storage_mode === 'local';

      if (isLocalProject) {
        // For local projects, we don't need an external client
        // Data is stored in the main Supabase instance
        set({
          selectedProject: project,
          projectClient: null, // No external client needed
        });

        // Fetch tables after connecting
        await get().fetchTables();
        return;
      }

      // External project - decrypt the service key
      const response = await fetch('/api/projects/decrypt-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to decrypt service key');
      }

      const { serviceKey } = await response.json();

      // Create a Supabase client for the connected external project
      const projectClient = createSupabaseClient(
        project.supabase_url!,
        serviceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      set({
        selectedProject: project,
        projectClient,
      });

      // Fetch tables after connecting
      await get().fetchTables();
    } catch (error) {
      console.error('Error connecting to project:', error);
    }
  },

  fetchTables: async () => {
    const { selectedProject } = get();
    if (!selectedProject) return;

    set({ isLoadingTables: true });

    try {
      // Use the API endpoint to fetch tables
      const response = await fetch(`/api/projects/${selectedProject.id}/tables`);

      if (!response.ok) {
        console.error('Error fetching tables: API returned', response.status);
        set({ isLoadingTables: false });
        return;
      }

      const result = await response.json();

      if (result.message) {
        // Server returned a message (e.g., need to create RPC function)
        console.warn(result.message);
        if (result.sql) {
          console.info('Run this SQL in your Supabase project:', result.sql);
        }
      }

      const tables: TableInfo[] = (result.tables || []).map((t: { name: string; schema?: string }) => ({
        name: t.name,
        schema: t.schema || 'public',
        columns: [],
      }));

      set({ tables, isLoadingTables: false });
    } catch (error) {
      console.error('Error fetching tables:', error);
      set({ isLoadingTables: false });
    }
  },

  selectTable: (tableName) => {
    set({ selectedTable: tableName, tableData: [] });
    if (tableName) {
      get().fetchTableData(tableName);
    }
  },

  fetchTableData: async (tableName, page = 1, pageSize = 50) => {
    const { projectClient } = get();
    if (!projectClient) return;

    set({ isLoadingData: true });

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await projectClient
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(from, to);

      if (error) {
        console.error('Error fetching table data:', error);
        set({ isLoadingData: false });
        return;
      }

      set({
        tableData: data || [],
        tableDataPagination: {
          page,
          pageSize,
          total: count || 0,
        },
        isLoadingData: false,
      });
    } catch (error) {
      console.error('Error fetching table data:', error);
      set({ isLoadingData: false });
    }
  },

  insertRow: async (tableName, data) => {
    const { projectClient } = get();
    if (!projectClient) return false;

    try {
      const { error } = await projectClient.from(tableName).insert(data);

      if (error) {
        console.error('Error inserting row:', error);
        return false;
      }

      // Refresh table data
      await get().fetchTableData(tableName);
      return true;
    } catch (error) {
      console.error('Error inserting row:', error);
      return false;
    }
  },

  updateRow: async (tableName, id, data) => {
    const { projectClient } = get();
    if (!projectClient) return false;

    try {
      const { error } = await projectClient
        .from(tableName)
        .update(data)
        .eq('id', id);

      if (error) {
        console.error('Error updating row:', error);
        return false;
      }

      // Refresh table data
      await get().fetchTableData(tableName);
      return true;
    } catch (error) {
      console.error('Error updating row:', error);
      return false;
    }
  },

  deleteRow: async (tableName, id) => {
    const { projectClient } = get();
    if (!projectClient) return false;

    try {
      const { error } = await projectClient
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting row:', error);
        return false;
      }

      // Refresh table data
      await get().fetchTableData(tableName);
      return true;
    } catch (error) {
      console.error('Error deleting row:', error);
      return false;
    }
  },

  createProject: async (projectData) => {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Encrypt the service key server-side
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectData,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const { project } = await response.json();

      // Refresh projects list
      await get().fetchProjects();

      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  },

  deleteProject: async (projectId) => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        return false;
      }

      // Refresh projects list
      await get().fetchProjects();

      // Clear selected project if it was deleted
      const { selectedProject } = get();
      if (selectedProject?.id === projectId) {
        set({
          selectedProject: null,
          projectClient: null,
          tables: [],
          selectedTable: null,
          tableData: [],
        });
      }

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  },
}));
