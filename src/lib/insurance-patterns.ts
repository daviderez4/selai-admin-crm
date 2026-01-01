/**
 * Insurance Industry Patterns Library
 * Hebrew-first pattern definitions for insurance agency data
 */

// Category definitions with icons and colors
export interface InsuranceCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  patterns: string[];
  chartType: 'pie' | 'bar' | 'funnel' | 'leaderboard' | 'timeline' | 'gauge';
  metrics: CategoryMetric[];
}

export interface CategoryMetric {
  id: string;
  name: string;
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  field?: string; // If specific field, otherwise uses category fields
  format: 'number' | 'currency' | 'percent';
}

// Insurance-specific categories
export const INSURANCE_CATEGORIES: InsuranceCategory[] = [
  {
    id: 'manufacturers',
    name: 'יצרנים',
    nameEn: 'Manufacturers',
    icon: '🏢',
    color: '#3b82f6', // blue
    description: 'חברות הביטוח והיצרנים',
    patterns: [
      'יצרן', 'חברה', 'חברת_ביטוח', 'מבטח', 'ספק', 'גוף_מוסדי',
      'שם_יצרן', 'יצרן_חדש', 'יצרן_קודם', 'company', 'manufacturer', 'insurer',
      'הפניקס', 'מגדל', 'הראל', 'כלל', 'מנורה', 'איילון', 'הכשרה',
      'אלטשולר', 'מיטב', 'אנליסט', 'פסגות', 'אקסלנס',
    ],
    chartType: 'pie',
    metrics: [
      { id: 'total_manufacturers', name: 'סה"כ יצרנים', type: 'distinct', format: 'number' },
      { id: 'records_per_manufacturer', name: 'ממוצע רשומות ליצרן', type: 'avg', format: 'number' },
    ],
  },
  {
    id: 'financial',
    name: 'כספים',
    nameEn: 'Financial',
    icon: '💰',
    color: '#10b981', // emerald
    description: 'סכומים, עמלות, פרמיות והכנסות',
    patterns: [
      'סכום', 'עמלה', 'פרמיה', 'תשלום', 'הכנסה', 'הוצאה',
      'סה"כ', 'סהכ', 'נטו', 'ברוטו', 'מע"מ', 'עלות', 'מחיר',
      'צבירה', 'הפקדה', 'יתרה', 'חיסכון', 'ערך', 'שווי',
      'amount', 'commission', 'premium', 'payment', 'income',
      'סכום_נטו', 'סכום_ברוטו', 'עמלה_חודשית', 'עמלה_שנתית',
      'פרמיה_חודשית', 'פרמיה_שנתית', 'דמי_ניהול',
    ],
    chartType: 'bar',
    metrics: [
      { id: 'total_amount', name: 'סה"כ סכום', type: 'sum', format: 'currency' },
      { id: 'avg_amount', name: 'ממוצע לרשומה', type: 'avg', format: 'currency' },
      { id: 'total_commission', name: 'סה"כ עמלות', type: 'sum', format: 'currency' },
    ],
  },
  {
    id: 'processes',
    name: 'תהליכים',
    nameEn: 'Processes',
    icon: '📋',
    color: '#8b5cf6', // violet
    description: 'סטטוסים, שלבים ומצבי תהליך',
    patterns: [
      'סטטוס', 'מצב', 'שלב', 'סוג', 'קטגוריה', 'סיווג',
      'תהליך', 'פעולה', 'אירוע', 'סוג_תהליך', 'סוג_פעולה',
      'status', 'state', 'stage', 'type', 'category',
      'ניוד', 'חידוש', 'ביטול', 'פתיחה', 'סגירה',
      'פעיל', 'לא_פעיל', 'ממתין', 'בטיפול', 'הושלם',
    ],
    chartType: 'funnel',
    metrics: [
      { id: 'status_count', name: 'מספר סטטוסים', type: 'distinct', format: 'number' },
      { id: 'active_count', name: 'תהליכים פעילים', type: 'count', format: 'number' },
    ],
  },
  {
    id: 'agents',
    name: 'סוכנים',
    nameEn: 'Agents',
    icon: '👤',
    color: '#f59e0b', // amber
    description: 'סוכנים, מטפלים ונציגים',
    patterns: [
      'סוכן', 'מטפל', 'נציג', 'עובד', 'יועץ', 'משווק',
      'שם_סוכן', 'סוכן_משנה', 'סוכן_ראשי', 'מנהל',
      'agent', 'handler', 'representative', 'advisor',
      'איש_קשר', 'אחראי', 'מפקח', 'מנהל_לקוח',
    ],
    chartType: 'leaderboard',
    metrics: [
      { id: 'total_agents', name: 'סה"כ סוכנים', type: 'distinct', format: 'number' },
      { id: 'records_per_agent', name: 'ממוצע רשומות לסוכן', type: 'avg', format: 'number' },
    ],
  },
  {
    id: 'clients',
    name: 'לקוחות',
    nameEn: 'Clients',
    icon: '👥',
    color: '#ec4899', // pink
    description: 'לקוחות, מבוטחים ופרטי קשר',
    patterns: [
      'לקוח', 'מבוטח', 'בעל_פוליסה', 'שם', 'שם_פרטי', 'שם_משפחה',
      'ת.ז', 'תעודת_זהות', 'ת"ז', 'מספר_זהות', 'ח.פ', 'עוסק',
      'client', 'customer', 'insured', 'policyholder',
      'טלפון', 'נייד', 'מייל', 'אימייל', 'כתובת', 'עיר',
      'phone', 'mobile', 'email', 'address', 'city',
    ],
    chartType: 'bar',
    metrics: [
      { id: 'total_clients', name: 'סה"כ לקוחות', type: 'distinct', format: 'number' },
      { id: 'new_clients', name: 'לקוחות חדשים', type: 'count', format: 'number' },
    ],
  },
  {
    id: 'products',
    name: 'מוצרים',
    nameEn: 'Products',
    icon: '📦',
    color: '#06b6d4', // cyan
    description: 'סוגי ביטוח, מוצרים ופוליסות',
    patterns: [
      'מוצר', 'פוליסה', 'ביטוח', 'ענף', 'תכנית', 'מסלול',
      'סוג_ביטוח', 'סוג_מוצר', 'סוג_פוליסה', 'שם_מוצר',
      'product', 'policy', 'insurance_type', 'plan',
      'חיים', 'בריאות', 'רכב', 'דירה', 'עסק', 'אלמנטרי',
      'פנסיה', 'גמל', 'השתלמות', 'קרן', 'ביטוח_מנהלים',
    ],
    chartType: 'pie',
    metrics: [
      { id: 'total_products', name: 'סה"כ מוצרים', type: 'distinct', format: 'number' },
      { id: 'products_per_client', name: 'מוצרים ללקוח', type: 'avg', format: 'number' },
    ],
  },
  {
    id: 'dates',
    name: 'תאריכים',
    nameEn: 'Dates',
    icon: '📅',
    color: '#6366f1', // indigo
    description: 'תאריכים, תקופות וזמנים',
    patterns: [
      'תאריך', 'יום', 'חודש', 'שנה', 'מועד', 'זמן', 'תקופה',
      'תאריך_פתיחה', 'תאריך_סגירה', 'תאריך_עדכון', 'תאריך_יצירה',
      'תאריך_תחילה', 'תאריך_סיום', 'תאריך_חידוש',
      'date', 'created_at', 'updated_at', 'start_date', 'end_date',
      'תוקף', 'תוקף_מ', 'תוקף_עד', 'תחילת_ביטוח', 'סיום_ביטוח',
    ],
    chartType: 'timeline',
    metrics: [
      { id: 'date_range', name: 'טווח תאריכים', type: 'min', format: 'number' },
      { id: 'records_per_month', name: 'ממוצע לחודש', type: 'avg', format: 'number' },
    ],
  },
  {
    id: 'identifiers',
    name: 'מזהים',
    nameEn: 'Identifiers',
    icon: '#️⃣',
    color: '#64748b', // slate
    description: 'מספרים מזהים, קודים והפניות',
    patterns: [
      'מספר', 'מזהה', 'קוד', 'id', 'מספר_תהליך', 'מספר_פוליסה',
      'מספר_לקוח', 'מספר_סוכן', 'מספר_חשבון', 'מספר_בקשה',
      'reference', 'code', 'number', 'serial',
      'אסמכתא', 'הפניה', 'אישור', 'מספר_אישור',
    ],
    chartType: 'bar',
    metrics: [
      { id: 'total_records', name: 'סה"כ רשומות', type: 'count', format: 'number' },
    ],
  },
];

