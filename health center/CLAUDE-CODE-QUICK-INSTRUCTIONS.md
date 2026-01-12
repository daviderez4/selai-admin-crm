# 🤖 הוראות לקלוד קוד - העתק והדבק

## משימה: הגדרת מערכת Data Health ו-Excel Processor ב-SELAI Admin Hub

---

## צעד 1: צור את הקומפוננטות

צור את הקבצים הבאים:

### 1. `src/components/admin/health/DataHealthDashboard.tsx`
דשבורד לצפייה בבדיקות בריאות נתונים מ-Supabase sync_history

### 2. `src/components/admin/health/SchemaRegistryManager.tsx`  
ממשק לניהול סכמות Excel מ-Supabase data_schemas

### 3. `src/components/admin/health/ExcelUploader.tsx`
קומפוננטה להעלאת Excel ל-n8n webhook:
URL: https://selai.app.n8n.cloud/webhook/process-excel

### 4. `src/app/admin/data-health/page.tsx`
עמוד שמציג את DataHealthDashboard

### 5. `src/app/admin/schema-registry/page.tsx`
עמוד שמציג את SchemaRegistryManager

---

## צעד 2: הוסף לסיידבר

הוסף קישורים לסיידבר הניהול:
- 🏥 בריאות נתונים → /admin/data-health
- 📊 סכמות Excel → /admin/schema-registry

---

## צעד 3: טבלאות Supabase

הטבלאות כבר קיימות:
- sync_history - לוג בדיקות בריאות
- data_schemas - סכמות Excel

---

## 📋 דרישות טכניות:

1. **RTL תמיכה** - כל הקומפוננטות בעברית עם dir="rtl"
2. **Supabase Client** - שימוש ב-createClient מ-@supabase/supabase-js
3. **Tailwind CSS** - עיצוב עם Tailwind
4. **TypeScript** - טייפים מלאים

---

## 🔗 n8n Webhooks:

- Health Check: POST https://selai.app.n8n.cloud/webhook/health-check
- Excel Upload: POST https://selai.app.n8n.cloud/webhook/process-excel

---

## ✅ בדיקה:

1. npm run dev
2. פתח http://localhost:3001/admin/data-health
3. פתח http://localhost:3001/admin/schema-registry
