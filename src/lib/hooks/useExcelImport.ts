'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useProjectsStore } from '../stores/projectsStore';
import { useAuditStore } from '../stores/auditStore';
import type { ImportConfig, ImportPreview } from '@/types';

interface UseExcelImportReturn {
  isLoading: boolean;
  error: string | null;
  preview: ImportPreview | null;
  parseFile: (file: File) => Promise<void>;
  importData: (config: ImportConfig) => Promise<boolean>;
  clearPreview: () => void;
}

export function useExcelImport(): UseExcelImportReturn {
  const { projectClient, selectedProject } = useProjectsStore();
  const { logAction } = useAuditStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rawData, setRawData] = useState<string[][]>([]);

  const parseFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to array of arrays
      const data: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });

      if (data.length === 0) {
        setError('The Excel file is empty');
        setIsLoading(false);
        return;
      }

      // First row is headers
      const headers = data[0].map((h) => String(h || '').trim());
      const rows = data.slice(1).filter((row) =>
        row.some((cell) => cell !== '')
      );

      setRawData(data);
      setPreview({
        headers,
        rows: rows.slice(0, 10), // Preview first 10 rows
        totalRows: rows.length,
      });
    } catch (err) {
      console.error('Error parsing Excel file:', err);
      setError('Failed to parse Excel file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importData = useCallback(async (config: ImportConfig): Promise<boolean> => {
    if (!projectClient || !preview || !selectedProject) {
      setError('No project selected or no data to import');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers = preview.headers;
      const dataRows = rawData.slice(config.skipFirstRow ? 1 : 0);

      // Map Excel columns to database columns
      const mappedData = dataRows
        .filter((row) => row.some((cell) => cell !== ''))
        .map((row) => {
          const mappedRow: Record<string, unknown> = {};

          Object.entries(config.columnMappings).forEach(([excelCol, dbCol]) => {
            const colIndex = headers.indexOf(excelCol);
            if (colIndex !== -1 && dbCol) {
              let value: unknown = row[colIndex];

              // Try to parse numbers
              if (typeof value === 'string' && !isNaN(Number(value)) && value !== '') {
                value = Number(value);
              }

              // Handle empty strings
              if (value === '') {
                value = null;
              }

              mappedRow[dbCol] = value;
            }
          });

          return mappedRow;
        });

      if (mappedData.length === 0) {
        setError('No data to import');
        setIsLoading(false);
        return false;
      }

      let successCount = 0;
      let errorCount = 0;

      // Import in batches of 100
      const batchSize = 100;
      for (let i = 0; i < mappedData.length; i += batchSize) {
        const batch = mappedData.slice(i, i + batchSize);

        if (config.updateExisting && config.uniqueColumn) {
          // Upsert mode
          const { error: upsertError } = await projectClient
            .from(config.tableName)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(batch as any, {
              onConflict: config.uniqueColumn,
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error('Upsert error:', upsertError);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        } else {
          // Insert mode
          const { error: insertError } = await projectClient
            .from(config.tableName)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(batch as any);

          if (insertError) {
            console.error('Insert error:', insertError);
            errorCount += batch.length;
          } else {
            successCount += batch.length;
          }
        }
      }

      // Log the import action
      await logAction('import_excel', {
        table: config.tableName,
        totalRows: mappedData.length,
        successCount,
        errorCount,
      }, selectedProject.id);

      if (errorCount > 0) {
        setError(`Imported ${successCount} rows, ${errorCount} rows failed`);
      }

      setIsLoading(false);
      return errorCount === 0;
    } catch (err) {
      console.error('Error importing data:', err);
      setError('Failed to import data');
      setIsLoading(false);
      return false;
    }
  }, [projectClient, preview, rawData, selectedProject, logAction]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setRawData([]);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    preview,
    parseFile,
    importData,
    clearPreview,
  };
}
