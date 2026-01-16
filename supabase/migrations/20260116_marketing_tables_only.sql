-- Marketing System Tables ONLY (no project_guests references)
-- Run this in Supabase SQL Editor

-- ================================================
-- Landing Pages Table
-- ================================================
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    template TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    meta JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    views INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_by ON landing_pages(created_by);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lp_select_auth" ON landing_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "lp_insert_auth" ON landing_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lp_update_auth" ON landing_pages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lp_delete_auth" ON landing_pages FOR DELETE TO authenticated USING (true);
CREATE POLICY "lp_select_anon" ON landing_pages FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "lp_update_anon" ON landing_pages FOR UPDATE TO anon USING (status = 'published') WITH CHECK (status = 'published');

-- ================================================
-- Marketing Campaigns Table
-- ================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'social' CHECK (type IN ('social', 'email', 'sms', 'whatsapp', 'display', 'search')),
    platforms TEXT[] DEFAULT '{}',
    content JSONB DEFAULT '{}'::jsonb,
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    budget DECIMAL(10,2),
    spent DECIMAL(10,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_landing_page ON marketing_campaigns(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON marketing_campaigns(created_by);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mc_select_auth" ON marketing_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "mc_insert_auth" ON marketing_campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "mc_update_auth" ON marketing_campaigns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "mc_delete_auth" ON marketing_campaigns FOR DELETE TO authenticated USING (true);

-- ================================================
-- Landing Page Leads Table
-- ================================================
CREATE TABLE IF NOT EXISTS landing_page_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    message TEXT,
    insurance_type TEXT,
    source TEXT DEFAULT 'direct',
    utm_params JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_page_leads_landing_page ON landing_page_leads(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_campaign ON landing_page_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_status ON landing_page_leads(status);

ALTER TABLE landing_page_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_auth" ON landing_page_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_insert_anon" ON landing_page_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "leads_insert_auth" ON landing_page_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leads_update_auth" ON landing_page_leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "leads_delete_auth" ON landing_page_leads FOR DELETE TO authenticated USING (true);

-- ================================================
-- Triggers
-- ================================================
CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS landing_pages_updated_at ON landing_pages;
CREATE TRIGGER landing_pages_updated_at BEFORE UPDATE ON landing_pages FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

DROP TRIGGER IF EXISTS marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER marketing_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

DROP TRIGGER IF EXISTS landing_page_leads_updated_at ON landing_page_leads;
CREATE TRIGGER landing_page_leads_updated_at BEFORE UPDATE ON landing_page_leads FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();

-- ================================================
-- Helper Functions
-- ================================================
CREATE OR REPLACE FUNCTION increment_page_views(page_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE landing_pages SET views = views + 1 WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_page_conversions(page_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE landing_pages SET conversions = conversions + 1 WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_page_views(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_page_conversions(UUID) TO anon, authenticated;
