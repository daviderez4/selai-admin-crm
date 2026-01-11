// ============================================
// Column Mapping Types for Data Import
// ============================================

/**
 * Represents a column detected in the source file (Excel/CSV)
 */
export interface SourceColumn {
  /** Original column name from the file */
  name: string;
  /** Index position in the file */
  index: number;
  /** Detected data type based on sample values */
  detectedType: ColumnDataType;
  /** Sample values from the column (first 5 non-empty) */
  sampleValues: string[];
  /** Count of non-empty values */
  nonEmptyCount: number;
  /** Count of unique values */
  uniqueCount: number;
  /** Whether the column appears to contain Hebrew text */
  isHebrew: boolean;
}

/**
 * Possible data types for columns
 */
export type ColumnDataType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'phone'
  | 'email'
  | 'id_number' // Israeli ID
  | 'percentage'
  | 'boolean'
  | 'json'
  | 'unknown';

/**
 * Standard field definitions that the system understands
 */
export interface StandardField {
  /** System identifier for the field */
  id: string;
  /** Display name in Hebrew */
  label: string;
  /** English name for reference */
  englishName: string;
  /** Expected data type */
  type: ColumnDataType;
  /** Category for grouping in UI */
  category: StandardFieldCategory;
  /** Whether this field is required */
  required: boolean;
  /** Description of the field */
  description: string;
  /** Keywords that might indicate this field in source data */
  keywords: string[];
  /** Format hint for display */
  formatHint?: string;
}

export type StandardFieldCategory =
  | 'identity'      // ID numbers, names
  | 'contact'       // Phone, email, address
  | 'financial'     // Amounts, premiums, commissions
  | 'product'       // Policy types, products
  | 'dates'         // All date fields
  | 'status'        // Status, stage
  | 'agent'         // Agent info
  | 'custom';       // User-defined

/**
 * A mapping between a source column and a target field
 */
export interface ColumnMapping {
  /** ID of the source column (by index or name) */
  sourceColumn: string;
  /** ID of the target standard field, or 'custom:name' for custom fields */
  targetField: string;
  /** Optional transformation to apply */
  transform?: ColumnTransform;
  /** Whether this mapping is confirmed by the user */
  confirmed: boolean;
  /** Confidence score from AI suggestion (0-100) */
  confidence?: number;
  /** Override display label */
  displayLabel?: string;
}

/**
 * Transformation to apply to column values
 */
export interface ColumnTransform {
  /** Type of transformation */
  type: TransformType;
  /** Parameters for the transformation */
  params?: Record<string, unknown>;
}

export type TransformType =
  | 'none'
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'date_format'      // Parse various date formats
  | 'number_format'    // Parse numbers with different formats
  | 'phone_normalize'  // Normalize Israeli phone numbers
  | 'id_normalize'     // Normalize Israeli ID numbers
  | 'currency_parse'   // Parse currency values
  | 'boolean_parse'    // Parse yes/no, true/false, 1/0
  | 'split'            // Split into multiple values
  | 'replace'          // Find and replace
  | 'default_value'    // Provide default if empty
  | 'custom_function'; // User-defined function

/**
 * Complete mapping configuration for a file
 */
export interface MappingConfiguration {
  /** Unique identifier */
  id: string;
  /** Project this mapping belongs to */
  projectId: string;
  /** Name of the mapping configuration */
  name: string;
  /** Description */
  description?: string;
  /** Source file information */
  sourceFile: {
    name: string;
    type: 'xlsx' | 'csv';
    sheetName?: string;
    totalRows: number;
    totalColumns: number;
    uploadedAt: string;
  };
  /** Detected source columns */
  sourceColumns: SourceColumn[];
  /** Column mappings */
  mappings: ColumnMapping[];
  /** Columns to ignore */
  ignoredColumns: string[];
  /** Import settings */
  settings: ImportSettings;
  /** Whether the mapping is approved */
  approved: boolean;
  /** When approved */
  approvedAt?: string;
  /** Who approved */
  approvedBy?: string;
  /** Created timestamp */
  createdAt: string;
  /** Last updated */
  updatedAt: string;
}

/**
 * Settings for the import process
 */
export interface ImportSettings {
  /** Skip the first N rows (usually header) */
  skipRows: number;
  /** How to handle duplicates */
  duplicateHandling: 'skip' | 'update' | 'append';
  /** Column(s) to use for duplicate detection */
  uniqueColumns: string[];
  /** Whether to validate data before import */
  validateBeforeImport: boolean;
  /** Whether to create a backup before import */
  createBackup: boolean;
  /** Date format hint for parsing */
  dateFormat?: string;
  /** Encoding for CSV files */
  encoding?: string;
}

/**
 * AI-suggested mapping with explanation
 */
export interface MappingSuggestion {
  /** The suggested mapping */
  mapping: ColumnMapping;
  /** Confidence score (0-100) */
  confidence: number;
  /** Explanation for why this mapping was suggested */
  reason: string;
  /** Alternative suggestions */
  alternatives?: {
    targetField: string;
    confidence: number;
    reason: string;
  }[];
}

