'use client';

import { useState } from 'react';
import type { SourceColumn, ColumnDataType } from '@/types/column-mapping';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  Hash,
  Type,
  Calendar,
  Phone,
  Mail,
  Banknote,
  Percent,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Columns,
} from 'lucide-react';

interface DataPreviewProps {
  fileName: string;
  sheetName?: string;
  columns: SourceColumn[];
  previewData: Record<string, unknown>[];
  totalRows: number;
  onColumnSelect?: (column: SourceColumn) => void;
  selectedColumns?: string[];
  ignoredColumns?: string[];
  onToggleIgnore?: (columnName: string) => void;
}

const typeIcons: Record<ColumnDataType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  currency: <Banknote className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  id_number: <Hash className="h-4 w-4" />,
  percentage: <Percent className="h-4 w-4" />,
  boolean: <Check className="h-4 w-4" />,
  json: <Type className="h-4 w-4" />,
  unknown: <AlertCircle className="h-4 w-4" />,
};

const typeLabels: Record<ColumnDataType, string> = {
  text: 'טקסט',
  number: 'מספר',
  currency: 'מטבע',
  date: 'תאריך',
  phone: 'טלפון',
  email: 'אימייל',
  id_number: 'ת.ז.',
  percentage: 'אחוז',
  boolean: 'כן/לא',
  json: 'JSON',
  unknown: 'לא ידוע',
};

const typeColors: Record<ColumnDataType, string> = {
  text: 'bg-gray-100 text-gray-700',
  number: 'bg-blue-100 text-blue-700',
  currency: 'bg-green-100 text-green-700',
  date: 'bg-purple-100 text-purple-700',
  phone: 'bg-cyan-100 text-cyan-700',
  email: 'bg-pink-100 text-pink-700',
  id_number: 'bg-orange-100 text-orange-700',
  percentage: 'bg-yellow-100 text-yellow-700',
  boolean: 'bg-emerald-100 text-emerald-700',
  json: 'bg-indigo-100 text-indigo-700',
  unknown: 'bg-red-100 text-red-700',
};

export function DataPreview({
  fileName,
  sheetName,
  columns,
  previewData,
  totalRows,
  onColumnSelect,
  selectedColumns = [],
  ignoredColumns = [],
  onToggleIgnore,
}: DataPreviewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'columns'>('columns');
  const rowsPerPage = 5;

  const filteredColumns = columns.filter(col =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedData = previewData.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  const totalPages = Math.ceil(previewData.length / rowsPerPage);

  return (
    <Card className="w-full" dir="rtl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle className="text-lg">{fileName}</CardTitle>
              {sheetName && (
                <p className="text-sm text-muted-foreground">גיליון: {sheetName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{totalRows.toLocaleString()} שורות</Badge>
            <Badge variant="outline">{columns.length} עמודות</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש עמודות..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'columns' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('columns')}
              className="rounded-l-none"
            >
              <Columns className="h-4 w-4 ml-2" />
              עמודות
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <FileSpreadsheet className="h-4 w-4 ml-2" />
              טבלה
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'columns' ? (
          // Columns View - Card-based display
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredColumns.map((column) => {
              const isIgnored = ignoredColumns.includes(column.name);
              const isSelected = selectedColumns.includes(column.name);

              return (
                <TooltipProvider key={column.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isIgnored
                            ? 'opacity-50 bg-gray-50'
                            : isSelected
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => onColumnSelect?.(column)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate" title={column.name}>
                                {column.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={typeColors[column.detectedType]} variant="secondary">
                                  {typeIcons[column.detectedType]}
                                  <span className="mr-1">{typeLabels[column.detectedType]}</span>
                                </Badge>
                                {column.isHebrew && (
                                  <Badge variant="outline" className="text-xs">עב</Badge>
                                )}
                              </div>
                            </div>
                            {onToggleIgnore && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleIgnore(column.name);
                                }}
                              >
                                {isIgnored ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>

                          <div className="mt-3 space-y-1">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">{column.nonEmptyCount}</span> ערכים |{' '}
                              <span className="font-medium">{column.uniqueCount}</span> ייחודיים
                            </div>
                            {column.sampleValues.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">דוגמאות:</p>
                                <div className="flex flex-wrap gap-1">
                                  {column.sampleValues.slice(0, 3).map((val, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs max-w-[120px] truncate"
                                    >
                                      {val || '(ריק)'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium">{column.name}</p>
                      <p className="text-xs mt-1">
                        סוג: {typeLabels[column.detectedType]} | מיקום: {column.index + 1}
                      </p>
                      {column.sampleValues.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">כל הדוגמאות:</p>
                          <ul className="text-xs mt-1">
                            {column.sampleValues.map((val, idx) => (
                              <li key={idx} className="truncate">
                                {val || '(ריק)'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        ) : (
          // Table View - Spreadsheet-like display
          <div className="space-y-4">
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center sticky right-0 bg-background">
                      #
                    </TableHead>
                    {filteredColumns.map((col) => (
                      <TableHead
                        key={col.name}
                        className={`min-w-[150px] ${
                          ignoredColumns.includes(col.name) ? 'opacity-50 bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={col.name}>
                            {col.name}
                          </span>
                          <Badge
                            className={`${typeColors[col.detectedType]} text-xs`}
                            variant="secondary"
                          >
                            {typeIcons[col.detectedType]}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      <TableCell className="text-center text-muted-foreground sticky right-0 bg-background">
                        {currentPage * rowsPerPage + rowIdx + 1}
                      </TableCell>
                      {filteredColumns.map((col) => (
                        <TableCell
                          key={col.name}
                          className={`max-w-[200px] truncate ${
                            ignoredColumns.includes(col.name) ? 'opacity-50 bg-gray-50' : ''
                          }`}
                        >
                          {String(row[col.name] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                מציג שורות {currentPage * rowsPerPage + 1}-
                {Math.min((currentPage + 1) * rowsPerPage, previewData.length)} מתוך{' '}
                {previewData.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage + 1} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