// Status patterns for color coding
export const STATUS_PATTERNS = {
  positive: [
    'פעיל', 'הושלם', 'אושר', 'הצלחה', 'תקין', 'מאושר', 'סגור',
    'active', 'completed', 'approved', 'success',
    'משולם', 'בוצע', 'הופק', 'נקלט',
  ],
  negative: [
    'רג\'קט', 'ביטול', 'נכשל', 'נדחה', 'מבוטל', 'לא_פעיל',
    'rejected', 'cancelled', 'failed', 'declined',
    'חסום', 'שגיאה', 'בעיה', 'נמחק',
  ],
  warning: [
    'ממתין', 'בתהליך', 'בטיפול', 'בבדיקה', 'בהמתנה', 'עיכוב',
    'pending', 'processing', 'in_progress', 'waiting',
    'דחוי', 'מושהה', 'לטיפול',
  ],
  info: [
    'חדש', 'טיוטה', 'התחלה', 'ראשוני', 'פתוח',
    'new', 'draft', 'initial', 'open',
    'נפתח', 'נוצר', 'התקבל',
  ],
};

// Product type patterns
export const PRODUCT_PATTERNS = {
  life: ['חיים', 'ריסק', 'מוות', 'life', 'risk'],
  health: ['בריאות', 'רפואי', 'תרופות', 'health', 'medical'],
  pension: ['פנסיה', 'גמל', 'השתלמות', 'pension', 'provident'],
  elementary: ['רכב', 'דירה', 'עסק', 'אלמנטרי', 'רכוש', 'car', 'home', 'property'],
  managers: ['מנהלים', 'ביטוח_מנהלים', 'managers'],
  travel: ['נסיעות', 'חו"ל', 'travel'],
};

