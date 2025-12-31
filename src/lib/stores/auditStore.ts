import { create } from 'zustand';
import { createClient } from '../supabase/client';
import type { AuditLog, PaginatedResponse } from '@/types';

interface AuditState {
  logs: AuditLog[];
  isLoading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: {
    userId?: string;
    projectId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  };

  // Actions
  fetchLogs: (page?: number, pageSize?: number) => Promise<void>;
  setFilters: (filters: AuditState['filters']) => void;
  clearFilters: () => void;
  logAction: (action: string, details?: Record<string, unknown>, projectId?: string) => Promise<void>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],
  isLoading: false,
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0,
  },
  filters: {},

  fetchLogs: async (page = 1, pageSize = 50) => {
    const supabase = createClient();
    const { filters } = get();

    set({ isLoading: true });

    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          users:user_id (email),
          projects:project_id (name)
        `, { count: 'exact' });

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.action) {
        query = query.ilike('action', `%${filters.action}%`);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching audit logs:', error);
        set({ isLoading: false });
        return;
      }

      // Transform data to include joined fields
      const logs: AuditLog[] = (data || []).map((log: Record<string, unknown>) => ({
        ...log,
        user_email: (log.users as { email?: string })?.email,
        project_name: (log.projects as { name?: string })?.name,
      })) as AuditLog[];

      set({
        logs,
        pagination: {
          page,
          pageSize,
          total: count || 0,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      set({ isLoading: false });
    }
  },

  setFilters: (filters) => {
    set({ filters });
    get().fetchLogs(1);
  },

  clearFilters: () => {
    set({ filters: {} });
    get().fetchLogs(1);
  },

  logAction: async (action, details, projectId) => {
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        project_id: projectId,
        action,
        details,
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  },
}));
