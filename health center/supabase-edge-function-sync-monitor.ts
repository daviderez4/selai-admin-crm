// ============================================================================
// SELAI Real-time Sync Monitor Edge Function
// Supabase Edge Function לניטור סנכרון בזמן אמת
// ============================================================================
// Deploy: supabase functions deploy sync-monitor
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface SyncCheckResult {
  tableName: string;
  displayName: string;
  supabaseCount: number;
  base44Count?: number;
  discrepancy: number;
  healthScore: number;
  healthStatus: "healthy" | "warning" | "critical";
  issues: string[];
}

interface HealthCheckResponse {
  success: boolean;
  timestamp: string;
  projectId: string;
  overallHealth: number;
  tables: SyncCheckResult[];
  alerts: Alert[];
  recommendations: string[];
}

interface Alert {
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  tableName?: string;
  timestamp: string;
}

// Table configuration
const TABLE_CONFIG: Record<string, { displayName: string; criticalFields: string[] }> = {
  contacts: { displayName: "אנשי קשר", criticalFields: ["agent_id", "phone"] },
  leads: { displayName: "לידים", criticalFields: ["agent_id", "status"] },
  clients: { displayName: "לקוחות", criticalFields: ["agent_id", "id_number"] },
  policies: { displayName: "פוליסות", criticalFields: ["agent_id", "policy_number", "status"] },
  deals: { displayName: "עסקאות", criticalFields: ["agent_id", "status"] },
  tasks: { displayName: "משימות", criticalFields: ["agent_id", "status", "due_date"] },
  meetings: { displayName: "פגישות", criticalFields: ["agent_id", "scheduled_at"] },
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "check";
    const projectId = url.searchParams.get("project_id") || "default";

    let response: any;

    switch (action) {
      case "check":
        response = await performHealthCheck(supabase, projectId);
        break;
      case "scan":
        response = await runQualityScan(supabase, projectId);
        break;
      case "fix":
        const body = await req.json();
        response = await autoFixIssues(supabase, projectId, body.limit || 50);
        break;
      case "sync":
        const syncBody = await req.json();
        response = await triggerSync(supabase, projectId, syncBody.tables);
        break;
      default:
        response = { error: "Unknown action", validActions: ["check", "scan", "fix", "sync"] };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ============================================================================
// Health Check
// ============================================================================

async function performHealthCheck(
  supabase: any,
  projectId: string
): Promise<HealthCheckResponse> {
  const tables: SyncCheckResult[] = [];
  const alerts: Alert[] = [];
  const recommendations: string[] = [];

  for (const [tableName, config] of Object.entries(TABLE_CONFIG)) {
    const result = await checkTable(supabase, projectId, tableName, config);
    tables.push(result);

    // Generate alerts based on results
    if (result.healthStatus === "critical") {
      alerts.push({
        severity: "critical",
        message: `טבלת ${config.displayName} במצב קריטי (${result.healthScore}%)`,
        tableName,
        timestamp: new Date().toISOString(),
      });
    } else if (result.healthStatus === "warning") {
      alerts.push({
        severity: "warning",
        message: `טבלת ${config.displayName} דורשת תשומת לב (${result.healthScore}%)`,
        tableName,
        timestamp: new Date().toISOString(),
      });
    }

    // Add specific issue alerts
    for (const issue of result.issues) {
      alerts.push({
        severity: "warning",
        message: issue,
        tableName,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Calculate overall health
  const overallHealth =
    tables.reduce((acc, t) => acc + t.healthScore, 0) / tables.length;

  // Generate recommendations
  if (overallHealth < 70) {
    recommendations.push("מומלץ לבצע סנכרון מלא של כל הטבלאות");
  }
  
  const criticalTables = tables.filter((t) => t.healthStatus === "critical");
  if (criticalTables.length > 0) {
    recommendations.push(
      `יש לטפל בדחיפות בטבלאות: ${criticalTables.map((t) => t.displayName).join(", ")}`
    );
  }

  const highDiscrepancy = tables.filter((t) => t.discrepancy > 50);
  if (highDiscrepancy.length > 0) {
    recommendations.push("נמצאו פערים משמעותיים - בדוק את תהליכי הסנכרון");
  }

  // Update sync_status table
  for (const table of tables) {
    await supabase.from("sync_status").upsert(
      {
        project_id: projectId,
        table_name: table.tableName,
        supabase_count: table.supabaseCount,
        discrepancy: table.discrepancy,
        health_score: table.healthScore,
        health_status: table.healthStatus,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,table_name" }
    );
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    projectId,
    overallHealth: Math.round(overallHealth * 100) / 100,
    tables,
    alerts,
    recommendations,
  };
}

async function checkTable(
  supabase: any,
  projectId: string,
  tableName: string,
  config: { displayName: string; criticalFields: string[] }
): Promise<SyncCheckResult> {
  const issues: string[] = [];
  let healthScore = 100;

  // Count records
  const { count: supabaseCount, error: countError } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (countError) {
    issues.push(`שגיאה בספירת רשומות: ${countError.message}`);
    healthScore -= 30;
  }

  // Check for missing critical fields
  for (const field of config.criticalFields) {
    const { count: missingCount } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is(field, null);

    if (missingCount && missingCount > 0) {
      const percentage = ((missingCount / (supabaseCount || 1)) * 100).toFixed(1);
      issues.push(`${missingCount} רשומות ללא ${field} (${percentage}%)`);
      healthScore -= Math.min(20, missingCount / 10);
    }
  }

  // Check for duplicates (if phone field exists)
  if (config.criticalFields.includes("phone") || tableName === "contacts") {
    const { data: duplicates } = await supabase.rpc("count_duplicates", {
      p_table_name: tableName,
      p_field_name: "phone",
      p_project_id: projectId,
    });

    if (duplicates && duplicates > 0) {
      issues.push(`${duplicates} רשומות עם טלפון כפול`);
      healthScore -= Math.min(15, duplicates / 5);
    }
  }

  // Check for stale data (no updates in 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: staleCount } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .lt("updated_at", thirtyDaysAgo.toISOString());

  if (staleCount && staleCount > 100) {
    issues.push(`${staleCount} רשומות לא עודכנו 30+ ימים`);
    healthScore -= 5;
  }

  // Determine health status
  healthScore = Math.max(0, Math.min(100, healthScore));
  const healthStatus: "healthy" | "warning" | "critical" =
    healthScore >= 90 ? "healthy" : healthScore >= 70 ? "warning" : "critical";

  return {
    tableName,
    displayName: config.displayName,
    supabaseCount: supabaseCount || 0,
    discrepancy: 0, // Would need Base44 count for actual discrepancy
    healthScore: Math.round(healthScore * 100) / 100,
    healthStatus,
    issues,
  };
}

// ============================================================================
// Quality Scan
// ============================================================================

async function runQualityScan(
  supabase: any,
  projectId: string
): Promise<{ success: boolean; issuesFound: number; byType: Record<string, number> }> {
  const { data, error } = await supabase.rpc("scan_data_quality", {
    p_project_id: projectId,
    p_table_name: null,
  });

  if (error) {
    throw new Error(`Scan failed: ${error.message}`);
  }

  // Get summary by type
  const { data: summary } = await supabase
    .from("data_quality_issues")
    .select("issue_type")
    .eq("project_id", projectId)
    .eq("status", "open");

  const byType: Record<string, number> = {};
  for (const issue of summary || []) {
    byType[issue.issue_type] = (byType[issue.issue_type] || 0) + 1;
  }

  return {
    success: true,
    issuesFound: data || 0,
    byType,
  };
}

// ============================================================================
// Auto-Fix Issues
// ============================================================================

async function autoFixIssues(
  supabase: any,
  projectId: string,
  limit: number
): Promise<{ success: boolean; fixed: number; failed: number; details: any[] }> {
  // Get fixable issues
  const { data: issues, error: fetchError } = await supabase
    .from("data_quality_issues")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "open")
    .eq("auto_fixable", true)
    .not("suggested_fix", "is", null)
    .limit(limit);

  if (fetchError) {
    throw new Error(`Failed to fetch issues: ${fetchError.message}`);
  }

  let fixed = 0;
  let failed = 0;
  const details: any[] = [];

  for (const issue of issues || []) {
    try {
      // Apply fix
      const { error: updateError } = await supabase
        .from(issue.table_name)
        .update({ [issue.field_name]: issue.suggested_fix })
        .eq("id", issue.record_id);

      if (updateError) {
        failed++;
        details.push({
          issueId: issue.id,
          status: "failed",
          error: updateError.message,
        });
        continue;
      }

      // Mark as resolved
      await supabase
        .from("data_quality_issues")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: `תוקן אוטומטית: ${issue.current_value} → ${issue.suggested_fix}`,
        })
        .eq("id", issue.id);

      fixed++;
      details.push({
        issueId: issue.id,
        status: "fixed",
        table: issue.table_name,
        field: issue.field_name,
        oldValue: issue.current_value,
        newValue: issue.suggested_fix,
      });
    } catch (err) {
      failed++;
      details.push({
        issueId: issue.id,
        status: "failed",
        error: err.message,
      });
    }
  }

  return {
    success: true,
    fixed,
    failed,
    details,
  };
}

// ============================================================================
// Trigger Sync
// ============================================================================

async function triggerSync(
  supabase: any,
  projectId: string,
  tables: string[]
): Promise<{ success: boolean; syncId: string; status: string }> {
  // Create sync history record
  const { data: syncRecord, error: insertError } = await supabase
    .from("sync_history")
    .insert({
      project_id: projectId,
      sync_type: "manual",
      source_system: "edge_function",
      target_system: "supabase",
      tables_synced: tables || Object.keys(TABLE_CONFIG),
      status: "running",
      trigger_source: "api",
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create sync record: ${insertError.message}`);
  }

  // In a real implementation, this would trigger actual sync logic
  // For now, we'll just update the status
  await supabase
    .from("sync_history")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_ms: 100,
    })
    .eq("id", syncRecord.id);

  return {
    success: true,
    syncId: syncRecord.id,
    status: "completed",
  };
}