// Column matching function
export function matchColumnToCategory(columnName: string): InsuranceCategory | null {
  const lowerName = columnName.toLowerCase();

  for (const category of INSURANCE_CATEGORIES) {
    for (const pattern of category.patterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        return category;
      }
    }
  }

  return null;
}

// Get all categories that match a column
export function getMatchingCategories(columnName: string): InsuranceCategory[] {
  const lowerName = columnName.toLowerCase();
  const matches: InsuranceCategory[] = [];

  for (const category of INSURANCE_CATEGORIES) {
    for (const pattern of category.patterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        if (!matches.find(m => m.id === category.id)) {
          matches.push(category);
        }
        break;
      }
    }
  }

  return matches;
}

// Get status color
export function getStatusPatternColor(value: string): 'green' | 'red' | 'yellow' | 'blue' | 'gray' {
  const lowerValue = value.toLowerCase();

  for (const pattern of STATUS_PATTERNS.positive) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'green';
  }
  for (const pattern of STATUS_PATTERNS.negative) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'red';
  }
  for (const pattern of STATUS_PATTERNS.warning) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'yellow';
  }
  for (const pattern of STATUS_PATTERNS.info) {
    if (lowerValue.includes(pattern.toLowerCase())) return 'blue';
  }

  return 'gray';
}

