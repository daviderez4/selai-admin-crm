# SELAI Data Health & Schema Registry System
## מערכת מקיפה לניטור בריאות נתונים ורישום סכמות

### 📋 סקירה כללית

מערכת זו מספקת פתרון מקיף לניהול אמינות ותקינות הנתונים ב-SELAI, כולל:

1. **Data Health Dashboard** - דשבורד לניטור בריאות נתונים בזמן אמת
2. **Schema Registry** - מנהל סכמות למיפוי קבצי Excel
3. **Automated Quality Scanning** - סריקה אוטומטית של בעיות תקינות
4. **Smart Excel Processor** - עיבוד חכם של קבצי Excel עם זיהוי סכמה אוטומטי
5. **Real-time Sync Monitoring** - ניטור סנכרון בזמן אמת

---

## 📁 קבצים במערכת

```
/SELAI-Data-Health-System/
├── SELAI-Data-Health-System.sql           # SQL Migration - כל הטבלאות והפונקציות
├── DataHealthDashboard.tsx                # React Component - דשבורד בריאות נתונים
├── SchemaRegistryManager.tsx              # React Component - מנהל סכמות
├── dataHealthService.ts                   # Services & Hooks - שירותי Supabase
├── n8n-data-health-monitor.json           # n8n Workflow - ניטור בריאות
├── n8n-smart-excel-processor.json         # n8n Workflow - עיבוד Excel חכם
├── supabase-edge-function-sync-monitor.ts # Edge Function - ניטור בזמן אמת
└── README.md                              # מסמך זה
```

---

## 🚀 התקנה

### שלב 1: הרצת ה-SQL Migration

```bash
# בתיקיית הפרויקט
cd C:/dev/selai-admin-hub

# העתק את קובץ ה-SQL
cp /path/to/SELAI-Data-Health-System.sql supabase/migrations/

# הרץ את ה-Migration
npx supabase db push
```

או הרץ ישירות ב-Supabase SQL Editor:
```sql
-- העתק את כל התוכן של SELAI-Data-Health-System.sql והרץ
```

### שלב 2: הוספת הקומפוננטות

```bash
# העתק את הקומפוננטות
cp DataHealthDashboard.tsx src/components/admin/
cp SchemaRegistryManager.tsx src/components/admin/

# העתק את השירותים
cp dataHealthService.ts src/services/
```

### שלב 3: הגדרת ה-Routes

```typescript
// src/app/admin/data-health/page.tsx
import DataHealthDashboard from '@/components/admin/DataHealthDashboard';

export default function DataHealthPage() {
  return <DataHealthDashboard />;
}

// src/app/admin/schema-registry/page.tsx
import SchemaRegistryManager from '@/components/admin/SchemaRegistryManager';

export default function SchemaRegistryPage() {
  return <SchemaRegistryManager />;
}
```

### שלב 4: ייבוא n8n Workflows

1. פתח את n8n Dashboard
2. לחץ על "Import from File"
3. בחר את `n8n-data-health-monitor.json`
4. עדכן את ה-Credentials:
   - Supabase API
   - OpenAI API
   - Slack OAuth (אופציונלי)
5. חזור על התהליך עבור `n8n-smart-excel-processor.json`

### שלב 5: Deploy Edge Function

```bash
# ב-Supabase CLI
supabase functions deploy sync-monitor --project-ref YOUR_PROJECT_REF
```

---

## 📊 טבלאות שנוצרות

| טבלה | תיאור |
|------|-------|
| `data_schemas` | רישום סכמות למיפוי Excel |
| `schema_usage_log` | היסטוריית שימוש בסכמות |
| `sync_status` | סטטוס סנכרון לכל טבלה |
| `data_quality_issues` | בעיות תקינות שזוהו |
| `sync_history` | היסטוריית סנכרונים |
| `sync_schedules` | תזמון סנכרונים |
| `validation_rules` | כללי תקינות לשדות |

---

## 🔧 פונקציות SQL שנוצרות

### פונקציות וולידציה
```sql
-- בדיקת תעודת זהות ישראלית
SELECT validate_israeli_id('123456782'); -- true/false

-- נורמליזציה של טלפון ישראלי
SELECT normalize_israeli_phone('+972501234567'); -- '0501234567'
```

### פונקציות ניטור
```sql
-- בדיקת בריאות כללית
SELECT * FROM check_data_health('your_project_id');

-- סריקת בעיות תקינות
SELECT scan_data_quality('your_project_id', 'contacts');

-- זיהוי סכמה
SELECT * FROM detect_schema('your_project_id', ARRAY['שם', 'טלפון', 'אימייל']);
```

---

## 🖥️ שימוש בקומפוננטות

### DataHealthDashboard

