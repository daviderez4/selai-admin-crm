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

    // Transform data according to mappings
    const transformedData = dataRows
      .filter(row => row.some(cell => cell !== '')) // Skip empty rows
      .map(row => {
        const transformedRow: Record<string, unknown> = {};

        columnMappings.forEach(mapping => {
          const excelIndex = headers.indexOf(mapping.excelColumn);
          if (excelIndex === -1) return;

          let value: unknown = row[excelIndex];

          // Apply transformation
          switch (mapping.transform) {
            case 'number':
              value = value === '' || value === null ? null : Number(value);
              if (isNaN(value as number)) value = null;
              break;
            case 'boolean':
              value = ['true', '1', 'yes', 'כן', 'אמת'].includes(
                String(value).toLowerCase()
              );
              break;
            case 'date':
              if (value) {
                const date = new Date(value as string);
                value = isNaN(date.getTime()) ? null : date.toISOString();
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
              value = value === '' ? null : String(value);
          }

          transformedRow[mapping.dbColumn] = value;
        });

        return transformedRow;
      });

    if (transformedData.length === 0) {
      return NextResponse.json({ error: 'No valid data to import' }, { status: 400 });
    }

    // Connect to project's Supabase
    const serviceKey = decrypt(project.supabase_service_key);
    const projectClient = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Import data in batches
    const batchSize = 500;
    let imported = 0;
    let errors: string[] = [];

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);

      let query;
      if (upsertColumn) {
        query = projectClient
          .from(tableName)
          .upsert(batch, { onConflict: upsertColumn });
      } else {
        query = projectClient.from(tableName).insert(batch);
      }

      const { error: insertError } = await query;

      if (insertError) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        imported += batch.length;
      }
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

    return NextResponse.json({
      success: true,
      imported,
      total: transformedData.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Excel import error:', error);
    return NextResponse.json(
      { error: 'Failed to import Excel data' },
      { status: 500 }
    );
  }
}
