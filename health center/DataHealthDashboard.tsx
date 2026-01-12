// ============================================================================
// SELAI Data Health Dashboard
// דשבורד מקיף לניטור בריאות נתונים
// ============================================================================
// File: src/components/admin/DataHealthDashboard.tsx
// Dependencies: lucide-react, @supabase/supabase-js, recharts
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  FileSpreadsheet,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  Settings,
  Bell,
  Search,
  Zap,
  Shield,
  AlertCircle,
  Info,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Table2,
  Eye,
  Wrench,
  Trash2,
  Check,
  X
} from 'lucide-react';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SyncStatus {
  id: string;
  tableName: string;
  displayName: string;
  supabaseCount: number;
  base44Count: number;
  discrepancy: number;
  lastSync: string | null;
  pendingSyncs: number;
  failedSyncs: number;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastError?: string;
}

interface DataQualityIssue {
  id: string;
  tableName: string;
  recordId: string;
  issueType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  fieldName: string;
  currentValue: string;
  expectedFormat: string;
  errorMessage: string;
  suggestedFix?: string;
  autoFixable: boolean;
  status: 'open' | 'acknowledged' | 'fixing' | 'resolved' | 'ignored';
  detectedAt: string;
}

interface SyncHistory {
  id: string;
  syncType: string;
  sourceSystem: string;
  targetSystem: string;
  tablesSynced: string[];
  status: 'running' | 'completed' | 'failed' | 'partial';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}

interface SystemHealthSummary {
  overallScore: number;
  totalRecords: number;
  totalTables: number;
  healthyTables: number;
  warningTables: number;
  criticalTables: number;
  openIssues: number;
  criticalIssues: number;
  lastSyncTime: string | null;
  pendingSyncs: number;
}

// ============================================================================
// Mock Data (Replace with Supabase queries)
// ============================================================================

const mockSyncStatus: SyncStatus[] = [
  {
    id: '1',
    tableName: 'contacts',
    displayName: 'אנשי קשר',
    supabaseCount: 15234,
    base44Count: 15230,
    discrepancy: 4,
    lastSync: new Date(Date.now() - 3600000).toISOString(),
    pendingSyncs: 4,
    failedSyncs: 0,
    healthScore: 98.5,
    healthStatus: 'healthy'
  },
  {
    id: '2',
    tableName: 'leads',
    displayName: 'לידים',
    supabaseCount: 3456,
    base44Count: 3456,
    discrepancy: 0,
    lastSync: new Date(Date.now() - 1800000).toISOString(),
    pendingSyncs: 0,
    failedSyncs: 0,
    healthScore: 100,
    healthStatus: 'healthy'
  },
  {
    id: '3',
    tableName: 'policies',
    displayName: 'פוליסות',
    supabaseCount: 8765,
    base44Count: 8790,
    discrepancy: 25,
    lastSync: new Date(Date.now() - 7200000).toISOString(),
    pendingSyncs: 25,
    failedSyncs: 3,
    healthScore: 72.3,
    healthStatus: 'warning',
    lastError: 'Timeout during batch insert'
  },
  {
    id: '4',
    tableName: 'deals',
    displayName: 'עסקאות',
    supabaseCount: 2345,
    base44Count: 2400,
    discrepancy: 55,
    lastSync: new Date(Date.now() - 86400000).toISOString(),
    pendingSyncs: 55,
    failedSyncs: 12,
    healthScore: 45.2,
    healthStatus: 'critical',
    lastError: 'Foreign key constraint violation on agent_id'
  },
  {
    id: '5',
    tableName: 'clients',
    displayName: 'לקוחות',
    supabaseCount: 5678,
    base44Count: 5678,
    discrepancy: 0,
    lastSync: new Date(Date.now() - 900000).toISOString(),
    pendingSyncs: 0,
    failedSyncs: 0,
    healthScore: 95.8,
    healthStatus: 'healthy'
  }
];

