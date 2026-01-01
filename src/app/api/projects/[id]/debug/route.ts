import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const diagnostics: Record<string, unknown> = {};

  try {
    const { id: projectId } = await params;
    diagnostics.projectId = projectId;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('supabase_url, supabase_service_key, name, table_name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found', diagnostics }, { status: 404 });
    }

    diagnostics.projectName = project.name;
    diagnostics.supabaseUrl = project.supabase_url;
    diagnostics.tableName = project.table_name;
    diagnostics.hasServiceKey = !!project.supabase_service_key;
    diagnostics.serviceKeyLength = project.supabase_service_key?.length;

    // Validate URL format
    const urlValid = project.supabase_url && project.supabase_url.includes('supabase.co');
    diagnostics.urlValid = urlValid;

    if (!urlValid) {
      return NextResponse.json({
        error: 'Invalid Supabase URL',
        diagnostics,
        suggestion: 'URL should be like: https://xxxxx.supabase.co'
      }, { status: 400 });
    }

    // Try to decrypt
    let serviceKey: string;
    try {
      serviceKey = decrypt(project.supabase_service_key);
      diagnostics.decryptSuccess = true;
      diagnostics.decryptedKeyLength = serviceKey.length;
      diagnostics.keyStartsWith = serviceKey.substring(0, 10) + '...';
    } catch (decryptError) {
      diagnostics.decryptSuccess = false;
      diagnostics.decryptError = decryptError instanceof Error ? decryptError.message : 'Unknown';
      return NextResponse.json({
        error: 'Failed to decrypt service key',
        diagnostics,
        suggestion: 'The encryption key may have changed or the stored key is corrupted'
      }, { status: 500 });
    }

    const projectClient = createSupabaseClient(project.supabase_url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Test connection with simple query
    const { data: testData, error: testError } = await projectClient
      .from('master_data')
      .select('id')
      .limit(1);

    if (testError) {
      diagnostics.connectionTest = 'failed';
      diagnostics.testError = testError.message;

      // Check if error is HTML (wrong URL or invalid key)
      if (testError.message.includes('<!DOCTYPE')) {
        return NextResponse.json({
          error: 'Connection returned HTML instead of JSON',
          diagnostics,
          suggestion: 'The Supabase URL or API key appears to be invalid. Check that:\n1. URL is the API URL (not Studio URL)\n2. Service key is correct\n3. master_data table exists'
        }, { status: 500 });
      }

      // Check if table doesn't exist
      if (testError.code === '42P01' || testError.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'Table master_data does not exist',
          diagnostics,
          suggestion: 'You need to create the master_data table first. Go to Data Import page and import data.'
        }, { status: 404 });
      }

      return NextResponse.json({
        error: testError.message,
        diagnostics
      }, { status: 500 });
    }

    diagnostics.connectionTest = 'success';
    diagnostics.testDataCount = testData?.length ?? 0;

    // Check table structure
    const { data: columns, error: columnsError } = await projectClient.rpc('exec_sql', {
      sql_query: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'master_data'
        ORDER BY ordinal_position;
      `
    });

    // Get sample data
    const { data: sampleData, error: sampleError } = await projectClient
      .from('master_data')
      .select('*')
      .limit(3);

    // Count records and check financial data
    const { data: stats, error: statsError } = await projectClient.rpc('exec_sql', {
      sql_query: `
        SELECT
          COUNT(*) as total_rows,
          COUNT(total_expected_accumulation) as has_total_accumulation,
          COUNT(raw_data) as has_raw_data,
          SUM(total_expected_accumulation) as sum_accumulation,
          COUNT(product_type_new) as has_product_type,
          COUNT(producer_new) as has_producer
        FROM master_data;
      `
    });

    // Check raw_data structure for first row
    let rawDataAnalysis = null;
    if (sampleData && sampleData.length > 0 && sampleData[0].raw_data) {
      const rawData = sampleData[0].raw_data;
      let parsed = rawData;

      if (typeof rawData === 'string') {
        try {
          parsed = JSON.parse(rawData);
        } catch {
          parsed = rawData;
        }
      }

      const indices = {
        'AZ (51) - צבירה': parsed[51],
        'CZ (103) - הפקדה': parsed[103],
        'BE (56) - מוצר חדש': parsed[56],
        'BF (57) - יצרן חדש': parsed[57],
        'DH (111) - תאריך מסמכים': parsed[111],
        'DO (118) - פרמיה צפויה': parsed[118],
      };

      rawDataAnalysis = {
        type: typeof rawData,
        isArray: Array.isArray(parsed),
        length: Array.isArray(parsed) ? parsed.length : null,
        relevantIndices: indices,
        first10Values: Array.isArray(parsed) ? parsed.slice(0, 10) : null,
        last20Values: Array.isArray(parsed) ? parsed.slice(-20) : null,
      };
    }

    return NextResponse.json({
      success: true,
      columns: columns || columnsError?.message,
      stats: stats || statsError?.message,
      sampleRows: sampleData?.map(row => ({
        id: row.id,
        total_expected_accumulation: row.total_expected_accumulation,
        product_type_new: row.product_type_new,
        producer_new: row.producer_new,
        documents_transfer_date: row.documents_transfer_date,
        raw_data_type: typeof row.raw_data,
        raw_data_is_array: Array.isArray(row.raw_data),
      })),
      rawDataAnalysis,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
