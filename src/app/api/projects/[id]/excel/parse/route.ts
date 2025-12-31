import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import type { ExcelSheetInfo } from '@/types';

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

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel or CSV file.' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Parse Excel file
    const workbook = XLSX.read(buffer, {
      type: 'array',
      codepage: 65001, // UTF-8 for Hebrew support
      cellDates: true,
    });

    // Parse all sheets info
    const sheetsInfo: ExcelSheetInfo[] = workbook.SheetNames.map((name, index) => {
      const worksheet = workbook.Sheets[name];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: '',
      }) as string[][];

      const headers = jsonData.length > 0
        ? jsonData[0].map((h) => String(h || '').trim()).filter(Boolean)
        : [];

      const previewRows = jsonData.slice(1, 6).map((row) => {
        const rowData: Record<string, string> = {};
        headers.forEach((header, i) => {
          rowData[header] = String(row[i] ?? '');
        });
        return rowData;
      });

      return {
        name,
        index,
        rowCount: Math.max(0, jsonData.length - 1),
        headers,
        preview: previewRows,
      };
    });

    // If a specific sheet was requested, return detailed info for it
    const currentSheetName = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[currentSheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as string[][];

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Extract headers (first row)
    const headers = jsonData[0].map((h, i) => ({
      index: i,
      original: String(h || `Column ${i + 1}`).trim(),
      suggested: sanitizeColumnName(String(h || `column_${i + 1}`)),
    }));

    // Get preview data (first 10 rows after header)
    const previewRows = jsonData.slice(1, 11).map(row => {
      const rowData: Record<string, string> = {};
      headers.forEach((header, i) => {
        rowData[header.original] = String(row[i] ?? '');
      });
      return rowData;
    });

    // Get total row count
    const totalRows = jsonData.length - 1;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sheetsInfo, // Detailed info for all sheets
      sheets: workbook.SheetNames, // Backwards compatibility
      currentSheet: currentSheetName,
      headers,
      preview: previewRows,
      totalRows,
    });
  } catch (error) {
    console.error('Excel parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse Excel file' },
      { status: 500 }
    );
  }
}

// Sanitize column name for database
function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, '_') // Replace spaces and hyphens with underscore
    .replace(/[^\w\u0590-\u05FF]/g, '') // Keep alphanumeric, underscore, and Hebrew chars
    .replace(/^(\d)/, '_$1') // Prefix with underscore if starts with number
    .substring(0, 63); // Postgres max identifier length
}
