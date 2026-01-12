# SELAI Data Health & Excel System - Complete Setup Guide
## For Claude Code - Full Implementation

---

## 📋 Overview

This document contains everything needed to set up the SELAI Data Health monitoring system and Smart Excel Processor.

### Components:
1. **Supabase Tables** - 4 tables for health monitoring and schema registry
2. **n8n Workflows** - 2 workflows (Data Health Monitor + Smart Excel Processor)
3. **Frontend Integration** - Connect to existing SELAI Admin Hub

---

## 🗄️ PART 1: Supabase Database Setup

### Run this SQL in Supabase SQL Editor:

```sql
-- =====================================================
-- SELAI DATA HEALTH SYSTEM - COMPLETE SQL
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
('פניקס - לקוחות', 'פניקס', '{"ת.ז": "id_number", "שם_פרטי": "first_name", "שם_משפחה": "last_name", "טלפון": "phone"}', true)
ON CONFLICT DO NOTHING;

-- DONE!
SELECT 'SUCCESS: All 4 tables created with RLS and indexes!' as result;
```

---

## 🔧 PART 2: n8n Workflow Setup

### Workflow 1: Data Health Monitor v3

**Already configured in n8n - Status: Active ✅**

Settings:
- Schedule: Every 1 hour
- OpenAI Model: GPT-4o
- Supabase Connection: Supabase SELAI

Flow:
```
Schedule Trigger → Simple Check → Prepare Prompt → AI Analysis → Save Result
```

### Workflow 2: Smart Excel Processor

**Already configured in n8n - Status: Active ✅**

Settings:
- Webhook URL: https://selai.app.n8n.cloud/webhook/process-excel
- OpenAI Model: GPT-4o
- Supabase Connection: Supabase SELAI

Flow:
```
Webhook → Parse Excel → Extract Headers → Detect Schema → AI Suggest → Insert to Supabase
```

---

## 💻 PART 3: Frontend Integration

### Create these files in the SELAI Admin Hub:

### File 1: `src/components/admin/DataHealthDashboard.tsx`

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface HealthCheck {
  id: string;
  check_type: string;
  tables_checked: string;
  issues_found: number;
  ai_summary: string;
  status: string;
  created_at: string;
}

