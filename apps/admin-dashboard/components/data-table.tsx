'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { cn } from '@/lib/cn';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSkeleton } from '@/components/loading-skeleton';

interface DataTableProps<TData> {
  data: TData[];
  columns: Array<ColumnDef<any, any>>;
  loading?: boolean;
  emptyMessage?: string;
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  enableRowSelection?: boolean;
  getRowId?: (row: any, index: number) => string;
  className?: string;
}

export function DataTable<TData>({
  data,
  columns,
  loading,
  emptyMessage = 'No records found.',
  manualSorting,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection,
  getRowId,
  className,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns: columns as Array<ColumnDef<TData, any>>,
    manualSorting: Boolean(manualSorting),
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    ...(enableRowSelection !== undefined ? { enableRowSelection } : {}),
    ...(onSortingChange !== undefined ? { onSortingChange } : {}),
    ...(onRowSelectionChange !== undefined ? { onRowSelectionChange } : {}),
    ...(getRowId !== undefined ? { getRowId } : {}),
    state: {
      ...(sorting !== undefined ? { sorting } : {}),
      ...(rowSelection !== undefined ? { rowSelection } : {}),
    },
  });

  return (
    <div className={cn('overflow-hidden rounded-xl border border-surface-500 bg-surface-800/80 shadow-subtle', className)}>
      <table className="min-w-full divide-y divide-surface-600 text-sm">
        <thead className="bg-surface-700/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-ink-300',
                      canSort ? 'cursor-pointer select-none' : undefined,
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort ? (
                        <span className="text-ink-500">
                          {header.column.getIsSorted() === 'asc' ? '▲' : header.column.getIsSorted() === 'desc' ? '▼' : ''}
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-surface-700">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="space-y-3 px-4 py-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <LoadingSkeleton key={index} />
                ))}
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-sm text-ink-300">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-700/60">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-ink-100">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export const SelectionColumn = <TData,>() =>
  ({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onChange={(event) => table.toggleAllPageRowsSelected(event.target.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(event) => row.toggleSelected(event.target.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  }) as ColumnDef<TData>;
