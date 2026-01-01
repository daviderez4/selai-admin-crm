import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import type {
  ColumnCategory,
  ColumnDataType,
  ColumnStats,
  AnalyzedColumn,
} from '@/types/dashboard';

// Category patterns for auto-detection (Hebrew + English)
const CATEGORY_PATTERNS: Record<ColumnCategory, RegExp[]> = {
  financial: [/סכום|פרמיה|עמלה|תשלום|מחיר|עלות|הכנסה|הוצאה|נטו|ברוטו|מע"מ|amount|price|cost|total|sum|fee|commission/i],
  dates: [/תאריך|מועד|יום|חודש|שנה|date|created|updated|time|timestamp|_at$/i],
  people: [/שם|איש_קשר|מטפל|סוכן|לקוח|עובד|נציג|name|user|agent|employee|contact|customer/i],
  status: [/סטטוס|מצב|שלב|סוג|קטגוריה|status|state|stage|phase|type$/i],
  companies: [/חברה|יצרן|ספק|גוף|company|vendor|supplier|organization|org/i],
  contact: [/טלפון|מייל|נייד|כתובת|פקס|phone|email|mobile|address|tel/i],
  identifiers: [/מספר|מזהה|ת\.ז\.|תעודת_זהות|ח\.פ\.|id$|_id$|number|code|uuid/i],
  system: [/^id$|^uuid$|created_at|updated_at|deleted_at|_by$/i],
  other: [],
};

// Category display info
const CATEGORY_INFO: Record<ColumnCategory, { icon: string; label: string }> = {
  financial: { icon: '💰', label: 'כספי' },
  dates: { icon: '📅', label: 'תאריכים' },
  people: { icon: '👤', label: 'אנשים' },
  status: { icon: '📋', label: 'סטטוס' },
  companies: { icon: '🏢', label: 'חברות' },
  contact: { icon: '📞', label: 'יצירת קשר' },
  identifiers: { icon: '🔢', label: 'מזהים' },
  system: { icon: '⚙️', label: 'מערכת' },
  other: { icon: '📁', label: 'אחר' },
};

// Detect column category based on name patterns
function detectCategory(columnName: string): ColumnCategory {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === 'other') continue;
    for (const pattern of patterns) {
      if (pattern.test(columnName)) {
        return category as ColumnCategory;
      }
    }
  }
  return 'other';
}

// Detect data type from sample values
function detectDataType(values: unknown[]): ColumnDataType {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonNullValues.length === 0) return 'unknown';

  // Check for boolean
  const booleanValues = nonNullValues.filter(v =>
    typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1 ||
    String(v).toLowerCase() === 'כן' || String(v).toLowerCase() === 'לא'
  );
  if (booleanValues.length === nonNullValues.length) return 'boolean';

  // Check for date
  const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}|^\d{2}\.\d{2}\.\d{4}/;
  const dateValues = nonNullValues.filter(v => {
    if (v instanceof Date) return true;
    if (typeof v === 'string') {
      return datePattern.test(v) || !isNaN(Date.parse(v));
    }
    return false;
  });
  if (dateValues.length > nonNullValues.length * 0.8) return 'date';

  // Check for number
  const numberValues = nonNullValues.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[,₪$€%]/g, '').trim();
      return cleaned !== '' && !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
    }
    return false;
  });
  if (numberValues.length > nonNullValues.length * 0.8) return 'number';

  // Check for enum (limited unique values)
  const uniqueValues = new Set(nonNullValues.map(v => String(v)));
  if (uniqueValues.size <= 20 && uniqueValues.size < nonNullValues.length * 0.3) {
    return 'enum';
  }

  return 'text';
}

// Calculate statistics for a column
function calculateStats(values: unknown[], dataType: ColumnDataType): ColumnStats {
  const total = values.length;
  const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const uniqueValues = [...new Set(nonNullValues.map(v => String(v)))];

  const stats: ColumnStats = {
    count: total,
    nullCount,
    nullPercentage: total > 0 ? Math.round((nullCount / total) * 100) : 0,
    uniqueCount: uniqueValues.length,
  };

  if (dataType === 'number') {
    const numbers = nonNullValues
      .map(v => {
        if (typeof v === 'number') return v;
        const cleaned = String(v).replace(/[,₪$€%]/g, '').trim();
        return parseFloat(cleaned);
      })
      .filter(n => !isNaN(n));

    if (numbers.length > 0) {
      stats.sum = numbers.reduce((a, b) => a + b, 0);
      stats.avg = stats.sum / numbers.length;
      stats.min = Math.min(...numbers);
      stats.max = Math.max(...numbers);
    }
  }

  if (dataType === 'enum' || (dataType === 'text' && uniqueValues.length <= 50)) {
    stats.uniqueValues = uniqueValues.slice(0, 50);
    stats.valueDistribution = {};
    for (const val of nonNullValues) {
      const key = String(val);
      stats.valueDistribution[key] = (stats.valueDistribution[key] || 0) + 1;
    }
  }

  return stats;
}

