'use client';

import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';

const N8N_WEBHOOK_URL = 'https://selai.app.n8n.cloud/webhook/process-excel';

interface UploadResult {
  success: boolean;
  name?: string;
  columns_detected?: number;
  rows_count?: number;
  schema_matched?: string;
  message?: string;
  error?: string;
}

export default function ExcelUploader() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('נא להעלות קובץ Excel או CSV בלבד');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult({
        success: true,
        ...data
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת הקובץ');
      setResult({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setUploading(false);
    }
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const resetUpload = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Upload className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">העלאת קובץ Excel</h2>
          <p className="text-sm text-slate-500">העלה קובץ לעיבוד והתאמת סכמה אוטומטית</p>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          disabled={uploading}
          className="hidden"
          id="excel-upload"
        />

        {uploading ? (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <span className="text-slate-600 font-medium">מעבד את הקובץ...</span>
            <span className="text-sm text-slate-400 mt-2">המתן בבקשה</span>
          </div>
        ) : result ? (
          <div className="flex flex-col items-center py-4">
            {result.success ? (
              <>
                <CheckCircle2 className="text-green-500 mb-4" size={48} />
                <span className="text-green-700 font-medium text-lg">הקובץ עובד בהצלחה!</span>
                <div className="mt-4 p-4 bg-green-50 rounded-lg text-right w-full max-w-md">
                  <div className="space-y-2 text-sm">
                    {result.name && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">שם הסכמה:</span>
                        <span className="font-medium text-slate-900">{result.name}</span>
                      </div>
                    )}
                    {result.columns_detected !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">עמודות שזוהו:</span>
                        <span className="font-medium text-slate-900">{result.columns_detected}</span>
                      </div>
                    )}
                    {result.rows_count !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">שורות:</span>
                        <span className="font-medium text-slate-900">{result.rows_count}</span>
                      </div>
                    )}
                    {result.schema_matched && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">סכמה תואמת:</span>
                        <span className="font-medium text-blue-600">{result.schema_matched}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={resetUpload}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <RefreshCw size={18} />
                  העלאת קובץ נוסף
                </button>
              </>
            ) : (
              <>
                <XCircle className="text-red-500 mb-4" size={48} />
                <span className="text-red-700 font-medium">שגיאה בעיבוד הקובץ</span>
                {result.error && (
                  <p className="text-sm text-red-600 mt-2">{result.error}</p>
                )}
                <button
                  onClick={resetUpload}
                  className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <RefreshCw size={18} />
                  נסה שוב
                </button>
              </>
            )}
          </div>
        ) : (
          <label htmlFor="excel-upload" className="cursor-pointer block py-4">
            <FileSpreadsheet className="mx-auto text-slate-400 mb-4" size={48} />
            <span className="text-slate-600 font-medium block mb-2">
              גרור קובץ Excel לכאן או לחץ לבחירה
            </span>
            <span className="text-sm text-slate-400 block">
              תומך בקבצי xlsx, xls, csv
            </span>
            <div className="mt-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <FileText size={18} />
                בחר קובץ
              </span>
            </div>
          </label>
        )}
      </div>

      {error && !result && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-700 font-medium">שגיאה</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">איך זה עובד?</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>המערכת מנתחת את מבנה הקובץ</li>
            <li>מזהה סכמה קיימת או יוצרת חדשה</li>
            <li>מבצעת נירמול והתאמת נתונים</li>
            <li>מייבאת את הנתונים לטבלה המתאימה</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
