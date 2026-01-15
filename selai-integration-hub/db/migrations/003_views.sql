-- ============================================
-- SELAI Insurance Integration Hub
-- Database Migration: 003_views.sql
-- Dashboard Views & Materialized Views
-- ============================================

-- ============================================
-- AGENT DASHBOARD VIEWS
-- ============================================

-- Agent Performance Summary View
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT
    am.agent_id,
    am.period_start,
    am.period_end,
    am.total_policies,
    am.total_premium,
    am.new_policies,
    am.renewed_policies,
    am.cancelled_policies,
    am.total_claims,
    am.claims_approved,
    am.claims_rejected,
    am.total_commissions,
    am.conversion_rate,
    am.retention_rate,
    am.average_policy_value,
    -- Calculated metrics
    CASE
        WHEN am.total_policies > 0
        THEN ROUND((am.claims_approved::NUMERIC / NULLIF(am.total_claims, 0)) * 100, 2)
        ELSE 0
    END AS claims_approval_rate,
    CASE
        WHEN am.total_policies > 0
        THEN ROUND(am.total_premium::NUMERIC / am.total_policies, 2)
        ELSE 0
    END AS avg_premium_per_policy,
    am.created_at,
    am.updated_at
FROM agent_metrics am
WHERE am.period_end >= CURRENT_DATE - INTERVAL '1 year';

-- Agent Ranking View (for leaderboards)
CREATE OR REPLACE VIEW v_agent_rankings AS
WITH latest_metrics AS (
    SELECT DISTINCT ON (agent_id)
        agent_id,
        total_premium,
        new_policies,
        conversion_rate,
        retention_rate,
        total_commissions,
        period_start,
        period_end
    FROM agent_metrics
    WHERE period_end >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY agent_id, period_end DESC
)
SELECT
    agent_id,
    total_premium,
    new_policies,
    conversion_rate,
    retention_rate,
    total_commissions,
    RANK() OVER (ORDER BY total_premium DESC) AS premium_rank,
    RANK() OVER (ORDER BY new_policies DESC) AS policies_rank,
    RANK() OVER (ORDER BY conversion_rate DESC) AS conversion_rank,
    RANK() OVER (ORDER BY retention_rate DESC) AS retention_rank,
    period_start,
    period_end
FROM latest_metrics;

-- ============================================
-- CUSTOMER PORTFOLIO VIEWS
-- ============================================

-- Customer 360 View
CREATE OR REPLACE VIEW v_customer_360 AS
SELECT
    c.id AS customer_id,
    c.id_number,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.birth_date,
    c.city,
    -- Policy summary
    COALESCE(policy_stats.total_policies, 0) AS total_policies,
    COALESCE(policy_stats.active_policies, 0) AS active_policies,
    COALESCE(policy_stats.total_premium, 0) AS total_annual_premium,
    policy_stats.policy_types,
    -- Claims summary
    COALESCE(claim_stats.total_claims, 0) AS total_claims,
    COALESCE(claim_stats.pending_claims, 0) AS pending_claims,
    COALESCE(claim_stats.approved_claims, 0) AS approved_claims,
    -- Coverage analysis
    coverage.score AS coverage_score,
    coverage.grade AS coverage_grade,
    COALESCE(gaps.gap_count, 0) AS coverage_gaps_count,
    gaps.critical_gaps,
    -- Pension summary
    COALESCE(pension_stats.pension_accounts, 0) AS pension_accounts,
    COALESCE(pension_stats.total_pension_balance, 0) AS total_pension_balance,
    -- Activity
    c.created_at AS customer_since,
    c.updated_at AS last_updated
