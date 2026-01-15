-- ============================================
-- SELAI Insurance Integration Hub
-- Database Migration: 004_functions.sql
-- Helper Functions & Stored Procedures
-- ============================================

-- ============================================
-- MATERIALIZED VIEW REFRESH
-- ============================================

-- Function to refresh customer summary materialized view
CREATE OR REPLACE FUNCTION refresh_customer_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (call from application or pg_cron)
COMMENT ON FUNCTION refresh_customer_summary() IS 'Refresh mv_customer_summary materialized view. Call periodically (e.g., every 15 minutes)';

-- ============================================
-- CUSTOMER FUNCTIONS
-- ============================================

-- Get customer's total coverage by type
CREATE OR REPLACE FUNCTION get_customer_coverage_by_type(p_customer_id UUID)
RETURNS TABLE (
    insurance_type VARCHAR,
    policy_count BIGINT,
    total_coverage NUMERIC,
    total_premium NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.insurance_type::VARCHAR,
        COUNT(*)::BIGINT,
        COALESCE(SUM(p.coverage_amount), 0)::NUMERIC,
        COALESCE(SUM(p.premium_amount), 0)::NUMERIC
    FROM policies p
    WHERE p.customer_id = p_customer_id
        AND p.status = 'active'
    GROUP BY p.insurance_type;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate customer's coverage score
CREATE OR REPLACE FUNCTION calculate_coverage_score(
    p_customer_id UUID,
    p_has_life BOOLEAN DEFAULT false,
    p_has_health BOOLEAN DEFAULT false,
    p_has_home BOOLEAN DEFAULT false,
    p_has_vehicle BOOLEAN DEFAULT false,
    p_has_pension BOOLEAN DEFAULT false,
    p_gaps_count INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
BEGIN
    -- Base score for each coverage type
    IF p_has_life THEN v_score := v_score + 25; END IF;
    IF p_has_health THEN v_score := v_score + 25; END IF;
    IF p_has_home THEN v_score := v_score + 15; END IF;
    IF p_has_vehicle THEN v_score := v_score + 15; END IF;
    IF p_has_pension THEN v_score := v_score + 20; END IF;

    -- Penalty for gaps
    v_score := v_score - (p_gaps_count * 5);

    -- Ensure score is between 0 and 100
    RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get coverage grade from score
CREATE OR REPLACE FUNCTION get_coverage_grade(p_score INTEGER)
RETURNS CHAR(1) AS $$
BEGIN
    RETURN CASE
        WHEN p_score >= 90 THEN 'A'
        WHEN p_score >= 75 THEN 'B'
        WHEN p_score >= 60 THEN 'C'
        WHEN p_score >= 40 THEN 'D'
        ELSE 'F'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- POLICY FUNCTIONS
-- ============================================

-- Get expiring policies
CREATE OR REPLACE FUNCTION get_expiring_policies(
    p_days_ahead INTEGER DEFAULT 30,
    p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    policy_id UUID,
    policy_number VARCHAR,
    customer_id UUID,
    customer_name TEXT,
    insurance_type VARCHAR,
    carrier_code VARCHAR,
    end_date DATE,
    days_until_expiry INTEGER,
    premium_amount NUMERIC,
    agent_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.policy_number,
        p.customer_id,
        (c.first_name || ' ' || c.last_name)::TEXT,
        p.insurance_type::VARCHAR,
        p.carrier_code::VARCHAR,
        p.end_date,
        (p.end_date - CURRENT_DATE)::INTEGER,
        p.premium_amount,
        p.agent_id
    FROM policies p
    JOIN customers c ON p.customer_id = c.id
    WHERE p.status = 'active'
        AND p.end_date IS NOT NULL
        AND p.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
        AND (p_agent_id IS NULL OR p.agent_id = p_agent_id)
    ORDER BY p.end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check policy overlap
CREATE OR REPLACE FUNCTION check_policy_overlap(
    p_customer_id UUID,
    p_insurance_type VARCHAR,
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_policy_id UUID DEFAULT NULL
)
RETURNS TABLE (
    overlapping_policy_id UUID,
    policy_number VARCHAR,
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.policy_number,
        p.start_date,
        p.end_date
    FROM policies p
    WHERE p.customer_id = p_customer_id
        AND p.insurance_type = p_insurance_type
        AND p.status = 'active'
        AND (p_exclude_policy_id IS NULL OR p.id != p_exclude_policy_id)
        AND (
            (p.start_date, COALESCE(p.end_date, '9999-12-31'::DATE))
            OVERLAPS
            (p_start_date, COALESCE(p_end_date, '9999-12-31'::DATE))
        );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- QUOTE FUNCTIONS
-- ============================================

-- Clean up expired quotes
CREATE OR REPLACE FUNCTION cleanup_expired_quotes(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    UPDATE quote_history
    SET status = 'expired'
    WHERE status = 'pending'
        AND expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Get best quote for request
CREATE OR REPLACE FUNCTION get_best_quote(p_request_id UUID)
RETURNS TABLE (
    quote_id UUID,
    carrier_code VARCHAR,
    carrier_name VARCHAR,
    monthly_premium NUMERIC,
    annual_premium NUMERIC,
    ranking_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        qh.id,
        qh.carrier_code::VARCHAR,
        qh.carrier_name::VARCHAR,
        qh.monthly_premium,
        qh.annual_premium,
        qh.ranking_score
    FROM quote_history qh
    WHERE qh.request_id = p_request_id
        AND qh.status = 'pending'
        AND qh.expires_at > CURRENT_TIMESTAMP
    ORDER BY qh.rank_position
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- NOTIFICATION FUNCTIONS
-- ============================================

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_customer_id UUID DEFAULT NULL,
    p_agent_id UUID DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal',
    p_channel VARCHAR DEFAULT 'in_app',
    p_related_entity_type VARCHAR DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_scheduled_for TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    p_action_url VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        type,
        title,
        message,
        customer_id,
        agent_id,
        priority,
        channel,
        related_entity_type,
        related_entity_id,
        scheduled_for,
        action_url,
        metadata
    ) VALUES (
        p_type,
        p_title,
        p_message,
        p_customer_id,
        p_agent_id,
        p_priority,
        p_channel,
        p_related_entity_type,
        p_related_entity_id,
        p_scheduled_for,
        p_action_url,
        p_metadata
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create policy expiry notifications
CREATE OR REPLACE FUNCTION create_expiry_notifications(
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    v_policy RECORD;
    v_created INTEGER := 0;
BEGIN
    FOR v_policy IN
        SELECT
            p.id AS policy_id,
            p.policy_number,
            p.customer_id,
            p.agent_id,
            p.insurance_type,
            p.end_date,
            (p.end_date - CURRENT_DATE) AS days_until
        FROM policies p
        WHERE p.status = 'active'
            AND p.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
            AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.related_entity_type = 'policy'
                    AND n.related_entity_id = p.id
                    AND n.type = 'policy_expiring'
                    AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
            )
    LOOP
        PERFORM create_notification(
            'policy_expiring',
            'Policy Expiring Soon',
            format('Policy %s (%s) expires in %s days',
                v_policy.policy_number,
                v_policy.insurance_type,
                v_policy.days_until
            ),
            v_policy.customer_id,
            v_policy.agent_id,
            CASE WHEN v_policy.days_until <= 7 THEN 'high' ELSE 'normal' END,
            'in_app',
            'policy',
            v_policy.policy_id,
            CURRENT_TIMESTAMP,
            format('/policies/%s', v_policy.policy_id)
        );
        v_created := v_created + 1;
    END LOOP;

    RETURN v_created;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REMINDER FUNCTIONS
-- ============================================

-- Create reminder
CREATE OR REPLACE FUNCTION create_reminder(
    p_type VARCHAR,
    p_title VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_agent_id UUID DEFAULT NULL,
    p_due_date DATE DEFAULT CURRENT_DATE,
    p_priority VARCHAR DEFAULT 'normal',
    p_related_entity_type VARCHAR DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_recurrence_rule VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_reminder_id UUID;
BEGIN
    INSERT INTO scheduled_reminders (
        type,
        title,
        description,
        customer_id,
        agent_id,
        due_date,
        priority,
        related_entity_type,
        related_entity_id,
        recurrence_rule,
        metadata
    ) VALUES (
        p_type,
        p_title,
        p_description,
        p_customer_id,
        p_agent_id,
        p_due_date,
        p_priority,
        p_related_entity_type,
        p_related_entity_id,
        p_recurrence_rule,
        p_metadata
    )
    RETURNING id INTO v_reminder_id;

    RETURN v_reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Complete reminder and create next if recurring
CREATE OR REPLACE FUNCTION complete_reminder(
    p_reminder_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_reminder RECORD;
    v_next_id UUID;
    v_next_date DATE;
BEGIN
    -- Get reminder details
    SELECT * INTO v_reminder
    FROM scheduled_reminders
    WHERE id = p_reminder_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reminder not found';
    END IF;

    -- Mark as completed
    UPDATE scheduled_reminders
    SET status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        metadata = metadata || jsonb_build_object('completion_notes', p_notes)
    WHERE id = p_reminder_id;

    -- Create next occurrence if recurring
    IF v_reminder.recurrence_rule IS NOT NULL THEN
        v_next_date := CASE v_reminder.recurrence_rule
            WHEN 'daily' THEN v_reminder.due_date + INTERVAL '1 day'
            WHEN 'weekly' THEN v_reminder.due_date + INTERVAL '1 week'
            WHEN 'biweekly' THEN v_reminder.due_date + INTERVAL '2 weeks'
            WHEN 'monthly' THEN v_reminder.due_date + INTERVAL '1 month'
            WHEN 'quarterly' THEN v_reminder.due_date + INTERVAL '3 months'
            WHEN 'yearly' THEN v_reminder.due_date + INTERVAL '1 year'
            ELSE NULL
        END;

        IF v_next_date IS NOT NULL THEN
            v_next_id := create_reminder(
                v_reminder.type,
                v_reminder.title,
                v_reminder.description,
                v_reminder.customer_id,
                v_reminder.agent_id,
                v_next_date::DATE,
                v_reminder.priority,
                v_reminder.related_entity_type,
                v_reminder.related_entity_id,
                v_reminder.recurrence_rule,
                v_reminder.metadata
            );

            -- Update original with next occurrence
            UPDATE scheduled_reminders
            SET next_occurrence = v_next_date
            WHERE id = p_reminder_id;

            RETURN v_next_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Snooze reminder
CREATE OR REPLACE FUNCTION snooze_reminder(
    p_reminder_id UUID,
    p_snooze_until DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE scheduled_reminders
    SET status = 'snoozed',
        snoozed_until = p_snooze_until
    WHERE id = p_reminder_id
        AND status IN ('pending', 'snoozed');

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMISSION FUNCTIONS
-- ============================================

-- Calculate commission for policy
CREATE OR REPLACE FUNCTION calculate_commission(
    p_premium_amount NUMERIC,
    p_insurance_type VARCHAR,
    p_carrier_code VARCHAR,
    p_is_new_policy BOOLEAN DEFAULT true
)
RETURNS NUMERIC AS $$
DECLARE
    v_commission_rate NUMERIC;
    v_commission NUMERIC;
BEGIN
    -- Get commission rate from products table
    SELECT commission_rate INTO v_commission_rate
    FROM insurance_products
    WHERE carrier_code = p_carrier_code
        AND insurance_type = p_insurance_type
        AND is_active = true
    LIMIT 1;

    -- Default rates if not found
    IF v_commission_rate IS NULL THEN
        v_commission_rate := CASE p_insurance_type
            WHEN 'life' THEN 0.35
            WHEN 'health' THEN 0.25
            WHEN 'home' THEN 0.15
            WHEN 'vehicle' THEN 0.12
            WHEN 'pension' THEN 0.02
            ELSE 0.10
        END;
    END IF;

    -- Renewal policies get lower commission
    IF NOT p_is_new_policy THEN
        v_commission_rate := v_commission_rate * 0.5;
    END IF;

    v_commission := p_premium_amount * v_commission_rate;

    RETURN ROUND(v_commission, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- COVERAGE GAP FUNCTIONS
-- ============================================

-- Record coverage gap
CREATE OR REPLACE FUNCTION record_coverage_gap(
    p_customer_id UUID,
    p_gap_type VARCHAR,
    p_title VARCHAR,
    p_description TEXT,
    p_priority VARCHAR DEFAULT 'medium',
    p_recommended_coverage NUMERIC DEFAULT NULL,
    p_estimated_premium NUMERIC DEFAULT NULL,
    p_risk_score INTEGER DEFAULT 50,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_gap_id UUID;
BEGIN
    -- Check if similar gap already exists
    SELECT id INTO v_gap_id
    FROM coverage_gaps
    WHERE customer_id = p_customer_id
        AND gap_type = p_gap_type
        AND status = 'open';

    IF FOUND THEN
        -- Update existing gap
        UPDATE coverage_gaps
        SET title = p_title,
            description = p_description,
            priority = p_priority,
            recommended_coverage = COALESCE(p_recommended_coverage, recommended_coverage),
            estimated_premium = COALESCE(p_estimated_premium, estimated_premium),
            risk_score = p_risk_score,
            metadata = metadata || p_metadata,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_gap_id;

        RETURN v_gap_id;
    ELSE
        -- Create new gap
        INSERT INTO coverage_gaps (
            customer_id,
            gap_type,
            title,
            description,
            priority,
            recommended_coverage,
            estimated_premium,
            risk_score,
            metadata
        ) VALUES (
            p_customer_id,
            p_gap_type,
            p_title,
            p_description,
            p_priority,
            p_recommended_coverage,
            p_estimated_premium,
            p_risk_score,
            p_metadata
        )
        RETURNING id INTO v_gap_id;

        RETURN v_gap_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Resolve coverage gap
CREATE OR REPLACE FUNCTION resolve_coverage_gap(
    p_gap_id UUID,
    p_resolution_type VARCHAR DEFAULT 'addressed',
    p_policy_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE coverage_gaps
    SET status = p_resolution_type,
        resolved_at = CURRENT_TIMESTAMP,
        resolution_policy_id = p_policy_id,
        metadata = metadata || jsonb_build_object(
            'resolution_notes', p_notes,
            'resolved_by_policy', p_policy_id
        )
    WHERE id = p_gap_id
        AND status = 'open';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AGENT METRICS FUNCTIONS
-- ============================================

-- Update agent metrics for period
CREATE OR REPLACE FUNCTION update_agent_metrics(
    p_agent_id UUID,
    p_period_start DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
    p_period_end DATE DEFAULT (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
)
RETURNS UUID AS $$
DECLARE
    v_metrics_id UUID;
    v_total_policies INTEGER;
    v_new_policies INTEGER;
    v_renewed_policies INTEGER;
    v_cancelled_policies INTEGER;
    v_total_premium NUMERIC;
    v_total_claims INTEGER;
    v_claims_approved INTEGER;
    v_claims_rejected INTEGER;
    v_total_commissions NUMERIC;
BEGIN
    -- Calculate metrics
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE created_at::DATE >= p_period_start),
        COUNT(*) FILTER (WHERE renewal_count > 0 AND updated_at::DATE >= p_period_start),
        COUNT(*) FILTER (WHERE status = 'cancelled' AND updated_at::DATE >= p_period_start),
        COALESCE(SUM(premium_amount) FILTER (WHERE status = 'active'), 0)
    INTO v_total_policies, v_new_policies, v_renewed_policies, v_cancelled_policies, v_total_premium
    FROM policies
    WHERE agent_id = p_agent_id
        AND (created_at::DATE BETWEEN p_period_start AND p_period_end
            OR (status = 'active' AND start_date <= p_period_end));

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO v_total_claims, v_claims_approved, v_claims_rejected
    FROM claims
    WHERE agent_id = p_agent_id
        AND created_at::DATE BETWEEN p_period_start AND p_period_end;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_commissions
    FROM commissions
    WHERE agent_id = p_agent_id
        AND created_at::DATE BETWEEN p_period_start AND p_period_end
        AND status = 'paid';

    -- Upsert metrics
    INSERT INTO agent_metrics (
        agent_id,
        period_start,
        period_end,
        total_policies,
        total_premium,
        new_policies,
        renewed_policies,
        cancelled_policies,
        total_claims,
        claims_approved,
        claims_rejected,
        total_commissions,
        conversion_rate,
        retention_rate,
        average_policy_value
    ) VALUES (
        p_agent_id,
        p_period_start,
        p_period_end,
        v_total_policies,
        v_total_premium,
        v_new_policies,
        v_renewed_policies,
        v_cancelled_policies,
        v_total_claims,
        v_claims_approved,
        v_claims_rejected,
        v_total_commissions,
        0, -- Would be calculated from quotes
        CASE WHEN (v_total_policies - v_new_policies) > 0
            THEN ((v_total_policies - v_new_policies - v_cancelled_policies)::NUMERIC /
                  (v_total_policies - v_new_policies) * 100)
            ELSE 100
        END,
        CASE WHEN v_total_policies > 0
            THEN v_total_premium / v_total_policies
            ELSE 0
        END
    )
    ON CONFLICT (agent_id, period_start, period_end) DO UPDATE SET
        total_policies = EXCLUDED.total_policies,
        total_premium = EXCLUDED.total_premium,
        new_policies = EXCLUDED.new_policies,
        renewed_policies = EXCLUDED.renewed_policies,
        cancelled_policies = EXCLUDED.cancelled_policies,
        total_claims = EXCLUDED.total_claims,
        claims_approved = EXCLUDED.claims_approved,
        claims_rejected = EXCLUDED.claims_rejected,
        total_commissions = EXCLUDED.total_commissions,
        conversion_rate = EXCLUDED.conversion_rate,
        retention_rate = EXCLUDED.retention_rate,
        average_policy_value = EXCLUDED.average_policy_value,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_metrics_id;

    RETURN v_metrics_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- API KEY FUNCTIONS
-- ============================================

-- Validate API key
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash VARCHAR)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    permissions TEXT[],
    tenant_id UUID,
    rate_limit_per_minute INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ak.id,
        ak.name,
        ak.permissions,
        ak.tenant_id,
        ak.rate_limit_per_minute
    FROM api_keys ak
    WHERE ak.key_hash = p_key_hash
        AND ak.is_active = true
        AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP);

    -- Update last used
    IF FOUND THEN
        UPDATE api_keys
        SET last_used_at = CURRENT_TIMESTAMP,
            request_count = request_count + 1
        WHERE key_hash = p_key_hash;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Israeli ID validation (Luhn algorithm variant)
CREATE OR REPLACE FUNCTION validate_israeli_id(p_id_number VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_sum INTEGER := 0;
    v_digit INTEGER;
    v_multiplied INTEGER;
    i INTEGER;
BEGIN
    -- Must be 9 digits
    IF NOT (p_id_number ~ '^\d{9}$') THEN
        RETURN false;
    END IF;

    -- Pad with leading zeros if needed
    p_id_number := LPAD(p_id_number, 9, '0');

    FOR i IN 1..9 LOOP
        v_digit := SUBSTRING(p_id_number, i, 1)::INTEGER;
        v_multiplied := v_digit * (CASE WHEN i % 2 = 0 THEN 2 ELSE 1 END);
        IF v_multiplied > 9 THEN
            v_multiplied := v_multiplied - 9;
        END IF;
        v_sum := v_sum + v_multiplied;
    END LOOP;

    RETURN (v_sum % 10) = 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate unique application number
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR := 'APP';
    v_year VARCHAR := to_char(CURRENT_DATE, 'YY');
    v_sequence INTEGER;
BEGIN
    -- Get next sequence for this year
    SELECT COALESCE(MAX(
        SUBSTRING(application_number FROM 6)::INTEGER
    ), 0) + 1
    INTO v_sequence
    FROM insurance_applications
    WHERE application_number LIKE v_prefix || v_year || '%';

    RETURN v_prefix || v_year || LPAD(v_sequence::VARCHAR, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION refresh_customer_summary() IS 'Refresh the customer summary materialized view';
COMMENT ON FUNCTION get_customer_coverage_by_type(UUID) IS 'Get customer coverage breakdown by insurance type';
COMMENT ON FUNCTION calculate_coverage_score(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER) IS 'Calculate customer coverage score (0-100)';
COMMENT ON FUNCTION get_coverage_grade(INTEGER) IS 'Convert coverage score to letter grade (A-F)';
COMMENT ON FUNCTION get_expiring_policies(INTEGER, UUID) IS 'Get policies expiring within specified days';
COMMENT ON FUNCTION check_policy_overlap(UUID, VARCHAR, DATE, DATE, UUID) IS 'Check for overlapping policies';
COMMENT ON FUNCTION cleanup_expired_quotes(INTEGER) IS 'Mark expired quotes and return count';
COMMENT ON FUNCTION get_best_quote(UUID) IS 'Get best available quote for a request';
COMMENT ON FUNCTION create_notification(VARCHAR, VARCHAR, TEXT, UUID, UUID, VARCHAR, VARCHAR, VARCHAR, UUID, TIMESTAMPTZ, VARCHAR, JSONB) IS 'Create a new notification';
COMMENT ON FUNCTION create_expiry_notifications(INTEGER) IS 'Create notifications for expiring policies';
COMMENT ON FUNCTION create_reminder(VARCHAR, VARCHAR, TEXT, UUID, UUID, DATE, VARCHAR, VARCHAR, UUID, VARCHAR, JSONB) IS 'Create a scheduled reminder';
COMMENT ON FUNCTION complete_reminder(UUID, TEXT) IS 'Complete reminder and create next if recurring';
COMMENT ON FUNCTION snooze_reminder(UUID, DATE) IS 'Snooze a reminder until specified date';
COMMENT ON FUNCTION calculate_commission(NUMERIC, VARCHAR, VARCHAR, BOOLEAN) IS 'Calculate commission amount for policy';
COMMENT ON FUNCTION record_coverage_gap(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, NUMERIC, NUMERIC, INTEGER, JSONB) IS 'Record or update a coverage gap';
COMMENT ON FUNCTION resolve_coverage_gap(UUID, VARCHAR, UUID, TEXT) IS 'Mark a coverage gap as resolved';
COMMENT ON FUNCTION update_agent_metrics(UUID, DATE, DATE) IS 'Calculate and update agent performance metrics';
COMMENT ON FUNCTION validate_api_key(VARCHAR) IS 'Validate API key and return permissions';
COMMENT ON FUNCTION validate_israeli_id(VARCHAR) IS 'Validate Israeli ID number using check digit';
COMMENT ON FUNCTION generate_application_number() IS 'Generate unique application number';
