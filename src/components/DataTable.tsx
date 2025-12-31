'use client';

import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  initialSearchValue?: string;
  onSearchChange?: (value: string) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'חיפוש...',
  initialSearchValue = '',
  onSearchChange,
  pagination,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialSearchValue);

  const handleSearchChange = (value: string) => {
    setGlobalFilter(value);
    onSearchChange?.(value);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    manualPagination: !!pagination,
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : undefined,
  });

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : table.getPageCount();

  const currentPage = pagination ? pagination.page : table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search */}
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-800/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-slate-700 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-slate-300 font-semibold text-right"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          header.column.getCanSort() && 'cursor-pointer select-none'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-slate-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    טוען...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-slate-800 hover:bg-slate-800/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-slate-300 text-right">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-slate-400"
                >
                  לא נמצאו תוצאות
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-400">
            שורות בעמוד:
          </p>
          <Select
            value={String(pagination?.pageSize || 10)}
            onValueChange={(value) => {
              if (pagination) {
                pagination.onPageSizeChange(Number(value));
              } else {
                table.setPageSize(Number(value));
              }
            }}
          >
            <SelectTrigger className="h-8 w-[70px] bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder={pagination?.pageSize || 10} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {[10, 25, 50, 100].map((pageSize) => (
                <SelectItem
                  key={pageSize}
                  value={String(pageSize)}
                  className="text-white focus:bg-slate-700"
                >
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-400">
            עמוד {currentPage} מתוך {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              onClick={() => {
                if (pagination) {
                  pagination.onPageChange(1);
                } else {
                  table.setPageIndex(0);
                }
              }}
              disabled={currentPage === 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              onClick={() => {
                if (pagination) {
                  pagination.onPageChange(currentPage - 1);
                } else {
                  table.previousPage();
                }
              }}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              onClick={() => {
                if (pagination) {
                  pagination.onPageChange(currentPage + 1);
                } else {
                  table.nextPage();
                }
              }}
              disabled={currentPage === totalPages}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              onClick={() => {
                if (pagination) {
                  pagination.onPageChange(totalPages);
                } else {
                  table.setPageIndex(totalPages - 1);
                }
              }}
              disabled={currentPage === totalPages}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
