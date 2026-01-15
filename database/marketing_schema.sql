-- Marketing Studio Database Schema
-- SELAI Insurance Marketing System

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MARKETING CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'social', -- 'social', 'landing_page', 'email'
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  platforms JSONB DEFAULT '[]'::jsonb, -- ['facebook', 'instagram', 'tiktok', 'whatsapp']
  content JSONB DEFAULT '{}'::jsonb, -- {text, image_url, video_url, cta_text, cta_link}
  landing_page_id UUID,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON marketing_campaigns(created_at DESC);

-- =====================================================
-- LANDING PAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  template VARCHAR(50) DEFAULT 'life-insurance', -- Template type
  content JSONB NOT NULL DEFAULT '{
    "hero": {
      "title": "",
      "subtitle": "",
      "image": "",
      "cta_text": "",
      "show_form": true
    },
    "features": [],
    "testimonials": [],
    "stats": [],
    "cta": {},
    "settings": {
      "primary_color": "#3b82f6",
      "secondary_color": "#8b5cf6",
      "font": "Geist"
    }
  }'::jsonb,
  meta JSONB DEFAULT '{
    "title": "",
    "description": "",
    "og_image": ""
  }'::jsonb,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_landing_pages_template ON landing_pages(template);
CREATE INDEX IF NOT EXISTS idx_landing_pages_created_at ON landing_pages(created_at DESC);