FROM customers c
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total_policies,
        COUNT(*) FILTER (WHERE status = 'active') AS active_policies,
        SUM(premium_amount) AS total_premium,
        ARRAY_AGG(DISTINCT insurance_type) AS policy_types
    FROM policies
    WHERE customer_id = c.id
) policy_stats ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total_claims,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review')) AS pending_claims,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved_claims
    FROM claims
    WHERE customer_id = c.id
) claim_stats ON true
LEFT JOIN LATERAL (
    SELECT score, grade
    FROM coverage_analysis
    WHERE customer_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
) coverage ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS gap_count,
        COUNT(*) FILTER (WHERE priority = 'critical') AS critical_gaps
    FROM coverage_gaps
    WHERE customer_id = c.id AND status = 'open'
) gaps ON true
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS pension_accounts,
        SUM(current_balance) AS total_pension_balance
    FROM pension_accounts
    WHERE customer_id = c.id
) pension_stats ON true;

-- Customer Policies Overview
CREATE OR REPLACE VIEW v_customer_policies AS
SELECT
    p.id AS policy_id,
    p.policy_number,
    p.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.id_number,
    p.insurance_type,
    p.carrier_code,
    p.product_name,
    p.status,
    p.start_date,
    p.end_date,
    p.premium_amount,
    p.premium_frequency,
    p.coverage_amount,
    p.deductible,
    -- Days until expiry
    CASE
        WHEN p.end_date IS NOT NULL
        THEN (p.end_date - CURRENT_DATE)
        ELSE NULL
    END AS days_until_expiry,
    -- Is expiring soon (within 30 days)
    CASE
        WHEN p.end_date IS NOT NULL AND (p.end_date - CURRENT_DATE) <= 30
        THEN true
        ELSE false
    END AS expiring_soon,
    p.created_at,
    p.updated_at
FROM policies p
JOIN customers c ON p.customer_id = c.id;

-- ============================================
-- QUOTES & APPLICATIONS VIEWS
-- ============================================

-- Quote Comparison Results View
CREATE OR REPLACE VIEW v_quote_comparisons AS
SELECT
    qh.id,
    qh.request_id,
    qh.customer_id,
    qh.id_number,
    qh.insurance_type,
    qh.coverage_amount,
    qh.deductible,
    qh.carrier_code,
    qh.carrier_name,
    qh.monthly_premium,
    qh.annual_premium,
    qh.coverage_details,
    qh.ranking_score,
    qh.rank_position,
    qh.status,
    -- Is best option
    qh.rank_position = 1 AS is_best_option,
    -- Price per coverage unit
    CASE
        WHEN qh.coverage_amount > 0
        THEN ROUND((qh.annual_premium / qh.coverage_amount) * 1000, 2)
        ELSE 0
    END AS price_per_1000_coverage,
    qh.created_at,
    qh.expires_at,
    -- Is expired
    CASE
        WHEN qh.expires_at < CURRENT_TIMESTAMP
        THEN true
        ELSE false
    END AS is_expired
FROM quote_history qh;

-- Active Applications Pipeline View
CREATE OR REPLACE VIEW v_applications_pipeline AS
SELECT
    ia.id,
    ia.application_number,
    ia.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.id_number,
    ia.insurance_type,
    ia.carrier_code,
    ia.product_code,
    ia.status,
    ia.premium_amount,
    ia.coverage_amount,
    ia.submitted_at,
    ia.approved_at,
    ia.rejected_at,
    ia.rejection_reason,
    -- Days in current status
    CASE
        WHEN ia.status = 'submitted' THEN CURRENT_DATE - ia.submitted_at::DATE
        WHEN ia.status = 'approved' THEN ia.approved_at::DATE - ia.submitted_at::DATE
        WHEN ia.status = 'rejected' THEN ia.rejected_at::DATE - ia.submitted_at::DATE
        ELSE 0
    END AS days_in_process,
    ia.agent_id,
    ia.created_at,
    ia.updated_at
FROM insurance_applications ia
LEFT JOIN customers c ON ia.customer_id = c.id
WHERE ia.status NOT IN ('cancelled', 'converted_to_policy');

-- ============================================
-- COVERAGE ANALYSIS VIEWS
-- ============================================

