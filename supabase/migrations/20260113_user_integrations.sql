-- =============================================
-- User Integrations Table
-- Stores personal API keys and integration settings per user
-- =============================================

-- Create user_integrations table
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Calendar Integrations
  google_calendar_key TEXT,
  google_calendar_refresh_token TEXT,
  cal_com_api_key TEXT,

  -- WhatsApp Integration (GreenAPI)
  whatsapp_instance_id TEXT,
  whatsapp_token TEXT,

  -- AI/LLM API Keys
  openai_api_key TEXT,
  anthropic_api_key TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per user
  CONSTRAINT user_integrations_user_id_unique UNIQUE (user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON public.user_integrations(user_id);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see/manage their own integrations
CREATE POLICY "Users can view own integrations"
  ON public.user_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON public.user_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.user_integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON public.user_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_integrations TO authenticated;

-- Add comment
COMMENT ON TABLE public.user_integrations IS 'Stores user personal API keys and integration settings for external services';
