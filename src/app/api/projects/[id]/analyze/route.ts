import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type {
  ColumnCategory,
  ColumnDataType,
  ColumnStats,
  AnalyzedColumn,
  DataAnalysis,
  CATEGORY_CONFIG
} from '@/types/dashboard';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Category patterns for auto-detection
const CATEGORY_PATTERNS: Record<ColumnCategory, RegExp[]> = {
  financial: [/סכום|פרמיה|עמלה|תשלום|מחיר|עלות|הכנסה|הוצאה|amount|price|cost|total|sum|fee|commission/i],
  dates: [/תאריך|מועד|יום|חודש|שנה|date|created|updated|time|timestamp|_at$/i],
  people: [/שם|איש_קשר|מטפל|סוכן|לקוח|עובד|נציג|name|user|agent|employee|contact|customer/i],
  status: [/סטטוס|מצב|שלב|status|state|stage|phase|type$/i],
  companies: [/חברה|יצרן|ספק|company|vendor|supplier|organization|org/i],
  contact: [/טלפון|מייל|נייד|כתובת|phone|email|mobile|address|tel/i],
  identifiers: [/מספר|מזהה|ת\.ז\.|תעודת_זהות|id$|_id$|number|code|uuid/i],
  system: [/^id$|^uuid$|created_at|updated_at|deleted_at|_by$/i],
  other: [],
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
    typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1
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
      return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
    }
    return false;
  });
  if (numberValues.length > nonNullValues.length * 0.8) return 'number';

  // Check for JSON
  const jsonValues = nonNullValues.filter(v => {
    if (typeof v === 'object') return true;
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        return typeof parsed === 'object';
      } catch {
        return false;
      }
    }
    return false;
  });
  if (jsonValues.length > nonNullValues.length * 0.8) return 'json';

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

  if (dataType === 'date') {
    const dates = nonNullValues
      .map(v => new Date(v as string))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length > 0) {
      stats.minDate = dates[0].toISOString();
      stats.maxDate = dates[dates.length - 1].toISOString();
    }
  }

  if (dataType === 'text') {
    const lengths = nonNullValues.map(v => String(v).length);
    if (lengths.length > 0) {
      stats.avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
      stats.maxLength = Math.max(...lengths);
    }
  }

  return stats;
}

// Calculate recommendation score for a column
function calculateRecommendationScore(
  column: string,
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
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const sampleSize = parseInt(searchParams.get('sampleSize') || '1000');

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

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

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get project to find database connection
    const { data: project } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key')
      .eq('id', projectId)
      .single();

    if (!project?.supabase_url || !project?.supabase_service_key) {
      return NextResponse.json(
        { error: 'Project database not configured' },
        { status: 400 }
      );
    }

    // Decrypt the service key and connect to project's Supabase
    const serviceKey = decrypt(project.supabase_service_key);
    const projectSupabase = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get total row count
    const { count: totalRows } = await projectSupabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // Get sample data for analysis
    const { data: sampleData, error: dataError } = await projectSupabase
      .from(tableName)
      .select('*')
      .limit(sampleSize);

    if (dataError) {
      throw dataError;
    }

    if (!sampleData || sampleData.length === 0) {
      return NextResponse.json({
        analysis: {
          tableName,
          totalRows: 0,
          totalColumns: 0,
          columns: [],
          categories: {},
          recommendedFields: [],
          analyzedAt: new Date().toISOString(),
        }
      });
    }

    // Extract column names
    const columnNames = Object.keys(sampleData[0]);

    // Analyze each column
    const analyzedColumns: AnalyzedColumn[] = columnNames.map(name => {
      const values = sampleData.map(row => row[name]);
      const category = detectCategory(name);
      const dataType = detectDataType(values);
      const stats = calculateStats(values, dataType);
      const recommendationScore = calculateRecommendationScore(name, category, dataType, stats);

      return {
        name,
        displayName: formatDisplayName(name),
        dataType,
        category,
        stats,
        sampleValues: values.slice(0, 5),
        isRecommended: recommendationScore >= 50,
        recommendationScore,
      };
    });

    // Sort by recommendation score
    analyzedColumns.sort((a, b) => b.recommendationScore - a.recommendationScore);

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

    for (const column of analyzedColumns) {
      categories[column.category].push(column);
    }

    // Get recommended fields (top scoring)
    const recommendedFields = analyzedColumns
      .filter(c => c.isRecommended)
      .slice(0, 15)
      .map(c => c.name);

    const analysis: DataAnalysis = {
      tableName,
      totalRows: totalRows || sampleData.length,
      totalColumns: columnNames.length,
      columns: analyzedColumns,
      categories,
      recommendedFields,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze table' },
      { status: 500 }
    );
  }
}
