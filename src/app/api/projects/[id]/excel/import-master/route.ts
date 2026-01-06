import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Central Supabase - ALL projects use this
const CENTRAL_SUPABASE_URL = process.env.CENTRAL_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const CENTRAL_SUPABASE_SERVICE_KEY = process.env.CENTRAL_SUPABASE_SERVICE_KEY || '';

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

// Convert dashboard URL to API URL
function normalizeSupabaseUrl(url: string): string {
  if (!url) return url;
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return url;
}

// Fixed column indices for master project (0-based)
const MASTER_COLUMNS = {
  AZ: 51,   // סה"כ צבירה צפויה מניוד
  CZ: 103,  // הפקדה חד פעמית צפויה
  BE: 56,   // סוג מוצר חדש
  BF: 57,   // יצרן חדש
  DH: 111,  // תאריך העברת מסמכים ליצרן
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let importLogId: string | null = null;

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

    // Get project details including all Supabase credentials
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_anon_key, supabase_service_key, name, table_name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetName = formData.get('sheetName') as string | null;
    const importMode = (formData.get('importMode') as string) || 'append'; // 'append' | 'replace_period' | 'replace_all'
    const importMonth = parseInt(formData.get('importMonth') as string) || new Date().getMonth() + 1;
    const importYear = parseInt(formData.get('importYear') as string) || new Date().getFullYear();

    // Use tableName from form or project's default table
    const TABLE_NAME = (formData.get('tableName') as string) || project.table_name || 'master_data';

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    console.log('Import to table:', TABLE_NAME, 'for project:', project.name);

    // Create import log entry at the start
    const { data: importLog } = await supabase
      .from('import_logs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        target_table: TABLE_NAME,
        status: 'processing',
        import_options: { importMode, importMonth, importYear, sheetName },
      })
      .select('id')
      .single();

    importLogId = importLog?.id || null;

    // Generate batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const importDate = new Date().toISOString();

    // Parse Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      codepage: 65001,
      cellDates: true,
    });

    const selectedSheet = sheetName || workbook.SheetNames[0];
    console.log('Using sheet:', selectedSheet, 'from available:', workbook.SheetNames);

    const worksheet = workbook.Sheets[selectedSheet];
    if (!worksheet) {
      return NextResponse.json({ error: `Sheet "${selectedSheet}" not found` }, { status: 400 });
    }

    // Get data as array of arrays
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    }) as unknown[][];

    if (jsonData.length < 2) {
      return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 });
    }

    // Find header row - first row with more than 3 non-empty cells (skip empty rows at beginning)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
      const row = jsonData[i] as unknown[];
      const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
      if (nonEmptyCells > 3) {
        headerRowIndex = i;
        console.log(`Found header row at index ${i} with ${nonEmptyCells} non-empty cells`);
        break;
      }
    }

    const headerRow = jsonData[headerRowIndex];
    console.log('Raw header row:', headerRow);

    // Extract headers - convert to strings and handle empty cells
    const headers = (headerRow as unknown[]).map((h, i) => {
      if (h === null || h === undefined || h === '') {
        return `עמודה_${i + 1}`;
      }
      const header = String(h).trim();
      return header || `עמודה_${i + 1}`; // Fallback for empty headers
    });

    console.log('Parsed headers:', headers.slice(0, 10));

    // Data rows start after header row
    const dataRows = jsonData.slice(headerRowIndex + 1) as unknown[][];

    console.log('Master import - Total data rows:', dataRows.length);
    console.log('Master import - Headers (first 10):', headers.slice(0, 10));
    console.log('Master import - Sample first data row:', dataRows[0]?.slice(0, 5));

    // Helper to parse number from cell
    const parseNumber = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const cleaned = String(value).replace(/[,₪$€%\s]/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Helper to parse date from cell - with year validation
    const parseDate = (value: unknown): string | null => {
      if (value === null || value === undefined || value === '') return null;

      try {
        const date = new Date(value as string);
        if (isNaN(date.getTime())) return null;

        const year = date.getFullYear();
        // Validate year is in reasonable range (1900-2100)
        if (year < 1900 || year > 2100) {
          return null; // Invalid date like year 235451
        }

        return date.toISOString().split('T')[0];
      } catch {
        return null;
      }
    };

    // Transform data - create objects with Hebrew column names
    const transformedData = dataRows
      .filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
      .map(row => {
        // Create object with header names as keys (Hebrew column names!)
        const rawDataObject: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          const cellValue = row[index];
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            // Convert cell value to string if needed, preserving numbers
            rawDataObject[header] = cellValue;
          }
        });

        // Base data for all tables - raw_data is now an OBJECT with Hebrew keys!
        // Clean the raw_data object to ensure valid JSON (removes undefined, functions, etc.)
        const baseData = {
          raw_data: JSON.parse(JSON.stringify(rawDataObject)), // Store as JSONB object with Hebrew column names
          project_id: projectId,
          import_batch: batchId,
          import_date: importDate,
          import_month: importMonth,
          import_year: importYear,
        };

        // For master_data table, also extract specific calculated fields
        if (TABLE_NAME === 'master_data') {
          const azValue = parseNumber(row[MASTER_COLUMNS.AZ]);
          const czValue = parseNumber(row[MASTER_COLUMNS.CZ]);
          const totalExpected = (azValue || 0) + (czValue || 0);

          return {
            ...baseData,
            total_expected_accumulation: totalExpected > 0 ? totalExpected : null,
            product_type_new: row[MASTER_COLUMNS.BE]?.toString().trim() || null,
            producer_new: row[MASTER_COLUMNS.BF]?.toString().trim() || null,
            documents_transfer_date: parseDate(row[MASTER_COLUMNS.DH]),
          };
        }

        // For other tables, just use raw_data
        return baseData;
      })
      .filter(row => row.raw_data && Object.keys(row.raw_data).length > 0);

    if (transformedData.length === 0) {
      return NextResponse.json({ error: 'No valid data to import' }, { status: 400 });
    }

    console.log('Master import - Transformed rows:', transformedData.length);
    console.log('Master import - Sample transformed row:', transformedData[0]);

    // CRITICAL: Determine which Supabase to use based on project's settings
    const projectSupabaseUrl = normalizeSupabaseUrl(project.supabase_url);
    const isExternalProject = projectSupabaseUrl && projectSupabaseUrl !== CENTRAL_SUPABASE_URL;

    let supabaseUrl: string;
    let serviceKey: string;

    if (isExternalProject) {
      // Project has its own external Supabase - use ONLY its credentials
      supabaseUrl = projectSupabaseUrl;

      if (!project.supabase_service_key) {
        console.error('External project missing service key:', project.name);
        return NextResponse.json({
          error: 'לא הוגדר Service Key לפרויקט זה.',
          details: 'יש לעדכן את פרטי החיבור בהגדרות הפרויקט.',
        }, { status: 400 });
      }

      try {
        serviceKey = decrypt(project.supabase_service_key);
      } catch (decryptError) {
        console.error('Failed to decrypt external service key:', decryptError);
        return NextResponse.json({
          error: 'לא ניתן לפענח את מפתח ה-Service של הפרויקט.',
        }, { status: 500 });
      }

      console.log('Importing to EXTERNAL Supabase:', supabaseUrl, 'for project:', project.name);
    } else {
      // Use Central Supabase
      supabaseUrl = CENTRAL_SUPABASE_URL;
      serviceKey = CENTRAL_SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        try {
          serviceKey = decrypt(project.supabase_service_key);
        } catch {
          return NextResponse.json({ error: 'Missing CENTRAL_SUPABASE_SERVICE_KEY in environment' }, { status: 500 });
        }
      }

      console.log('Importing to CENTRAL Supabase:', supabaseUrl, 'for project:', project.name);
    }

    const projectClient = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if table exists, if not provide SQL for creation
    const { error: checkError } = await projectClient
      .from(TABLE_NAME)
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist
      return NextResponse.json({
        error: 'Table master_data does not exist',
        needsSetup: true,
        setupSql: `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS master_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_expected_accumulation NUMERIC,
  product_type_new TEXT,
  producer_new TEXT,
  documents_transfer_date DATE,
  raw_data JSONB,
  project_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON master_data
  FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';`,
      }, { status: 400 });
    }

    // Import data using exec_sql for reliability
    let hasExecSql = false;
    try {
      const { error: checkExec } = await projectClient.rpc('exec_sql', { sql_query: 'SELECT 1' });
      hasExecSql = !checkExec;
    } catch {
      hasExecSql = false;
    }

    const escapeValue = (val: unknown): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      // Handle objects and arrays as JSONB
      if (typeof val === 'object') {
        // Clean and serialize the object to ensure valid JSON
        const jsonStr = JSON.stringify(JSON.parse(JSON.stringify(val))).replace(/'/g, "''");
        return `'${jsonStr}'::jsonb`;
      }
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Handle import modes
    if (importMode === 'replace_all') {
      // Delete all existing data
      console.log('Master import - Replacing ALL data');
      await projectClient.from(TABLE_NAME).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } else if (importMode === 'replace_period') {
      // Delete data for specific month/year
      console.log(`Master import - Replacing data for ${importMonth}/${importYear}`);
      await projectClient
        .from(TABLE_NAME)
        .delete()
        .eq('import_month', importMonth)
        .eq('import_year', importYear);
    }
    // 'append' mode - just add data without deleting

    const batchSize = hasExecSql ? 100 : 500;
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      try {
        if (hasExecSql) {
          // Use direct SQL insert
          const columns = Object.keys(batch[0]);
          const columnList = columns.map(c => `"${c}"`).join(', ');

          const valuesList = batch.map(row => {
            const values = columns.map(col => escapeValue((row as Record<string, unknown>)[col]));
            return `(${values.join(', ')})`;
          }).join(',\n');

          const insertSql = `INSERT INTO "${TABLE_NAME}" (${columnList}) VALUES ${valuesList};`;
          const { error } = await projectClient.rpc('exec_sql', { sql_query: insertSql });

          if (error) {
            console.error(`Master import - Batch ${batchNum} error:`, error.message);
            errors.push(`Batch ${batchNum}: ${error.message}`);
          } else {
            imported += batch.length;
          }
        } else {
          // Use REST API
          const { error: insertError } = await projectClient.from(TABLE_NAME).insert(batch);
          if (insertError) {
            console.error(`Master import - Batch ${batchNum} REST error:`, insertError.message);
            errors.push(`Batch ${batchNum}: ${insertError.message}`);
          } else {
            imported += batch.length;
          }
        }
      } catch (e) {
        console.error(`Master import - Batch ${batchNum} exception:`, e);
        errors.push(`Batch ${batchNum}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    const durationMs = Date.now() - startTime;
    const finalStatus = errors.length === 0 ? 'success' : (imported > 0 ? 'partial' : 'failed');

    console.log(`Master import - Final: imported=${imported}, errors=${errors.length}, duration=${durationMs}ms`);

    // Update import log with results
    if (importLogId) {
      await supabase
        .from('import_logs')
        .update({
          status: finalStatus,
          rows_total: transformedData.length,
          rows_imported: imported,
          rows_failed: transformedData.length - imported,
          error_message: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
          error_details: errors.length > 0 ? { errors: errors.slice(0, 20) } : null,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', importLogId);
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'master_import',
      details: {
        table_name: TABLE_NAME,
        file_name: file.name,
        rows_imported: imported,
        total_rows: transformedData.length,
        duration_ms: durationMs,
        status: finalStatus,
      },
    });

    return NextResponse.json({
      success: imported > 0,
      imported,
      total: transformedData.length,
      tableName: TABLE_NAME,
      batchId,
      importMonth,
      importYear,
      importMode,
      durationMs,
      status: finalStatus,
      importLogId,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      message: imported > 0
        ? `✅ יובאו ${imported} שורות מתוך ${transformedData.length} (${importMode === 'append' ? 'הוספה' : importMode === 'replace_period' ? `החלפת ${importMonth}/${importYear}` : 'החלפה מלאה'}) - ${(durationMs / 1000).toFixed(1)} שניות`
        : '❌ לא יובאו שורות - בדוק את פורמט הקובץ',
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error('Master import error:', error);

    // Update import log with failure
    if (importLogId) {
      const supabase = await createClient();
      await supabase
        .from('import_logs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_details: { stack: error instanceof Error ? error.stack : null },
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq('id', importLogId);
    }

    return NextResponse.json(
      {
        error: 'Failed to import data',
        message: `❌ שגיאה בייבוא: ${error instanceof Error ? error.message : 'Unknown error'}`,
        importLogId,
      },
      { status: 500 }
    );
  }
}
