'use client';

import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { FilterBar } from '@/components/filter-bar';
import { DataTable } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { StatusBadge } from '@/components/status-badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUploadJobs } from '@/lib/hooks/use-upload-jobs';

const statusOptions = ['PENDING', 'ACCEPTED', 'DOWNLOADING', 'PROCESSING_AUDIO', 'UPLOADING', 'TRANSCRIBING', 'COMPLETED', 'FAILED'];
const sourceOptions = ['MANUAL', 'YOUTUBE', 'GOOGLE_DRIVE', 'IMPORT_SOCIAL_SERMON'];

export default function UploadJobsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'all', source: 'all', dateFrom: '', dateTo: '' });
  const uploadJobs = useUploadJobs({
    page,
    pageSize: 20,
    status: filters.status === 'all' ? undefined : filters.status,
    source: filters.source === 'all' ? undefined : filters.source,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const columns = useMemo(
    () => [
      {
        header: 'Job',
        accessorKey: 'id',
        cell: ({ row }: { row: { original: { id: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/upload-jobs/${row.original.id}`}>
            {row.original.id.slice(0, 8)}
          </Link>
        ),
      },
      {
        header: 'Source',
        accessorKey: 'source',
      },
      {
        header: 'Source URL',
        accessorKey: 'sourceUrl',
        cell: ({ row }: { row: { original: { sourceUrl: string | null } } }) => row.original.sourceUrl ?? 'N/A',
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: { row: { original: { status: string } } }) => <StatusBadge status={row.original.status} />,
      },
      { header: 'Total', accessorKey: 'totalItems' },
      { header: 'Processed', accessorKey: 'processedItems' },
      { header: 'Failed', accessorKey: 'failedItemsCount' },
      {
        header: 'Sermon',
        accessorKey: 'sermon',
        cell: ({ row }: { row: { original: { sermon: { id: string; title: string } | null } } }) =>
          row.original.sermon ? (
            <Link className="text-brand-300 hover:underline" href={`/sermons/${row.original.sermon.id}`}>
              {row.original.sermon.title}
            </Link>
          ) : (
            'N/A'
          ),
      },
      {
        header: 'Requested By',
        accessorKey: 'requestedBy',
        cell: ({ row }: { row: { original: { requestedBy: { displayName: string; email: string } } } }) =>
          row.original.requestedBy.displayName ?? row.original.requestedBy.email,
      },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }: { row: { original: { createdAt: string } } }) => new Date(row.original.createdAt).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Jobs"
        subtitle="Track ingestion and processing jobs across the platform."
      />

      <FilterBar>
        <div className="w-52">
          <Select value={filters.status} onValueChange={(value: string) => setFilters((prev) => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={filters.source} onValueChange={(value: string) => setFilters((prev) => ({ ...prev, source: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sourceOptions.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
            }
          />
        </div>
        <div className="w-40">
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
            }
          />
        </div>
      </FilterBar>

      <DataTable
        data={uploadJobs.data?.items ?? []}
        columns={columns}
        loading={uploadJobs.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />

      <PaginationControls
        page={uploadJobs.data?.meta?.page ?? page}
        totalPages={uploadJobs.data?.meta?.total ? Math.ceil((uploadJobs.data.meta.total ?? 0) / 20) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}
