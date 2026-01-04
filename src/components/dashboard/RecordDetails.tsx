'use client';

import { X, Phone, MessageCircle, Edit, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface RecordDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  record: Record<string, unknown> | null;
  tableName?: string; // Added to know if it's master_data or dynamic
}

const statusColors: Record<string, string> = {
  'פעיל': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'בטיפול': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'הושלם': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'הצלחה': 'bg-green-500/20 text-green-400 border-green-500/30',
  'בוטל': 'bg-red-500/20 text-red-400 border-red-500/30',
  'רג\'קט': 'bg-red-500/20 text-red-400 border-red-500/30',
  'ממתין': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'תהליך בסנכרון': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const formatCurrency = (value: unknown): string => {
  if (!value) return '-';
  const num = Number(value);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (value: unknown): string => {
  if (!value) return '-';
  try {
    return new Date(String(value)).toLocaleDateString('he-IL');
  } catch {
    return '-';
  }
};

const formatPhone = (phone: unknown): string => {
  if (!phone) return '-';
  const str = String(phone).replace(/\D/g, '');
  if (str.startsWith('972')) {
    return '0' + str.slice(3);
  }
  return str;
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') {
    return value.toLocaleString('he-IL');
  }
  return String(value);
};

// Check if record has master_data structure (Hebrew column names)
const isMasterDataRecord = (record: Record<string, unknown>): boolean => {
  return 'מספר_תהליך' in record || 'סוג_תהליך' in record || 'לקוח' in record;
};

// Helper to get value from record or raw_data
const getFieldValue = (record: Record<string, unknown>, ...fieldNames: string[]): unknown => {
  // First check top-level record
  for (const field of fieldNames) {
    if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
      return record[field];
    }
  }
  // Then check raw_data if it exists
  const rawData = record.raw_data as Record<string, unknown> | undefined;
  if (rawData && typeof rawData === 'object') {
    for (const field of fieldNames) {
      if (rawData[field] !== undefined && rawData[field] !== null && rawData[field] !== '') {
        return rawData[field];
      }
    }
  }
  return null;
};