```tsx
import { useDataHealth } from '@/services/dataHealthService';

function MyComponent() {
  const {
    syncStatus,
    issues,
    summary,
    isLoading,
    refresh,
    scanQuality,
    fixIssue
  } = useDataHealth(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    'your_project_id'
  );

  // הרץ סריקה
  const handleScan = async () => {
    const result = await scanQuality('contacts');
    console.log(`נמצאו ${result.issuesFound} בעיות`);
  };

  // תקן בעיה
  const handleFix = async (issue) => {
    const success = await fixIssue(issue);
    if (success) console.log('תוקן!');
  };
}
```

### SchemaRegistryManager

```tsx
import { useSchemaRegistry } from '@/services/dataHealthService';

function MyComponent() {
  const {
    schemas,
    isLoading,
    createSchema,
    updateSchema,
    deleteSchema,
    detectSchema,
    suggestMappings
  } = useSchemaRegistry(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    'your_project_id'
  );

  // זיהוי סכמה מכותרות
  const handleDetect = async (headers: string[]) => {
    const matches = await detectSchema(headers);
    console.log('סכמות תואמות:', matches);
  };
}
```

---

## 🔄 n8n Workflows

### Data Health Monitor

**Endpoints:**
- `GET/POST /webhook/data-health-scan` - הפעלת סריקה ידנית
- `POST /webhook/auto-fix-issues` - תיקון אוטומטי של בעיות

**תזמון:**
- רץ אוטומטית כל שעה
- שולח התראות ל-Slack על בעיות קריטיות

### Smart Excel Processor

**Endpoint:**
- `POST /webhook/process-excel`

**Body:**
```json
{
  "project_id": "your_project_id",
  "target_table": "contacts",
  "file_name": "import.xlsx"
}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalRows": 1000,
    "validRows": 985,
    "invalidRows": 15,
    "validationRate": "98.5%"
  },
  "insertedCount": 985,
  "schemaDetected": "דוח פנסיה הראל",
  "confidence": "95.0%"
}
```

---

## 🌐 Edge Function API

### Base URL
```
https://YOUR_PROJECT.supabase.co/functions/v1/sync-monitor
```

### Endpoints

#### בדיקת בריאות
```bash
GET /sync-monitor?action=check&project_id=default
```

#### סריקת איכות
```bash
GET /sync-monitor?action=scan&project_id=default
```

#### תיקון אוטומטי
```bash
POST /sync-monitor?action=fix
Content-Type: application/json

{
  "limit": 50
}
```

#### הפעלת סנכרון
```bash
POST /sync-monitor?action=sync
Content-Type: application/json

{
  "tables": ["contacts", "leads"]
}
```

---

## 📈 Views שימושיות

```sql
-- תצוגת בריאות כללית
SELECT * FROM v_system_health;

-- בעיות פתוחות לפי סוג
SELECT * FROM v_open_issues;

-- סכמות פופולריות
SELECT * FROM v_popular_schemas;
```

---

## 🔐 RLS Policies

המערכת כוללת Row Level Security מלא:

- **Admin** - גישה מלאה לכל הנתונים
- **Agent** - גישה רק לנתוני הפרויקט שלו
- **Public** - גישה לסכמות ציבוריות בלבד

---

## 🛠️ פקודות Claude Code

### להתקנה מלאה:

```bash
# 1. צור את התיקיות
mkdir -p src/components/admin src/services supabase/migrations supabase/functions/sync-monitor

# 2. העתק את הקבצים
# (הקבצים כבר נמצאים ב-/home/claude/)

# 3. הרץ את ה-Migration
npx supabase db push

# 4. Deploy Edge Function
supabase functions deploy sync-monitor

# 5. ייבא את ה-Workflows ל-n8n
```

### לבדיקה מהירה:

```bash
# בדוק שהטבלאות נוצרו
npx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'data_%' OR table_name LIKE 'sync_%' OR table_name LIKE 'schema_%'"

# בדוק שהפונקציות נוצרו
npx supabase db query "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public'"
```

---

## 📞 תמיכה

- **בעיות טכניות**: בדוק את ה-Supabase Logs
- **שגיאות n8n**: בדוק את ה-Execution History
- **בעיות RLS**: ודא שה-JWT מכיל את ה-role הנכון

---

## 📝 הערות חשובות

1. **גיבוי**: לפני הרצת ה-Migration, גבה את מסד הנתונים
2. **Credentials**: ודא שכל ה-API Keys מוגדרים נכון
3. **Performance**: הוסף אינדקסים נוספים לפי הצורך
4. **Monitoring**: הגדר התראות ב-Supabase Dashboard

---

*נוצר עבור SELAI - מערכת ניהול סוכנויות ביטוח*
*גרסה 1.0.0 | ינואר 2026*
