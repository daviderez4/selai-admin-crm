# SELAI Health Center - Claude Code Setup Instructions
## הוראות מלאות להתקנה בקלוד קוד

---

## 🚀 העתק והדבק את הפקודות הבאות לקלוד קוד:

### פקודה 1: ארגון מבנה הקבצים

```bash
cd C:/dev/selai-admin-hub

# Create directories
mkdir -p src/components/admin/health
mkdir -p src/services
mkdir -p src/app/admin/data-health
mkdir -p src/app/admin/schema-registry
mkdir -p src/hooks
mkdir -p src/types
mkdir -p supabase/migrations
mkdir -p supabase/functions/sync-monitor

# Move files from health center
cp "health center/SELAI-Data-Health-System.sql" supabase/migrations/20260112_data_health_system.sql
cp "health center/DataHealthDashboard.tsx" src/components/admin/health/
cp "health center/SchemaRegistryManager.tsx" src/components/admin/health/
cp "health center/dataHealthService.ts" src/services/
cp "health center/supabase-edge-function-sync-monitor.ts" supabase/functions/sync-monitor/index.ts

echo "✅ Files organized!"
```

---

### פקודה 2: צור את דף Data Health

```bash
cat > src/app/admin/data-health/page.tsx << 'EOF'
'use client';

import React from 'react';
import DataHealthDashboard from '@/components/admin/health/DataHealthDashboard';

export default function DataHealthPage() {
  return <DataHealthDashboard />;
}
EOF

echo "✅ Data Health page created!"
```

---

### פקודה 3: צור את דף Schema Registry

```bash
cat > src/app/admin/schema-registry/page.tsx << 'EOF'
'use client';

import React from 'react';
import SchemaRegistryManager from '@/components/admin/health/SchemaRegistryManager';

export default function SchemaRegistryPage() {
  return <SchemaRegistryManager />;
}
EOF

echo "✅ Schema Registry page created!"
```

---

### פקודה 4: צור Types File

```bash
cat > src/types/dataHealth.ts << 'EOF'
// Data Health Types for SELAI

export interface SyncStatus {
  id: string;
  projectId: string;
  tableName: string;
  supabaseCount: number;
  base44Count: number;
  discrepancy: number;
  lastSyncAt: string | null;
  lastSuccessfulSync: string | null;
  pendingSyncs: number;
  failedSyncs: number;
  lastError: string | null;
  lastErrorAt: string | null;
  errorCount24h: number;
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
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  detectedAt: string;
  updatedAt: string;
}

export interface SyncHistory {
  id: string;
  projectId: string;
  syncType: 'full' | 'incremental' | 'manual' | 'scheduled';
  sourceSystem: string;
  targetSystem: string;
  tablesSynced: string[];
  status: 'running' | 'completed' | 'failed' | 'partial';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  errors: any[];
  warnings: any[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  triggeredBy: string | null;
  triggerSource: string;
}

export interface DataSchema {
  id: string;
  projectId: string;
  schemaName: string;
  schemaNameEn: string | null;
  description: string | null;
  sourceType: 'excel' | 'csv' | 'api' | 'manual';
  columnMappings: Record<string, string>;
  normalizationRules: Record<string, string> | null;
  sampleHeaders: string[] | null;
  headerPatterns: any[] | null;
  useCount: number;
  lastUsedAt: string | null;
  autoDetectedCount: number;
  successRate: number;
  category: string | null;
  insuranceCompany: string | null;
  createdBy: string | null;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
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
EOF

echo "✅ Types file created!"
```

---

### פקודה 5: צור Index Export

```bash
cat > src/components/admin/health/index.ts << 'EOF'
export { default as DataHealthDashboard } from './DataHealthDashboard';
export { default as SchemaRegistryManager } from './SchemaRegistryManager';
EOF

echo "✅ Index export created!"
```

---

### פקודה 6: עדכן את הניווט (Navigation)

```bash
cat > src/components/admin/health/HealthNavigation.tsx << 'EOF'
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, FileJson, Database, Settings } from 'lucide-react';

const navItems = [
  {
    href: '/admin/data-health',
    label: 'בריאות נתונים',
    icon: Activity,
    description: 'ניטור סנכרון ותקינות'
  },
  {
    href: '/admin/schema-registry',
    label: 'מנהל סכמות',
    icon: FileJson,
    description: 'מיפוי קבצי Excel'
  }
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
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
EOF

echo "✅ Navigation component created!"
```

---

### פקודה 7: צור Hook לשימוש קל

