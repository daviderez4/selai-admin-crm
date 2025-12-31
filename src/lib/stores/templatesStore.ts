import { create } from 'zustand';
import type { DashboardTemplate, TemplateConfig, TemplateColumn, TemplateChart } from '@/types';

interface TemplatesState {
  templates: DashboardTemplate[];
  activeTemplate: DashboardTemplate | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTemplates: (projectId: string) => Promise<void>;
  createTemplate: (projectId: string, data: {
    name: string;
    description?: string;
    config: TemplateConfig;
    is_default?: boolean;
  }) => Promise<DashboardTemplate | null>;
  updateTemplate: (projectId: string, templateId: string, data: Partial<{
    name: string;
    description: string;
    config: TemplateConfig;
    is_default: boolean;
  }>) => Promise<boolean>;
  deleteTemplate: (projectId: string, templateId: string) => Promise<boolean>;
  setActiveTemplate: (template: DashboardTemplate | null) => void;
  getDefaultTemplate: (projectId: string) => DashboardTemplate | undefined;
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [],
  activeTemplate: null,
  isLoading: false,
  error: null,

  fetchTemplates: async (projectId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/projects/${projectId}/templates`);

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      const templates = data.templates || [];

      set({ templates, isLoading: false });

      // Set default template as active if none is set
      const { activeTemplate } = get();
      if (!activeTemplate && templates.length > 0) {
        const defaultTemplate = templates.find((t: DashboardTemplate) => t.is_default) || templates[0];
        set({ activeTemplate: defaultTemplate });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates'
      });
    }
  },

  createTemplate: async (projectId, data) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create template');
      }

      const { template } = await response.json();

      set((state) => ({
        templates: [...state.templates, template],
        activeTemplate: data.is_default ? template : state.activeTemplate,
      }));

      return template;
    } catch (error) {
      console.error('Error creating template:', error);
      return null;
    }
  },

  updateTemplate: async (projectId, templateId, data) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, ...data }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      const { template } = await response.json();

      set((state) => ({
        templates: state.templates.map((t) =>
          t.id === templateId ? template : (data.is_default ? { ...t, is_default: false } : t)
        ),
        activeTemplate: state.activeTemplate?.id === templateId ? template : state.activeTemplate,
      }));

      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      return false;
    }
  },

  deleteTemplate: async (projectId, templateId) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/templates?templateId=${templateId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      set((state) => ({
        templates: state.templates.filter((t) => t.id !== templateId),
        activeTemplate: state.activeTemplate?.id === templateId ? null : state.activeTemplate,
      }));

      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      return false;
    }
  },

  setActiveTemplate: (template) => {
    set({ activeTemplate: template });
  },

  getDefaultTemplate: (projectId) => {
    const { templates } = get();
    return templates.find((t) => t.project_id === projectId && t.is_default);
  },
}));

// Helper function to create a default template config
export function createDefaultTemplateConfig(tableName: string, columns: string[]): TemplateConfig {
  return {
    table_name: tableName,
    columns: columns.map((name, index) => ({
      name,
      label: name,
      visible: true,
      order: index,
      format: 'text',
    })),
    filters: [],
    charts: [],
    layout: 'default',
    page_size: 50,
  };
}

// Helper function to create a chart
export function createTemplateChart(
  type: TemplateChart['type'],
  title: string,
  column: string,
  options?: Partial<TemplateChart>
): TemplateChart {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    column,
    aggregation: 'count',
    ...options,
  };
}