/**
 * Natural language query for column mapping
 */
export interface MappingQuery {
  /** The user's question in natural language */
  query: string;
  /** Current context (source columns available) */
  context: {
    sourceColumns: SourceColumn[];
    currentMappings: ColumnMapping[];
  };
}

/**
 * Response from AI mapping service
 */
export interface MappingQueryResponse {
  /** Whether the query was understood */
  understood: boolean;
  /** Suggested mappings based on the query */
  suggestions: MappingSuggestion[];
  /** Clarifying questions if needed */
  clarifyingQuestions?: string[];
  /** Natural language response */
  message: string;
}

/**
 * Validation result for a mapping
 */
export interface MappingValidation {
  /** Whether the mapping is valid */
  isValid: boolean;
  /** Errors that prevent import */
  errors: ValidationError[];
  /** Warnings that don't prevent import */
  warnings: ValidationWarning[];
  /** Preview of transformed data */
  preview: Record<string, unknown>[];
}

export interface ValidationError {
  type: 'missing_required' | 'type_mismatch' | 'duplicate_mapping' | 'invalid_transform';
  message: string;
  column?: string;
  details?: Record<string, unknown>;
}

export interface ValidationWarning {
  type: 'empty_column' | 'low_confidence' | 'data_loss' | 'truncation';
  message: string;
  column?: string;
  details?: Record<string, unknown>;
}

// ============================================
// Standard Fields Library
// ============================================

/**
 * Predefined standard fields for insurance data
 */