```bash
cat > src/hooks/useDataHealth.ts << 'EOF'
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
        supabase
          .from('sync_status')
          .select('*')
          .eq('project_id', projectId),
        supabase
          .from('data_quality_issues')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'open')
          .limit(100)
      ]);

      if (statusRes.error) throw statusRes.error;
      if (issuesRes.error) throw issuesRes.error;

      setSyncStatus(statusRes.data || []);
      setIssues(issuesRes.data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const scanQuality = async (tableName?: string) => {
    const { data, error } = await supabase.rpc('scan_data_quality', {
      p_project_id: projectId,
      p_table_name: tableName || null
    });
    if (error) throw error;
    await refresh();
    return data;
  };

  const resolveIssue = async (issueId: string, status: 'resolved' | 'ignored') => {
    const { error } = await supabase
      .from('data_quality_issues')
      .update({ 
        status, 
        resolved_at: new Date().toISOString() 
      })
      .eq('id', issueId);
    if (error) throw error;
    await refresh();
  };

  return {
    syncStatus,
    issues,
    isLoading,
    error,
    refresh,
    scanQuality,
    resolveIssue
  };
}

export function useSchemaRegistry(projectId: string = 'default') {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseKey));
  const [schemas, setSchemas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_schemas')
        .select('*')
        .or(`project_id.eq.${projectId},is_public.eq.true`)
        .order('use_count', { ascending: false });

      if (error) throw error;
      setSchemas(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSchema = async (schema: any) => {
    const { data, error } = await supabase
      .from('data_schemas')
      .insert({ ...schema, project_id: projectId })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data;
  };

  const deleteSchema = async (schemaId: string) => {
    const { error } = await supabase
      .from('data_schemas')
      .delete()
      .eq('id', schemaId);
    if (error) throw error;
    await refresh();
  };

  return {
    schemas,
    isLoading,
    error,
    refresh,
    createSchema,
    deleteSchema
  };
}
EOF

echo "✅ Hooks created!"
```

---

### פקודה 8: הרץ את ה-SQL Migration

```bash
# Option 1: Using Supabase CLI
npx supabase db push

# Option 2: If CLI not configured, copy the SQL content and run in Supabase Dashboard
echo "📋 Copy supabase/migrations/20260112_data_health_system.sql content to Supabase SQL Editor"
```

---

### פקודה 9: בדוק שהכל עובד

```bash
# Check file structure
echo "📁 Checking file structure..."
ls -la src/components/admin/health/
ls -la src/services/
ls -la src/app/admin/data-health/
ls -la src/app/admin/schema-registry/
ls -la supabase/migrations/

# Run dev server
npm run dev

echo "🚀 Open http://localhost:3000/admin/data-health"
echo "🚀 Open http://localhost:3000/admin/schema-registry"
```

---

## 📋 סיכום מבנה הקבצים הסופי

```
C:\dev\selai-admin-hub\
├── src/
│   ├── app/
│   │   └── admin/
│   │       ├── data-health/
│   │       │   └── page.tsx          ✅
│   │       └── schema-registry/
│   │           └── page.tsx          ✅
│   ├── components/
│   │   └── admin/
│   │       └── health/
│   │           ├── DataHealthDashboard.tsx    ✅
│   │           ├── SchemaRegistryManager.tsx  ✅
│   │           ├── HealthNavigation.tsx       ✅
│   │           └── index.ts                   ✅
│   ├── services/
│   │   └── dataHealthService.ts      ✅
│   ├── hooks/
│   │   └── useDataHealth.ts          ✅
│   └── types/
│       └── dataHealth.ts             ✅
├── supabase/
│   ├── migrations/
│   │   └── 20260112_data_health_system.sql  ✅
│   └── functions/
│       └── sync-monitor/
│           └── index.ts              ✅
└── health center/
    ├── n8n-data-health-monitor.json  📥 Import to n8n
    └── n8n-smart-excel-processor.json 📥 Import to n8n
```

---

## 🔗 קישורים אחרי ההתקנה

- **Data Health Dashboard**: `http://localhost:3000/admin/data-health`
- **Schema Registry**: `http://localhost:3000/admin/schema-registry`

---

## ⚠️ הערות חשובות

1. **Supabase URL & Key**: ודא שיש לך `.env.local` עם:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. **n8n Workflows**: יש לייבא ידנית דרך n8n Dashboard

3. **Edge Function**: Deploy עם:
   ```bash
   supabase functions deploy sync-monitor
   ```
