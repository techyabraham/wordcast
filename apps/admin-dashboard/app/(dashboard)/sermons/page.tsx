'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { FilterBar } from '@/components/filter-bar';
import { SearchInput } from '@/components/search-input';
import { DataTable, SelectionColumn } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { useSermons } from '@/lib/hooks/use-sermons';
import { usePreachers } from '@/lib/hooks/use-preachers';
import { usePrograms } from '@/lib/hooks/use-programs';
import { useTopics } from '@/lib/hooks/use-topics';

const statusOptions = ['DRAFT', 'PROCESSING', 'REVIEW_PENDING', 'PUBLISHED', 'ARCHIVED', 'FAILED'];
const sourceOptions = ['MANUAL_UPLOAD', 'YOUTUBE_IMPORT', 'GOOGLE_DRIVE_IMPORT', 'EXTERNAL_LINK'];

export default function SermonsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    preacherId: 'all',
    programId: 'all',
    topic: 'all',
    sourceType: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const sermonsQuery = useSermons({
    page,
    pageSize: 20,
    status: filters.status === 'all' ? undefined : filters.status,
    preacherId: filters.preacherId === 'all' ? undefined : filters.preacherId,
    programId: filters.programId === 'all' ? undefined : filters.programId,
    topic: filters.topic === 'all' ? undefined : filters.topic,
    sourceType: filters.sourceType === 'all' ? undefined : filters.sourceType,
    search: filters.search || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const preachersQuery = usePreachers({ page: 1, pageSize: 200 });
  const programsQuery = usePrograms({ page: 1, pageSize: 200 });
  const topicsQuery = useTopics({ page: 1, pageSize: 200 });

  const publishMutation = useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map((id) => apiClient.post(`/admin/sermons/${id}/publish`))),
    onSuccess: async () => {
      setRowSelection({});
      await queryClient.invalidateQueries({ queryKey: ['sermons'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map((id) => apiClient.post(`/admin/sermons/${id}/archive`))),
    onSuccess: async () => {
      setRowSelection({});
      await queryClient.invalidateQueries({ queryKey: ['sermons'] });
    },
  });

  const columns = useMemo(
    () => [
      SelectionColumn(),
      {
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }: { row: { original: { id: string; title: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/sermons/${row.original.id}`}>
            {row.original.title}
          </Link>
        ),
      },
      {
        header: 'Preacher',
        accessorKey: 'preacher',
        cell: ({ row }: { row: { original: { preacher: { displayName: string } | null } } }) =>
          row.original.preacher?.displayName ?? 'N/A',
      },
      {
        header: 'Program',
        accessorKey: 'program',
        cell: ({ row }: { row: { original: { program: { name: string } | null } } }) => row.original.program?.name ?? 'N/A',
      },
      {
        header: 'Session',
        accessorKey: 'session',
        cell: ({ row }: { row: { original: { session: { name: string } | null } } }) => row.original.session?.name ?? 'N/A',
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: { row: { original: { status: string } } }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Source',
        accessorKey: 'sourceType',
      },
      {
        header: 'Date Preached',
        accessorKey: 'datePreached',
        cell: ({ row }: { row: { original: { datePreached: string | null } } }) =>
          row.original.datePreached ? new Date(row.original.datePreached).toLocaleDateString() : 'N/A',
      },
      {
        header: 'Updated',
        accessorKey: 'updatedAt',
        cell: ({ row }: { row: { original: { updatedAt: string } } }) =>
          new Date(row.original.updatedAt).toLocaleDateString(),
      },
    ],
    [],
  );

  const selectedIds = Object.entries(rowSelection)
    .filter(([, selected]) => selected)
    .map(([id]) => id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sermons"
        subtitle="Manage sermon metadata, assignments, and publishing controls."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/uploads">Upload Audio</Link>
            </Button>
            <Button asChild>
              <Link href="/uploads">Create Sermon</Link>
            </Button>
          </div>
        }
      />

      <FilterBar>
        <div className="w-64">
          <SearchInput
            value={filters.search}
            onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            placeholder="Search sermons"
          />
        </div>
        <div className="w-44">
          <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}>
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
        <div className="w-48">
          <Select value={filters.sourceType} onValueChange={(value) => setFilters((prev) => ({ ...prev, sourceType: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sourceOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={filters.preacherId} onValueChange={(value) => setFilters((prev) => ({ ...prev, preacherId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Preacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All preachers</SelectItem>
              {preachersQuery.data?.items.map((preacher) => (
                <SelectItem key={preacher.id} value={preacher.id}>
                  {preacher.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={filters.programId} onValueChange={(value) => setFilters((prev) => ({ ...prev, programId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programsQuery.data?.items.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={filters.topic} onValueChange={(value) => setFilters((prev) => ({ ...prev, topic: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topicsQuery.data?.items.map((topic) => (
                <SelectItem key={topic.id} value={topic.slug}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            placeholder="From"
          />
        </div>
        <div className="w-36">
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            placeholder="To"
          />
        </div>
      </FilterBar>

      {selectedIds.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-500 bg-surface-700/60 p-4">
          <p className="text-sm text-ink-200">{selectedIds.length} selected</p>
          <Button
            variant="secondary"
            onClick={() => publishMutation.mutate(selectedIds)}
            disabled={publishMutation.isPending}
          >
            Publish
          </Button>
          <Button
            variant="danger"
            onClick={() => archiveMutation.mutate(selectedIds)}
            disabled={archiveMutation.isPending}
          >
            Archive
          </Button>
        </div>
      ) : null}

      <DataTable
        data={sermonsQuery.data?.items ?? []}
        columns={columns}
        loading={sermonsQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={(selection) => setRowSelection(selection as Record<string, boolean>)}
      />

      <PaginationControls
        page={sermonsQuery.data?.meta?.page ?? page}
        totalPages={sermonsQuery.data?.meta?.total ? Math.ceil((sermonsQuery.data.meta.total ?? 0) / 20) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}
