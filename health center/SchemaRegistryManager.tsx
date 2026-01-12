// ============================================================================
// SELAI Schema Registry Manager
// מנהל רישום סכמות למיפוי קבצי Excel
// ============================================================================
// File: src/components/admin/SchemaRegistryManager.tsx
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Eye,
  CheckCircle2,
  XCircle,
  Star,
  StarOff,
  Filter,
  ChevronDown,
  ChevronRight,
  Code,
  FileJson,
  Building2,
  Calendar,
  Activity,
  Sparkles,
  Wand2,
  ArrowRight,
  Save,
  X,
  Info,
  AlertTriangle,
  Check,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  FileText,
  Zap
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transformations?: string[];
  validationRule?: string;
  isRequired?: boolean;
}

interface Schema {
  id: string;
  projectId: string;
  schemaName: string;
  schemaNameEn?: string;
  description?: string;
  sourceType: 'excel' | 'csv' | 'api' | 'manual';
  category?: 'pension' | 'insurance' | 'contacts' | 'financial' | 'other';
  insuranceCompany?: string;
  columnMappings: Record<string, string>;
  normalizationRules?: Record<string, string>;
  sampleHeaders?: string[];
  useCount: number;
  lastUsedAt?: string;
  successRate: number;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ValidationRule {
  id: string;
  ruleName: string;
  fieldType: string;
  validationType: 'regex' | 'function' | 'range' | 'enum';
  validationPattern?: string;
  exampleValid?: string;
  exampleInvalid?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockSchemas: Schema[] = [
  {
    id: '1',
    projectId: 'default',
    schemaName: 'דוח פנסיה הראל',
    schemaNameEn: 'harel_pension_report',
    description: 'סכמה לייבוא דוחות פנסיה מהראל',
    sourceType: 'excel',
    category: 'pension',
    insuranceCompany: 'הראל',
    columnMappings: {
      'שם פרטי': 'first_name',
      'שם משפחה': 'last_name',
      'ת.ז.': 'id_number',
      'טלפון נייד': 'phone',
      'יתרה לתאריך': 'balance',
      'תאריך הצטרפות': 'join_date',
      'שיעור הפקדה': 'contribution_rate'
    },
    normalizationRules: {
      phone: 'normalize_israeli_phone',
      id_number: 'normalize_israeli_id',
      balance: 'parse_currency'
    },
    sampleHeaders: ['שם פרטי', 'שם משפחה', 'ת.ז.', 'טלפון נייד', 'יתרה לתאריך'],
    useCount: 156,
    lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
    successRate: 98.5,
    isActive: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '2',
    projectId: 'default',
    schemaName: 'דוח גמל מגדל',
    schemaNameEn: 'migdal_gemel_report',
    description: 'סכמה לייבוא דוחות גמל ממגדל',
    sourceType: 'excel',
    category: 'pension',
    insuranceCompany: 'מגדל',
    columnMappings: {
      'מזהה': 'id_number',
      'שם מלא': 'full_name',
      'סכום': 'balance',
      'סטטוס': 'status',
      'תאריך פתיחה': 'open_date'
    },
    sampleHeaders: ['מזהה', 'שם מלא', 'סכום', 'סטטוס'],
    useCount: 89,
    lastUsedAt: new Date(Date.now() - 172800000).toISOString(),
    successRate: 95.2,
    isActive: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: '3',
    projectId: 'default',
    schemaName: 'יבוא אנשי קשר',
    schemaNameEn: 'generic_contacts',
    description: 'סכמה גנרית לייבוא אנשי קשר',
    sourceType: 'excel',
    category: 'contacts',
    columnMappings: {
      'שם': 'full_name',
      'שם פרטי': 'first_name',
      'שם משפחה': 'last_name',
      'טלפון': 'phone',
      'נייד': 'phone',
      'אימייל': 'email',
      'מייל': 'email',
      'כתובת': 'address',
      'עיר': 'city',
      'הערות': 'notes'
    },
    sampleHeaders: ['שם', 'טלפון', 'אימייל'],
    useCount: 234,
    lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
    successRate: 99.1,
    isActive: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const mockValidationRules: ValidationRule[] = [
  {
    id: '1',
    ruleName: 'israeli_phone',
    fieldType: 'phone',
    validationType: 'regex',
    validationPattern: '^0[0-9]{8,9}$',
    exampleValid: '0501234567',
    exampleInvalid: '501234567'
  },
  {
    id: '2',
    ruleName: 'israeli_id',
    fieldType: 'id_number',
    validationType: 'function',
    validationPattern: 'validate_israeli_id',
    exampleValid: '123456782',
    exampleInvalid: '123456789'
  },
  {
    id: '3',
    ruleName: 'email',
    fieldType: 'email',
    validationType: 'regex',
    validationPattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    exampleValid: 'test@example.com',
    exampleInvalid: 'invalid-email'
  }
];

const insuranceCompanies = ['הראל', 'מגדל', 'פניקס', 'כלל', 'מנורה', 'הפניקס', 'איילון', 'הכשרה', 'שלמה'];
const categories = [
  { value: 'pension', label: 'פנסיה' },
  { value: 'insurance', label: 'ביטוח' },
  { value: 'contacts', label: 'אנשי קשר' },
  { value: 'financial', label: 'כספים' },
  { value: 'other', label: 'אחר' }
];

const targetFields = [
  { value: 'first_name', label: 'שם פרטי', type: 'text' },
  { value: 'last_name', label: 'שם משפחה', type: 'text' },
  { value: 'full_name', label: 'שם מלא', type: 'text' },
  { value: 'id_number', label: 'תעודת זהות', type: 'id_number' },
  { value: 'phone', label: 'טלפון', type: 'phone' },
  { value: 'email', label: 'אימייל', type: 'email' },
  { value: 'address', label: 'כתובת', type: 'text' },
  { value: 'city', label: 'עיר', type: 'text' },
  { value: 'balance', label: 'יתרה', type: 'amount' },
  { value: 'premium', label: 'פרמיה', type: 'amount' },
  { value: 'policy_number', label: 'מספר פוליסה', type: 'text' },
  { value: 'status', label: 'סטטוס', type: 'text' },
  { value: 'join_date', label: 'תאריך הצטרפות', type: 'date' },
  { value: 'start_date', label: 'תאריך תחילה', type: 'date' },
  { value: 'end_date', label: 'תאריך סיום', type: 'date' },
  { value: 'notes', label: 'הערות', type: 'text' }
];

// ============================================================================
// Utility Functions
// ============================================================================

const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(dateStr));
};

const formatRelativeTime = (dateStr: string | undefined): string => {
  if (!dateStr) return 'לא נעשה שימוש';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return formatDate(dateStr);
};

// ============================================================================
// Sub-Components
// ============================================================================

// Schema Card
const SchemaCard: React.FC<{
  schema: Schema;
  onEdit: (schema: Schema) => void;
  onDelete: (schema: Schema) => void;
  onDuplicate: (schema: Schema) => void;
  onToggleActive: (schema: Schema) => void;
}> = ({ schema, onEdit, onDelete, onDuplicate, onToggleActive }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const mappingCount = Object.keys(schema.columnMappings).length;
  
  return (
    <div className={`bg-white rounded-xl border ${schema.isActive ? 'border-gray-200' : 'border-gray-300 opacity-60'} overflow-hidden hover:shadow-md transition-all`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${
              schema.category === 'pension' ? 'bg-blue-100 text-blue-600' :
              schema.category === 'insurance' ? 'bg-green-100 text-green-600' :
              schema.category === 'contacts' ? 'bg-purple-100 text-purple-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              <FileSpreadsheet size={24} />
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {schema.schemaName}
                {schema.isPublic && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                    ציבורי
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{schema.description}</p>
              
              <div className="flex items-center gap-3 mt-2">
                {schema.insuranceCompany && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 size={12} />
                    {schema.insuranceCompany}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Activity size={12} />
                  {schema.useCount} שימושים
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar size={12} />
                  {formatRelativeTime(schema.lastUsedAt)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Success Rate */}
            <div className={`px-2 py-1 rounded-lg text-sm font-medium ${
              schema.successRate >= 95 ? 'bg-green-100 text-green-700' :
              schema.successRate >= 80 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {schema.successRate}%
            </div>
            
            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal size={20} className="text-gray-500" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-20 min-w-[150px]">
                    <button
                      onClick={() => { onEdit(schema); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit size={16} />
                      עריכה
                    </button>
                    <button
                      onClick={() => { onDuplicate(schema); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy size={16} />
                      שכפול
                    </button>
                    <button
                      onClick={() => { onToggleActive(schema); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {schema.isActive ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      {schema.isActive ? 'השבתה' : 'הפעלה'}
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => { onDelete(schema); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      מחיקה
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {mappingCount} מיפויים
        </button>
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">מיפוי עמודות:</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(schema.columnMappings).map(([source, target]) => (
                <div key={source} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-600 truncate flex-1">{source}</span>
                  <ArrowRight size={14} className="text-gray-400" />
                  <span className="text-blue-600 font-medium">{target}</span>
                </div>
              ))}
            </div>
          </div>
          
          {schema.sampleHeaders && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">כותרות לדוגמה:</h4>
              <div className="flex flex-wrap gap-1">
                {schema.sampleHeaders.map((header, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                    {header}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Schema Editor Modal
const SchemaEditorModal: React.FC<{
  schema?: Schema | null;
  onSave: (schema: Partial<Schema>) => void;
  onClose: () => void;
}> = ({ schema, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    schemaName: schema?.schemaName || '',
    schemaNameEn: schema?.schemaNameEn || '',
    description: schema?.description || '',
    sourceType: schema?.sourceType || 'excel',
    category: schema?.category || 'contacts',
    insuranceCompany: schema?.insuranceCompany || '',
    isPublic: schema?.isPublic || false,
    columnMappings: schema?.columnMappings || {}
  });
  
  const [mappings, setMappings] = useState<Array<{ source: string; target: string }>>(
    Object.entries(formData.columnMappings).map(([source, target]) => ({ source, target }))
  );
  
  const [newMapping, setNewMapping] = useState({ source: '', target: '' });
  
  const addMapping = () => {
    if (newMapping.source && newMapping.target) {
      setMappings([...mappings, newMapping]);
      setNewMapping({ source: '', target: '' });
    }
  };
  
  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };
  
  const handleSave = () => {
    const columnMappings: Record<string, string> = {};
    mappings.forEach(m => {
      if (m.source && m.target) {
        columnMappings[m.source] = m.target;
      }
    });
    
    onSave({
      ...formData,
      columnMappings
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {schema ? 'עריכת סכמה' : 'יצירת סכמה חדשה'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם הסכמה (עברית) *
                </label>
                <input
                  type="text"
                  value={formData.schemaName}
                  onChange={e => setFormData({ ...formData, schemaName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="דוח פנסיה הראל"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם הסכמה (אנגלית)
                </label>
                <input
                  type="text"
                  value={formData.schemaNameEn}
                  onChange={e => setFormData({ ...formData, schemaNameEn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="harel_pension_report"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תיאור
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="תיאור קצר של הסכמה..."
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סוג מקור
                </label>
                <select
                  value={formData.sourceType}
                  onChange={e => setFormData({ ...formData, sourceType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                  <option value="api">API</option>
                  <option value="manual">ידני</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  קטגוריה
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  חברת ביטוח
                </label>
                <select
                  value={formData.insuranceCompany}
                  onChange={e => setFormData({ ...formData, insuranceCompany: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">ללא</option>
                  {insuranceCompanies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Column Mappings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מיפוי עמודות
              </label>
              
              <div className="space-y-2">
                {mappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={mapping.source}
                      onChange={e => {
                        const newMappings = [...mappings];
                        newMappings[index].source = e.target.value;
                        setMappings(newMappings);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      placeholder="שם עמודה במקור"
                    />
                    <ArrowRight size={16} className="text-gray-400" />
                    <select
                      value={mapping.target}
                      onChange={e => {
                        const newMappings = [...mappings];
                        newMappings[index].target = e.target.value;
                        setMappings(newMappings);
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">בחר שדה יעד</option>
                      {targetFields.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeMapping(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                {/* Add New Mapping */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <input
                    type="text"
                    value={newMapping.source}
                    onChange={e => setNewMapping({ ...newMapping, source: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="שם עמודה במקור"
                  />
                  <ArrowRight size={16} className="text-gray-400" />
                  <select
                    value={newMapping.target}
                    onChange={e => setNewMapping({ ...newMapping, target: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">בחר שדה יעד</option>
                    {targetFields.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={addMapping}
                    disabled={!newMapping.source || !newMapping.target}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">סכמה ציבורית (זמינה לכל הסוכנים)</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.schemaName || mappings.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={18} />
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
};

// AI Schema Detector
const AISchemaDetector: React.FC<{
  onDetected: (headers: string[], suggestedSchema: Schema | null) => void;
}> = ({ onDetected }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsAnalyzing(true);
    
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock detected headers
    const mockHeaders = ['שם פרטי', 'שם משפחה', 'ת.ז.', 'טלפון', 'יתרה'];
    setHeaders(mockHeaders);
    setIsAnalyzing(false);
    
    onDetected(mockHeaders, null);
  };
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="text-purple-600" size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">זיהוי סכמה אוטומטי</h3>
          <p className="text-sm text-gray-500">העלה קובץ והמערכת תזהה את המבנה</p>
        </div>
      </div>
      
      <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-purple-500" size={32} />
            <p className="text-gray-600">מנתח את הקובץ...</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="text-green-500" size={32} />
            <p className="font-medium text-gray-900">{file.name}</p>
            {headers.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {headers.map((h, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded">
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload className="mx-auto text-purple-400 mb-3" size={32} />
            <p className="text-gray-600 mb-2">גרור קובץ Excel או CSV לכאן</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700">
              <FileSpreadsheet size={18} />
              בחר קובץ
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const SchemaRegistryManager: React.FC = () => {
  const [schemas, setSchemas] = useState<Schema[]>(mockSchemas);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingSchema, setEditingSchema] = useState<Schema | null>(null);
  const [showDetector, setShowDetector] = useState(false);
  
  // Filtered schemas
  const filteredSchemas = schemas.filter(s => {
    if (searchQuery && !s.schemaName.includes(searchQuery) && !s.description?.includes(searchQuery)) {
      return false;
    }
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (companyFilter !== 'all' && s.insuranceCompany !== companyFilter) return false;
    return true;
  });
  
  // Stats
  const stats = {
    total: schemas.length,
    active: schemas.filter(s => s.isActive).length,
    totalUses: schemas.reduce((acc, s) => acc + s.useCount, 0),
    avgSuccess: schemas.reduce((acc, s) => acc + s.successRate, 0) / schemas.length
  };
  
  // Handlers
  const handleEdit = (schema: Schema) => {
    setEditingSchema(schema);
    setShowEditor(true);
  };
  
  const handleDelete = (schema: Schema) => {
    if (confirm(`למחוק את הסכמה "${schema.schemaName}"?`)) {
      setSchemas(prev => prev.filter(s => s.id !== schema.id));
    }
  };
  
  const handleDuplicate = (schema: Schema) => {
    const newSchema: Schema = {
      ...schema,
      id: Date.now().toString(),
      schemaName: `${schema.schemaName} (עותק)`,
      useCount: 0,
      lastUsedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSchemas(prev => [newSchema, ...prev]);
  };
  
  const handleToggleActive = (schema: Schema) => {
    setSchemas(prev => prev.map(s => 
      s.id === schema.id ? { ...s, isActive: !s.isActive } : s
    ));
  };
  
  const handleSave = (schemaData: Partial<Schema>) => {
    if (editingSchema) {
      // Update
      setSchemas(prev => prev.map(s => 
        s.id === editingSchema.id ? { ...s, ...schemaData, updatedAt: new Date().toISOString() } : s
      ));
    } else {
      // Create
      const newSchema: Schema = {
        ...schemaData,
        id: Date.now().toString(),
        projectId: 'default',
        useCount: 0,
        successRate: 100,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Schema;
      setSchemas(prev => [newSchema, ...prev]);
    }
    setShowEditor(false);
    setEditingSchema(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileJson className="text-purple-600" />
              מנהל סכמות נתונים
            </h1>
            <p className="text-gray-500 mt-1">ניהול מיפויים לייבוא קבצי Excel ונתונים</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDetector(!showDetector)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <Wand2 size={18} />
              זיהוי אוטומטי
            </button>
            <button
              onClick={() => { setEditingSchema(null); setShowEditor(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              סכמה חדשה
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileSpreadsheet className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">סכמות</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-gray-500">פעילות</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUses}</p>
                <p className="text-sm text-gray-500">שימושים</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Activity className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.avgSuccess.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">הצלחה ממוצעת</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Detector */}
      {showDetector && (
        <div className="px-6 pb-4">
          <AISchemaDetector
            onDetected={(headers, schema) => {
              console.log('Detected:', headers, schema);
            }}
          />
        </div>
      )}
      
      {/* Filters */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="חיפוש סכמות..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">כל הקטגוריות</option>
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          
          <select
            value={companyFilter}
            onChange={e => setCompanyFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">כל החברות</option>
            {insuranceCompanies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Schemas Grid */}
      <div className="px-6 pb-6">
        {filteredSchemas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileSpreadsheet size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">לא נמצאו סכמות</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredSchemas.map(schema => (
              <SchemaCard
                key={schema.id}
                schema={schema}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Editor Modal */}
      {showEditor && (
        <SchemaEditorModal
          schema={editingSchema}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingSchema(null); }}
        />
      )}
    </div>
  );
};

export default SchemaRegistryManager;