-- Coverage Gaps Summary View
CREATE OR REPLACE VIEW v_coverage_gaps_summary AS
SELECT
    cg.id,
    cg.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.id_number,
    cg.gap_type,
    cg.title,
    cg.description,
    cg.priority,
    cg.status,
    cg.recommended_coverage,
    cg.estimated_premium,
    cg.risk_score,
    -- Priority order for sorting
    CASE cg.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
    END AS priority_order,
    cg.created_at,
    cg.resolved_at
FROM coverage_gaps cg
LEFT JOIN customers c ON cg.customer_id = c.id;

-- Coverage Analysis Dashboard View
CREATE OR REPLACE VIEW v_coverage_analysis_dashboard AS
SELECT
    ca.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.id_number,
    ca.score,
    ca.grade,
    ca.total_coverage_amount,
    ca.total_annual_premium,
    ca.policies_count,
    ca.pension_accounts_count,
    ca.gaps_count,
    ca.critical_gaps_count,
    ca.risk_areas,
    ca.strengths,
    ca.recommendations,
    -- Grade color for UI
    CASE ca.grade
        WHEN 'A' THEN '#22c55e'  -- green
        WHEN 'B' THEN '#84cc16'  -- lime
        WHEN 'C' THEN '#eab308'  -- yellow
        WHEN 'D' THEN '#f97316'  -- orange
        WHEN 'F' THEN '#ef4444'  -- red
        ELSE '#6b7280'          -- gray
    END AS grade_color,
    ca.analyzed_at,
    ca.created_at
FROM coverage_analysis ca
LEFT JOIN customers c ON ca.customer_id = c.id
WHERE ca.analyzed_at = (
    SELECT MAX(ca2.analyzed_at)
    FROM coverage_analysis ca2
    WHERE ca2.customer_id = ca.customer_id
);

-- ============================================
-- NOTIFICATIONS & REMINDERS VIEWS
-- ============================================

-- Active Notifications View
CREATE OR REPLACE VIEW v_active_notifications AS
SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    n.agent_id,
    n.related_entity_type,
    n.related_entity_id,
    n.channel,
    n.status,
    n.scheduled_for,
    n.sent_at,
    n.read_at,
    n.action_url,
    -- Is overdue
    CASE
        WHEN n.scheduled_for < CURRENT_TIMESTAMP AND n.status = 'pending'
        THEN true
        ELSE false
    END AS is_overdue,
    n.created_at
FROM notifications n
LEFT JOIN customers c ON n.customer_id = c.id
WHERE n.status IN ('pending', 'sent')
ORDER BY
    CASE n.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
    END,
    n.scheduled_for;

-- Scheduled Reminders View
CREATE OR REPLACE VIEW v_scheduled_reminders AS
SELECT
    sr.id,
    sr.type,
    sr.title,
    sr.description,
    sr.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    sr.agent_id,
    sr.related_entity_type,
    sr.related_entity_id,
    sr.due_date,
    sr.priority,
    sr.status,
    sr.completed_at,
    sr.snoozed_until,
    sr.recurrence_rule,
    sr.next_occurrence,
    -- Days until due
    (sr.due_date - CURRENT_DATE) AS days_until_due,
    -- Is overdue
    sr.due_date < CURRENT_DATE AND sr.status = 'pending' AS is_overdue,
    -- Is due today
    sr.due_date = CURRENT_DATE AS is_due_today,
    sr.created_at
FROM scheduled_reminders sr
LEFT JOIN customers c ON sr.customer_id = c.id
WHERE sr.status IN ('pending', 'snoozed')
ORDER BY sr.due_date;

-- ============================================
-- PRODUCTS CATALOG VIEW
-- ============================================

