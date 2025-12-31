-- Smart Dashboard Templates table
-- Stores configurable dashboard templates with field selection, filters, cards, and charts

CREATE TABLE IF NOT EXISTS smart_dashboard_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    table_name TEXT NOT NULL,

    -- Analysis data (cached for performance)
    data_analysis JSONB,

    -- Configuration
    field_selection JSONB DEFAULT '[]'::jsonb,  -- Array of FieldSelection
    filters_config JSONB DEFAULT '[]'::jsonb,   -- Array of FilterConfig
    cards_config JSONB DEFAULT '[]'::jsonb,     -- Array of CardConfig
    table_config JSONB DEFAULT '{"columns": [], "pageSize": 50, "enableSearch": true, "enableExport": true}'::jsonb,
    charts_config JSONB DEFAULT '[]'::jsonb,    -- Array of ChartConfig

    -- Metadata
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_smart_dashboard_templates_project_id
    ON smart_dashboard_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_smart_dashboard_templates_is_default
    ON smart_dashboard_templates(project_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_smart_dashboard_templates_table_name
    ON smart_dashboard_templates(project_id, table_name);

-- Enable RLS
ALTER TABLE smart_dashboard_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates for projects they have access to"
    ON smart_dashboard_templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = smart_dashboard_templates.project_id
            AND user_project_access.user_id = auth.uid()
        )
    );

CREATE POLICY "Editors and admins can insert templates"
    ON smart_dashboard_templates
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = smart_dashboard_templates.project_id
            AND user_project_access.user_id = auth.uid()
            AND user_project_access.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Editors and admins can update templates"
    ON smart_dashboard_templates
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = smart_dashboard_templates.project_id
            AND user_project_access.user_id = auth.uid()
            AND user_project_access.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Editors and admins can delete templates"
    ON smart_dashboard_templates
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_project_access
            WHERE user_project_access.project_id = smart_dashboard_templates.project_id
            AND user_project_access.user_id = auth.uid()
            AND user_project_access.role IN ('admin', 'editor')
        )
    );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_smart_dashboard_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER smart_dashboard_templates_updated_at
    BEFORE UPDATE ON smart_dashboard_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_smart_dashboard_templates_updated_at();

-- User Dashboard State table
-- Stores per-user state for dashboards (filters, column widths, etc.)
CREATE TABLE IF NOT EXISTS user_dashboard_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_id UUID REFERENCES smart_dashboard_templates(id) ON DELETE SET NULL,

    -- User state
    current_filters JSONB DEFAULT '{}'::jsonb,
    column_widths JSONB DEFAULT '{}'::jsonb,
    expanded_groups JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Unique constraint per user per project
    UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE user_dashboard_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user states
CREATE POLICY "Users can view their own dashboard states"
    ON user_dashboard_states
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own dashboard states"
    ON user_dashboard_states
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own dashboard states"
    ON user_dashboard_states
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own dashboard states"
    ON user_dashboard_states
    FOR DELETE
    USING (user_id = auth.uid());

-- Trigger to update updated_at for user states
CREATE TRIGGER user_dashboard_states_updated_at
    BEFORE UPDATE ON user_dashboard_states
    FOR EACH ROW
    EXECUTE FUNCTION update_smart_dashboard_templates_updated_at();
