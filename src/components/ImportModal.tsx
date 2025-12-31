'use client';

import { useState, useRef, useMemo } from 'react';
import { Upload, X, FileSpreadsheet, Check, Plus, Copy, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useExcelImport } from '@/lib/hooks/useExcelImport';
import { useProjectsStore } from '@/lib/stores/projectsStore';
import type { ImportConfig } from '@/types';
import { toast } from 'sonner';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

// Helper to sanitize column names for SQL
function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u0590-\u05FF]/g, '')
    .replace(/^_+|_+$/g, '') || 'column';
}

// Infer column type from sample values
function inferColumnType(values: (string | undefined)[]): 'text' | 'integer' | 'numeric' | 'boolean' | 'timestamp' {
  const nonEmpty = values.filter(v => v && v.trim() !== '');
  if (nonEmpty.length === 0) return 'text';

  // Check for boolean
  const boolPatterns = ['true', 'false', 'yes', 'no', 'כן', 'לא', '1', '0'];
  const allBool = nonEmpty.every(v => boolPatterns.includes(v!.toLowerCase()));
  if (allBool) return 'boolean';

  // Check for date/timestamp
  const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}[\/.-]\d{2}[\/.-]\d{2,4}/;
  const allDates = nonEmpty.every(v => datePattern.test(v!) || !isNaN(Date.parse(v!)));
  if (allDates && nonEmpty.length > 0) return 'timestamp';

  // Check for numbers
  const allNumbers = nonEmpty.every(v => {
    const cleaned = v!.replace(/[,₪$€%]/g, '').trim();
    return !isNaN(Number(cleaned)) && cleaned !== '';
  });
  if (allNumbers) {
    // Check if all integers
    const allIntegers = nonEmpty.every(v => {
      const cleaned = v!.replace(/[,₪$€%]/g, '').trim();
      return Number.isInteger(Number(cleaned));
    });
    return allIntegers ? 'integer' : 'numeric';
  }

  return 'text';
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const { tables, selectedProject } = useProjectsStore();
  const { isLoading, error, preview, parseFile, importData, clearPreview } = useExcelImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTable, setSelectedTable] = useState<string>('');
  const [newTableName, setNewTableName] = useState<string>('');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [skipFirstRow, setSkipFirstRow] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [uniqueColumn, setUniqueColumn] = useState<string>('');
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [generatedSql, setGeneratedSql] = useState<string>('');
  const [isCreatingTable, setIsCreatingTable] = useState(false);

  const isNewTable = selectedTable === '__new__';

  // Generate SQL for creating a new table from Excel columns
  const generatedTableSql = useMemo(() => {
    if (!preview || !newTableName) return '';

    const sanitizedName = sanitizeColumnName(newTableName);
    const columns = preview.headers.map((header, index) => {
      const sampleValues = preview.rows.slice(0, 10).map(row => row[index]);
      const colType = inferColumnType(sampleValues);
      const colName = sanitizeColumnName(header);

      let pgType = 'TEXT';
      switch (colType) {
        case 'integer': pgType = 'INTEGER'; break;
        case 'numeric': pgType = 'NUMERIC'; break;
        case 'boolean': pgType = 'BOOLEAN'; break;
        case 'timestamp': pgType = 'TIMESTAMPTZ'; break;
      }

      return `  "${colName}" ${pgType}`;
    });

    return `CREATE TABLE IF NOT EXISTS "${sanitizedName}" (
  id BIGSERIAL PRIMARY KEY,
${columns.join(',\n')},
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "${sanitizedName}" ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role access" ON "${sanitizedName}"
  FOR ALL USING (true) WITH CHECK (true);`;
  }, [preview, newTableName]);

  // Auto-generate column mappings for new table
  const newTableColumns = useMemo(() => {
    if (!preview) return [];
    return preview.headers.map(header => sanitizeColumnName(header));
  }, [preview]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await parseFile(file);
    }
  };

  const handleTableSelect = (value: string) => {
    setSelectedTable(value);
    if (value === '__new__') {
      // Auto-map columns for new table
      const autoMappings: Record<string, string> = {};
      preview?.headers.forEach(header => {
        autoMappings[header] = sanitizeColumnName(header);
      });
      setColumnMappings(autoMappings);
    } else {
      setColumnMappings({});
    }
  };

  const handleColumnMapping = (excelColumn: string, dbColumn: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [excelColumn]: dbColumn,
    }));
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generatedTableSql);
    toast.success('SQL הועתק ללוח');
  };

  const handleCreateTable = async () => {
    if (!selectedProject || !newTableName) return;

    setIsCreatingTable(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/tables/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: newTableName,
          columns: preview?.headers.map((header, index) => {
            const sampleValues = preview.rows.slice(0, 10).map(row => row[index]);
            return {
              name: sanitizeColumnName(header),
              type: inferColumnType(sampleValues),
            };
          }),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`טבלה "${result.tableName}" נוצרה בהצלחה`);
        // Now proceed with import
        await handleImportToNewTable(result.tableName);
      } else if (result.sql) {
        // Need to create table manually
        setGeneratedSql(result.sql);
        setShowSqlDialog(true);
      } else {
        toast.error(result.error || 'שגיאה ביצירת הטבלה');
      }
    } catch (err) {
      console.error('Create table error:', err);
      toast.error('שגיאה ביצירת הטבלה');
    } finally {
      setIsCreatingTable(false);
    }
  };

  const handleImportToNewTable = async (tableName: string) => {
    const config: ImportConfig = {
      tableName,
      columnMappings,
      skipFirstRow,
      updateExisting: false,
    };

    const success = await importData(config);

    if (success) {
      toast.success('הנתונים יובאו בהצלחה');
      handleClose();
    } else if (error) {
      toast.error(error);
    }
  };

  const handleImport = async () => {
    if (isNewTable) {
      if (!newTableName.trim()) {
        toast.error('יש להזין שם לטבלה החדשה');
        return;
      }
      await handleCreateTable();
    } else {
      if (!selectedTable) {
        toast.error('יש לבחור טבלה');
        return;
      }

      const config: ImportConfig = {
        tableName: selectedTable,
        columnMappings,
        skipFirstRow,
        updateExisting,
        uniqueColumn: updateExisting ? uniqueColumn : undefined,
      };

      const success = await importData(config);

      if (success) {
        toast.success('הנתונים יובאו בהצלחה');
        handleClose();
      } else if (error) {
        toast.error(error);
      }
    }
  };

  const handleClose = () => {
    clearPreview();
    setSelectedTable('');
    setNewTableName('');
    setColumnMappings({});
    setSkipFirstRow(true);
    setUpdateExisting(false);
    setUniqueColumn('');
    setShowSqlDialog(false);
    setGeneratedSql('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const selectedTableInfo = tables.find((t) => t.name === selectedTable);
  const dbColumns = isNewTable ? newTableColumns : (selectedTableInfo?.columns.map((c) => c.name) || []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              ייבוא מאקסל
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Upload */}
            {!preview && (
              <div
                className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-300 mb-2">גרור קובץ אקסל לכאן או לחץ לבחירה</p>
                <p className="text-sm text-slate-500">תומך ב-.xlsx, .xls, .csv</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* Preview & Settings */}
            {preview && (
              <>
                {/* Table Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>טבלת יעד</Label>
                    <Select value={selectedTable} onValueChange={handleTableSelect}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder="בחר טבלה" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem
                          value="__new__"
                          className="text-emerald-400 focus:bg-slate-700"
                        >
                          <span className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            צור טבלה חדשה
                          </span>
                        </SelectItem>
                        {tables.length > 0 && (
                          <div className="border-t border-slate-700 my-1" />
                        )}
                        {tables.map((table) => (
                          <SelectItem
                            key={table.name}
                            value={table.name}
                            className="text-white focus:bg-slate-700"
                          >
                            {table.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="invisible">פעולה</Label>
                    <Button
                      variant="outline"
                      className="w-full border-slate-700 text-slate-300"
                      onClick={() => {
                        clearPreview();
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4 ml-2" />
                      בחר קובץ אחר
                    </Button>
                  </div>
                </div>

                {/* New Table Name Input */}
                {isNewTable && (
                  <div className="space-y-2">
                    <Label>שם הטבלה החדשה</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        placeholder="הזן שם לטבלה"
                        className="bg-slate-800 border-slate-700 flex-1"
                      />
                      <Button
                        variant="outline"
                        className="border-slate-700 text-slate-300"
                        onClick={() => {
                          setGeneratedSql(generatedTableSql);
                          setShowSqlDialog(true);
                        }}
                        disabled={!newTableName}
                      >
                        <Copy className="h-4 w-4 ml-2" />
                        הצג SQL
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      שם הטבלה: {newTableName ? sanitizeColumnName(newTableName) : '---'}
                    </p>
                  </div>
                )}

                {/* Options */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="skipFirst"
                      checked={skipFirstRow}
                      onCheckedChange={(checked) => setSkipFirstRow(checked as boolean)}
                    />
                    <Label htmlFor="skipFirst" className="text-slate-300">
                      שורה ראשונה היא כותרות
                    </Label>
                  </div>
                  {!isNewTable && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="updateExisting"
                        checked={updateExisting}
                        onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                      />
                      <Label htmlFor="updateExisting" className="text-slate-300">
                        עדכן רשומות קיימות
                      </Label>
                    </div>
                  )}
                </div>

                {updateExisting && !isNewTable && (
                  <div className="space-y-2">
                    <Label>עמודה ייחודית (למיזוג)</Label>
                    <Select value={uniqueColumn} onValueChange={setUniqueColumn}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 max-w-xs">
                        <SelectValue placeholder="בחר עמודה" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {dbColumns.map((col) => (
                          <SelectItem
                            key={col}
                            value={col}
                            className="text-white focus:bg-slate-700"
                          >
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Column Mapping */}
                {(selectedTable && selectedTable !== '__new__') || (isNewTable && newTableName) ? (
                  <div className="space-y-2">
                    <Label>מיפוי עמודות</Label>
                    <div className="rounded-lg border border-slate-700 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-800/50">
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300 text-right">עמודה באקסל</TableHead>
                            <TableHead className="text-slate-300 text-right">עמודה בדטהבייס</TableHead>
                            <TableHead className="text-slate-300 text-right">דוגמה</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.headers.map((header, index) => (
                            <TableRow key={header} className="border-slate-700">
                              <TableCell className="text-slate-300 font-medium">
                                {header}
                              </TableCell>
                              <TableCell>
                                {isNewTable ? (
                                  <Input
                                    value={columnMappings[header] || sanitizeColumnName(header)}
                                    onChange={(e) => handleColumnMapping(header, e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                  />
                                ) : (
                                  <Select
                                    value={columnMappings[header] || '__ignore__'}
                                    onValueChange={(value) => handleColumnMapping(header, value === '__ignore__' ? '' : value)}
                                  >
                                    <SelectTrigger className="bg-slate-800 border-slate-700 w-full">
                                      <SelectValue placeholder="בחר עמודה" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                      <SelectItem value="__ignore__" className="text-slate-500">
                                        התעלם
                                      </SelectItem>
                                      {dbColumns.map((col) => (
                                        <SelectItem
                                          key={col}
                                          value={col}
                                          className="text-white focus:bg-slate-700"
                                        >
                                          {col}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {preview.rows[0]?.[index] || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null}

                {/* Preview Data */}
                <div className="space-y-2">
                  <Label>תצוגה מקדימה ({preview.totalRows} שורות)</Label>
                  <div className="rounded-lg border border-slate-700 overflow-x-auto max-h-48">
                    <Table>
                      <TableHeader className="bg-slate-800/50 sticky top-0">
                        <TableRow className="border-slate-700">
                          {preview.headers.map((header) => (
                            <TableHead key={header} className="text-slate-300 text-right whitespace-nowrap">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.rows.slice(0, 5).map((row, rowIndex) => (
                          <TableRow key={rowIndex} className="border-slate-700">
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="text-slate-400 text-sm whitespace-nowrap">
                                {cell || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-300"
                    onClick={handleClose}
                  >
                    ביטול
                  </Button>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={handleImport}
                    disabled={(!selectedTable && !isNewTable) || (isNewTable && !newTableName) || isLoading || isCreatingTable}
                  >
                    {isLoading || isCreatingTable ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                        {isCreatingTable ? 'יוצר טבלה...' : 'מייבא...'}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 ml-2" />
                        {isNewTable ? `צור טבלה וייבא ${preview.totalRows} שורות` : `ייבא ${preview.totalRows} שורות`}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SQL Dialog */}
      <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white" dir="ltr">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              SQL ליצירת הטבלה
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm" dir="rtl">
              העתק את הקוד הבא והרץ אותו ב-Supabase SQL Editor כדי ליצור את הטבלה:
            </p>
            <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-sm text-emerald-400 font-mono">
              {generatedSql || generatedTableSql}
            </pre>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300"
                onClick={() => setShowSqlDialog(false)}
              >
                סגור
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={handleCopySql}
              >
                <Copy className="h-4 w-4 ml-2" />
                העתק SQL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