const mockIssues: DataQualityIssue[] = [
  {
    id: '1',
    tableName: 'contacts',
    recordId: 'c-123',
    issueType: 'invalid_phone',
    severity: 'warning',
    fieldName: 'phone',
    currentValue: '501234567',
    expectedFormat: '05XXXXXXXX',
    errorMessage: 'מספר טלפון חסר אפס בתחילה',
    suggestedFix: '0501234567',
    autoFixable: true,
    status: 'open',
    detectedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '2',
    tableName: 'leads',
    recordId: 'l-456',
    issueType: 'duplicate',
    severity: 'warning',
    fieldName: 'phone',
    currentValue: '0541234567',
    expectedFormat: 'unique',
    errorMessage: 'מספר טלפון קיים במערכת (3 כפילויות)',
    autoFixable: false,
    status: 'open',
    detectedAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: '3',
    tableName: 'deals',
    recordId: 'd-789',
    issueType: 'missing_required',
    severity: 'error',
    fieldName: 'agent_id',
    currentValue: 'NULL',
    expectedFormat: 'UUID',
    errorMessage: 'עסקה ללא שיוך לסוכן',
    autoFixable: false,
    status: 'open',
    detectedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '4',
    tableName: 'policies',
    recordId: 'p-101',
    issueType: 'invalid_date',
    severity: 'critical',
    fieldName: 'end_date',
    currentValue: '31/13/2024',
    expectedFormat: 'DD/MM/YYYY',
    errorMessage: 'תאריך סיום לא תקין',
    suggestedFix: '31/12/2024',
    autoFixable: true,
    status: 'open',
    detectedAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: '5',
    tableName: 'contacts',
    recordId: 'c-202',
    issueType: 'invalid_id',
    severity: 'error',
    fieldName: 'id_number',
    currentValue: '123456789',
    expectedFormat: 'Valid Israeli ID',
    errorMessage: 'תעודת זהות לא עוברת בדיקת ספרת ביקורת',
    autoFixable: false,
    status: 'open',
    detectedAt: new Date(Date.now() - 43200000).toISOString()
  }
];

const mockSyncHistory: SyncHistory[] = [
  {
    id: '1',
    syncType: 'incremental',
    sourceSystem: 'base44',
    targetSystem: 'supabase',
    tablesSynced: ['contacts', 'leads'],
    status: 'completed',
    recordsProcessed: 150,
    recordsCreated: 45,
    recordsUpdated: 105,
    recordsFailed: 0,
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: new Date(Date.now() - 1750000).toISOString(),
    durationMs: 50000
  },
  {
    id: '2',
    syncType: 'full',
    sourceSystem: 'excel',
    targetSystem: 'supabase',
    tablesSynced: ['policies'],
    status: 'partial',
    recordsProcessed: 500,
    recordsCreated: 480,
    recordsUpdated: 0,
    recordsFailed: 20,
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7000000).toISOString(),
    durationMs: 200000
  },
  {
    id: '3',
    syncType: 'manual',
    sourceSystem: 'base44',
    targetSystem: 'supabase',
    tablesSynced: ['deals'],
    status: 'failed',
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 55,
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86300000).toISOString(),
    durationMs: 100000
  }
];

// ============================================================================
// Utility Functions
// ============================================================================

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('he-IL').format(num);
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'לא בוצע';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return 'אף פעם';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  return `לפני ${diffDays} ימים`;
};

const getHealthColor = (status: string): string => {
  switch (status) {
    case 'healthy': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'critical': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

const getHealthBgColor = (status: string): string => {
  switch (status) {
    case 'healthy': return 'bg-green-100 border-green-200';
    case 'warning': return 'bg-yellow-100 border-yellow-200';
    case 'critical': return 'bg-red-100 border-red-200';
    default: return 'bg-gray-100 border-gray-200';
  }
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'info': return 'text-blue-500 bg-blue-50';
    case 'warning': return 'text-yellow-600 bg-yellow-50';
    case 'error': return 'text-orange-500 bg-orange-50';
    case 'critical': return 'text-red-500 bg-red-50';
    default: return 'text-gray-500 bg-gray-50';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'info': return Info;
    case 'warning': return AlertTriangle;
    case 'error': return AlertCircle;
    case 'critical': return XCircle;
    default: return Info;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'text-green-500 bg-green-50';
    case 'running': return 'text-blue-500 bg-blue-50';
    case 'partial': return 'text-yellow-500 bg-yellow-50';
    case 'failed': return 'text-red-500 bg-red-50';
    default: return 'text-gray-500 bg-gray-50';
  }
};

const getIssueTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'invalid_phone': 'טלפון לא תקין',
    'duplicate': 'כפילות',
    'missing_required': 'שדה חובה חסר',
    'invalid_format': 'פורמט שגוי',
    'invalid_date': 'תאריך לא תקין',
    'invalid_id': 'ת.ז. לא תקינה',
    'orphan_record': 'רשומה יתומה',
    'data_mismatch': 'אי התאמה'
  };
  return labels[type] || type;
};

// ============================================================================
// Sub-Components
// ============================================================================

