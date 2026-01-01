import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DataAnalysis,
  SmartDashboardTemplate,
  UserDashboardState,
  FieldSelection,
  FilterConfig,
  CardConfig,
  ChartConfig,
  TableConfig,
} from '@/types/dashboard';

interface SmartDashboardState {
  // Current analysis
  currentAnalysis: DataAnalysis | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Templates
  templates: SmartDashboardTemplate[];
  activeTemplate: SmartDashboardTemplate | null;
  isLoadingTemplates: boolean;

  // User state per project
  userStates: Record<string, UserDashboardState>;

  // Actions
  analyzeTable: (projectId: string, tableName: string) => Promise<DataAnalysis | null>;
  fetchTemplates: (projectId: string) => Promise<void>;
  createTemplate: (projectId: string, template: Omit<SmartDashboardTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SmartDashboardTemplate | null>;
  updateTemplate: (projectId: string, templateId: string, updates: Partial<SmartDashboardTemplate>) => Promise<boolean>;
  deleteTemplate: (projectId: string, templateId: string) => Promise<boolean>;
  setActiveTemplate: (template: SmartDashboardTemplate | null) => void;

  // User state actions
  saveUserState: (projectId: string, state: Partial<UserDashboardState>) => void;
  getUserState: (projectId: string) => UserDashboardState | undefined;
  clearUserState: (projectId: string) => void;
}

export const useSmartDashboardStore = create<SmartDashboardState>()(
  persist(
    (set, get) => ({
      currentAnalysis: null,
      isAnalyzing: false,
      analysisError: null,
      templates: [],
      activeTemplate: null,
      isLoadingTemplates: false,
      userStates: {},

      analyzeTable: async (projectId, tableName) => {
        set({ isAnalyzing: true, analysisError: null });

        try {
          const response = await fetch(
            `/api/projects/${projectId}/analyze?table=${encodeURIComponent(tableName)}`
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to analyze table');
          }

          const { analysis } = await response.json();
          set({ currentAnalysis: analysis, isAnalyzing: false });
          return analysis;
        } catch (error) {
          console.error('Analysis error:', error);
          set({
            isAnalyzing: false,
            analysisError: error instanceof Error ? error.message : 'Analysis failed',
          });
          return null;
        }
      },

      fetchTemplates: async (projectId) => {
        set({ isLoadingTemplates: true });

        try {
          const response = await fetch(`/api/projects/${projectId}/smart-templates`);

          if (!response.ok) {
            // API not available or error - just use empty array
            console.warn('Templates API not available, using empty array');
            set({ templates: [], isLoadingTemplates: false });
            return;
          }

          const result = await response.json();
          const templates = result.templates || [];
          set({ templates, isLoadingTemplates: false });

          // Set default template as active if none is set
          const { activeTemplate } = get();
          if (!activeTemplate && templates.length > 0) {
            const defaultTemplate = templates.find((t: SmartDashboardTemplate) => t.isDefault) || templates[0];
            set({ activeTemplate: defaultTemplate });
          }
        } catch (error) {
          // Silently handle errors - templates are optional
          console.warn('Failed to fetch templates:', error);
          set({ templates: [], isLoadingTemplates: false });
        }
      },

      createTemplate: async (projectId, template) => {
        try {
          const response = await fetch(`/api/projects/${projectId}/smart-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create template');
          }

          const { template: newTemplate } = await response.json();

          set(state => ({
            templates: [...state.templates, newTemplate],
            activeTemplate: template.isDefault ? newTemplate : state.activeTemplate,
          }));

          return newTemplate;
        } catch (error) {
          console.error('Error creating template:', error);
          return null;
        }
      },

      updateTemplate: async (projectId, templateId, updates) => {
        try {
          const response = await fetch(`/api/projects/${projectId}/smart-templates`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: templateId, ...updates }),
          });

          if (!response.ok) {
            throw new Error('Failed to update template');
          }

          const { template } = await response.json();

          set(state => ({
            templates: state.templates.map(t =>
              t.id === templateId ? template : (updates.isDefault ? { ...t, isDefault: false } : t)
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
            `/api/projects/${projectId}/smart-templates?templateId=${templateId}`,
            { method: 'DELETE' }
          );

          if (!response.ok) {
            throw new Error('Failed to delete template');
          }

          set(state => ({
            templates: state.templates.filter(t => t.id !== templateId),
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

      saveUserState: (projectId, state) => {
        set(prev => ({
          userStates: {
            ...prev.userStates,
            [projectId]: {
              ...prev.userStates[projectId],
              ...state,
              projectId,
              updatedAt: new Date().toISOString(),
            } as UserDashboardState,
          },
        }));
      },

      getUserState: (projectId) => {
        return get().userStates[projectId];
      },

      clearUserState: (projectId) => {
        set(prev => {
          const { [projectId]: _, ...rest } = prev.userStates;
          return { userStates: rest };
        });
      },
    }),
    {
      name: 'smart-dashboard-storage',
      partialize: (state) => ({
        userStates: state.userStates,
      }),
    }
  )
);

// Helper function to create a default template from analysis
export function createTemplateFromAnalysis(
  analysis: DataAnalysis,
  projectId: string,
  name: string = 'תבנית ברירת מחדל'
): Omit<SmartDashboardTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  // Create field selection from recommended fields
  const fieldSelection: FieldSelection[] = analysis.recommendedFields.map((name, index) => {
    const column = analysis.columns.find(c => c.name === name);
    return {
      name,
      order: index,
      visible: true,
      customLabel: column?.displayName,
    };
  });

  // Create cards for numeric fields
  const numericColumns = analysis.columns.filter(c => c.dataType === 'number');
  const cardsConfig: CardConfig[] = numericColumns.slice(0, 4).map((col, index) => ({
    id: crypto.randomUUID(),
    title: col.displayName,
    column: col.name,
    aggregation: 'sum',
    icon: index === 0 ? '💰' : index === 1 ? '📊' : index === 2 ? '📈' : '💵',
    color: ['blue', 'green', 'purple', 'amber'][index],
    format: 'number',
  }));

  // Create filters for enum fields
  const enumColumns = analysis.columns.filter(
    c => c.dataType === 'enum' || (c.stats.uniqueValues && c.stats.uniqueValues.length <= 20)
  );
  const filtersConfig: FilterConfig[] = enumColumns.slice(0, 5).map(col => ({
    column: col.name,
    type: 'enum',
    enabled: true,
    options: col.stats.uniqueValues,
  }));

  // Create table config
  const tableConfig: TableConfig = {
    columns: fieldSelection,
    pageSize: 50,
    enableSearch: true,
    enableExport: true,
  };

  // Create charts for enum fields
  const chartsConfig: ChartConfig[] = enumColumns.slice(0, 2).map((col, index) => ({
    id: crypto.randomUUID(),
    type: index === 0 ? 'pie' : 'bar',
    title: `התפלגות ${col.displayName}`,
    groupBy: col.name,
    aggregation: 'count',
    showLegend: true,
    showValues: true,
  }));

  return {
    projectId,
    name,
    tableName: analysis.tableName,
    dataAnalysis: analysis,
    fieldSelection,
    filtersConfig,
    cardsConfig,
    tableConfig,
    chartsConfig,
    isDefault: true,
  };
}
