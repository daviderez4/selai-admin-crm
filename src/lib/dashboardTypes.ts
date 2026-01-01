import {
  Wallet,
  Shield,
  Receipt,
  TrendingUp,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';

export type DashboardType = 'accumulation' | 'insurance' | 'commissions' | 'sahbak' | 'custom';

export interface DashboardTypeConfig {
  id: DashboardType;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  defaultTableName: string;
  recommendedColumns: string[];
  defaultFilters: string[];
  defaultCards: {
    title: string;
    column: string;
    aggregation: 'sum' | 'count' | 'avg';
    icon: string;
  }[];
}

export const DASHBOARD_TYPES: Record<DashboardType, DashboardTypeConfig> = {
  accumulation: {
    id: 'accumulation',
    name: 'דשבורד צבירה',
    description: 'מעקב אחר נתוני צבירה, יתרות ותנועות',
    icon: Wallet,
    color: 'emerald',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
    defaultTableName: 'accumulation_data',
    recommendedColumns: [
      'producer_name',
      'handler_name',
      'supervisor_name',
      'total_balance',
      'monthly_deposits',
      'record_count',
    ],
    defaultFilters: ['producer_name', 'handler_name', 'supervisor_name', 'month', 'year'],
    defaultCards: [
      { title: 'סך הצבירה', column: 'total_balance', aggregation: 'sum', icon: 'wallet' },
      { title: 'הפקדות חודשיות', column: 'monthly_deposits', aggregation: 'sum', icon: 'trending-up' },
      { title: 'מספר רשומות', column: 'id', aggregation: 'count', icon: 'file-text' },
      { title: 'ממוצע ליצרן', column: 'total_balance', aggregation: 'avg', icon: 'calculator' },
    ],
  },
  insurance: {
    id: 'insurance',
    name: 'דשבורד ביטוח',
    description: 'נתוני פוליסות ביטוח, תביעות וחידושים',
    icon: Shield,
    color: 'blue',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
    defaultTableName: 'insurance_data',
    recommendedColumns: [
      'policy_number',
      'insured_name',
      'agent_name',
      'premium',
      'coverage_amount',
      'status',
    ],
    defaultFilters: ['agent_name', 'status', 'insurance_type', 'branch'],
    defaultCards: [
      { title: 'סך פרמיות', column: 'premium', aggregation: 'sum', icon: 'receipt' },
      { title: 'כיסוי כולל', column: 'coverage_amount', aggregation: 'sum', icon: 'shield' },
      { title: 'מספר פוליסות', column: 'policy_number', aggregation: 'count', icon: 'file-text' },
      { title: 'פרמיה ממוצעת', column: 'premium', aggregation: 'avg', icon: 'calculator' },
    ],
  },
  commissions: {
    id: 'commissions',
    name: 'דשבורד עמלות',
    description: 'מעקב אחר עמלות, תשלומים והתחשבנויות',
    icon: Receipt,
    color: 'purple',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-pink-600',
    defaultTableName: 'commissions_data',
    recommendedColumns: [
      'agent_name',
      'commission_amount',
      'transaction_date',
      'commission_type',
      'status',
    ],
    defaultFilters: ['agent_name', 'commission_type', 'status', 'month', 'year'],
    defaultCards: [
      { title: 'סך עמלות', column: 'commission_amount', aggregation: 'sum', icon: 'receipt' },
      { title: 'מספר עסקאות', column: 'id', aggregation: 'count', icon: 'file-text' },
      { title: 'עמלה ממוצעת', column: 'commission_amount', aggregation: 'avg', icon: 'calculator' },
      { title: 'סוכנים פעילים', column: 'agent_name', aggregation: 'count', icon: 'users' },
    ],
  },
  sahbak: {
    id: 'sahbak',
    name: 'דשבורד שח"ב',
    description: 'נתוני שירותי חשבונאות וביטוח',
    icon: TrendingUp,
    color: 'amber',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-600',
    defaultTableName: 'sahbak_data',
    recommendedColumns: [
      'client_name',
      'service_type',
      'amount',
      'date',
      'handler_name',
    ],
    defaultFilters: ['service_type', 'handler_name', 'status', 'month'],
    defaultCards: [
      { title: 'סך הכנסות', column: 'amount', aggregation: 'sum', icon: 'trending-up' },
      { title: 'מספר לקוחות', column: 'client_name', aggregation: 'count', icon: 'users' },
      { title: 'ממוצע לעסקה', column: 'amount', aggregation: 'avg', icon: 'calculator' },
      { title: 'שירותים פעילים', column: 'service_type', aggregation: 'count', icon: 'briefcase' },
    ],
  },
  custom: {
    id: 'custom',
    name: 'דשבורד מותאם אישית',
    description: 'הגדרה חופשית של דשבורד לפי צרכים ייחודיים',
    icon: LayoutDashboard,
    color: 'slate',
    gradientFrom: 'from-slate-500',
    gradientTo: 'to-gray-600',
    defaultTableName: 'custom_data',
    recommendedColumns: [],
    defaultFilters: [],
    defaultCards: [],
  },
};

// Helper function to get dashboard type config
export function getDashboardTypeConfig(type: DashboardType): DashboardTypeConfig {
  return DASHBOARD_TYPES[type] || DASHBOARD_TYPES.custom;
}

// Helper function to get all dashboard types as array
export function getAllDashboardTypes(): DashboardTypeConfig[] {
  return Object.values(DASHBOARD_TYPES);
}

// Helper function to get dashboard type icon component
export function getDashboardTypeIcon(type: DashboardType): LucideIcon {
  return DASHBOARD_TYPES[type]?.icon || LayoutDashboard;
}

// Helper function to get color classes for a dashboard type
export function getDashboardTypeColors(type: DashboardType): {
  bg: string;
  text: string;
  gradient: string;
  border: string;
} {
  const config = DASHBOARD_TYPES[type] || DASHBOARD_TYPES.custom;
  return {
    bg: `bg-${config.color}-500/10`,
    text: `text-${config.color}-500`,
    gradient: `bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}`,
    border: `border-${config.color}-500/20`,
  };
}