// Detect product type
export function detectProductType(value: string): string | null {
  const lowerValue = value.toLowerCase();

  for (const [type, patterns] of Object.entries(PRODUCT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerValue.includes(pattern.toLowerCase())) {
        return type;
      }
    }
  }

  return null;
}

// Dashboard template based on categories
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  requiredCategories: string[];
  layout: DashboardLayoutItem[];
}

export interface DashboardLayoutItem {
  type: 'card' | 'chart' | 'table' | 'filter';
  category?: string;
  span: 1 | 2 | 3 | 4; // Grid columns (out of 4)
  height?: 'sm' | 'md' | 'lg';
  config?: Record<string, unknown>;
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'commission_report',
    name: 'דוח עמלות',
    description: 'מעקב אחר עמלות, יצרנים וסוכנים',
    requiredCategories: ['financial', 'manufacturers', 'agents'],
    layout: [
      { type: 'card', category: 'financial', span: 1 },
      { type: 'card', category: 'manufacturers', span: 1 },
      { type: 'card', category: 'agents', span: 1 },
      { type: 'card', category: 'processes', span: 1 },
      { type: 'chart', category: 'manufacturers', span: 2, height: 'md' },
      { type: 'chart', category: 'financial', span: 2, height: 'md' },
      { type: 'filter', span: 4 },
      { type: 'table', span: 4, height: 'lg' },
    ],
  },
  {
    id: 'process_tracking',
    name: 'מעקב תהליכים',
    description: 'מעקב אחר סטטוסים ותהליכים',
    requiredCategories: ['processes', 'dates', 'agents'],
    layout: [
      { type: 'card', category: 'processes', span: 1 },
      { type: 'card', category: 'dates', span: 1 },
      { type: 'card', category: 'agents', span: 1 },
      { type: 'card', category: 'identifiers', span: 1 },
      { type: 'chart', category: 'processes', span: 2, height: 'md' },
      { type: 'chart', category: 'dates', span: 2, height: 'md' },
      { type: 'filter', span: 4 },
      { type: 'table', span: 4, height: 'lg' },
    ],
  },
  {
    id: 'client_overview',
    name: 'סקירת לקוחות',
    description: 'מבט על לקוחות ומוצרים',
    requiredCategories: ['clients', 'products', 'financial'],
    layout: [
      { type: 'card', category: 'clients', span: 1 },
      { type: 'card', category: 'products', span: 1 },
      { type: 'card', category: 'financial', span: 1 },
      { type: 'card', category: 'processes', span: 1 },
      { type: 'chart', category: 'products', span: 2, height: 'md' },
      { type: 'chart', category: 'clients', span: 2, height: 'md' },
      { type: 'filter', span: 4 },
      { type: 'table', span: 4, height: 'lg' },
    ],
  },
  {
    id: 'general',
    name: 'דשבורד כללי',
    description: 'סקירה כללית של כל הנתונים',
    requiredCategories: [],
    layout: [
      { type: 'card', span: 1 },
      { type: 'card', span: 1 },
      { type: 'card', span: 1 },
      { type: 'card', span: 1 },
      { type: 'chart', span: 2, height: 'md' },
      { type: 'chart', span: 2, height: 'md' },
      { type: 'filter', span: 4 },
      { type: 'table', span: 4, height: 'lg' },
    ],
  },
];

// Suggest dashboard template based on detected categories
export function suggestDashboardTemplate(detectedCategories: string[]): DashboardTemplate {
  // Score each template by how many required categories match
  let bestTemplate = DASHBOARD_TEMPLATES.find(t => t.id === 'general')!;
  let bestScore = 0;

  for (const template of DASHBOARD_TEMPLATES) {
    if (template.requiredCategories.length === 0) continue;

    const matchCount = template.requiredCategories.filter(
      cat => detectedCategories.includes(cat)
    ).length;

    const score = matchCount / template.requiredCategories.length;

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  return bestTemplate;
}