// Health Score Circle
const HealthScoreCircle: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ 
  score, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-20 h-20 text-lg',
    lg: 'w-32 h-32 text-3xl'
  };
  
  const getScoreColor = () => {
    if (score >= 90) return 'text-green-500 border-green-500';
    if (score >= 70) return 'text-yellow-500 border-yellow-500';
    return 'text-red-500 border-red-500';
  };
  
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <svg className="absolute transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444'}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`font-bold ${getScoreColor()}`}>{Math.round(score)}%</span>
    </div>
  );
};

// Stats Card
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  subtitle?: string;
}> = ({ title, value, icon: Icon, trend, trendValue, color = 'blue', subtitle }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={16} /> :
             trend === 'down' ? <ArrowDownRight size={16} /> :
             <Minus size={16} />}
            {trendValue && <span className="mr-1">{trendValue}</span>}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

// Table Health Row
const TableHealthRow: React.FC<{
  table: SyncStatus;
  onSync: (tableName: string) => void;
  onViewIssues: (tableName: string) => void;
}> = ({ table, onSync, onViewIssues }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`border rounded-lg overflow-hidden ${getHealthBgColor(table.healthStatus)}`}>
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          
          <div className="flex items-center gap-3">
            <Database className={getHealthColor(table.healthStatus)} size={24} />
            <div>
              <h4 className="font-semibold text-gray-900">{table.displayName}</h4>
              <p className="text-sm text-gray-500">{table.tableName}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Record Count */}
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              {formatNumber(table.supabaseCount)}
            </p>
            <p className="text-xs text-gray-500">רשומות</p>
          </div>
          
          {/* Discrepancy */}
          {table.discrepancy > 0 && (
            <div className="text-left">
              <p className="text-sm font-medium text-red-500">
                {formatNumber(table.discrepancy)}
              </p>
              <p className="text-xs text-gray-500">פער</p>
            </div>
          )}
          
          {/* Last Sync */}
          <div className="text-left min-w-[100px]">
            <p className="text-sm font-medium text-gray-900">
              {formatRelativeTime(table.lastSync)}
            </p>
            <p className="text-xs text-gray-500">סנכרון אחרון</p>
          </div>
          
          {/* Health Score */}
          <HealthScoreCircle score={table.healthScore} size="sm" />
          
          {/* Actions */}
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onSync(table.tableName)}
              className="p-2 rounded-lg hover:bg-white transition-colors"
              title="סנכרן עכשיו"
            >
              <RefreshCw size={18} className="text-gray-600" />
            </button>
            <button
              onClick={() => onViewIssues(table.tableName)}
              className="p-2 rounded-lg hover:bg-white transition-colors"
              title="צפה בבעיות"
            >
              <Eye size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200 bg-white/70">
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-500">Supabase</p>
              <p className="text-lg font-semibold">{formatNumber(table.supabaseCount)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-500">Base44</p>
              <p className="text-lg font-semibold">{formatNumber(table.base44Count)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-500">ממתינים</p>
              <p className="text-lg font-semibold text-yellow-500">{table.pendingSyncs}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-500">נכשלו</p>
              <p className="text-lg font-semibold text-red-500">{table.failedSyncs}</p>
            </div>
          </div>
          
          {table.lastError && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-700">שגיאה אחרונה:</p>
              <p className="text-sm text-red-600">{table.lastError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Issue Row
const IssueRow: React.FC<{
  issue: DataQualityIssue;
  onFix: (issue: DataQualityIssue) => void;
  onIgnore: (issue: DataQualityIssue) => void;
  onView: (issue: DataQualityIssue) => void;
}> = ({ issue, onFix, onIgnore, onView }) => {
  const SeverityIcon = getSeverityIcon(issue.severity);
  
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${getSeverityColor(issue.severity)}`}>
          <SeverityIcon size={20} />
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {getIssueTypeLabel(issue.issueType)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              {issue.tableName}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{issue.errorMessage}</p>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
            <span>שדה: {issue.fieldName}</span>
            <span>ערך: "{issue.currentValue}"</span>
            <span>{formatRelativeTime(issue.detectedAt)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {issue.autoFixable && issue.suggestedFix && (
          <button
            onClick={() => onFix(issue)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm"
          >
            <Wrench size={14} />
            תקן ({issue.suggestedFix})
          </button>
        )}
        <button
          onClick={() => onView(issue)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="צפה ברשומה"
        >
          <Eye size={18} className="text-gray-500" />
        </button>
        <button
          onClick={() => onIgnore(issue)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="התעלם"
        >
          <X size={18} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
};

// Sync History Row
const SyncHistoryRow: React.FC<{ sync: SyncHistory }> = ({ sync }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-4">
        <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(sync.status)}`}>
          {sync.status === 'completed' ? 'הושלם' :
           sync.status === 'running' ? 'פועל' :
           sync.status === 'partial' ? 'חלקי' : 'נכשל'}
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {sync.syncType === 'full' ? 'סנכרון מלא' :
               sync.syncType === 'incremental' ? 'סנכרון הדרגתי' : 'סנכרון ידני'}
            </span>
            <span className="text-sm text-gray-500">
              {sync.sourceSystem} → {sync.targetSystem}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            טבלאות: {sync.tablesSynced.join(', ')}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div className="text-left">
          <p className="font-medium text-gray-900">{formatNumber(sync.recordsProcessed)}</p>
          <p className="text-xs text-gray-500">עובדו</p>
        </div>
        <div className="text-left">
          <p className="font-medium text-green-500">{formatNumber(sync.recordsCreated)}</p>
          <p className="text-xs text-gray-500">נוצרו</p>
        </div>
        <div className="text-left">
          <p className="font-medium text-blue-500">{formatNumber(sync.recordsUpdated)}</p>
          <p className="text-xs text-gray-500">עודכנו</p>
        </div>
        {sync.recordsFailed > 0 && (
          <div className="text-left">
            <p className="font-medium text-red-500">{formatNumber(sync.recordsFailed)}</p>
            <p className="text-xs text-gray-500">נכשלו</p>
          </div>
        )}
        <div className="text-left min-w-[80px]">
          <p className="font-medium text-gray-700">{formatRelativeTime(sync.startedAt)}</p>
          <p className="text-xs text-gray-500">
            {sync.durationMs ? `${(sync.durationMs / 1000).toFixed(1)}s` : '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const DataHealthDashboard: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'issues' | 'history'>('overview');
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>(mockSyncStatus);
  const [issues, setIssues] = useState<DataQualityIssue[]>(mockIssues);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>(mockSyncHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  
  // Calculate summary
  const summary: SystemHealthSummary = {
    overallScore: syncStatus.reduce((acc, t) => acc + t.healthScore, 0) / syncStatus.length,
    totalRecords: syncStatus.reduce((acc, t) => acc + t.supabaseCount, 0),
    totalTables: syncStatus.length,
    healthyTables: syncStatus.filter(t => t.healthStatus === 'healthy').length,
    warningTables: syncStatus.filter(t => t.healthStatus === 'warning').length,
    criticalTables: syncStatus.filter(t => t.healthStatus === 'critical').length,
    openIssues: issues.filter(i => i.status === 'open').length,
    criticalIssues: issues.filter(i => i.status === 'open' && i.severity === 'critical').length,
    lastSyncTime: syncStatus.reduce((latest, t) => {
      if (!t.lastSync) return latest;
      if (!latest) return t.lastSync;
      return new Date(t.lastSync) > new Date(latest) ? t.lastSync : latest;
    }, null as string | null),
    pendingSyncs: syncStatus.reduce((acc, t) => acc + t.pendingSyncs, 0)
  };
  
  // Handlers
  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };
  
  const handleScan = async () => {
    setIsScanning(true);
    // Simulate scanning
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsScanning(false);
  };
  
  const handleSync = async (tableName: string) => {
    console.log('Syncing table:', tableName);
    // Implement sync logic
  };
  
  const handleFixIssue = async (issue: DataQualityIssue) => {
    console.log('Fixing issue:', issue);
    // Implement fix logic
    setIssues(prev => prev.filter(i => i.id !== issue.id));
  };
  
  const handleIgnoreIssue = async (issue: DataQualityIssue) => {
    console.log('Ignoring issue:', issue);
    setIssues(prev => prev.filter(i => i.id !== issue.id));
  };
  
  const handleViewIssue = (issue: DataQualityIssue) => {
    console.log('Viewing issue:', issue);
    // Implement view logic
  };
  
  // Filtered issues
  const filteredIssues = issues.filter(i => {
    if (selectedTable && i.tableName !== selectedTable) return false;
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    return i.status === 'open';
  });
  
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="text-blue-600" />
              דשבורד בריאות נתונים
            </h1>
            <p className="text-gray-500 mt-1">ניטור סנכרון, תקינות ואיכות נתונים</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isScanning ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Zap size={18} />
              )}
              סריקת בעיות
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <RefreshCw size={18} />
              )}
              רענן
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'overview', label: 'סקירה כללית', icon: PieChart },
            { id: 'tables', label: 'טבלאות', icon: Table2 },
            { id: 'issues', label: 'בעיות', icon: AlertTriangle, badge: summary.openIssues },
            { id: 'history', label: 'היסטוריה', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-6">
                <HealthScoreCircle score={summary.overallScore} size="lg" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">ציון בריאות כללי</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {summary.overallScore >= 90 ? 'המערכת במצב תקין' :
                     summary.overallScore >= 70 ? 'נדרשת תשומת לב' :
                     'נדרש טיפול דחוף'}
                  </p>
                </div>
              </div>
              
              <StatsCard
                title="סה״כ רשומות"
                value={formatNumber(summary.totalRecords)}
                icon={Database}
                color="blue"
              />
              <StatsCard
                title="טבלאות תקינות"
                value={`${summary.healthyTables}/${summary.totalTables}`}
                icon={CheckCircle2}
                color="green"
              />
              <StatsCard
                title="בעיות פתוחות"
                value={summary.openIssues}
                icon={AlertTriangle}
                color={summary.criticalIssues > 0 ? 'red' : 'yellow'}
                subtitle={summary.criticalIssues > 0 ? `${summary.criticalIssues} קריטיות` : undefined}
              />
              <StatsCard
                title="ממתינים לסנכרון"
                value={summary.pendingSyncs}
                icon={Clock}
                color="purple"
                subtitle={summary.lastSyncTime ? formatRelativeTime(summary.lastSyncTime) : undefined}
              />
            </div>
            
            {/* Quick Actions & Critical Issues */}
            <div className="grid grid-cols-2 gap-6">
              {/* Critical Issues */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="text-red-500" size={20} />
                  בעיות קריטיות
                </h3>
                
                {issues.filter(i => i.severity === 'critical' && i.status === 'open').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500" />
                    <p>אין בעיות קריטיות</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {issues
                      .filter(i => i.severity === 'critical' && i.status === 'open')
                      .slice(0, 3)
                      .map(issue => (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          onFix={handleFixIssue}
                          onIgnore={handleIgnoreIssue}
                          onView={handleViewIssue}
                        />
                      ))}
                  </div>
                )}
              </div>
              
              {/* Tables with Issues */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Database className="text-yellow-500" size={20} />
                  טבלאות דורשות טיפול
                </h3>
                
                <div className="space-y-3">
                  {syncStatus
                    .filter(t => t.healthStatus !== 'healthy')
                    .sort((a, b) => a.healthScore - b.healthScore)
                    .slice(0, 3)
                    .map(table => (
                      <TableHealthRow
                        key={table.id}
                        table={table}
                        onSync={handleSync}
                        onViewIssues={(t) => {
                          setSelectedTable(t);
                          setActiveTab('issues');
                        }}
                      />
                    ))}
                </div>
              </div>
            </div>
            
            {/* Recent Syncs */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="text-blue-500" size={20} />
                סנכרונים אחרונים
              </h3>
              
              <div className="space-y-3">
                {syncHistory.slice(0, 5).map(sync => (
                  <SyncHistoryRow key={sync.id} sync={sync} />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Tables Tab */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">סטטוס טבלאות</h3>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50">
                  <Filter size={16} />
                  סינון
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50">
                  <Download size={16} />
                  ייצוא
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {syncStatus.map(table => (
                <TableHealthRow
                  key={table.id}
                  table={table}
                  onSync={handleSync}
                  onViewIssues={(t) => {
                    setSelectedTable(t);
                    setActiveTab('issues');
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-500" />
                <span className="text-sm text-gray-600">סינון:</span>
              </div>
              
              <select
                value={selectedTable || ''}
                onChange={(e) => setSelectedTable(e.target.value || null)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="">כל הטבלאות</option>
                {syncStatus.map(t => (
                  <option key={t.tableName} value={t.tableName}>{t.displayName}</option>
                ))}
              </select>
              
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="all">כל הרמות</option>
                <option value="critical">קריטי</option>
                <option value="error">שגיאה</option>
                <option value="warning">אזהרה</option>
                <option value="info">מידע</option>
              </select>
              
              <div className="flex-1" />
              
              <span className="text-sm text-gray-500">
                {filteredIssues.length} בעיות נמצאו
              </span>
            </div>
            
            {/* Issues List */}
            <div className="space-y-3">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <CheckCircle2 size={48} className="mx-auto mb-3 text-green-500" />
                  <p className="text-gray-500">לא נמצאו בעיות</p>
                </div>
              ) : (
                filteredIssues.map(issue => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onFix={handleFixIssue}
                    onIgnore={handleIgnoreIssue}
                    onView={handleViewIssue}
                  />
                ))
              )}
            </div>
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">היסטוריית סנכרונים</h3>
            </div>
            
            <div className="space-y-3">
              {syncHistory.map(sync => (
                <SyncHistoryRow key={sync.id} sync={sync} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataHealthDashboard;