-- Available Products View
CREATE OR REPLACE VIEW v_available_products AS
SELECT
    ip.id,
    ip.carrier_code,
    ip.product_code,
    ip.product_name,
    ip.insurance_type,
    ip.category,
    ip.description,
    ip.min_coverage,
    ip.max_coverage,
    ip.min_premium,
    ip.max_premium,
    ip.coverage_features,
    ip.exclusions,
    ip.waiting_period_days,
    ip.commission_rate,
    ip.is_active,
    ip.effective_from,
    ip.effective_until,
    -- Is currently effective
    CASE
        WHEN ip.effective_from <= CURRENT_DATE
            AND (ip.effective_until IS NULL OR ip.effective_until >= CURRENT_DATE)
            AND ip.is_active = true
        THEN true
        ELSE false
    END AS is_currently_available,
    ip.created_at,
    ip.updated_at
FROM insurance_products ip;

-- ============================================
-- AGGREGATE STATISTICS VIEWS
-- ============================================

-- Daily Statistics View
CREATE OR REPLACE VIEW v_daily_stats AS
SELECT
    CURRENT_DATE AS stats_date,
    -- Policies
    (SELECT COUNT(*) FROM policies WHERE created_at::DATE = CURRENT_DATE) AS new_policies_today,
    (SELECT COUNT(*) FROM policies WHERE status = 'active') AS total_active_policies,
    (SELECT SUM(premium_amount) FROM policies WHERE status = 'active') AS total_active_premium,
    -- Claims
    (SELECT COUNT(*) FROM claims WHERE created_at::DATE = CURRENT_DATE) AS new_claims_today,
    (SELECT COUNT(*) FROM claims WHERE status IN ('submitted', 'under_review')) AS pending_claims,
    -- Quotes
    (SELECT COUNT(*) FROM quote_history WHERE created_at::DATE = CURRENT_DATE) AS quotes_generated_today,
    (SELECT COUNT(DISTINCT request_id) FROM quote_history WHERE created_at::DATE = CURRENT_DATE) AS quote_requests_today,
    -- Applications
    (SELECT COUNT(*) FROM insurance_applications WHERE created_at::DATE = CURRENT_DATE) AS new_applications_today,
    (SELECT COUNT(*) FROM insurance_applications WHERE status = 'submitted') AS pending_applications,
    -- Coverage gaps
    (SELECT COUNT(*) FROM coverage_gaps WHERE status = 'open') AS open_gaps,
    (SELECT COUNT(*) FROM coverage_gaps WHERE status = 'open' AND priority = 'critical') AS critical_gaps,
    -- Customers
    (SELECT COUNT(*) FROM customers WHERE created_at::DATE = CURRENT_DATE) AS new_customers_today,
    (SELECT COUNT(*) FROM customers) AS total_customers;

-- Insurance Type Distribution View
CREATE OR REPLACE VIEW v_insurance_distribution AS
SELECT
    insurance_type,
    COUNT(*) AS policy_count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    SUM(premium_amount) AS total_premium,
    SUM(premium_amount) FILTER (WHERE status = 'active') AS active_premium,
    AVG(premium_amount) AS avg_premium,
    AVG(coverage_amount) AS avg_coverage,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM policies) * 100, 2) AS percentage
FROM policies
GROUP BY insurance_type
ORDER BY policy_count DESC;

-- Carrier Performance View
CREATE OR REPLACE VIEW v_carrier_performance AS
SELECT
    p.carrier_code,
    COUNT(DISTINCT p.id) AS total_policies,
    COUNT(DISTINCT p.customer_id) AS total_customers,
    SUM(p.premium_amount) AS total_premium,
    AVG(p.premium_amount) AS avg_premium,
    -- Claims metrics
    COUNT(DISTINCT cl.id) AS total_claims,
    COUNT(DISTINCT cl.id) FILTER (WHERE cl.status = 'approved') AS approved_claims,
    CASE
        WHEN COUNT(DISTINCT cl.id) > 0
        THEN ROUND(COUNT(DISTINCT cl.id) FILTER (WHERE cl.status = 'approved')::NUMERIC / COUNT(DISTINCT cl.id) * 100, 2)
        ELSE 0
    END AS claim_approval_rate,
    -- Quote metrics
    COUNT(DISTINCT qh.id) AS total_quotes,
    COUNT(DISTINCT qh.id) FILTER (WHERE qh.status = 'accepted') AS accepted_quotes,
    CASE
        WHEN COUNT(DISTINCT qh.id) > 0
        THEN ROUND(COUNT(DISTINCT qh.id) FILTER (WHERE qh.status = 'accepted')::NUMERIC / COUNT(DISTINCT qh.id) * 100, 2)
        ELSE 0
    END AS quote_acceptance_rate
