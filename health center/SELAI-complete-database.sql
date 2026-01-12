-- =====================================================
-- SELAI DATA HEALTH SYSTEM - COMPLETE SQL
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- 1. SYNC_HISTORY TABLE (for logging health checks)
DROP TABLE IF EXISTS sync_history CASCADE;
CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type TEXT DEFAULT 'manual',
    tables_checked TEXT DEFAULT '[]',
    issues_found INTEGER DEFAULT 0,
    ai_summary TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_history_all" ON sync_history FOR ALL USING (true);
CREATE INDEX idx_sync_history_created ON sync_history(created_at DESC);

-- 2. SYNC_STATUS TABLE (for tracking table sync status)
DROP TABLE IF EXISTS sync_status CASCADE;
CREATE TABLE sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL UNIQUE,
    last_sync TIMESTAMPTZ,
    record_count INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_status_all" ON sync_status FOR ALL USING (true);

-- 3. DATA_QUALITY_ISSUES TABLE (for tracking data problems)
DROP TABLE IF EXISTS data_quality_issues CASCADE;
CREATE TABLE data_quality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    severity TEXT DEFAULT 'warning',
    record_id TEXT,
    field_name TEXT,
    current_value TEXT,
    suggested_fix TEXT,
    status TEXT DEFAULT 'open',
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE data_quality_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_quality_issues_all" ON data_quality_issues FOR ALL USING (true);
CREATE INDEX idx_issues_status ON data_quality_issues(status);
CREATE INDEX idx_issues_severity ON data_quality_issues(severity);

-- 4. DATA_SCHEMAS TABLE (for Excel column mappings)
DROP TABLE IF EXISTS data_schemas CASCADE;
CREATE TABLE data_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source_type TEXT DEFAULT 'excel',
    insurance_company TEXT,
    column_mappings JSONB DEFAULT '{}',
    sample_data JSONB,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE data_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_schemas_all" ON data_schemas FOR ALL USING (true);
CREATE INDEX idx_schemas_company ON data_schemas(insurance_company);
CREATE INDEX idx_schemas_active ON data_schemas(is_active);

-- 5. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. ADD TRIGGERS
DROP TRIGGER IF EXISTS trg_sync_history_updated ON sync_history;
CREATE TRIGGER trg_sync_history_updated
    BEFORE UPDATE ON sync_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sync_status_updated ON sync_status;
CREATE TRIGGER trg_sync_status_updated
    BEFORE UPDATE ON sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_issues_updated ON data_quality_issues;
CREATE TRIGGER trg_issues_updated
    BEFORE UPDATE ON data_quality_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_schemas_updated ON data_schemas;
CREATE TRIGGER trg_schemas_updated
    BEFORE UPDATE ON data_schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. INSERT SAMPLE SCHEMAS FOR INSURANCE COMPANIES
INSERT INTO data_schemas (name, insurance_company, column_mappings, is_active) VALUES
('הראל - דו"ח פוליסות', 'הראל', '{"מספר_פוליסה": "policy_number", "שם_מבוטח": "client_name", "תאריך_תחילה": "start_date", "סכום_ביטוח": "coverage_amount"}', true),
('מגדל - דו"ח עמלות', 'מגדל', '{"מספר_סוכן": "agent_id", "סכום_עמלה": "commission", "חודש": "month", "שם_לקוח": "client_name"}', true),
('פניקס - לקוחות', 'פניקס', '{"ת.ז": "id_number", "שם_פרטי": "first_name", "שם_משפחה": "last_name", "טלפון": "phone"}', true),
('כלל - פוליסות חיים', 'כלל', '{"מספר_פוליסה": "policy_number", "סוג_ביטוח": "insurance_type", "פרמיה": "premium", "תאריך_סיום": "end_date"}', true),
('מנורה - תביעות', 'מנורה', '{"מספר_תביעה": "claim_number", "תאריך_תביעה": "claim_date", "סכום": "amount", "סטטוס": "status"}', true)
ON CONFLICT DO NOTHING;

-- VERIFICATION
SELECT 'SUCCESS: All tables created!' as result;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('sync_history', 'sync_status', 'data_quality_issues', 'data_schemas');