-- =====================================================
-- LANDING PAGE LEADS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS landing_page_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  message TEXT,
  insurance_type VARCHAR(100), -- Type of insurance interested in
  source VARCHAR(50), -- 'facebook', 'instagram', 'tiktok', 'whatsapp', 'direct'
  utm_params JSONB DEFAULT '{}'::jsonb, -- {utm_source, utm_medium, utm_campaign, utm_content}
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lead queries
CREATE INDEX IF NOT EXISTS idx_leads_landing_page ON landing_page_leads(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON landing_page_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON landing_page_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON landing_page_leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON landing_page_leads(created_at DESC);

-- =====================================================
-- MARKETING ASSETS TABLE (Media Library)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'image', 'video'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  size_bytes INTEGER,
  dimensions JSONB DEFAULT '{}'::jsonb, -- {width: number, height: number}
  duration_seconds INTEGER, -- For videos
  mime_type VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb, -- ['car', 'family', 'business']
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_type ON marketing_assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON marketing_assets(created_at DESC);

-- =====================================================
-- CAMPAIGN ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0, -- Ad spend if tracked
  platform VARCHAR(50), -- 'facebook', 'instagram', etc.
  source VARCHAR(100), -- Traffic source
  device VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint per campaign/page per day per platform
  UNIQUE(campaign_id, landing_page_id, date, platform)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_landing_page ON campaign_analytics(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON campaign_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_platform ON campaign_analytics(platform);

-- =====================================================
-- LANDING PAGE TEMPLATES TABLE (Predefined templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS landing_page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_he VARCHAR(255) NOT NULL, -- Hebrew name
  description TEXT,
  description_he TEXT, -- Hebrew description
  category VARCHAR(100), -- 'life', 'car', 'health', 'business', 'pension', 'home'
  preview_image TEXT,
  content JSONB NOT NULL, -- Full template content structure
  colors JSONB NOT NULL, -- {primary, secondary, accent, background}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INSERT DEFAULT TEMPLATES
-- =====================================================
INSERT INTO landing_page_templates (slug, name, name_he, description, description_he, category, colors, content, sort_order)
VALUES
  (
    'life-insurance',
    'Life Insurance',
    'ביטוח חיים',
    'Professional template for life insurance campaigns',
    'תבנית מקצועית לקמפיינים של ביטוח חיים',
    'life',
    '{"primary": "#3b82f6", "secondary": "#1e40af", "accent": "#60a5fa", "background": "#eff6ff"}'::jsonb,
    '{
      "hero": {
        "title": "הגנה על המשפחה שלך",
        "subtitle": "ביטוח חיים מקיף שמעניק לך שקט נפשי",
        "image": "/templates/life-hero.jpg",
        "cta_text": "קבל הצעת מחיר",
        "show_form": true
      },
      "features": [
        {"icon": "Shield", "title": "הגנה מלאה", "description": "כיסוי מקיף לכל תרחיש"},
        {"icon": "Heart", "title": "דאגה למשפחה", "description": "הבטחת עתיד יקיריך"},
        {"icon": "Wallet", "title": "מחירים הוגנים", "description": "תוכניות מותאמות לתקציב"}
      ],
      "testimonials": [
        {"name": "דוד כהן", "text": "שירות מעולה ומקצועי", "rating": 5}
      ],
      "stats": [
        {"value": "50,000+", "label": "לקוחות מרוצים"},
        {"value": "98%", "label": "שביעות רצון"},
        {"value": "24/7", "label": "תמיכה זמינה"}
      ]
    }'::jsonb,
    1
  ),
  (
    'car-insurance',
    'Car Insurance',
    'ביטוח רכב',
    'Dynamic template for car insurance campaigns',
    'תבנית דינמית לקמפיינים של ביטוח רכב',
    'car',
    '{"primary": "#f97316", "secondary": "#ea580c", "accent": "#fb923c", "background": "#fff7ed"}'::jsonb,
    '{
      "hero": {
        "title": "ביטוח רכב חכם",
        "subtitle": "הגנה מלאה לרכב שלך במחיר שמתאים לך",
        "image": "/templates/car-hero.jpg",
        "cta_text": "חשב פרמיה עכשיו",
        "show_form": true
      },
      "features": [
        {"icon": "Car", "title": "כיסוי מקיף", "description": "הגנה מפני כל נזק"},
        {"icon": "Zap", "title": "טיפול מהיר", "description": "שירות תביעות מהיר"},
        {"icon": "PiggyBank", "title": "חיסכון משמעותי", "description": "עד 30% הנחה"}
      ],
      "testimonials": [],
      "stats": [
        {"value": "30%", "label": "חיסכון ממוצע"},
        {"value": "15 דק׳", "label": "זמן טיפול בתביעה"},
        {"value": "100+", "label": "מוסכי הסדר"}
      ]
    }'::jsonb,
    2
  ),
  (
    'health-insurance',
    'Health Insurance',
    'ביטוח בריאות',
    'Calm and reassuring template for health insurance',
    'תבנית רגועה ומרגיעה לביטוח בריאות',
    'health',
    '{"primary": "#10b981", "secondary": "#059669", "accent": "#34d399", "background": "#ecfdf5"}'::jsonb,
    '{
      "hero": {
        "title": "הבריאות שלך בראש סדר העדיפויות",
        "subtitle": "ביטוח בריאות פרטי שנותן לך גישה לטיפול הטוב ביותר",
        "image": "/templates/health-hero.jpg",
        "cta_text": "בדוק התאמה",
        "show_form": true
      },
      "features": [
        {"icon": "Stethoscope", "title": "רופאים מומחים", "description": "גישה לטובים ביותר"},
        {"icon": "Clock", "title": "ללא המתנה", "description": "קביעת תורים מהירה"},
        {"icon": "Building2", "title": "בתי חולים פרטיים", "description": "טיפול VIP"}
      ],
      "testimonials": [],
      "stats": []
    }'::jsonb,
    3
  ),
  (
    'business-insurance',
    'Business Insurance',
    'ביטוח עסקי',
    'Professional template for business insurance',
    'תבנית מקצועית לביטוח עסקי',
    'business',
    '{"primary": "#8b5cf6", "secondary": "#7c3aed", "accent": "#a78bfa", "background": "#f5f3ff"}'::jsonb,
    '{
      "hero": {
        "title": "הגנה מקיפה לעסק שלך",
        "subtitle": "פתרונות ביטוח מותאמים לכל סוג עסק",
        "image": "/templates/business-hero.jpg",
        "cta_text": "קבל ייעוץ חינם",
        "show_form": true
      },
      "features": [
        {"icon": "Building", "title": "ביטוח רכוש", "description": "הגנה על הנכסים"},
        {"icon": "Users", "title": "אחריות מקצועית", "description": "כיסוי לטעויות"},
        {"icon": "Briefcase", "title": "אובדן הכנסה", "description": "רשת ביטחון"}
      ],
      "testimonials": [],
      "stats": []
    }'::jsonb,
    4
  ),
  (
    'pension-savings',
    'Pension & Savings',
    'פנסיה וחיסכון',
    'Elegant template for pension and savings products',
    'תבנית אלגנטית למוצרי פנסיה וחיסכון',
    'pension',
    '{"primary": "#eab308", "secondary": "#ca8a04", "accent": "#fde047", "background": "#fefce8"}'::jsonb,
    '{
      "hero": {
        "title": "בנה את העתיד הפיננסי שלך",
        "subtitle": "תוכניות פנסיה וחיסכון שיבטיחו לך פרישה נוחה",
        "image": "/templates/pension-hero.jpg",
        "cta_text": "תכנן את הפנסיה",
        "show_form": true
      },
      "features": [
        {"icon": "TrendingUp", "title": "תשואות גבוהות", "description": "ניהול השקעות מקצועי"},
        {"icon": "Lock", "title": "כספך בטוח", "description": "אבטחה מקסימלית"},
        {"icon": "Calculator", "title": "תכנון מותאם", "description": "לפי הצרכים שלך"}
      ],
      "testimonials": [],
      "stats": []
    }'::jsonb,
    5
  ),
  (
    'home-insurance',
    'Home Insurance',
    'ביטוח דירה',
    'Warm template for home insurance',
    'תבנית חמימה לביטוח דירה',
    'home',
    '{"primary": "#06b6d4", "secondary": "#0891b2", "accent": "#22d3ee", "background": "#ecfeff"}'::jsonb,
    '{
      "hero": {
        "title": "הבית שלך מוגן",
        "subtitle": "ביטוח דירה מקיף שמכסה את כל מה שחשוב לך",
        "image": "/templates/home-hero.jpg",
        "cta_text": "קבל הצעה",
        "show_form": true
      },
      "features": [
        {"icon": "Home", "title": "כיסוי מבנה", "description": "הגנה על הנכס"},
        {"icon": "Sofa", "title": "תכולה", "description": "כל מה שבפנים"},
        {"icon": "Droplets", "title": "נזקי מים", "description": "כיסוי צנרת"}
      ],
      "testimonials": [],
      "stats": []
    }'::jsonb,
    6
  )
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_templates ENABLE ROW LEVEL SECURITY;

