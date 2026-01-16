-- System Settings Table
-- Stores global system configuration including email notification settings

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write system settings
CREATE POLICY "system_settings_admin_select" ON system_settings
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND user_type = 'admin'
    )
);

CREATE POLICY "system_settings_admin_insert" ON system_settings
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND user_type = 'admin'
    )
);

CREATE POLICY "system_settings_admin_update" ON system_settings
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND user_type = 'admin'
    )
);

CREATE POLICY "system_settings_admin_delete" ON system_settings
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid() AND user_type = 'admin'
    )
);

-- Service role has full access (for background jobs)
CREATE POLICY "system_settings_service_role" ON system_settings
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Allow anon to read email settings for lead notifications
CREATE POLICY "system_settings_anon_read_email" ON system_settings
FOR SELECT TO anon
USING (key = 'email_notifications');

-- Insert default email notification settings
INSERT INTO system_settings (key, value, description)
VALUES (
    'email_notifications',
    '{
        "from_email": "selai@selam.co.il",
        "from_name": "SELAI System",
        "reply_to": "support@selam.co.il",
        "notifications": {
            "new_lead": {"enabled": true, "recipients": [], "subject_prefix": "[ליד חדש]"},
            "lead_assigned": {"enabled": true, "recipients": [], "subject_prefix": "[ליד הוקצה]"},
            "daily_report": {"enabled": false, "recipients": [], "subject_prefix": "[דוח יומי]"},
            "weekly_report": {"enabled": false, "recipients": [], "subject_prefix": "[דוח שבועי]"},
            "campaign_alert": {"enabled": true, "recipients": [], "subject_prefix": "[התראת קמפיין]"},
            "system_alert": {"enabled": true, "recipients": [], "subject_prefix": "[התראת מערכת]"}
        }
    }'::jsonb,
    'Email notification settings for the system'
)
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON system_settings TO authenticated;
GRANT SELECT ON system_settings TO anon;
GRANT ALL ON system_settings TO service_role;