// Insurance data details component
function InsuranceDataRecordDetails({ record }: { record: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);

  // Debug: log raw_data to see exact field names
  console.log('=== Insurance Record Debug ===');
  console.log('Full record:', record);
  console.log('raw_data:', record.raw_data);
  if (record.raw_data && typeof record.raw_data === 'object') {
    console.log('raw_data keys:', Object.keys(record.raw_data as object));
  }
  console.log('==============================');

  // Get values from raw_data or top-level record
  // Based on actual field names from Excel import
  const processNumber = getFieldValue(record, 'מספר תהליך', 'מספר_תהליך', 'מספר רפסנ');
  const processType = getFieldValue(record, 'סוג תהליך', 'סוג_תהליך');
  const producer = getFieldValue(record, 'יצרן חדש', 'יצרן_חדש', 'יצרן');
  const productType = getFieldValue(record, 'סוג מוצר חדש', 'סוג מוצר', 'סוג_מוצר');
  const policyNumber = getFieldValue(record, 'מספר חשבון/פוליסה חדש', 'מספר פוליסה', 'מספר_פוליסה');
  const status = getFieldValue(record, 'סטטוס', 'סטטוס תהליך');
  const supervisor = getFieldValue(record, 'מפקח', 'שם מפקח');
  const customerId = getFieldValue(record, 'מזהה לקוח', 'מזהה_לקוח', 'ת.ז.', 'תז');
  const expectedPremium = getFieldValue(record, 'פרמיה צפויה', 'פרמיה_צפויה', 'פרמיה');
  const customerName = getFieldValue(record, 'לקוח', 'שם לקוח', 'שם');
  const handler = getFieldValue(record, 'תיאור מספר סוכן', 'מטפל', 'שם מטפל', 'סוכן');
  const agentNumber = getFieldValue(record, 'מספר סוכן רשום', 'מספר_סוכן_רשום');
  const phone = getFieldValue(record, 'טלפון', 'סלולרי', 'נייד', 'סלולרי לקוח');
  const joinDate = getFieldValue(record, 'תאריך הצטרפות לקופה/הפקת פוליסה', 'תאריך פתיחת תהליך');

  const handleCopyId = () => {
    const id = String(customerId || '');
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCall = () => {
    const phoneStr = formatPhone(phone);
    if (phoneStr !== '-') {
      window.open(`tel:${phoneStr}`, '_blank');
    }
  };

  const handleWhatsApp = () => {
    const phoneStr = formatPhone(phone);
    if (phoneStr !== '-') {
      const intlPhone = phoneStr.startsWith('0') ? '972' + phoneStr.slice(1) : phoneStr;
      window.open(`https://wa.me/${intlPhone}`, '_blank');
    }
  };

  const statusStr = String(status || '');
  const statusClass = statusColors[statusStr] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Customer Info */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {String(customerName || processNumber || '?').charAt(0)}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">
                {customerName ? String(customerName) : `תהליך ${formatValue(processNumber)}`}
              </h3>
              {Boolean(customerId) && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <span>מזהה: {String(customerId)}</span>
                  <button onClick={handleCopyId} className="hover:text-white transition-colors">
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
          {Boolean(phone) && (
            <div className="flex items-center gap-2 text-slate-300">
              <span>📱</span>
              <span className="font-mono">{formatPhone(phone)}</span>
            </div>
          )}
        </div>

        {/* Process Details */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>📊</span> פרטי התהליך
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מספר תהליך</p>
              <p className="text-white font-mono">{formatValue(processNumber)}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">סטטוס</p>
              <Badge className={cn('border', statusClass)}>{statusStr || '-'}</Badge>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 col-span-2">
              <p className="text-slate-500 text-xs mb-1">סוג תהליך</p>
              <p className="text-white">{formatValue(processType)}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">יצרן</p>
              <p className="text-white">{formatValue(producer)}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">סוג מוצר</p>
              <p className="text-white">{formatValue(productType)}</p>
            </div>
          </div>
        </div>

        {/* Policy Details */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>📄</span> פרטי פוליסה
          </h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מספר פוליסה</p>
              <p className="text-white font-mono">{formatValue(policyNumber)}</p>
            </div>
            {Boolean(expectedPremium) && (
              <div className="bg-slate-800/30 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">פרמיה צפויה</p>
                <p className="text-emerald-400 font-bold font-mono">{formatCurrency(expectedPremium)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        {Boolean(joinDate) && (
          <div className="space-y-4">
            <h4 className="text-slate-300 font-medium flex items-center gap-2">
              <span>📅</span> תאריכים
            </h4>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">תאריך הצטרפות/פתיחה</p>
              <p className="text-white">{formatValue(joinDate)}</p>
            </div>
          </div>
        )}

        {/* Staff Details */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>👨‍💼</span> צוות
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מפקח</p>
              <p className="text-white">{formatValue(supervisor)}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">סוכן</p>
              <p className="text-white">{formatValue(handler)}</p>
            </div>
            {Boolean(agentNumber) && (
              <div className="bg-slate-800/30 rounded-lg p-3 col-span-2">
                <p className="text-slate-500 text-xs mb-1">מספר סוכן רשום</p>
                <p className="text-white font-mono">{formatValue(agentNumber)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer ID */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>🆔</span> זיהוי לקוח
          </h4>
          <div className="bg-slate-800/30 rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1">מזהה לקוח (ת.ז.)</p>
            <p className="text-white font-mono">{formatValue(customerId)}</p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-700">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 ml-1" />
            התקשר
          </Button>
          <Button
            variant="outline"
            className="border-green-600 text-green-400 hover:bg-green-500/10"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 ml-1" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Edit className="h-4 w-4 ml-1" />
            ערוך
          </Button>
        </div>
      </div>
    </>
  );
}

// Check if this is an insurance_data record
const isInsuranceDataRecord = (record: Record<string, unknown>): boolean => {
  const rawData = record.raw_data as Record<string, unknown> | undefined;
  if (rawData && typeof rawData === 'object') {
    // Check for insurance-specific fields in raw_data
    return 'מספר תהליך' in rawData || 'יצרן חדש' in rawData || 'סוג מוצר חדש' in rawData || 'מפקח' in rawData;
  }
  // Check top-level fields
  return 'מספר תהליך' in record || 'יצרן חדש' in record || 'סוג מוצר חדש' in record;
};

// Dynamic details component for non-master_data tables
function DynamicRecordDetails({ record, onClose }: { record: Record<string, unknown>; onClose: () => void }) {
  // Filter out meta fields and get displayable fields
  const metaFields = ['id', 'import_batch', 'import_date', 'created_at', 'updated_at', 'import_month', 'import_year', 'project_id'];

  // Get all columns - both col_X and Hebrew column names
  const displayFields: { key: string; label: string; value: unknown }[] = Object.entries(record)
    .filter(([key]) => !metaFields.includes(key))
    .map(([key, value]) => {
      // For old col_X format, convert to "עמודה X"
      // For new Hebrew format, use key as label (replace underscores with spaces)
      const label = key.startsWith('col_')
        ? `עמודה ${parseInt(key.replace('col_', '')) + 1}`
        : key.replace(/_/g, ' ');
      return { key, label, value };
    });

  // Get first displayable value for header
  const firstValue = displayFields.length > 0 ? displayFields[0].value : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Summary Header */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
            #
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">
              {formatValue(firstValue) !== '-' ? formatValue(firstValue) : `רשומה ${String(record.id || '').slice(0, 8)}`}
            </h3>
            <p className="text-slate-400 text-sm">
              {displayFields.length} שדות
            </p>
          </div>
        </div>
      </div>

      {/* Import Info */}
      {(record.import_month !== undefined || record.import_year !== undefined) && (
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-500 text-xs mb-1">תקופת ייבוא</p>
          <p className="text-white">
            {String(record.import_month || '')}/{String(record.import_year || '')}
          </p>
        </div>
      )}

      {/* All Fields - Dynamic Display */}
      <div className="space-y-2">
        <h4 className="text-slate-300 font-medium flex items-center gap-2">
          <span>📋</span> כל השדות
        </h4>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {displayFields.map(({ key, label, value }) => (
            <div key={key} className="bg-slate-800/30 rounded-lg p-3 flex justify-between items-start gap-4">
              <span className="text-slate-400 text-sm shrink-0">{label}</span>
              <span className="text-white text-sm text-left break-words max-w-[200px]">
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Master data details component (existing layout)
function MasterDataRecordDetails({ record }: { record: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    const id = String(record.מזהה_לקוח || '');
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCall = () => {
    const phone = formatPhone(record.סלולרי_לקוח);
    if (phone !== '-') {
      window.open(`tel:${phone}`, '_blank');
    }
  };

  const handleWhatsApp = () => {
    const phone = formatPhone(record.סלולרי_לקוח);
    if (phone !== '-') {
      const intlPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
      window.open(`https://wa.me/${intlPhone}`, '_blank');
    }
  };

  const status = String(record.סטטוס || '');
  const statusClass = statusColors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  return (
    <>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Customer Info */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {String(record.לקוח || '?').charAt(0)}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{String(record.לקוח || '-')}</h3>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <span>ת.ז. {String(record.מזהה_לקוח || '-')}</span>
                <button onClick={handleCopyId} className="hover:text-white transition-colors">
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>📱</span>
            <span className="font-mono">{formatPhone(record.סלולרי_לקוח)}</span>
          </div>
        </div>

        {/* Process Details */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>📊</span> פרטי התהליך
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מספר תהליך</p>
              <p className="text-white font-mono">{String(record.מספר_תהליך || '-')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">סוג</p>
              <p className="text-white">{String(record.סוג_תהליך || '-')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">סטטוס</p>
              <Badge className={cn('border', statusClass)}>{status || '-'}</Badge>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מטפל</p>
              <p className="text-white">{String(record.מטפל || '-')}</p>
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>💰</span> פיננסי
          </h4>
          <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">צבירה צפויה מניוד:</span>
              <span className="text-white font-mono">{formatCurrency(record.סהכ_צבירה_צפויה_מניוד)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">פרמיה צפויה:</span>
              <span className="text-white font-mono">{formatCurrency(record.פרמיה_צפויה)}</span>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">סה״כ צבירה:</span>
                <span className="text-emerald-400 font-bold font-mono text-lg">
                  {formatCurrency(record.total_expected_accumulation || record.סהכ_צבירה_צפויה_מניוד)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Producer Details */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>🏢</span> יצרן
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">יצרן חדש</p>
              <p className="text-white">{String(record.יצרן_חדש || '-')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מוצר חדש</p>
              <p className="text-white">{String(record.סוג_מוצר_חדש || '-')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 col-span-2">
              <p className="text-slate-500 text-xs mb-1">מספר חשבון</p>
              <p className="text-white font-mono">{String(record.מספר_חשבון_פוליסה_חדש || '-')}</p>
            </div>
          </div>
        </div>

        {/* Existing Product */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>📦</span> מוצר קיים
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">סוג מוצר</p>
              <p className="text-white">{String(record.סוג_מוצר_קיים || '-')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">יצרן</p>
              <p className="text-white">{String(record.יצרן_קיים || '-')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3 col-span-2">
              <p className="text-slate-500 text-xs mb-1">מספר פוליסה</p>
              <p className="text-white font-mono">{String(record.מספר_חשבון_פוליסה_קיים || '-')}</p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>📅</span> תאריכים
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">פתיחת תהליך</p>
              <p className="text-white">{formatDate(record.תאריך_פתיחת_תהליך)}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">העברת מסמכים</p>
              <p className="text-white">{formatDate(record.תאריך_העברת_מסמכים_ליצרן)}</p>
            </div>
          </div>
        </div>

        {/* Supervisor */}
        <div className="space-y-4">
          <h4 className="text-slate-300 font-medium flex items-center gap-2">
            <span>👨‍💼</span> פרטים נוספים
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מפקח</p>
              <p className="text-white">{String(record.מפקח || '-')}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">מספר סוכן</p>
              <p className="text-white font-mono">{String(record.מספר_סוכן_רשום || '-')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-700">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 ml-1" />
            התקשר
          </Button>
          <Button
            variant="outline"
            className="border-green-600 text-green-400 hover:bg-green-500/10"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 ml-1" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Edit className="h-4 w-4 ml-1" />
            ערוך
          </Button>
        </div>
      </div>
    </>
  );
}

export function RecordDetails({ isOpen, onClose, record, tableName }: RecordDetailsProps) {
  if (!record) return null;

  // Debug: log what we received
  console.log('RecordDetails - tableName:', tableName);
  console.log('RecordDetails - record keys:', Object.keys(record));

  // Determine record type - check tableName FIRST before heuristics
  // Insurance data takes priority if tableName matches
  const isInsuranceData = tableName === 'insurance_data' ||
    (tableName !== 'master_data' && isInsuranceDataRecord(record));
  const isMasterData = !isInsuranceData &&
    (tableName === 'master_data' || isMasterDataRecord(record));

  console.log('RecordDetails - isInsuranceData:', isInsuranceData, 'isMasterData:', isMasterData);

  // Determine panel title
  const getPanelTitle = () => {
    if (isInsuranceData) return 'פרטי תהליך';
    if (isMasterData) return 'פרטי תהליך';
    return 'פרטי רשומה';
  };

  // Render appropriate content
  const renderContent = () => {
    if (isInsuranceData) {
      return <InsuranceDataRecordDetails record={record} />;
    }
    if (isMasterData) {
      return <MasterDataRecordDetails record={record} />;
    }
    return <DynamicRecordDetails record={record} onClose={onClose} />;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-50 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {getPanelTitle()}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-slate-400" />
          </Button>
        </div>

        {renderContent()}
      </div>
    </>
  );
}
