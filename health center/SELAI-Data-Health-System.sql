-- ============================================================================
-- SELAI Data Health & Schema Registry System
-- מערכת מקיפה לניטור בריאות נתונים ורישום סכמות
-- ============================================================================
-- Created: 2026-01-12
-- Version: 1.0.0
-- Description: Complete data reliability infrastructure for SELAI
-- ============================================================================

-- ============================================================================
-- PART 1: SCHEMA REGISTRY TABLES
-- טבלאות לניהול סכמות Excel וממקורות חיצוניים
-- ============================================================================

-- טבלת סכמות נתונים ראשית
CREATE TABLE IF NOT EXISTS data_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    schema_name_en TEXT,
    description TEXT,
    source_type TEXT NOT NULL DEFAULT 'excel', -- 'excel', 'api', 'manual', 'csv'
    
    -- מיפוי עמודות
    column_mappings JSONB NOT NULL DEFAULT '{}',
    -- דוגמה: {"עמודה א": "first_name", "טלפון": "phone"}
    
    -- נורמליזציה
    normalization_rules JSONB DEFAULT '{}',
    -- דוגמה: {"phone": "remove_dashes", "date": "dd/mm/yyyy"}
    
    -- מטא-דאטה לזיהוי אוטומטי
    sample_headers TEXT[],
    header_patterns JSONB DEFAULT '[]',
    -- דוגמה: [{"pattern": "שם.*פרטי", "field": "first_name"}]
    
    -- שימוש ומעקב
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    auto_detected_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    
    -- סיווג
    category TEXT, -- 'pension', 'insurance', 'contacts', 'financial'
    insurance_company TEXT, -- 'הראל', 'מגדל', 'פניקס', etc.
    
    -- מטא-דאטה
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE, -- שיתוף עם סוכנים אחרים
    
    UNIQUE(project_id, schema_name)
);

-- היסטוריית שימוש בסכמות
CREATE TABLE IF NOT EXISTS schema_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id UUID REFERENCES data_schemas(id) ON DELETE SET NULL,
    project_id TEXT NOT NULL,
    
    -- פרטי הקובץ
    file_name TEXT,
    file_size_bytes BIGINT,
    row_count INTEGER,
    
    -- תוצאות
    detection_method TEXT, -- 'auto', 'manual', 'suggested'
    confidence_score DECIMAL(5,2),
    was_successful BOOLEAN DEFAULT TRUE,
    error_details JSONB,
    
    -- סטטיסטיקות
    valid_rows INTEGER,
    invalid_rows INTEGER,
    skipped_rows INTEGER,
    validation_errors JSONB DEFAULT '[]',
    
    -- מטא-דאטה
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processing_time_ms INTEGER
);

-- ============================================================================
-- PART 2: DATA HEALTH MONITORING TABLES
-- טבלאות לניטור בריאות נתונים בזמן אמת
-- ============================================================================

-- סטטוס סנכרון כללי
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    
    -- ספירות
    supabase_count BIGINT DEFAULT 0,
    base44_count BIGINT DEFAULT 0,
    discrepancy INTEGER DEFAULT 0,
    
    -- סטטוס סנכרון
    last_sync_at TIMESTAMPTZ,
    last_successful_sync TIMESTAMPTZ,
    pending_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    
    -- שגיאות אחרונות
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    error_count_24h INTEGER DEFAULT 0,
    
    -- בריאות
    health_score DECIMAL(5,2) DEFAULT 100.00, -- 0-100
    health_status TEXT DEFAULT 'healthy', -- 'healthy', 'warning', 'critical'
    
    -- מטא-דאטה
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, table_name)
);

-- בעיות תקינות נתונים
CREATE TABLE IF NOT EXISTS data_quality_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT,
    
    -- סוג הבעיה
    issue_type TEXT NOT NULL,
    -- 'invalid_phone', 'duplicate', 'missing_required', 'invalid_format', 
    -- 'orphan_record', 'invalid_reference', 'data_mismatch'
    
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    
    -- פרטי הבעיה
    field_name TEXT,
    current_value TEXT,
    expected_format TEXT,
    error_message TEXT,
    
    -- פתרון
    suggested_fix TEXT,
    auto_fixable BOOLEAN DEFAULT FALSE,
    
    -- סטטוס
    status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'fixing', 'resolved', 'ignored'
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- מטא-דאטה
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- היסטוריית סנכרונים
CREATE TABLE IF NOT EXISTS sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    
    -- פרטי הסנכרון
    sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual', 'scheduled'
    source_system TEXT, -- 'base44', 'excel', 'api', 'supabase'
    target_system TEXT, -- 'supabase', 'base44'
    
    -- טבלאות שסונכרנו
    tables_synced TEXT[],
    
    -- תוצאות
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'partial'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- שגיאות
    errors JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    
    -- זמנים
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- מטא-דאטה
    triggered_by UUID REFERENCES auth.users(id),
    trigger_source TEXT -- 'manual', 'scheduled', 'webhook', 'system'
);