FROM policies p
LEFT JOIN claims cl ON p.id = cl.policy_id
LEFT JOIN quote_history qh ON p.carrier_code = qh.carrier_code AND p.customer_id = qh.customer_id
GROUP BY p.carrier_code
ORDER BY total_premium DESC;

-- ============================================
-- MATERIALIZED VIEW FOR PERFORMANCE
-- ============================================

-- Customer Summary Materialized View (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_summary AS
SELECT
    c.id AS customer_id,
    c.id_number,
    c.first_name,
    c.last_name,
    COUNT(DISTINCT p.id) AS policy_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_policy_count,
    COALESCE(SUM(p.premium_amount) FILTER (WHERE p.status = 'active'), 0) AS total_active_premium,
    COUNT(DISTINCT cl.id) AS claim_count,
    COUNT(DISTINCT pa.id) AS pension_account_count,
    MAX(ca.score) AS latest_coverage_score,
    MAX(ca.grade) AS latest_coverage_grade,
    COUNT(DISTINCT cg.id) FILTER (WHERE cg.status = 'open') AS open_gaps_count,
    c.created_at AS customer_since,
    GREATEST(c.updated_at, MAX(p.updated_at), MAX(cl.updated_at)) AS last_activity
FROM customers c
LEFT JOIN policies p ON c.id = p.customer_id
LEFT JOIN claims cl ON c.id = cl.customer_id
LEFT JOIN pension_accounts pa ON c.id = pa.customer_id
LEFT JOIN coverage_analysis ca ON c.id = ca.customer_id
LEFT JOIN coverage_gaps cg ON c.id = cg.customer_id
GROUP BY c.id, c.id_number, c.first_name, c.last_name, c.created_at, c.updated_at;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_customer_summary_id ON mv_customer_summary(customer_id);
CREATE INDEX IF NOT EXISTS idx_mv_customer_summary_id_number ON mv_customer_summary(id_number);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON VIEW v_agent_performance IS 'Agent performance metrics with calculated rates';
COMMENT ON VIEW v_agent_rankings IS 'Agent leaderboard rankings by various metrics';
COMMENT ON VIEW v_customer_360 IS 'Complete customer view with all related data';
COMMENT ON VIEW v_customer_policies IS 'Customer policies with expiration tracking';
COMMENT ON VIEW v_quote_comparisons IS 'Quote comparison results with rankings';
COMMENT ON VIEW v_applications_pipeline IS 'Active insurance applications pipeline';
COMMENT ON VIEW v_coverage_gaps_summary IS 'Coverage gaps with priority ordering';
COMMENT ON VIEW v_coverage_analysis_dashboard IS 'Latest coverage analysis per customer';
COMMENT ON VIEW v_active_notifications IS 'Active and pending notifications';
COMMENT ON VIEW v_scheduled_reminders IS 'Pending and snoozed reminders';
COMMENT ON VIEW v_available_products IS 'Currently available insurance products';
COMMENT ON VIEW v_daily_stats IS 'Daily aggregate statistics dashboard';
COMMENT ON VIEW v_insurance_distribution IS 'Policy distribution by insurance type';
COMMENT ON VIEW v_carrier_performance IS 'Carrier performance metrics';
COMMENT ON MATERIALIZED VIEW mv_customer_summary IS 'Cached customer summary for fast lookups - refresh periodically';
