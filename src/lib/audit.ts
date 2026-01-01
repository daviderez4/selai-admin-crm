import { createClient } from '@/lib/supabase/client';

export type AuditAction =
  | 'import'
  | 'view'
  | 'filter'
  | 'export'
  | 'delete'
  | 'update'
  | 'create'
  | 'login'
  | 'logout'
  | 'settings_change';

export interface AuditLogEntry {
  action: AuditAction;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  project_id?: string;
}

/**
 * Log an activity to the audit_logs table
 * @param entry - The audit log entry to create
 */
export async function logActivity(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Audit log skipped: no authenticated user');
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details,
      project_id: entry.project_id,
    });

    if (error) {
      // Don't throw - audit logging shouldn't break the app
      console.error('Failed to log activity:', error.message);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Get recent activity for a project
 * @param projectId - The project ID to get activity for
 * @param limit - Maximum number of entries to return
 */
export async function getProjectActivity(
  projectId: string,
  limit = 10
): Promise<AuditLogEntry[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch activity:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Activity fetch error:', error);
    return [];
  }
}

/**
 * Get system-wide activity stats
 */
export async function getActivityStats(): Promise<{
  today: number;
  thisWeek: number;
  activeUsers: number;
}> {
  try {
    const supabase = createClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get today's activity count
    const { count: todayCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get this week's activity count
    const { count: weekCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    // Get unique active users this week
    const { data: uniqueUsers } = await supabase
      .from('audit_logs')
      .select('user_id')
      .gte('created_at', weekAgo.toISOString());

    const activeUsers = new Set(uniqueUsers?.map(u => u.user_id) || []).size;

    return {
      today: todayCount || 0,
      thisWeek: weekCount || 0,
      activeUsers,
    };
  } catch (error) {
    console.error('Activity stats error:', error);
    return { today: 0, thisWeek: 0, activeUsers: 0 };
  }
}

// Helper function to format activity for display
export function formatActivityMessage(entry: AuditLogEntry): string {
  const details = entry.details as Record<string, unknown> | undefined;

  switch (entry.action) {
    case 'import':
      return `יובאו ${details?.rows || 0} שורות ל-${entry.entity_type || 'טבלה'}`;
    case 'view':
      return `צפייה ב${entry.entity_type || 'נתונים'}`;
    case 'filter':
      return 'הפעלת פילטרים';
    case 'export':
      return `ייצוא ${details?.format || 'נתונים'}`;
    case 'delete':
      return `מחיקת ${entry.entity_type || 'רשומה'}`;
    case 'update':
      return `עדכון ${entry.entity_type || 'רשומה'}`;
    case 'create':
      return `יצירת ${entry.entity_type || 'רשומה'}`;
    case 'login':
      return 'כניסה למערכת';
    case 'logout':
      return 'יציאה מהמערכת';
    case 'settings_change':
      return 'שינוי הגדרות';
    default:
      return entry.action;
  }
}
