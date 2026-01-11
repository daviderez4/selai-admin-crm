-- =====================================================
-- AUTOMATION SYSTEM TABLES
-- Created: 2026-01-11
-- Purpose: Support for automated imports, message templates, and agent operations
-- =====================================================

-- 1. Scheduled Imports Configuration
-- Stores settings for automated email-to-import mappings
CREATE TABLE IF NOT EXISTS scheduled_imports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Email configuration
  email_address TEXT NOT NULL,           -- Dedicated receiving email for this import
  sender_whitelist TEXT[] DEFAULT '{}',  -- Allowed sender emails (empty = all allowed)
  subject_pattern TEXT,                  -- Regex pattern to match email subjects

  -- Import settings
  target_table TEXT NOT NULL,            -- 'master_data', 'nifraim', 'gemel', etc.
  import_mode TEXT DEFAULT 'append',     -- Always 'append' for automated imports
  data_frequency TEXT DEFAULT 'daily',   -- 'daily', 'weekly', 'monthly'
  expected_day_of_month INTEGER,         -- For monthly imports (1-31)

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_import_at TIMESTAMPTZ,
  last_error TEXT,
  import_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- 2. Inbound Emails Tracking
-- Logs all incoming emails and their processing status
CREATE TABLE IF NOT EXISTS inbound_emails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scheduled_import_id UUID REFERENCES scheduled_imports(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Email details
  message_id TEXT UNIQUE NOT NULL,       -- Unique email message ID
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,

  -- Attachment info
  attachment_name TEXT,
  attachment_size INTEGER,
  attachment_url TEXT,                   -- Supabase Storage URL

  -- Processing status
  status TEXT DEFAULT 'pending',         -- 'pending', 'processing', 'imported', 'failed', 'rejected'
  import_log_id UUID REFERENCES import_logs(id),
  error_message TEXT,

  -- Raw webhook data
  raw_headers JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Message Templates
-- Templates for WhatsApp, SMS, and email messages
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL,
  channel TEXT NOT NULL,                 -- 'whatsapp', 'sms', 'email'
  category TEXT,                         -- 'status_update', 'reminder', 'welcome', 'follow_up'

  -- Content with placeholders like {client_name}, {status}, {amount}
  template_text TEXT NOT NULL,
  placeholders TEXT[] DEFAULT '{}',      -- List of placeholder names used

  -- For email templates
  email_subject TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,      -- Default template for this channel
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- 4. Communication Logs
-- Tracks all outbound communications
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Message details
  channel TEXT NOT NULL,                 -- 'whatsapp', 'sms', 'email', 'call'
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,

  -- Recipient info
  recipient_phone TEXT,
  recipient_email TEXT,
  recipient_name TEXT,

  -- Content
  message_content TEXT NOT NULL,

  -- Context - which record this relates to
  record_id TEXT,                        -- ID of the related data record
  record_table TEXT,                     -- 'master_data', 'nifraim', etc.

  -- Status
  status TEXT DEFAULT 'sent',            -- 'pending', 'sent', 'delivered', 'failed'

  -- Metadata
  sent_by UUID REFERENCES auth.users(id) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Agent Action Logs
-- Tracks all actions taken by agents on records
CREATE TABLE IF NOT EXISTS agent_action_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Action details
  action_type TEXT NOT NULL,             -- 'status_update', 'note_added', 'message_sent', 'call_made', 'assigned'
  record_id TEXT NOT NULL,               -- ID of the affected record
  record_table TEXT NOT NULL,            -- 'master_data', 'nifraim', etc.

  -- Change tracking
  previous_value JSONB,                  -- Previous state (for updates)
  new_value JSONB,                       -- New state

  -- Notes
  agent_notes TEXT,

  -- Who/When
  agent_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE scheduled_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_action_logs ENABLE ROW LEVEL SECURITY;

-- Scheduled Imports Policies
CREATE POLICY "Users can view scheduled imports for their projects" ON scheduled_imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = scheduled_imports.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage scheduled imports" ON scheduled_imports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = scheduled_imports.project_id
      AND user_project_access.user_id = auth.uid()
      AND user_project_access.role = 'admin'
    )
  );

