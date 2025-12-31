import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ColumnMapping {
  excelColumn: string;
  dbColumn: string;
  transform: 'string' | 'number' | 'boolean' | 'date' | 'json';
  enabled: boolean;
}

interface ImportTemplateRequest {
  tableName: string;
  name: string;
  columnMappings: ColumnMapping[];
  sampleData: Record<string, string>[];
}

const CARD_COLORS = ['emerald', 'blue', 'purple', 'amber', 'cyan', 'pink'] as const;
const CARD_ICONS = ['💰', '📊', '📈', '💵', '🔢', '📉'] as const;

// POST - Create a dashboard template from import configuration
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

    const body: ImportTemplateRequest = await request.json();
    const { tableName, name, columnMappings, sampleData } = body;

    if (!tableName || !columnMappings || columnMappings.length === 0) {
      return NextResponse.json(
        { error: 'Table name and column mappings are required' },
        { status: 400 }
      );
    }

    const enabledMappings = columnMappings.filter(m => m.enabled);

    // Generate field selection
    const fieldSelection = enabledMappings.map((col, i) => ({
      name: col.dbColumn,
      order: i,
      visible: true,
      customLabel: col.excelColumn,
    }));

    // Analyze sample data to determine filters and cards
    const filtersConfig: Array<{
      column: string;
      type: 'text' | 'number' | 'date' | 'enum' | 'boolean';
      enabled: boolean;
      options?: string[];
    }> = [];

    const cardsConfig: Array<{
      id: string;
      title: string;
      column: string;
      aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct';
      icon: string;
      color: string;
      format: 'number' | 'currency' | 'percent';
    }> = [];

    let numericCardCount = 0;

    for (const mapping of enabledMappings) {
      // Get unique values for this column
      const values = sampleData
        .map(row => row[mapping.excelColumn])
        .filter(v => v !== null && v !== undefined && v !== '');

      const uniqueValues = new Set(values);
      const uniqueCount = uniqueValues.size;

      // Determine filter type
      if (mapping.transform === 'boolean') {
        filtersConfig.push({
          column: mapping.dbColumn,
          type: 'boolean',
          enabled: true,
        });
      } else if (mapping.transform === 'date') {
        filtersConfig.push({
          column: mapping.dbColumn,
          type: 'date',
          enabled: true,
        });
      } else if (mapping.transform === 'number') {
        // Number filters - range input
        filtersConfig.push({
          column: mapping.dbColumn,
          type: 'number',
          enabled: false, // Disabled by default for numbers
        });

        // Add card for numeric columns (max 4 cards)
        if (numericCardCount < 4) {
          cardsConfig.push({
            id: `card-${numericCardCount}`,
            title: mapping.excelColumn,
            column: mapping.dbColumn,
            aggregation: 'sum',
            icon: CARD_ICONS[numericCardCount] || '📊',
            color: CARD_COLORS[numericCardCount] || 'emerald',
            format: 'number',
          });
          numericCardCount++;
        }
      } else if (uniqueCount > 0 && uniqueCount <= 20) {
        // Enum filter for low cardinality text columns
        filtersConfig.push({
          column: mapping.dbColumn,
          type: 'enum',
          enabled: true,
          options: Array.from(uniqueValues).map(String).sort(),
        });
      } else {
        // Text filter for high cardinality
        filtersConfig.push({
          column: mapping.dbColumn,
          type: 'text',
          enabled: false, // Disabled by default
        });
      }
    }

    // If no numeric columns, add a count card
    if (cardsConfig.length === 0) {
      cardsConfig.push({
        id: 'card-count',
        title: 'סה"כ רשומות',
        column: enabledMappings[0]?.dbColumn || 'id',
        aggregation: 'count',
        icon: '📊',
        color: 'emerald',
        format: 'number',
      });
    }

    // Generate table config
    const tableConfig = {
      columns: fieldSelection,
      pageSize: 50,
      enableSearch: true,
      enableExport: true,
    };

    // Create template in database
    const { data: template, error } = await supabase
      .from('smart_dashboard_templates')
      .insert({
        project_id: projectId,
        name: name || `דשבורד - ${tableName}`,
        description: `דשבורד שנוצר אוטומטית מייבוא לטבלה ${tableName}`,
        table_name: tableName,
        field_selection: fieldSelection,
        filters_config: filtersConfig,
        cards_config: cardsConfig,
        table_config: tableConfig,
        charts_config: [], // No charts by default
        is_default: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      project_id: projectId,
      action: 'create_template_from_import',
      details: {
        template_id: template.id,
        table_name: tableName,
        columns_count: enabledMappings.length,
        cards_count: cardsConfig.length,
        filters_count: filtersConfig.filter(f => f.enabled).length,
      },
    });

    return NextResponse.json({
      success: true,
      templateId: template.id,
      template: {
        id: template.id,
        name: template.name,
        tableName: template.table_name,
        cardsCount: cardsConfig.length,
        filtersCount: filtersConfig.filter(f => f.enabled).length,
      },
    });
  } catch (error) {
    console.error('Error creating template from import:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