-- Policies for marketing_campaigns
CREATE POLICY "Users can view all campaigns" ON marketing_campaigns
  FOR SELECT USING (true);

CREATE POLICY "Users can insert campaigns" ON marketing_campaigns
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own campaigns" ON marketing_campaigns
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own campaigns" ON marketing_campaigns
  FOR DELETE USING (true);

-- Policies for landing_pages
CREATE POLICY "Anyone can view published landing pages" ON landing_pages
  FOR SELECT USING (status = 'published' OR true);

CREATE POLICY "Users can create landing pages" ON landing_pages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update landing pages" ON landing_pages
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete landing pages" ON landing_pages
  FOR DELETE USING (true);

-- Policies for leads (more restrictive)
CREATE POLICY "Users can view leads" ON landing_page_leads
  FOR SELECT USING (true);

CREATE POLICY "Anyone can submit leads" ON landing_page_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update leads" ON landing_page_leads
  FOR UPDATE USING (true);

-- Policies for assets
CREATE POLICY "Users can view assets" ON marketing_assets
  FOR SELECT USING (true);

CREATE POLICY "Users can upload assets" ON marketing_assets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own assets" ON marketing_assets
  FOR DELETE USING (true);

-- Policies for analytics (read-only for most)
CREATE POLICY "Users can view analytics" ON campaign_analytics
  FOR SELECT USING (true);

CREATE POLICY "System can insert analytics" ON campaign_analytics
  FOR INSERT WITH CHECK (true);

-- Templates are read-only for users
CREATE POLICY "Anyone can view templates" ON landing_page_templates
  FOR SELECT USING (is_active = true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landing_pages_updated_at ON landing_pages;
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_landing_page_leads_updated_at ON landing_page_leads;
CREATE TRIGGER update_landing_page_leads_updated_at
  BEFORE UPDATE ON landing_page_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment page views
CREATE OR REPLACE FUNCTION increment_page_views(page_slug VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET views = views + 1
  WHERE slug = page_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to increment conversions
CREATE OR REPLACE FUNCTION increment_page_conversions(page_slug VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET conversions = conversions + 1
  WHERE slug = page_slug;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE marketing_campaigns IS 'Marketing campaigns for social media and landing pages';
COMMENT ON TABLE landing_pages IS 'Landing pages for lead generation';
COMMENT ON TABLE landing_page_leads IS 'Leads captured from landing pages';
COMMENT ON TABLE marketing_assets IS 'Media library for marketing assets';
COMMENT ON TABLE campaign_analytics IS 'Analytics data for campaigns and landing pages';
COMMENT ON TABLE landing_page_templates IS 'Predefined templates for landing pages';