-- תזמון סנכרונים
CREATE TABLE IF NOT EXISTS sync_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    
    -- הגדרות
    schedule_name TEXT NOT NULL,
    description TEXT,
    cron_expression TEXT NOT NULL, -- '0 */6 * * *' = כל 6 שעות
    timezone TEXT DEFAULT 'Asia/Jerusalem',
    
    -- מה לסנכרן
    sync_type TEXT DEFAULT 'incremental',
    tables_to_sync TEXT[] DEFAULT ARRAY['contacts', 'leads', 'policies'],
    
    -- סטטוס
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    
    -- מטא-דאטה
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: VALIDATION RULES
-- כללי תקינות לשדות
-- ============================================================================

CREATE TABLE IF NOT EXISTS validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT,
    
    -- הגדרת הכלל
    rule_name TEXT NOT NULL,
    field_type TEXT NOT NULL, -- 'phone', 'email', 'id_number', 'date', 'amount'
    
    -- לוגיקה
    validation_type TEXT NOT NULL, -- 'regex', 'function', 'range', 'enum', 'custom'
    validation_pattern TEXT, -- regex או שם פונקציה
    validation_params JSONB DEFAULT '{}',
    
    -- נורמליזציה
    normalization_function TEXT, -- פונקציה לנורמליזציה
    example_valid TEXT,
    example_invalid TEXT,
    
    -- סטטוס
    is_active BOOLEAN DEFAULT TRUE,
    is_global BOOLEAN DEFAULT FALSE, -- חל על כל הפרויקטים
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- הכנסת כללי תקינות בסיסיים
INSERT INTO validation_rules (rule_name, field_type, validation_type, validation_pattern, normalization_function, example_valid, example_invalid, is_global) VALUES
-- טלפון ישראלי
('israeli_phone', 'phone', 'regex', '^0[0-9]{8,9}$', 'normalize_israeli_phone', '0501234567', '501234567', TRUE),
-- תעודת זהות ישראלית
('israeli_id', 'id_number', 'function', 'validate_israeli_id', 'normalize_israeli_id', '123456782', '123456789', TRUE),
-- אימייל
('email', 'email', 'regex', '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', 'normalize_email', 'test@example.com', 'invalid-email', TRUE),
-- תאריך עברי
('hebrew_date', 'date', 'regex', '^[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}$', 'normalize_date_hebrew', '15/03/2024', '2024-03-15', TRUE),
-- סכום כסף
('money_amount', 'amount', 'regex', '^[0-9]{1,3}(,[0-9]{3})*(\.[0-9]{2})?$', 'normalize_amount', '1,234.56', 'abc', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- פונקציות עזר לבריאות נתונים
-- ============================================================================

-- פונקציה לוולידציה של תעודת זהות ישראלית
CREATE OR REPLACE FUNCTION validate_israeli_id(id_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    padded TEXT;
    digit INT;
    sum INT := 0;
    i INT;
BEGIN
    -- נורמליזציה - הסרת רווחים ומקפים
    id_number := REGEXP_REPLACE(id_number, '[^0-9]', '', 'g');
    
    -- בדיקת אורך
    IF LENGTH(id_number) > 9 THEN
        RETURN FALSE;
    END IF;
    
    -- padding עם אפסים
    padded := LPAD(id_number, 9, '0');
    
    -- אלגוריתם לוהן
    FOR i IN 1..9 LOOP
        digit := (SUBSTRING(padded, i, 1))::INT;
        IF i % 2 = 0 THEN
            digit := digit * 2;
            IF digit > 9 THEN
                digit := digit - 9;
            END IF;
        END IF;
        sum := sum + digit;
    END LOOP;
    
    RETURN sum % 10 = 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- פונקציה לנורמליזציה של טלפון ישראלי
CREATE OR REPLACE FUNCTION normalize_israeli_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    -- הסרת תווים לא רלוונטיים
    phone := REGEXP_REPLACE(phone, '[^0-9+]', '', 'g');
    
    -- המרת קידומת בינלאומית
    IF phone LIKE '+972%' THEN
        phone := '0' || SUBSTRING(phone FROM 5);
    ELSIF phone LIKE '972%' THEN
        phone := '0' || SUBSTRING(phone FROM 4);
    END IF;
    
    -- הסרת אפס כפול בהתחלה
    IF phone LIKE '00%' THEN
        phone := SUBSTRING(phone FROM 2);
    END IF;
    
    RETURN phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- פונקציה לחישוב ציון בריאות טבלה
CREATE OR REPLACE FUNCTION calculate_table_health_score(
    p_project_id TEXT,
    p_table_name TEXT
)
RETURNS DECIMAL AS $$
DECLARE
    v_total_records BIGINT;
    v_invalid_records BIGINT;
    v_missing_required BIGINT;
    v_duplicates BIGINT;
    v_score DECIMAL := 100.0;
BEGIN
    -- ספירת רשומות כללית
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE project_id = $1', p_table_name)
    INTO v_total_records
    USING p_project_id;
    
    IF v_total_records = 0 THEN
        RETURN 100.0;
    END IF;
    
    -- ספירת בעיות פתוחות
    SELECT COUNT(*) INTO v_invalid_records
    FROM data_quality_issues
    WHERE project_id = p_project_id 
    AND table_name = p_table_name
    AND status = 'open';
    
    -- חישוב ציון
    v_score := 100.0 - (v_invalid_records::DECIMAL / v_total_records * 100);
    
    -- וידוא שהציון בטווח
    IF v_score < 0 THEN v_score := 0; END IF;
    IF v_score > 100 THEN v_score := 100; END IF;
    
    RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לבדיקת בריאות כללית
CREATE OR REPLACE FUNCTION check_data_health(p_project_id TEXT)
RETURNS TABLE(
    table_name TEXT,
    total_records BIGINT,
    issues_count BIGINT,
    health_score DECIMAL,
    health_status TEXT,
    critical_issues BIGINT,
    last_sync TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.table_name,
        ss.supabase_count AS total_records,
        COALESCE(issues.cnt, 0) AS issues_count,
        ss.health_score,
        ss.health_status,
        COALESCE(critical.cnt, 0) AS critical_issues,
        ss.last_sync_at AS last_sync
    FROM sync_status ss
    LEFT JOIN (
        SELECT dqi.table_name AS tbl, COUNT(*) AS cnt
        FROM data_quality_issues dqi
        WHERE dqi.project_id = p_project_id AND dqi.status = 'open'
        GROUP BY dqi.table_name
    ) issues ON ss.table_name = issues.tbl
    LEFT JOIN (
        SELECT dqi.table_name AS tbl, COUNT(*) AS cnt
        FROM data_quality_issues dqi
        WHERE dqi.project_id = p_project_id 
        AND dqi.status = 'open' 
        AND dqi.severity = 'critical'
        GROUP BY dqi.table_name
    ) critical ON ss.table_name = critical.tbl
    WHERE ss.project_id = p_project_id
    ORDER BY ss.health_score ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לזיהוי סכמה אוטומטי
CREATE OR REPLACE FUNCTION detect_schema(
    p_project_id TEXT,
    p_headers TEXT[]
)
RETURNS TABLE(
    schema_id UUID,
    schema_name TEXT,
    confidence DECIMAL,
    matched_columns INT,
    total_columns INT
) AS $$
DECLARE
    v_schema RECORD;
    v_match_count INT;
    v_header_count INT;
    v_confidence DECIMAL;
BEGIN
    v_header_count := array_length(p_headers, 1);
    
    FOR v_schema IN 
        SELECT * FROM data_schemas 
        WHERE project_id = p_project_id AND is_active = TRUE
        ORDER BY use_count DESC
    LOOP
        -- חישוב התאמה
        SELECT COUNT(*) INTO v_match_count
        FROM unnest(p_headers) h
        WHERE EXISTS (
            SELECT 1 FROM jsonb_object_keys(v_schema.column_mappings) k
            WHERE h ILIKE '%' || k || '%' OR k ILIKE '%' || h || '%'
        );
        
        -- חישוב confidence
        IF v_header_count > 0 THEN
            v_confidence := (v_match_count::DECIMAL / v_header_count) * 100;
        ELSE
            v_confidence := 0;
        END IF;
        
        -- החזרת תוצאות מעל סף
        IF v_confidence >= 30 THEN
            schema_id := v_schema.id;
            schema_name := v_schema.schema_name;
            confidence := v_confidence;
            matched_columns := v_match_count;
            total_columns := v_header_count;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- פונקציה לסריקת בעיות תקינות
CREATE OR REPLACE FUNCTION scan_data_quality(
    p_project_id TEXT,
    p_table_name TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_issues_found INT := 0;
    v_tables TEXT[];
    v_table TEXT;
BEGIN
    -- קביעת טבלאות לסריקה
    IF p_table_name IS NOT NULL THEN
        v_tables := ARRAY[p_table_name];
    ELSE
        v_tables := ARRAY['contacts', 'leads', 'clients', 'policies', 'deals'];
    END IF;
    
    FOREACH v_table IN ARRAY v_tables
    LOOP
        -- בדיקת טלפונים לא תקינים
        IF v_table IN ('contacts', 'leads', 'clients') THEN
            INSERT INTO data_quality_issues (
                project_id, table_name, record_id, issue_type, 
                severity, field_name, current_value, expected_format,
                error_message, auto_fixable
            )
            SELECT 
                p_project_id,
                v_table,
                id::TEXT,
                'invalid_phone',
                'warning',
                'phone',
                phone,
                '05XXXXXXXX',
                'מספר טלפון לא תקין',
                TRUE
            FROM (
                SELECT id, phone FROM contacts WHERE project_id = p_project_id
                UNION ALL
                SELECT id, phone FROM leads WHERE project_id = p_project_id
            ) t
            WHERE phone IS NOT NULL 
            AND NOT (normalize_israeli_phone(phone) ~ '^0[0-9]{9}$')
            ON CONFLICT DO NOTHING;
            
            GET DIAGNOSTICS v_issues_found = ROW_COUNT;
        END IF;
        
        -- בדיקת רשומות ללא agent_id
        IF v_table IN ('contacts', 'leads', 'deals') THEN
            INSERT INTO data_quality_issues (
                project_id, table_name, record_id, issue_type,
                severity, field_name, error_message, auto_fixable
            )
            SELECT 
                p_project_id,
                v_table,
                id::TEXT,
                'missing_required',
                'error',
                'agent_id',
                'רשומה ללא שיוך לסוכן',
                FALSE
            FROM (
                SELECT id, agent_id FROM contacts WHERE project_id = p_project_id
                UNION ALL
                SELECT id, agent_id FROM leads WHERE project_id = p_project_id
            ) t
            WHERE agent_id IS NULL
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- בדיקת כפילויות
        INSERT INTO data_quality_issues (
            project_id, table_name, record_id, issue_type,
            severity, field_name, current_value, error_message, auto_fixable
        )
        SELECT 
            p_project_id,
            v_table,
            id::TEXT,
            'duplicate',
            'warning',
            'phone',
            phone,
            'קיים מספר טלפון זהה במערכת',
            FALSE
        FROM (
            SELECT id, phone,
                   ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at) as rn
            FROM contacts
            WHERE project_id = p_project_id AND phone IS NOT NULL
        ) t
        WHERE rn > 1
        ON CONFLICT DO NOTHING;
        
    END LOOP;
    
    -- עדכון סטטוס בריאות
    UPDATE sync_status ss
    SET 
        health_score = calculate_table_health_score(p_project_id, ss.table_name),
        health_status = CASE 
            WHEN calculate_table_health_score(p_project_id, ss.table_name) >= 90 THEN 'healthy'
            WHEN calculate_table_health_score(p_project_id, ss.table_name) >= 70 THEN 'warning'
            ELSE 'critical'
        END,
        updated_at = NOW()
    WHERE ss.project_id = p_project_id;
    
    RETURN v_issues_found;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: TRIGGERS
-- טריגרים לעדכון אוטומטי
-- ============================================================================

-- טריגר לעדכון use_count בסכמה
CREATE OR REPLACE FUNCTION update_schema_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schema_id IS NOT NULL THEN
        UPDATE data_schemas
        SET 
            use_count = use_count + 1,
            last_used_at = NOW(),
            success_rate = (
                SELECT AVG(CASE WHEN was_successful THEN 100 ELSE 0 END)
                FROM schema_usage_log
                WHERE schema_id = NEW.schema_id
            )
        WHERE id = NEW.schema_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_schema_usage
AFTER INSERT ON schema_usage_log
FOR EACH ROW EXECUTE FUNCTION update_schema_usage();

-- טריגר לעדכון sync_status
CREATE OR REPLACE FUNCTION update_sync_status_on_history()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE sync_status
        SET 
            last_sync_at = NEW.completed_at,
            last_successful_sync = NEW.completed_at,
            pending_syncs = 0,
            updated_at = NOW()
        WHERE project_id = NEW.project_id
        AND table_name = ANY(NEW.tables_synced);
    ELSIF NEW.status = 'failed' THEN
        UPDATE sync_status
        SET 
            last_error = (NEW.errors->0->>'message'),
            last_error_at = NOW(),
            error_count_24h = error_count_24h + 1,
            failed_syncs = failed_syncs + 1,
            updated_at = NOW()
        WHERE project_id = NEW.project_id
        AND table_name = ANY(NEW.tables_synced);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_sync_status
AFTER UPDATE ON sync_history
FOR EACH ROW EXECUTE FUNCTION update_sync_status_on_history();

-- ============================================================================
-- PART 6: INDEXES
-- אינדקסים לביצועים
-- ============================================================================

-- Schema Registry
CREATE INDEX IF NOT EXISTS idx_data_schemas_project ON data_schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_data_schemas_category ON data_schemas(category);
CREATE INDEX IF NOT EXISTS idx_data_schemas_source ON data_schemas(source_type);
CREATE INDEX IF NOT EXISTS idx_schema_usage_schema ON schema_usage_log(schema_id);
CREATE INDEX IF NOT EXISTS idx_schema_usage_project ON schema_usage_log(project_id);

-- Data Health
CREATE INDEX IF NOT EXISTS idx_sync_status_project ON sync_status(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_health ON sync_status(health_status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_project ON data_quality_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON data_quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_severity ON data_quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_quality_issues_table ON data_quality_issues(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_history_project ON sync_history(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);

-- ============================================================================
-- PART 7: ROW LEVEL SECURITY
-- הרשאות לטבלאות חדשות
-- ============================================================================

ALTER TABLE data_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "admin_all_data_schemas" ON data_schemas
    FOR ALL USING (is_admin());

CREATE POLICY "admin_all_schema_usage" ON schema_usage_log
    FOR ALL USING (is_admin());

CREATE POLICY "admin_all_sync_status" ON sync_status
    FOR ALL USING (is_admin());

CREATE POLICY "admin_all_quality_issues" ON data_quality_issues
    FOR ALL USING (is_admin());

CREATE POLICY "admin_all_sync_history" ON sync_history
    FOR ALL USING (is_admin());

CREATE POLICY "admin_all_sync_schedules" ON sync_schedules
    FOR ALL USING (is_admin());

-- Agent policies - רואה רק של הפרויקט שלו
CREATE POLICY "agent_read_schemas" ON data_schemas
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM user_profiles WHERE id = auth.uid()
        )
        OR is_public = TRUE
    );

CREATE POLICY "agent_read_sync_status" ON sync_status
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Validation rules - כולם יכולים לקרוא גלובליים
CREATE POLICY "read_global_validation_rules" ON validation_rules
    FOR SELECT USING (is_global = TRUE);

-- ============================================================================
-- PART 8: INITIAL DATA
-- נתונים התחלתיים
-- ============================================================================

-- סכמות נפוצות לחברות ביטוח ישראליות
INSERT INTO data_schemas (project_id, schema_name, schema_name_en, category, insurance_company, column_mappings, sample_headers, is_public)
VALUES 
-- הראל פנסיה
('default', 'דוח פנסיה הראל', 'harel_pension_report', 'pension', 'הראל', 
 '{"שם פרטי": "first_name", "שם משפחה": "last_name", "ת.ז.": "id_number", "טלפון נייד": "phone", "יתרה לתאריך": "balance", "תאריך הצטרפות": "join_date", "שיעור הפקדה": "contribution_rate"}'::jsonb,
 ARRAY['שם פרטי', 'שם משפחה', 'ת.ז.', 'טלפון נייד', 'יתרה לתאריך'],
 TRUE),

-- מגדל גמל
('default', 'דוח גמל מגדל', 'migdal_gemel_report', 'pension', 'מגדל',
 '{"מזהה": "id_number", "שם מלא": "full_name", "סכום": "balance", "סטטוס": "status", "תאריך פתיחה": "open_date"}'::jsonb,
 ARRAY['מזהה', 'שם מלא', 'סכום', 'סטטוס'],
 TRUE),

-- פניקס ביטוח
('default', 'דוח ביטוח פניקס', 'phoenix_insurance_report', 'insurance', 'פניקס',
 '{"מספר פוליסה": "policy_number", "שם המבוטח": "insured_name", "ת.ז. מבוטח": "id_number", "סוג ביטוח": "insurance_type", "פרמיה חודשית": "premium", "תאריך תחילה": "start_date", "תאריך סיום": "end_date"}'::jsonb,
 ARRAY['מספר פוליסה', 'שם המבוטח', 'ת.ז. מבוטח', 'סוג ביטוח'],
 TRUE),

-- אנשי קשר גנרי
('default', 'יבוא אנשי קשר', 'generic_contacts', 'contacts', NULL,
 '{"שם": "full_name", "שם פרטי": "first_name", "שם משפחה": "last_name", "טלפון": "phone", "נייד": "phone", "אימייל": "email", "מייל": "email", "כתובת": "address", "עיר": "city", "הערות": "notes"}'::jsonb,
 ARRAY['שם', 'טלפון', 'אימייל'],
 TRUE)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 9: VIEWS
-- תצוגות נוחות
-- ============================================================================

-- תצוגה מרוכזת של בריאות המערכת
CREATE OR REPLACE VIEW v_system_health AS
SELECT 
    project_id,
    COUNT(*) AS total_tables,
    AVG(health_score)::DECIMAL(5,2) AS avg_health_score,
    SUM(CASE WHEN health_status = 'healthy' THEN 1 ELSE 0 END) AS healthy_tables,
    SUM(CASE WHEN health_status = 'warning' THEN 1 ELSE 0 END) AS warning_tables,
    SUM(CASE WHEN health_status = 'critical' THEN 1 ELSE 0 END) AS critical_tables,
    SUM(pending_syncs) AS total_pending_syncs,
    MAX(last_sync_at) AS last_sync,
    SUM(supabase_count) AS total_records
FROM sync_status
GROUP BY project_id;

-- תצוגה של בעיות פתוחות
CREATE OR REPLACE VIEW v_open_issues AS
SELECT 
    project_id,
    table_name,
    issue_type,
    severity,
    COUNT(*) AS count,
    MIN(detected_at) AS oldest_issue,
    MAX(detected_at) AS newest_issue
FROM data_quality_issues
WHERE status = 'open'
GROUP BY project_id, table_name, issue_type, severity
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'error' THEN 2 
        WHEN 'warning' THEN 3 
        ELSE 4 
    END,
    count DESC;

-- תצוגה של סכמות פופולריות
CREATE OR REPLACE VIEW v_popular_schemas AS
SELECT 
    id,
    schema_name,
    category,
    insurance_company,
    use_count,
    success_rate,
    last_used_at,
    CASE 
        WHEN last_used_at > NOW() - INTERVAL '7 days' THEN 'recent'
        WHEN last_used_at > NOW() - INTERVAL '30 days' THEN 'active'
        ELSE 'stale'
    END AS usage_status
FROM data_schemas
WHERE is_active = TRUE
ORDER BY use_count DESC, last_used_at DESC NULLS LAST;

-- ============================================================================
-- DONE!
-- ============================================================================

COMMENT ON TABLE data_schemas IS 'רישום סכמות למיפוי קבצי Excel וממקורות חיצוניים';
COMMENT ON TABLE sync_status IS 'סטטוס סנכרון לכל טבלה בפרויקט';
COMMENT ON TABLE data_quality_issues IS 'בעיות תקינות נתונים שזוהו';
COMMENT ON TABLE sync_history IS 'היסטוריית סנכרונים';
COMMENT ON TABLE validation_rules IS 'כללי תקינות לשדות';