export default function DataHealthDashboard() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealthChecks();
  }, []);

  async function fetchHealthChecks() {
    const { data, error } = await supabase
      .from('sync_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setHealthChecks(data);
    setLoading(false);
  }

  async function triggerManualCheck() {
    setLoading(true);
    // Call n8n webhook for manual check
    try {
      await fetch('https://selai.app.n8n.cloud/webhook/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' })
      });
      // Wait a bit then refresh
      setTimeout(fetchHealthChecks, 3000);
    } catch (error) {
      console.error('Error triggering check:', error);
      setLoading(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏥 בריאות נתונים</h1>
        <button
          onClick={triggerManualCheck}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⏳ בודק...' : '🔄 בדיקה ידנית'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">טוען...</div>
      ) : (
        <div className="space-y-4">
          {healthChecks.map((check) => (
            <div
              key={check.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    check.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {check.status === 'completed' ? '✅ הושלם' : '⏳ בתהליך'}
                  </span>
                  <span className="mr-2 text-sm text-gray-500">
                    {new Date(check.created_at).toLocaleString('he-IL')}
                  </span>
                </div>
                <div className="text-sm">
                  <span className={check.issues_found > 0 ? 'text-red-600' : 'text-green-600'}>
                    {check.issues_found} בעיות
                  </span>
                </div>
              </div>
              {check.ai_summary && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  {check.ai_summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File 2: `src/components/admin/SchemaRegistryManager.tsx`

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DataSchema {
  id: string;
  name: string;
  insurance_company: string;
  column_mappings: Record<string, string>;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export default function SchemaRegistryManager() {
  const [schemas, setSchemas] = useState<DataSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchemas();
  }, []);

  async function fetchSchemas() {
    const { data, error } = await supabase
      .from('data_schemas')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setSchemas(data.map(s => ({
        ...s,
        column_mappings: typeof s.column_mappings === 'string' 
          ? JSON.parse(s.column_mappings) 
          : s.column_mappings
      })));
    }
    setLoading(false);
  }

  async function toggleSchema(id: string, currentStatus: boolean) {
    await supabase
      .from('data_schemas')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    fetchSchemas();
  }

  async function deleteSchema(id: string) {
    if (confirm('האם למחוק את הסכמה?')) {
      await supabase.from('data_schemas').delete().eq('id', id);
      fetchSchemas();
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 ניהול סכמות Excel</h1>

      {loading ? (
        <div className="text-center py-8">טוען...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">חברת ביטוח</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">עמודות</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שימושים</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">פעולות</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schemas.map((schema) => (
                <tr key={schema.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {schema.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {schema.insurance_company || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {Object.keys(schema.column_mappings || {}).length} עמודות
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {schema.usage_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${
                      schema.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {schema.is_active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 space-x-reverse">
                    <button
                      onClick={() => toggleSchema(schema.id, schema.is_active)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {schema.is_active ? 'השבת' : 'הפעל'}
                    </button>
                    <button
                      onClick={() => deleteSchema(schema.id)}
                      className="text-red-600 hover:text-red-900 mr-2"
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### File 3: `src/components/admin/ExcelUploader.tsx`

```tsx
'use client';

import React, { useState, useCallback } from 'react';

const N8N_WEBHOOK_URL = 'https://selai.app.n8n.cloud/webhook/process-excel';

export default function ExcelUploader() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('נא להעלות קובץ Excel או CSV בלבד');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg" dir="rtl">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📤 העלאת קובץ Excel</h2>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="excel-upload"
        />
        <label
          htmlFor="excel-upload"
          className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <span className="text-gray-600">מעבד את הקובץ...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-4">📁</span>
              <span className="text-gray-600">לחץ כאן או גרור קובץ Excel</span>
              <span className="text-sm text-gray-400 mt-2">xlsx, xls, csv</span>
            </div>
          )}
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">✅ הקובץ עובד בהצלחה!</h3>
          <div className="text-sm text-green-700">
            <p>שם הסכמה: {result.name || 'לא זוהה'}</p>
            <p>עמודות שזוהו: {result.columns_detected || 0}</p>
            <p>שורות: {result.rows_count || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### File 4: `src/app/admin/data-health/page.tsx`

```tsx
import DataHealthDashboard from '@/components/admin/DataHealthDashboard';

export default function DataHealthPage() {
  return (
    <div className="container mx-auto py-8">
      <DataHealthDashboard />
    </div>
  );
}
```

### File 5: `src/app/admin/schema-registry/page.tsx`

```tsx
import SchemaRegistryManager from '@/components/admin/SchemaRegistryManager';

export default function SchemaRegistryPage() {
  return (
    <div className="container mx-auto py-8">
      <SchemaRegistryManager />
    </div>
  );
}
```

---

## 🔗 PART 4: Add to Sidebar Navigation

Add these links to your sidebar:

```tsx
// In your sidebar component, add:
{
  name: 'בריאות נתונים',
  href: '/admin/data-health',
  icon: '🏥',
  adminOnly: true
},
{
  name: 'סכמות Excel',
  href: '/admin/schema-registry',
  icon: '📊',
  adminOnly: true
}
```

---

## ✅ PART 5: Verification Checklist

### Supabase:
- [ ] Run SQL to create 4 tables
- [ ] Verify tables exist: `SELECT * FROM sync_history LIMIT 1;`
- [ ] Verify schemas: `SELECT * FROM data_schemas LIMIT 5;`

### n8n:
- [ ] Data Health Monitor v3 - Active ✅
- [ ] Smart Excel Processor - Active ✅
- [ ] Supabase credentials connected
- [ ] OpenAI credentials connected

### Frontend:
- [ ] DataHealthDashboard component created
- [ ] SchemaRegistryManager component created
- [ ] ExcelUploader component created
- [ ] Routes added (/admin/data-health, /admin/schema-registry)
- [ ] Sidebar links added

---

## 📊 Summary

| Component | Status | Location |
|-----------|--------|----------|
| sync_history table | ✅ | Supabase |
| sync_status table | ✅ | Supabase |
| data_quality_issues table | ✅ | Supabase |
| data_schemas table | ✅ | Supabase |
| Data Health Monitor | ✅ Active | n8n |
| Smart Excel Processor | ✅ Active | n8n |
| Frontend Components | 📝 Ready | src/components/admin/ |

---

## 🚀 Quick Commands for Claude Code

```bash
# Create admin components directory
mkdir -p src/components/admin

# Create admin pages directory  
mkdir -p src/app/admin/data-health
mkdir -p src/app/admin/schema-registry

# Run the app
npm run dev
```

---

## 📞 n8n Webhook URLs

- **Health Check**: `https://selai.app.n8n.cloud/webhook/health-check`
- **Excel Upload**: `https://selai.app.n8n.cloud/webhook/process-excel`

---

*Document created: January 12, 2026*
*Version: 1.0*