-- Inbound Emails Policies
CREATE POLICY "Users can view inbound emails for their projects" ON inbound_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = inbound_emails.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

-- Message Templates Policies
CREATE POLICY "Users can view message templates for their projects" ON message_templates
  FOR SELECT USING (
    project_id IS NULL OR -- Global templates
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = message_templates.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage message templates" ON message_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = message_templates.project_id
      AND user_project_access.user_id = auth.uid()
      AND user_project_access.role IN ('admin', 'editor')
    )
  );

-- Communication Logs Policies
CREATE POLICY "Users can view communication logs for their projects" ON communication_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = communication_logs.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create communication logs" ON communication_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = communication_logs.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

-- Agent Action Logs Policies
CREATE POLICY "Users can view agent action logs for their projects" ON agent_action_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = agent_action_logs.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agent action logs" ON agent_action_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_project_access
      WHERE user_project_access.project_id = agent_action_logs.project_id
      AND user_project_access.user_id = auth.uid()
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Scheduled Imports indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_imports_project_id ON scheduled_imports(project_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_imports_is_active ON scheduled_imports(is_active);

-- Inbound Emails indexes
CREATE INDEX IF NOT EXISTS idx_inbound_emails_project_id ON inbound_emails(project_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON inbound_emails(status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_received_at ON inbound_emails(received_at DESC);

-- Message Templates indexes
CREATE INDEX IF NOT EXISTS idx_message_templates_project_id ON message_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active ON message_templates(is_active);

-- Communication Logs indexes
CREATE INDEX IF NOT EXISTS idx_communication_logs_project_id ON communication_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_record_id ON communication_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_sent_at ON communication_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_logs_channel ON communication_logs(channel);

-- Agent Action Logs indexes
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_project_id ON agent_action_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_record_id ON agent_action_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_agent_id ON agent_action_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_created_at ON agent_action_logs(created_at DESC);

-- =====================================================
-- DEFAULT MESSAGE TEMPLATES (Hebrew)
-- =====================================================

-- Insert default WhatsApp templates
INSERT INTO message_templates (id, project_id, name, channel, category, template_text, placeholders, is_active, is_default, created_by)
VALUES
  (
    uuid_generate_v4(),
    NULL, -- Global template
    'עדכון סטטוס',
    'whatsapp',
    'status_update',
    'שלום {שם_לקוח}, זוהי הודעה מסוכנות הביטוח. סטטוס התהליך שלך: {סטטוס}. לשאלות ניתן לפנות אלינו.',
    ARRAY['שם_לקוח', 'סטטוס'],
    true,
    true,
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    uuid_generate_v4(),
    NULL,
    'תזכורת חתימה',
    'whatsapp',
    'reminder',
    'שלום {שם_לקוח}, נבקש להזכיר שיש לחתום על המסמכים בהקדם. מספר תהליך: {מספר_תהליך}',
    ARRAY['שם_לקוח', 'מספר_תהליך'],
    true,
    false,
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    uuid_generate_v4(),
    NULL,
    'ברוכים הבאים',
    'whatsapp',
    'welcome',
    'שלום {שם_לקוח}, תודה שבחרת בנו! הסוכן שלך {מטפל} יצור איתך קשר בקרוב.',
    ARRAY['שם_לקוח', 'מטפל'],
    true,
    false,
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    uuid_generate_v4(),
    NULL,
    'עדכון צבירה',
    'whatsapp',
    'status_update',
    'שלום {שם_לקוח}, להלן עדכון לגבי הפוליסה שלך: יצרן: {יצרן_חדש}, צבירה צפויה: {סהכ_צבירה_צפויה_מניוד} ש"ח',
    ARRAY['שם_לקוח', 'יצרן_חדש', 'סהכ_צבירה_צפויה_מניוד'],
    true,
    false,
    (SELECT id FROM auth.users LIMIT 1)
  )
ON CONFLICT DO NOTHING;
