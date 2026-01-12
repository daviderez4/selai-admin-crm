#!/bin/bash
# =============================================================================
# SELAI Health Center - Complete Setup Script
# =============================================================================
# Run in Claude Code: bash setup-all.sh
# =============================================================================

set -e  # Exit on error

echo "🚀 SELAI Health Center Setup Starting..."
echo "=========================================="

# Navigate to project root
cd "C:/dev/selai-admin-hub" || { echo "❌ Failed to cd to project"; exit 1; }

echo ""
echo "📁 Step 1: Creating directory structure..."
mkdir -p src/components/admin/health
mkdir -p src/services
mkdir -p src/app/admin/data-health
mkdir -p src/app/admin/schema-registry
mkdir -p src/hooks
mkdir -p src/types
mkdir -p supabase/migrations
mkdir -p supabase/functions/sync-monitor
echo "✅ Directories created"

echo ""
echo "📦 Step 2: Moving files from health center..."
cp "health center/SELAI-Data-Health-System.sql" supabase/migrations/20260112_data_health_system.sql 2>/dev/null || echo "⚠️ SQL file not found"
cp "health center/DataHealthDashboard.tsx" src/components/admin/health/ 2>/dev/null || echo "⚠️ Dashboard not found"
cp "health center/SchemaRegistryManager.tsx" src/components/admin/health/ 2>/dev/null || echo "⚠️ Schema Manager not found"
cp "health center/dataHealthService.ts" src/services/ 2>/dev/null || echo "⚠️ Service file not found"
cp "health center/supabase-edge-function-sync-monitor.ts" supabase/functions/sync-monitor/index.ts 2>/dev/null || echo "⚠️ Edge function not found"
echo "✅ Files moved"

echo ""
echo "📄 Step 3: Creating page files..."

# Data Health Page
cat > src/app/admin/data-health/page.tsx << 'DATAHEALTH'
'use client';

import React from 'react';
import DataHealthDashboard from '@/components/admin/health/DataHealthDashboard';

export default function DataHealthPage() {
  return <DataHealthDashboard />;
}
DATAHEALTH

# Schema Registry Page
cat > src/app/admin/schema-registry/page.tsx << 'SCHEMAREG'
'use client';

import React from 'react';
import SchemaRegistryManager from '@/components/admin/health/SchemaRegistryManager';

export default function SchemaRegistryPage() {
  return <SchemaRegistryManager />;
}
SCHEMAREG

echo "✅ Page files created"

echo ""
echo "📄 Step 4: Creating index export..."
cat > src/components/admin/health/index.ts << 'INDEX'
export { default as DataHealthDashboard } from './DataHealthDashboard';
export { default as SchemaRegistryManager } from './SchemaRegistryManager';
INDEX
echo "✅ Index created"

echo ""
echo "📄 Step 5: Creating types file..."
cat > src/types/dataHealth.ts << 'TYPES'
export interface SyncStatus {
  id: string;
  projectId: string;
  tableName: string;
  supabaseCount: number;
  base44Count: number;
  discrepancy: number;
  lastSyncAt: string | null;
  pendingSyncs: number;
  failedSyncs: number;
  lastError: string | null;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  updatedAt: string;
}

export interface DataQualityIssue {
  id: string;
  projectId: string;
  tableName: string;
  recordId: string;
  issueType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  fieldName: string;
  currentValue: string;
  expectedFormat: string;
  errorMessage: string;
  suggestedFix: string | null;
  autoFixable: boolean;
  status: 'open' | 'acknowledged' | 'fixing' | 'resolved' | 'ignored';
  detectedAt: string;
}

export interface DataSchema {
  id: string;
  projectId: string;
  schemaName: string;
  description: string | null;
  sourceType: 'excel' | 'csv' | 'api' | 'manual';
  columnMappings: Record<string, string>;
  category: string | null;
  insuranceCompany: string | null;
  useCount: number;
  successRate: number;
  isActive: boolean;
  isPublic: boolean;
}

export interface SystemHealthSummary {
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
TYPES
echo "✅ Types created"

echo ""
echo "📄 Step 6: Creating hooks..."
cat > src/hooks/useDataHealth.ts << 'HOOKS'
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useDataHealth(projectId: string = 'default') {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseKey));
  const [syncStatus, setSyncStatus] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statusRes, issuesRes] = await Promise.all([
        supabase.from('sync_status').select('*').eq('project_id', projectId),
        supabase.from('data_quality_issues').select('*').eq('project_id', projectId).eq('status', 'open').limit(100)
      ]);
      setSyncStatus(statusRes.data || []);
      setIssues(issuesRes.data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const scanQuality = async (tableName?: string) => {
    const { data, error } = await supabase.rpc('scan_data_quality', {
      p_project_id: projectId, p_table_name: tableName || null
    });
    if (error) throw error;
    await refresh();
    return data;
  };

  return { syncStatus, issues, isLoading, error, refresh, scanQuality };
}

export function useSchemaRegistry(projectId: string = 'default') {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseKey));
  const [schemas, setSchemas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('data_schemas').select('*')
      .or(\`project_id.eq.\${projectId},is_public.eq.true\`).order('use_count', { ascending: false });
    setSchemas(data || []);
    setIsLoading(false);
  }, [supabase, projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { schemas, isLoading, refresh };
}
HOOKS
echo "✅ Hooks created"

echo ""
echo "📄 Step 7: Creating navigation component..."
cat > src/components/admin/health/HealthNavigation.tsx << 'NAV'
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, FileJson } from 'lucide-react';

const navItems = [
  { href: '/admin/data-health', label: 'בריאות נתונים', icon: Activity },
  { href: '/admin/schema-registry', label: 'מנהל סכמות', icon: FileJson }
];

export default function HealthNavigation() {
  const pathname = usePathname();
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3" dir="rtl">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-500">ניהול נתונים:</span>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={\`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors \${
                isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }\`}>
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
NAV
echo "✅ Navigation created"

echo ""
echo "=========================================="
echo "✅ SELAI Health Center Setup Complete!"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo "   1. Run SQL migration in Supabase Dashboard:"
echo "      - Open: supabase/migrations/20260112_data_health_system.sql"
echo "      - Copy content to Supabase SQL Editor and run"
echo ""
echo "   2. Import n8n workflows:"
echo "      - health center/n8n-data-health-monitor.json"
echo "      - health center/n8n-smart-excel-processor.json"
echo ""
echo "   3. Start dev server:"
echo "      npm run dev"
echo ""
echo "   4. Open in browser:"
echo "      http://localhost:3000/admin/data-health"
echo "      http://localhost:3000/admin/schema-registry"
echo ""
