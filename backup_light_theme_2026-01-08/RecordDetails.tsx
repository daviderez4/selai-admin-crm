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

// Light theme status colors
const statusColors: Record<string, string> = {
  'פעיל': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'בטיפול': 'bg-amber-100 text-amber-700 border-amber-200',
  'הושלם': 'bg-blue-100 text-blue-700 border-blue-200',
  'הצלחה': 'bg-green-100 text-green-700 border-green-200',
  'בוטל': 'bg-red-100 text-red-700 border-red-200',
  'רג\'קט': 'bg-red-100 text-red-700 border-red-200',
  'ממתין': 'bg-purple-100 text-purple-700 border-purple-200',
  'תהליך בסנכרון': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'ללא תפעול': 'bg-slate-100 text-slate-600 border-slate-200',
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

// Insurance data details component - Light Theme
function InsuranceDataRecordDetails({ record }: { record: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);

  // Get values from raw_data or top-level record
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
  const expectedAccumulation = getFieldValue(record, 'סהכ צבירה צפויה מניוד', 'סהכ_צבירה_צפויה_מניוד', 'צבירה צפויה');

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
  const statusClass = statusColors[statusStr] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <>
      {/* Content - Light Theme */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Customer Info */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm">
              {String(customerName || processNumber || '?').charAt(0)}
            </div>
            <div>
              <h3 className="text-slate-800 font-bold text-lg">
                {customerName ? String(customerName) : `תהליך ${formatValue(processNumber)}`}
              </h3>
              {Boolean(customerId) && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <span>ת.ז. {String(customerId)}</span>
                  <button onClick={handleCopyId} className="hover:text-slate-700 transition-colors">
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>
          {Boolean(phone) && (
            <div className="flex items-center gap-2 text-slate-600">
              <span>📱</span>
              <span className="font-mono">{formatPhone(phone)}</span>
            </div>
          )}
        </div>

        {/* Process Details */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>📊</span> פרטי התהליך
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מספר תהליך</p>
              <p className="text-slate-800 font-mono font-medium">{formatValue(processNumber)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">סטטוס</p>
              <Badge className={cn('border', statusClass)}>{statusStr || '-'}</Badge>
            </div>
            <div className="bg-white rounded-lg p-3 col-span-2 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מטפל</p>
              <p className="text-slate-800 font-medium">{formatValue(handler)}</p>
            </div>
          </div>
        </div>

        {/* Financial - Light Theme */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>💰</span> פיננסי
          </h4>
          <div className="bg-white rounded-lg p-4 space-y-3 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">צבירה צפויה מניוד:</span>
              <span className="text-slate-800 font-mono font-medium">{formatCurrency(expectedAccumulation)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">פרמיה צפויה:</span>
              <span className="text-slate-800 font-mono">{formatCurrency(expectedPremium)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-700 font-semibold">סה״כ צבירה:</span>
                <span className="text-emerald-600 font-bold font-mono text-lg">
                  {formatCurrency(expectedAccumulation)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Producer Details */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>🏢</span> יצרן
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">יצרן חדש</p>
              <p className="text-slate-800">{formatValue(producer)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מוצר חדש</p>
              <p className="text-slate-800">{formatValue(productType)}</p>
            </div>
          </div>
        </div>

        {/* Account Number */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>📄</span> מספר חשבון
          </h4>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-slate-400 text-xs mb-1">מספר חשבון</p>
            <p className="text-slate-800 font-mono">{formatValue(policyNumber)}</p>
          </div>
        </div>
      </div>

      {/* Footer Actions - Light Theme */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 ml-1" />
            התקשר
          </Button>
          <Button
            variant="outline"
            className="border-green-200 text-green-600 hover:bg-green-50"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 ml-1" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
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
    return 'מספר תהליך' in rawData || 'יצרן חדש' in rawData || 'סוג מוצר חדש' in rawData || 'מפקח' in rawData;
  }
  return 'מספר תהליך' in record || 'יצרן חדש' in record || 'סוג מוצר חדש' in record;
};

// Dynamic details component for non-master_data tables - Light Theme
function DynamicRecordDetails({ record, onClose }: { record: Record<string, unknown>; onClose: () => void }) {
  const metaFields = ['id', 'import_batch', 'import_date', 'created_at', 'updated_at', 'import_month', 'import_year', 'project_id'];

  const displayFields: { key: string; label: string; value: unknown }[] = Object.entries(record)
    .filter(([key]) => !metaFields.includes(key))
    .map(([key, value]) => {
      const label = key.startsWith('col_')
        ? `עמודה ${parseInt(key.replace('col_', '')) + 1}`
        : key.replace(/_/g, ' ');
      return { key, label, value };
    });

  const firstValue = displayFields.length > 0 ? displayFields[0].value : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Summary Header */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm">
            #
          </div>
          <div>
            <h3 className="text-slate-800 font-bold text-lg">
              {formatValue(firstValue) !== '-' ? formatValue(firstValue) : `רשומה ${String(record.id || '').slice(0, 8)}`}
            </h3>
            <p className="text-slate-500 text-sm">
              {displayFields.length} שדות
            </p>
          </div>
        </div>
      </div>

      {/* Import Info */}
      {(record.import_month !== undefined || record.import_year !== undefined) && (
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-slate-400 text-xs mb-1">תקופת ייבוא</p>
          <p className="text-slate-800">
            {String(record.import_month || '')}/{String(record.import_year || '')}
          </p>
        </div>
      )}

      {/* All Fields */}
      <div className="space-y-2">
        <h4 className="text-slate-700 font-semibold flex items-center gap-2">
          <span>📋</span> כל השדות
        </h4>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {displayFields.map(({ key, label, value }) => (
            <div key={key} className="bg-white rounded-lg p-3 flex justify-between items-start gap-4 border border-slate-200">
              <span className="text-slate-500 text-sm shrink-0">{label}</span>
              <span className="text-slate-800 text-sm text-left break-words max-w-[200px] font-medium">
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Master data details component - Light Theme
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
  const statusClass = statusColors[status] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <>
      {/* Content - Light Theme */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Customer Info */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm">
              {String(record.לקוח || '?').charAt(0)}
            </div>
            <div>
              <h3 className="text-slate-800 font-bold text-lg">{String(record.לקוח || '-')}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span>ת.ז. {String(record.מזהה_לקוח || '-')}</span>
                <button onClick={handleCopyId} className="hover:text-slate-700 transition-colors">
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span>📱</span>
            <span className="font-mono">{formatPhone(record.סלולרי_לקוח)}</span>
          </div>
        </div>

        {/* Process Details */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>📊</span> פרטי התהליך
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מספר תהליך</p>
              <p className="text-slate-800 font-mono font-medium">{String(record.מספר_תהליך || '-')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">סוג</p>
              <p className="text-slate-800">{String(record.סוג_תהליך || '-')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">סטטוס</p>
              <Badge className={cn('border', statusClass)}>{status || '-'}</Badge>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מטפל</p>
              <p className="text-slate-800">{String(record.מטפל || '-')}</p>
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>💰</span> פיננסי
          </h4>
          <div className="bg-white rounded-lg p-4 space-y-3 border border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">צבירה צפויה מניוד:</span>
              <span className="text-slate-800 font-mono font-medium">{formatCurrency(record.סהכ_צבירה_צפויה_מניוד)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">פרמיה צפויה:</span>
              <span className="text-slate-800 font-mono">{formatCurrency(record.פרמיה_צפויה)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-700 font-semibold">סה״כ צבירה:</span>
                <span className="text-emerald-600 font-bold font-mono text-lg">
                  {formatCurrency(record.total_expected_accumulation || record.סהכ_צבירה_צפויה_מניוד)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Producer Details */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>🏢</span> יצרן
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">יצרן חדש</p>
              <p className="text-slate-800">{String(record.יצרן_חדש || '-')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מוצר חדש</p>
              <p className="text-slate-800">{String(record.סוג_מוצר_חדש || '-')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 col-span-2 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מספר חשבון</p>
              <p className="text-slate-800 font-mono">{String(record.מספר_חשבון_פוליסה_חדש || '-')}</p>
            </div>
          </div>
        </div>

        {/* Supervisor */}
        <div className="space-y-4">
          <h4 className="text-slate-700 font-semibold flex items-center gap-2">
            <span>👨‍💼</span> פרטים נוספים
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מפקח</p>
              <p className="text-slate-800">{String(record.מפקח || '-')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-slate-400 text-xs mb-1">מספר סוכן</p>
              <p className="text-slate-800 font-mono">{String(record.מספר_סוכן_רשום || '-')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions - Light Theme */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 ml-1" />
            התקשר
          </Button>
          <Button
            variant="outline"
            className="border-green-200 text-green-600 hover:bg-green-50"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 ml-1" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
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

  // Determine record type
  const isInsuranceData = tableName === 'insurance_data' ||
    (tableName !== 'master_data' && isInsuranceDataRecord(record));
  const isMasterData = !isInsuranceData &&
    (tableName === 'master_data' || isMasterDataRecord(record));

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
          'fixed inset-0 bg-black/30 z-40 transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel - Light Theme */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-50 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">
            {getPanelTitle()}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-500 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {renderContent()}
      </div>
    </>
  );
}
