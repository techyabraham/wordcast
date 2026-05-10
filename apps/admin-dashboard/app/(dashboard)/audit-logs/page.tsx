'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { FilterBar } from '@/components/filter-bar';
import { DataTable } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { Input } from '@/components/ui/input';
import { useAuditLogs } from '@/lib/hooks/use-audit-logs';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', entityType: '', actorId: '' });
  const logsQuery = useAuditLogs({
    page,
    pageSize: 20,
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    actorId: filters.actorId || undefined,
  });

  const columns = useMemo(
    () => [
      {
        header: 'Time',
        accessorKey: 'createdAt',
        cell: ({ row }: { row: { original: { createdAt: string } } }) => new Date(row.original.createdAt).toLocaleString(),
      },
      {
        header: 'Actor',
        accessorKey: 'actor',
        cell: ({ row }: { row: { original: { actor: { displayName: string; email: string } | null } } }) =>
          row.original.actor?.displayName ?? row.original.actor?.email ?? 'System',
      },
      { header: 'Action', accessorKey: 'action' },
      {
        header: 'Entity',
        accessorKey: 'entityType',
        cell: ({ row }: { row: { original: { entityType: string; entityId: string | null; id: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/audit-logs/${row.original.id}`}>
            {row.original.entityType}{row.original.entityId ? `:${row.original.entityId.slice(0, 8)}` : ''}
          </Link>
        ),
      },
      { header: 'Severity', accessorKey: 'severity' },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Track admin actions across the platform."
      />

      <FilterBar>
        <div className="w-56">
          <Input
            placeholder="Action"
            value={filters.action}
            onChange={(event) => setFilters((prev) => ({ ...prev, action: event.target.value }))}
          />
        </div>
        <div className="w-56">
          <Input
            placeholder="Entity type"
            value={filters.entityType}
            onChange={(event) => setFilters((prev) => ({ ...prev, entityType: event.target.value }))}
          />
        </div>
        <div className="w-56">
          <Input
            placeholder="Actor ID"
            value={filters.actorId}
            onChange={(event) => setFilters((prev) => ({ ...prev, actorId: event.target.value }))}
          />
        </div>
      </FilterBar>

      <DataTable
        data={logsQuery.data?.items ?? []}
        columns={columns}
        loading={logsQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />

      <PaginationControls
        page={logsQuery.data?.meta?.page ?? page}
        totalPages={logsQuery.data?.meta?.total ? Math.ceil((logsQuery.data.meta.total ?? 0) / 20) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}
