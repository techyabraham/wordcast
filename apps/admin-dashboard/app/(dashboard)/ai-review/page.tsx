'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { FilterBar } from '@/components/filter-bar';
import { DataTable } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { StatusBadge } from '@/components/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAiReviewQueue } from '@/lib/hooks/use-ai-review';

const statusOptions = ['PENDING', 'APPROVED', 'REJECTED', 'REVIEWED', 'GENERATED'];

export default function AiReviewPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const reviews = useAiReviewQueue({ page, pageSize: 20, status: status === 'all' ? undefined : status });

  const columns = useMemo(
    () => [
      {
        header: 'Sermon',
        accessorKey: 'sermon',
        cell: ({ row }: { row: { original: { sermon: { id: string; title: string } } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/ai-review/${row.original.sermon.id}`}>
            {row.original.sermon.title}
          </Link>
        ),
      },
      {
        header: 'Preacher',
        accessorKey: 'preacher',
        cell: ({ row }: { row: { original: { sermon: { preacher: { displayName: string } } } } }) =>
          row.original.sermon.preacher?.displayName ?? 'N/A',
      },
      {
        header: 'Confidence',
        accessorKey: 'confidenceScore',
        cell: ({ row }: { row: { original: { confidenceScore: number | null } } }) =>
          row.original.confidenceScore ? row.original.confidenceScore.toFixed(2) : 'N/A',
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: { row: { original: { status: string } } }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Description',
        accessorKey: 'generatedDescription',
        cell: ({ row }: { row: { original: { generatedDescription: string | null } } }) =>
          row.original.generatedDescription?.slice(0, 60) ?? 'N/A',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Review Queue"
        subtitle="Approve, edit, or reject AI-generated metadata before publishing."
      />

      <FilterBar>
        <div className="w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {entry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <DataTable
        data={reviews.data?.items ?? []}
        columns={columns}
        loading={reviews.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />

      <PaginationControls
        page={reviews.data?.meta?.page ?? page}
        totalPages={reviews.data?.meta?.total ? Math.ceil((reviews.data.meta.total ?? 0) / 20) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}