export const STANDARD_FIELDS: StandardField[] = [
  // Identity
  {
    id: 'customer_id',
    label: 'תעודת זהות',
    englishName: 'Customer ID',
    type: 'id_number',
    category: 'identity',
    required: false,
    description: 'מספר תעודת זהות של הלקוח',
    keywords: ['ת.ז', 'תז', 'מזהה', 'id', 'identity', 'מספר_זהות', 'מזהה_לקוח'],
  },
  {
    id: 'customer_name',
    label: 'שם לקוח',
    englishName: 'Customer Name',
    type: 'text',
    category: 'identity',
    required: false,
    description: 'שם מלא של הלקוח',
    keywords: ['שם', 'לקוח', 'name', 'customer', 'שם_לקוח', 'שם_מלא'],
  },
  {
    id: 'first_name',
    label: 'שם פרטי',
    englishName: 'First Name',
    type: 'text',
    category: 'identity',
    required: false,
    description: 'שם פרטי',
    keywords: ['שם_פרטי', 'first', 'פרטי'],
  },
  {
    id: 'last_name',
    label: 'שם משפחה',
    englishName: 'Last Name',
    type: 'text',
    category: 'identity',
    required: false,
    description: 'שם משפחה',
    keywords: ['שם_משפחה', 'last', 'משפחה'],
  },

  // Contact
  {
    id: 'phone',
    label: 'טלפון',
    englishName: 'Phone',
    type: 'phone',
    category: 'contact',
    required: false,
    description: 'מספר טלפון נייד',
    keywords: ['טלפון', 'סלולרי', 'נייד', 'phone', 'mobile', 'cell', 'סלולרי_לקוח'],
  },
  {
    id: 'email',
    label: 'אימייל',
    englishName: 'Email',
    type: 'email',
    category: 'contact',
    required: false,
    description: 'כתובת אימייל',
    keywords: ['אימייל', 'מייל', 'email', 'mail', 'דוא"ל'],
  },
  {
    id: 'address',
    label: 'כתובת',
    englishName: 'Address',
    type: 'text',
    category: 'contact',
    required: false,
    description: 'כתובת מגורים',
    keywords: ['כתובת', 'address', 'רחוב', 'עיר'],
  },

  // Financial
  {
    id: 'accumulation',
    label: 'צבירה',
    englishName: 'Accumulation',
    type: 'currency',
    category: 'financial',
    required: false,
    description: 'סכום הצבירה',
    keywords: ['צבירה', 'accumulation', 'סהכ_צבירה', 'צבירה_צפויה'],
    formatHint: '₪',
  },
  {
    id: 'premium',
    label: 'פרמיה',
    englishName: 'Premium',
    type: 'currency',
    category: 'financial',
    required: false,
    description: 'סכום הפרמיה',
    keywords: ['פרמיה', 'premium', 'פרמיה_צפויה', 'תשלום'],
    formatHint: '₪',
  },
  {
    id: 'commission',
    label: 'עמלה',
    englishName: 'Commission',
    type: 'currency',
    category: 'financial',
    required: false,
    description: 'סכום העמלה',
    keywords: ['עמלה', 'commission', 'עמלות'],
    formatHint: '₪',
  },
  {
    id: 'deposit',
    label: 'הפקדה',
    englishName: 'Deposit',
    type: 'currency',
    category: 'financial',
    required: false,
    description: 'סכום ההפקדה',
    keywords: ['הפקדה', 'deposit', 'הפקדות'],
    formatHint: '₪',
  },

  // Product
  {
    id: 'policy_number',
    label: 'מספר פוליסה',
    englishName: 'Policy Number',
    type: 'text',
    category: 'product',
    required: false,
    description: 'מספר הפוליסה',
    keywords: ['פוליסה', 'policy', 'מספר_פוליסה', 'מספר_חשבון'],
  },
  {
    id: 'product_type',
    label: 'סוג מוצר',
    englishName: 'Product Type',
    type: 'text',
    category: 'product',
    required: false,
    description: 'סוג המוצר הביטוחי',
    keywords: ['מוצר', 'product', 'סוג_מוצר', 'ענף'],
  },
  {
    id: 'insurance_company',
    label: 'חברת ביטוח',
    englishName: 'Insurance Company',
    type: 'text',
    category: 'product',
    required: false,
    description: 'שם חברת הביטוח',
    keywords: ['יצרן', 'חברה', 'company', 'producer', 'יצרן_קיים', 'יצרן_חדש'],
  },
  {
    id: 'process_type',
    label: 'סוג תהליך',
    englishName: 'Process Type',
    type: 'text',
    category: 'product',
    required: false,
    description: 'סוג התהליך',
    keywords: ['תהליך', 'process', 'סוג_תהליך'],
  },

  // Dates
  {
    id: 'process_date',
    label: 'תאריך תהליך',
    englishName: 'Process Date',
    type: 'date',
    category: 'dates',
    required: false,
    description: 'תאריך פתיחת התהליך',
    keywords: ['תאריך', 'date', 'תאריך_פתיחה', 'תאריך_פתיחת_תהליך'],
    formatHint: 'DD/MM/YYYY',
  },
  {
    id: 'policy_start_date',
    label: 'תאריך תחילת פוליסה',
    englishName: 'Policy Start Date',
    type: 'date',
    category: 'dates',
    required: false,
    description: 'תאריך תחילת הפוליסה',
    keywords: ['תחילה', 'start', 'תאריך_תחילה'],
    formatHint: 'DD/MM/YYYY',
  },
  {
    id: 'policy_end_date',
    label: 'תאריך סיום פוליסה',
    englishName: 'Policy End Date',
    type: 'date',
    category: 'dates',
    required: false,
    description: 'תאריך סיום הפוליסה',
    keywords: ['סיום', 'end', 'תאריך_סיום', 'חידוש'],
    formatHint: 'DD/MM/YYYY',
  },

  // Status
  {
    id: 'status',
    label: 'סטטוס',
    englishName: 'Status',
    type: 'text',
    category: 'status',
    required: false,
    description: 'סטטוס התהליך/פוליסה',
    keywords: ['סטטוס', 'status', 'מצב'],
  },
  {
    id: 'process_number',
    label: 'מספר תהליך',
    englishName: 'Process Number',
    type: 'text',
    category: 'status',
    required: false,
    description: 'מספר זיהוי התהליך',
    keywords: ['מספר_תהליך', 'process_number', 'תהליך'],
  },

  // Agent
  {
    id: 'agent_name',
    label: 'שם סוכן',
    englishName: 'Agent Name',
    type: 'text',
    category: 'agent',
    required: false,
    description: 'שם הסוכן המטפל',
    keywords: ['סוכן', 'מטפל', 'agent', 'handler'],
  },
  {
    id: 'agent_number',
    label: 'מספר סוכן',
    englishName: 'Agent Number',
    type: 'text',
    category: 'agent',
    required: false,
    description: 'מספר הסוכן',
    keywords: ['מספר_סוכן', 'agent_number'],
  },
  {
    id: 'supervisor_name',
    label: 'שם מפקח',
    englishName: 'Supervisor Name',
    type: 'text',
    category: 'agent',
    required: false,
    description: 'שם המפקח',
    keywords: ['מפקח', 'supervisor', 'מנהל'],
  },
];

/**
 * Get standard field by ID
 */
export function getStandardField(id: string): StandardField | undefined {
  return STANDARD_FIELDS.find(f => f.id === id);
}

/**
 * Get standard fields by category
 */
export function getStandardFieldsByCategory(category: StandardFieldCategory): StandardField[] {
  return STANDARD_FIELDS.filter(f => f.category === category);
}

/**
 * Find matching standard fields for a source column name
 */
export function findMatchingFields(columnName: string): StandardField[] {
  const normalizedName = columnName.toLowerCase().trim();

  return STANDARD_FIELDS.filter(field => {
    // Check exact match with label
    if (field.label.toLowerCase() === normalizedName) return true;

    // Check exact match with ID
    if (field.id === normalizedName) return true;

    // Check keywords
    return field.keywords.some(kw =>
      normalizedName.includes(kw.toLowerCase()) ||
      kw.toLowerCase().includes(normalizedName)
    );
  }).sort((a, b) => {
    // Prioritize exact matches
    const aExact = a.label.toLowerCase() === normalizedName || a.id === normalizedName;
    const bExact = b.label.toLowerCase() === normalizedName || b.id === normalizedName;
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;
    return 0;
  });
}