// Calculate recommendation score for a column
function calculateRecommendationScore(
  category: ColumnCategory,
  dataType: ColumnDataType,
  stats: ColumnStats
): number {
  let score = 0;

  // Prefer non-system columns
  if (category !== 'system') score += 20;

  // Prefer columns with low null percentage
  score += Math.max(0, 100 - stats.nullPercentage) * 0.3;

  // Prefer meaningful categories
  const categoryScores: Record<ColumnCategory, number> = {
    financial: 25,
    status: 20,
    people: 18,
    dates: 15,
    companies: 15,
    contact: 12,
    identifiers: 10,
    other: 5,
    system: 0,
  };
  score += categoryScores[category];

  // Prefer enum/status fields for filters
  if (dataType === 'enum') score += 10;

  // Prefer number fields for aggregations
  if (dataType === 'number') score += 15;

  // Penalize very high cardinality
  if (stats.uniqueCount > 1000) score -= 10;

  return Math.min(100, Math.max(0, score));
}

// Format display name from column name
function formatDisplayName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

// Calculated field definition
interface CalculatedField {
  name: string;
  displayName: string;
  formula: string;
  sourceColumns: string[];
  operation: 'sum' | 'subtract' | 'multiply' | 'divide' | 'concat';
}

// Chart configuration
interface ChartConfig {
  type: 'pie' | 'bar' | 'line' | 'area';
  title: string;
  valueColumn: string;
  groupByColumn: string;
}

// Suggest templates based on analysis
interface TemplateSuggestion {
  id: string;
  name: string;
  icon: string;
  description: string;
  columns: string[];
  cardColumns: string[];
  filterColumns: string[];
  calculatedFields?: CalculatedField[];
  charts?: ChartConfig[];
}

