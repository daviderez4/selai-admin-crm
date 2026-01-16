-- Marketing System Tables
-- Tables for landing pages, marketing campaigns, and leads

-- ================================================
-- Landing Pages Table
-- ================================================
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    template TEXT, -- Template identifier (e.g., 'car-insurance', 'home-insurance')
    content JSONB DEFAULT '{}'::jsonb, -- Page content (headline, description, features, etc.)
    meta JSONB DEFAULT '{}'::jsonb, -- SEO metadata (title, description, keywords)
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    views INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for landing_pages
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_by ON landing_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_landing_pages_template ON landing_pages(template);

-- Enable RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for landing_pages
-- Authenticated users can view all landing pages
CREATE POLICY "Authenticated users can view landing pages" ON landing_pages
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can create landing pages
CREATE POLICY "Authenticated users can create landing pages" ON landing_pages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update landing pages they created or if they're admin
CREATE POLICY "Users can update landing pages" ON landing_pages
    FOR UPDATE
    TO authenticated
    USING (true);

-- Users can delete landing pages they created or if they're admin
CREATE POLICY "Users can delete landing pages" ON landing_pages
    FOR DELETE
    TO authenticated
    USING (true);

-- Public can view published landing pages (for public LP access)
CREATE POLICY "Public can view published landing pages" ON landing_pages
    FOR SELECT
    TO anon
    USING (status = 'published');

-- Public can update view/conversion counts
CREATE POLICY "Public can update counters" ON landing_pages
    FOR UPDATE
    TO anon
    USING (status = 'published')
    WITH CHECK (status = 'published');

-- ================================================
-- Marketing Campaigns Table
-- ================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'social' CHECK (type IN ('social', 'email', 'sms', 'whatsapp', 'display', 'search')),
    platforms TEXT[] DEFAULT '{}', -- Array of platform identifiers
    content JSONB DEFAULT '{}'::jsonb, -- Campaign content (headline, text, media, etc.)
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

-- Indexes for marketing_campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_landing_page ON marketing_campaigns(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON marketing_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled_at ON marketing_campaigns(scheduled_at);

-- Enable RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_campaigns
-- Authenticated users can view all campaigns
CREATE POLICY "Authenticated users can view campaigns" ON marketing_campaigns
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can create campaigns
CREATE POLICY "Authenticated users can create campaigns" ON marketing_campaigns
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update campaigns
CREATE POLICY "Users can update campaigns" ON marketing_campaigns
    FOR UPDATE
    TO authenticated
    USING (true);

-- Users can delete campaigns
CREATE POLICY "Users can delete campaigns" ON marketing_campaigns
    FOR DELETE
    TO authenticated
    USING (true);

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
    source TEXT DEFAULT 'direct', -- direct, facebook, google, instagram, etc.
    utm_params JSONB DEFAULT '{}'::jsonb, -- UTM parameters for tracking
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for landing_page_leads
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_landing_page ON landing_page_leads(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_campaign ON landing_page_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_status ON landing_page_leads(status);
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_phone ON landing_page_leads(phone);
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_email ON landing_page_leads(email);
CREATE INDEX IF NOT EXISTS idx_landing_page_leads_created_at ON landing_page_leads(created_at);

-- Enable RLS
ALTER TABLE landing_page_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for landing_page_leads
-- Authenticated users can view all leads
CREATE POLICY "Authenticated users can view leads" ON landing_page_leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Public can create leads (form submissions)
CREATE POLICY "Public can create leads" ON landing_page_leads
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Authenticated can also create leads
CREATE POLICY "Authenticated can create leads" ON landing_page_leads
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update leads
CREATE POLICY "Authenticated users can update leads" ON landing_page_leads
    FOR UPDATE
    TO authenticated
    USING (true);

-- Authenticated users can delete leads
CREATE POLICY "Authenticated users can delete leads" ON landing_page_leads
    FOR DELETE
    TO authenticated
    USING (true);

-- ================================================
-- Updated At Triggers
-- ================================================

-- Function for updating updated_at
CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for landing_pages
DROP TRIGGER IF EXISTS landing_pages_updated_at ON landing_pages;
CREATE TRIGGER landing_pages_updated_at
    BEFORE UPDATE ON landing_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_updated_at();

-- Trigger for marketing_campaigns
DROP TRIGGER IF EXISTS marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER marketing_campaigns_updated_at
    BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_updated_at();

-- Trigger for landing_page_leads
DROP TRIGGER IF EXISTS landing_page_leads_updated_at ON landing_page_leads;
CREATE TRIGGER landing_page_leads_updated_at
    BEFORE UPDATE ON landing_page_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_updated_at();

-- ================================================
-- Helper Functions
-- ================================================

-- Function to increment page views
CREATE OR REPLACE FUNCTION increment_page_views(page_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE landing_pages
    SET views = views + 1
    WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment page conversions
CREATE OR REPLACE FUNCTION increment_page_conversions(page_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE landing_pages
    SET conversions = conversions + 1
    WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment campaign metrics
CREATE OR REPLACE FUNCTION increment_campaign_metrics(
    p_campaign_id UUID,
    p_impressions INTEGER DEFAULT 0,
    p_clicks INTEGER DEFAULT 0,
    p_conversions INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
    UPDATE marketing_campaigns
    SET
        impressions = impressions + p_impressions,
        clicks = clicks + p_clicks,
        conversions = conversions + p_conversions
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_page_views(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_page_conversions(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_campaign_metrics(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ================================================
-- Comments
-- ================================================
COMMENT ON TABLE landing_pages IS 'Marketing landing pages for lead generation';
COMMENT ON TABLE marketing_campaigns IS 'Marketing campaigns across multiple platforms';
COMMENT ON TABLE landing_page_leads IS 'Leads collected from landing page forms';

COMMENT ON COLUMN landing_pages.content IS 'JSONB content: headline, description, features, cta, images, etc.';
COMMENT ON COLUMN landing_pages.meta IS 'JSONB SEO metadata: title, description, keywords, og_image';
COMMENT ON COLUMN marketing_campaigns.content IS 'JSONB content: headline, text, media URLs, variations';
COMMENT ON COLUMN marketing_campaigns.platforms IS 'Array of platforms: facebook, instagram, google, linkedin, etc.';
COMMENT ON COLUMN landing_page_leads.utm_params IS 'UTM tracking parameters: source, medium, campaign, term, content';
