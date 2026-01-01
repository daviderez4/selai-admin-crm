import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

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

// Convert dashboard URL to API URL
function normalizeSupabaseUrl(url: string): string {
  if (!url) return url;
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  return url;
}

interface ColumnMapping {
  excelColumn: string;
  dbColumn: string;
  transform?: 'string' | 'number' | 'boolean' | 'date' | 'json';
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

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tableName = formData.get('tableName') as string;
    const columnMappingsStr = formData.get('columnMappings') as string;
    const sheetName = formData.get('sheetName') as string | null;
    const skipFirstRow = formData.get('skipFirstRow') === 'true';
    const upsertColumn = formData.get('upsertColumn') as string | null;

    if (!file || !tableName || !columnMappingsStr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const columnMappings: ColumnMapping[] = JSON.parse(columnMappingsStr);

    if (columnMappings.length === 0) {
      return NextResponse.json(
        { error: 'No column mappings provided' },
        { status: 400 }
      );
    }

    // Parse Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      codepage: 65001,
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
    const headers = jsonData[0].map(h => String(h || '').trim());
    const dataRows = skipFirstRow ? jsonData.slice(1) : jsonData;

    console.log('Import debug - Headers:', headers.slice(0, 10));
    console.log('Import debug - Column mappings:', columnMappings.slice(0, 5));
    console.log('Import debug - Total data rows:', dataRows.length);

    // Create a map of excel column name to index for faster lookup
    const headerIndexMap = new Map<string, number>();
    headers.forEach((h, i) => headerIndexMap.set(h, i));

    // Transform data according to mappings
    const transformedData = dataRows
      .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== '')) // Skip empty rows
      .map(row => {
        const transformedRow: Record<string, unknown> = {};

        columnMappings.forEach(mapping => {
          // Try exact match first, then case-insensitive
          let excelIndex = headerIndexMap.get(mapping.excelColumn);
          if (excelIndex === undefined) {
            // Try case-insensitive match
            const lowerExcel = mapping.excelColumn.toLowerCase();
            for (const [header, idx] of headerIndexMap) {
              if (header.toLowerCase() === lowerExcel) {
                excelIndex = idx;
                break;
              }
            }
          }

          if (excelIndex === undefined) {
            console.log(`Import debug - Column not found: "${mapping.excelColumn}"`);
            return;
          }

          let value: unknown = row[excelIndex];

          // Apply transformation
          switch (mapping.transform) {
            case 'number':
              if (value === '' || value === null || value === undefined) {
                value = null;
              } else {
                // Handle Hebrew/formatted numbers
                const cleanedValue = String(value).replace(/[,₪$€%\s]/g, '').trim();
                const num = parseFloat(cleanedValue);
                value = isNaN(num) ? null : num;
              }
              break;
            case 'boolean':
              value = ['true', '1', 'yes', 'כן', 'אמת'].includes(
                String(value).toLowerCase().trim()
              );
              break;
            case 'date':
              if (value && value !== '') {
                try {
                  const date = new Date(value as string);
                  if (isNaN(date.getTime())) {
                    value = null;
                  } else {
                    const year = date.getFullYear();
                    // Validate year is in reasonable range (1900-2100)
                    if (year < 1900 || year > 2100) {
                      value = null; // Invalid date like year 235451
                    } else {
                      value = date.toISOString();
                    }
                  }
                } catch {
                  value = null;
                }
              } else {
                value = null;
              }
              break;
            case 'json':
              try {
                value = JSON.parse(String(value));
              } catch {
                value = null;
              }
              break;
            default:
              value = (value === '' || value === null || value === undefined) ? null : String(value).trim();
          }

          transformedRow[mapping.dbColumn] = value;
        });

        return transformedRow;
      })
      .filter(row => Object.keys(row).length > 0); // Filter out rows with no mapped columns

    if (transformedData.length === 0) {
      return NextResponse.json({ error: 'No valid data to import' }, { status: 400 });
    }

    // Connect to project's Supabase
    const serviceKey = decrypt(project.supabase_service_key);
    const supabaseUrl = normalizeSupabaseUrl(project.supabase_url);

    console.log('Import debug - Connecting to:', supabaseUrl);

    const projectClient = createSupabaseClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if exec_sql function exists (needed for reliable imports)
    let hasExecSql = false;
    try {
      const { error: checkError } = await projectClient.rpc('exec_sql', { sql_query: 'SELECT 1' });
      hasExecSql = !checkError;
      console.log('Import debug - exec_sql available:', hasExecSql);
    } catch {
      hasExecSql = false;
    }

    // Import data in batches
    const sqlBatchSize = 100; // Smaller batches for SQL to avoid query size limits
    const restBatchSize = 500;
    let imported = 0;
    let errors: string[] = [];

    console.log('Import debug - Transformed data count:', transformedData.length);
    console.log('Import debug - First row sample:', JSON.stringify(transformedData[0]).slice(0, 500));
    console.log('Import debug - Table name:', tableName);
    console.log('Import debug - Using method:', hasExecSql ? 'exec_sql (direct SQL)' : 'REST API');

    // Helper function to escape SQL values
    const escapeValue = (val: unknown): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      // Escape single quotes by doubling them
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Helper function to insert via exec_sql
    const insertViaSql = async (batch: Record<string, unknown>[]): Promise<{ success: boolean; error?: string }> => {
      try {
        const columns = Object.keys(batch[0]);
        const columnList = columns.map(c => `"${c}"`).join(', ');

        const valuesList = batch.map(row => {
          const values = columns.map(col => escapeValue(row[col]));
          return `(${values.join(', ')})`;
        }).join(',\n');

        const insertSql = `INSERT INTO "${tableName}" (${columnList}) VALUES ${valuesList};`;

        const { error } = await projectClient.rpc('exec_sql', { sql_query: insertSql });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    };

    // Use appropriate batch size based on method
    const batchSize = hasExecSql ? sqlBatchSize : restBatchSize;

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      console.log(`Import debug - Inserting batch ${batchNum}, rows: ${batch.length}`);

      try {
        // Use exec_sql if available (bypasses REST API completely - no schema cache issues)
        if (hasExecSql) {
          const sqlResult = await insertViaSql(batch);
          if (sqlResult.success) {
            console.log(`Import debug - Batch ${batchNum} success via exec_sql`);
            imported += batch.length;
          } else {
            console.error(`Import debug - Batch ${batchNum} exec_sql error:`, sqlResult.error);
            errors.push(`Batch ${batchNum}: ${sqlResult.error}`);
          }
          continue;
        }

        // Fallback to REST API (only if exec_sql not available)
        let result;
        if (upsertColumn) {
          result = await projectClient
            .from(tableName)
            .upsert(batch, { onConflict: upsertColumn });
        } else {
          result = await projectClient.from(tableName).insert(batch);
        }

        const { error: insertError, status } = result;

        if (insertError) {
          console.error(`Import debug - Batch ${batchNum} REST error:`, insertError);
          errors.push(`Batch ${batchNum}: ${insertError.message} (${insertError.code || 'unknown'})`);
        } else {
          console.log(`Import debug - Batch ${batchNum} success via REST, status: ${status}`);
          imported += batch.length;
        }
      } catch (batchError) {
        console.error(`Import debug - Batch ${batchNum} exception:`, batchError);
        errors.push(`Batch ${batchNum}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
      }
    }

    console.log(`Import debug - Final count: imported=${imported}, errors=${errors.length}`);

    // If no rows imported and exec_sql not available, provide setup instructions
    if (imported === 0 && !hasExecSql && errors.length > 0) {
      const setupSql = `
-- Run this SQL in Supabase SQL Editor to enable automatic imports:

CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
`;
      return NextResponse.json({
        success: false,
        imported: 0,
        total: transformedData.length,
        errors,
        needsSetup: true,
        setupSql: setupSql.trim(),
        message: 'יש להתקין את פונקציית exec_sql ב-Supabase להפעלת ייבוא אוטומטי',
      });
    }

    // Log the import
    await supabase.from('import_history').insert({
      user_id: user.id,
      project_id: projectId,
      table_name: tableName,
      file_name: file.name,
      rows_imported: imported,
      status: errors.length === 0 ? 'completed' : 'completed_with_errors',
      error_message: errors.length > 0 ? errors.join('; ') : null,
    });

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'excel_import',
      details: {
        table_name: tableName,
        file_name: file.name,
        rows_imported: imported,
        total_rows: transformedData.length,
      },
    });

    // Return detailed response
    const response = {
      success: errors.length === 0 || imported > 0,
      imported,
      total: transformedData.length,
      tableName,
      errors: errors.length > 0 ? errors : undefined,
      message: imported > 0
        ? `יובאו ${imported} שורות מתוך ${transformedData.length}`
        : 'לא יובאו שורות - בדוק את ההגדרות',
    };

    console.log('Import debug - Response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Excel import error:', error);
    return NextResponse.json(
      { error: 'Failed to import Excel data' },
      { status: 500 }
    );
  }
}