function suggestTemplates(
  categories: Record<ColumnCategory, AnalyzedColumn[]>,
  recommendedFields: string[],
  allColumns: AnalyzedColumn[]
): TemplateSuggestion[] {
  const suggestions: TemplateSuggestion[] = [];

  // Helper to find column by partial name match
  const findColumn = (patterns: string[]): string | null => {
    for (const pattern of patterns) {
      const found = allColumns.find(c =>
        c.name.includes(pattern) || c.name.toLowerCase().includes(pattern.toLowerCase())
      );
      if (found) return found.name;
    }
    return null;
  };

  // Helper to find all columns matching patterns
  const findColumns = (patterns: string[]): string[] => {
    const found: string[] = [];
    for (const pattern of patterns) {
      const match = allColumns.find(c =>
        c.name.includes(pattern) || c.name.toLowerCase().includes(pattern.toLowerCase())
      );
      if (match && !found.includes(match.name)) {
        found.push(match.name);
      }
    }
    return found;
  };

  // Custom Financial Template - "דוח פיננסי"
  // Specific fields requested by user
  const financialFields = {
    tzvira: findColumn(['סה"כ צבירה צפויה מניוד', 'צבירה צפויה', 'סהכ צבירה']),
    hafkada: findColumn(['הפקדה חד פעמית צפויה', 'הפקדה חד פעמית', 'הפקדה צפויה']),
    productType: findColumn(['סוג מוצר חדש', 'סוג מוצר', 'סוג_מוצר']),
    manufacturer: findColumn(['יצרן חדש', 'יצרן', 'יצרן_חדש']),
    docDate: findColumn(['תאריך העברת מסמכים ליצרן', 'תאריך העברת מסמכים', 'תאריך מסמכים']),
  };

  // Check if we have at least some of the specific financial fields
  const hasSpecificFinancialFields = financialFields.tzvira || financialFields.hafkada;

  if (hasSpecificFinancialFields) {
    const templateColumns: string[] = [];
    const cardCols: string[] = [];
    const filterCols: string[] = [];

    // Add available columns
    if (financialFields.tzvira) {
      templateColumns.push(financialFields.tzvira);
      cardCols.push(financialFields.tzvira);
    }
    if (financialFields.hafkada) {
      templateColumns.push(financialFields.hafkada);
      cardCols.push(financialFields.hafkada);
    }
    if (financialFields.productType) {
      templateColumns.push(financialFields.productType);
      filterCols.push(financialFields.productType);
    }
    if (financialFields.manufacturer) {
      templateColumns.push(financialFields.manufacturer);
      filterCols.push(financialFields.manufacturer);
    }
    if (financialFields.docDate) {
      templateColumns.push(financialFields.docDate);
      filterCols.push(financialFields.docDate);
    }

    // Create calculated field definition
    const calculatedFields: CalculatedField[] = [];
    if (financialFields.tzvira && financialFields.hafkada) {
      calculatedFields.push({
        name: 'סהכ_צפוי',
        displayName: 'סה"כ צפוי',
        formula: `${financialFields.tzvira} + ${financialFields.hafkada}`,
        sourceColumns: [financialFields.tzvira, financialFields.hafkada],
        operation: 'sum',
      });
    }

    // Create chart configurations
    const charts: ChartConfig[] = [];
    if (financialFields.manufacturer) {
      charts.push({
        type: 'pie',
        title: 'סה"כ צפוי לפי יצרן',
        valueColumn: calculatedFields.length > 0 ? 'סהכ_צפוי' : (financialFields.tzvira || templateColumns[0]),
        groupByColumn: financialFields.manufacturer,
      });
    }
    if (financialFields.productType) {
      charts.push({
        type: 'bar',
        title: 'סה"כ צפוי לפי סוג מוצר',
        valueColumn: calculatedFields.length > 0 ? 'סהכ_צפוי' : (financialFields.tzvira || templateColumns[0]),
        groupByColumn: financialFields.productType,
      });
    }

    suggestions.push({
      id: 'financial',
      name: 'דוח פיננסי',
      icon: '💎',
      description: 'צבירה צפויה, הפקדות, יצרנים וסוגי מוצרים',
      columns: templateColumns,
      cardColumns: cardCols,
      filterColumns: filterCols,
      calculatedFields: calculatedFields.length > 0 ? calculatedFields : undefined,
      charts: charts.length > 0 ? charts : undefined,
    });
  }

  // Commission Report - has financial + status + dates
  const hasFinancial = categories.financial.length >= 2;
  const hasStatus = categories.status.length >= 1;
  const hasDates = categories.dates.length >= 1;
  const hasPeople = categories.people.length >= 1;
  const hasCompanies = categories.companies.length >= 1;
  const hasIdentifiers = categories.identifiers.length >= 1;

  if (hasFinancial && hasStatus && hasDates) {
    const columns = [
      ...categories.financial.slice(0, 4).map(c => c.name),
      ...categories.status.slice(0, 2).map(c => c.name),
      ...categories.dates.slice(0, 2).map(c => c.name),
      ...categories.people.slice(0, 2).map(c => c.name),
      ...categories.companies.slice(0, 2).map(c => c.name),
    ];
    suggestions.push({
      id: 'commission',
      name: 'דוח עמלות',
      icon: '💰',
      description: 'סיכום נתונים כספיים עם סטטוסים ותאריכים',
      columns: [...new Set(columns)],
      cardColumns: categories.financial.slice(0, 3).map(c => c.name),
      filterColumns: [
        ...categories.status.slice(0, 2).map(c => c.name),
        ...categories.companies.slice(0, 1).map(c => c.name),
        ...categories.dates.slice(0, 1).map(c => c.name),
      ],
    });
  }

  // Process Report - has identifiers + status
  if (hasIdentifiers && hasStatus) {
    const columns = [
      ...categories.identifiers.slice(0, 2).map(c => c.name),
      ...categories.status.slice(0, 2).map(c => c.name),
      ...categories.dates.slice(0, 2).map(c => c.name),
      ...categories.people.slice(0, 2).map(c => c.name),
    ];
    suggestions.push({
      id: 'process',
      name: 'דוח תהליכים',
      icon: '📊',
      description: 'מעקב תהליכים וסטטוסים',
      columns: [...new Set(columns)],
      cardColumns: categories.identifiers.slice(0, 1).map(c => c.name),
      filterColumns: [
        ...categories.status.slice(0, 2).map(c => c.name),
        ...categories.dates.slice(0, 1).map(c => c.name),
      ],
    });
  }

  // People Report - has people + contact
  if (hasPeople && categories.contact.length >= 1) {
    const columns = [
      ...categories.people.slice(0, 4).map(c => c.name),
      ...categories.contact.slice(0, 3).map(c => c.name),
      ...categories.companies.slice(0, 2).map(c => c.name),
      ...categories.status.slice(0, 1).map(c => c.name),
    ];
    suggestions.push({
      id: 'people',
      name: 'דוח אנשי קשר',
      icon: '👥',
      description: 'רשימת אנשים ופרטי התקשרות',
      columns: [...new Set(columns)],
      cardColumns: [],
      filterColumns: [
        ...categories.companies.slice(0, 1).map(c => c.name),
        ...categories.status.slice(0, 1).map(c => c.name),
      ],
    });
  }

  // General Summary - always available
  suggestions.push({
    id: 'general',
    name: 'סיכום כללי',
    icon: '📈',
    description: '15 העמודות המומלצות ביותר',
    columns: recommendedFields.slice(0, 15),
    cardColumns: categories.financial.slice(0, 3).map(c => c.name),
    filterColumns: categories.status.slice(0, 3).map(c => c.name),
  });

  // Custom - always available
  suggestions.push({
    id: 'custom',
    name: 'מותאם אישית',
    icon: '⚙️',
    description: 'בחר עמודות לפי קטגוריה',
    columns: [],
    cardColumns: [],
    filterColumns: [],
  });

  return suggestions;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access
    const { data: access } = await supabase
      .from('user_project_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (!access || !['admin', 'editor'].includes(access.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetName = formData.get('sheetName') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Parse Excel file
    const workbook = XLSX.read(buffer, {
      type: 'array',
      codepage: 65001, // UTF-8 for Hebrew support
      cellDates: true,
    });

    const worksheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as string[][];

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Get headers from first row
    const headers = jsonData[0]
      .map((h, i) => ({ original: String(h || `Column_${i + 1}`).trim(), index: i }))
      .filter(h => h.original !== '');

    // Get data rows (skip header, filter empty rows)
    const dataRows = jsonData.slice(1).filter(row =>
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    const totalRows = dataRows.length;

    // Sample data for analysis (max 1000 rows)
    const sampleSize = Math.min(1000, dataRows.length);
    const sampleData = dataRows.slice(0, sampleSize);

    // Analyze each column
    const analyzedColumns: AnalyzedColumn[] = headers.map(({ original, index }) => {
      const values = sampleData.map(row => row[index]);
      const category = detectCategory(original);
      const dataType = detectDataType(values);
      const stats = calculateStats(values, dataType);
      const recommendationScore = calculateRecommendationScore(category, dataType, stats);

      return {
        name: original,
        displayName: formatDisplayName(original),
        dataType,
        category,
        stats,
        sampleValues: values.slice(0, 5).filter(v => v !== null && v !== undefined && v !== ''),
        isRecommended: recommendationScore >= 50,
        recommendationScore,
      };
    });

    // Sort by recommendation score
    const sortedColumns = [...analyzedColumns].sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Group by category
    const categories: Record<ColumnCategory, AnalyzedColumn[]> = {
      financial: [],
      dates: [],
      people: [],
      status: [],
      companies: [],
      contact: [],
      identifiers: [],
      system: [],
      other: [],
    };

    for (const column of sortedColumns) {
      categories[column.category].push(column);
    }

    // Get recommended fields (top scoring)
    const recommendedFields = sortedColumns
      .filter(c => c.isRecommended)
      .slice(0, 15)
      .map(c => c.name);

    // Calculate category summary
    const categorySummary = Object.entries(categories)
      .filter(([_, cols]) => cols.length > 0)
      .map(([cat, cols]) => ({
        category: cat as ColumnCategory,
        ...CATEGORY_INFO[cat as ColumnCategory],
        count: cols.length,
        columns: cols.map(c => c.name),
      }))
      .sort((a, b) => b.count - a.count);

    // Key fields (important columns detected)
    const keyFields = sortedColumns
      .filter(c => c.recommendationScore >= 60)
      .slice(0, 8)
      .map(c => c.name);

    // Suggest templates
    const templateSuggestions = suggestTemplates(categories, recommendedFields, analyzedColumns);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sheetName: sheetName || workbook.SheetNames[0],
      sheets: workbook.SheetNames,
      totalRows,
      totalColumns: headers.length,
      columns: analyzedColumns,
      categories,
      categorySummary,
      keyFields,
      recommendedFields,
      templateSuggestions,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Excel analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze Excel file' },
      { status: 500 }
    );
  }
}
