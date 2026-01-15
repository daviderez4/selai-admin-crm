# 🏦 SELAI Insurance Integration Hub

מערכת אינטגרציה מרכזית לחיבור סוכנויות ביטוח למקורות מידע ישראליים.

## 📋 תוכן עניינים

- [סקירה כללית](#סקירה-כללית)
- [ארכיטקטורה](#ארכיטקטורה)
- [התקנה מהירה](#התקנה-מהירה)
- [חיבורים נתמכים](#חיבורים-נתמכים)
- [API Reference](#api-reference)
- [שילוב עם SELAI](#שילוב-עם-selai)
- [n8n Workflows](#n8n-workflows)

---

## 🎯 סקירה כללית

### מה המערכת עושה?

SELAI Integration Hub מאפשר לסוכני ביטוח לקבל **תמונה 360°** של הלקוחות שלהם על ידי חיבור למגוון מקורות מידע:

| מקור | סוג מידע | פרוטוקול |
|------|----------|----------|
| **הר הביטוח** | ביטוח רכב, היסטוריה | REST API |
| **המסלקה הפנסיונית** | פנסיה, גמל, קרנות השתלמות | SOAP/REST |
| **חברות ביטוח** | פוליסות, תביעות, עמלות | REST API |
| **Surense** | נתוני ביטוח מאוחדים | REST API |

### יכולות מרכזיות

- ✅ **Customer 360** - תצוגה מלאה של כל נכסי הלקוח
- ✅ **Gap Analysis** - זיהוי אוטומטי של פערי כיסוי
- ✅ **Real-time Sync** - סנכרון בזמן אמת עם Supabase
- ✅ **Event Bus** - עדכונים דרך Kafka
- ✅ **Multi-tenant** - תמיכה במספר סוכנויות

---

## 🏗️ ארכיטקטורה

```
┌──────────────────────────────────────────────────────────────────┐
│                        SELAI CRM (Base44)                        │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Integration Hub (Node.js)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   API Gateway   │  │  Flow Engine    │  │   Event Bus     │  │
│  │   (Fastify)     │  │  (Orchestration)│  │   (Kafka)       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                     │           │
│  ┌────────┴────────────────────┴─────────────────────┴────────┐  │
│  │                    Connectors Layer                         │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │  │
│  │  │הר הביטוח│  │ מסלקה  │  │ Carriers │  │ Surense │       │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL                          │
│              (28 Tables + RLS + Sync Service)                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 התקנה מהירה

### דרישות מקדימות

- Node.js 20+
- Docker & Docker Compose (אופציונלי)
- חשבון Supabase

### שלב 1: Clone והתקנה

```bash
# Clone the repository
git clone https://github.com/your-org/selai-integration-hub.git
cd selai-integration-hub

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### שלב 2: הגדרת משתני סביבה

ערוך את קובץ `.env`:

```env
# הגדרות בסיסיות
NODE_ENV=development
USE_MOCKS=true  # להתחיל עם נתונים מדומים

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### שלב 3: הרצה

```bash
# Development mode
npm run dev

# או עם Docker
docker-compose up -d
```

### שלב 4: בדיקה

```bash
# בדיקת תקינות
curl http://localhost:3001/health

# תיעוד API
open http://localhost:3001/docs
```

---

## 🔌 חיבורים נתמכים

### הר הביטוח

```typescript
import { createHarHabitouachConnector } from './connectors/har-habitoach/connector';

const connector = createHarHabitouachConnector();

// קבלת פוליסות לפי ת"ז
const policies = await connector.getPoliciesByOwnerId('123456789');

// קבלת היסטוריה ביטוחית לרכב
const history = await connector.getVehicleHistory('12345678');
```

### המסלקה הפנסיונית

```typescript
import { createMislakaConnector } from './connectors/mislaka/connector';

const connector = createMislakaConnector();

// יצירת הסכמה
await connector.createConsent({
  customer_id: '123456789',
  scope: 'all',
  valid_until: '2026-01-01T00:00:00Z'
});

// קבלת חשבונות פנסיוניים
const accounts = await connector.getPensionAccounts('123456789');
```

### חברות ביטוח

```typescript
import { ClalInsuranceAdapter, HarelInsuranceAdapter } from './connectors/carriers/israeli-carriers';

// כלל ביטוח
const clal = new ClalInsuranceAdapter();
const policies = await clal.getPolicies('customer-uuid');

// הצעת מחיר
const quote = await clal.getQuote({
  insurance_type: 'car',
  customer_data: { id_number: '123456789' },
  coverage: { amount: 500000 },
  start_date: '2025-02-01'
});
```

---

## 📡 API Reference

### Customer 360

```http
GET /api/v1/customers/:customerId/360?idNumber=123456789&sync=true
```

**Response:**
```json
{
  "customer_id": "uuid",
  "policies": [...],
  "pension_accounts": [...],
  "claims": [],
  "total_coverage": 1500000,
  "total_premium_annual": 8500,
  "total_pension_balance": 450000,
  "gaps_identified": [
    {
      "type": "health_insurance",
      "description": "לא נמצא ביטוח בריאות פרטי",
      "priority": "high",
      "estimated_premium": 350
    }
  ],
  "risk_score": 85
}
```

### Vehicle Insurance

```http
GET /api/v1/vehicle/policies?idNumber=123456789
GET /api/v1/vehicle/:vehicleNumber/history
```

### Pension Data

```http
GET /api/v1/pension/accounts?idNumber=123456789
POST /api/v1/pension/consent
```

### Data Sync

```http
POST /api/v1/sync/customer
POST /api/v1/sync/batch
```

---

## 🔗 שילוב עם SELAI

### 1. הוספת Integration Hub כמקור נתונים

בדשבורד SELAI, הוסף את ה-Integration Hub כ-API חיצוני:

```javascript
// בתוך Base44 Function
const response = await fetch(
  `${process.env.INTEGRATION_HUB_URL}/api/v1/customers/${contactId}/360`,
  {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    params: { idNumber, sync: 'true' }
  }
);
const data = await response.json();
```

### 2. Supabase Tables נדרשות

```sql
-- טבלת פוליסות חיצוניות
CREATE TABLE external_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  policy_number TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  insurance_type TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active',
  coverage_amount DECIMAL,
  premium_amount DECIMAL,
  source_system TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת חשבונות פנסיוניים
CREATE TABLE pension_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL,
  managing_company TEXT,
  fund_name TEXT,
  balance_total DECIMAL,
  status TEXT DEFAULT 'active',
  source_system TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## ⚙️ n8n Workflows

### Customer Data Sync Workflow

הוסף את ה-workflow מתיקיית `n8n-workflows/`:

1. פתח n8n
2. Import Workflow → `05_customer_data_sync.json`
3. הגדר Credentials:
   - Supabase API
   - Integration Hub API Key
4. הפעל

### Workflow Flow:

```
Schedule (כל 6 שעות)
    │
    ▼
קבל אנשי קשר לסנכרון
    │
    ▼
לכל איש קשר:
    │
    ├── קרא Customer 360 מ-Integration Hub
    │
    ├── יש פערי כיסוי? → צור משימה
    │
    └── עדכן סטטוס סנכרון
```

---

## 🧪 בדיקות

```bash
# הרץ בדיקות
npm test

# בדיקות עם כיסוי
npm run test:coverage
```

---

## 📁 מבנה הפרויקט

```
selai-integration-hub/
├── src/
│   ├── api/              # API routes
│   ├── connectors/       # External data connectors
│   │   ├── har-habitoach/
│   │   ├── mislaka/
│   │   └── carriers/
│   ├── models/           # Canonical data models (Zod)
│   ├── services/         # Business logic
│   │   ├── integration-service.ts
│   │   ├── supabase-sync.ts
│   │   └── event-bus.ts
│   ├── utils/            # Utilities
│   └── index.ts          # Entry point
├── n8n-workflows/        # n8n workflow JSONs
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 🔐 אבטחה

- **OAuth2** לכל ה-connectors
- **JWT** לאימות API
- **Rate Limiting** למניעת abuse
- **Audit Logging** לכל הפעולות
- **Encryption** at rest & in transit

---

## 📞 תמיכה

- 📧 Email: support@selai.app
- 📖 Docs: https://docs.selai.app
- 🐛 Issues: https://github.com/your-org/selai-integration-hub/issues

---

## 📜 רישיון

MIT License - ראה [LICENSE](LICENSE)
