'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { RoleBadge } from '@/components/role-badge';
import { useUsers } from '@/lib/hooks/use-users';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const usersQuery = useUsers({ page, pageSize: 20 });

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'displayName',
        cell: ({ row }: { row: { original: { id: string; displayName: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/users/${row.original.id}`}>
            {row.original.displayName}
          </Link>
        ),
      },
      { header: 'Email', accessorKey: 'email' },
      {
        header: 'Roles',
        accessorKey: 'roles',
        cell: ({ row }: { row: { original: { roles: string[] } } }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>
        ),
      },
      {
        header: 'Plan',
        accessorKey: 'subscriptionPlan',
        cell: ({ row }: { row: { original: { subscriptionPlan?: { name: string } | null } } }) =>
          row.original.subscriptionPlan?.name ?? 'None',
      },
      { header: 'Status', accessorKey: 'status' },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }: { row: { original: { createdAt: string } } }) => new Date(row.original.createdAt).toLocaleDateString(),
      },
      {
        header: 'Last Login',
        accessorKey: 'lastLoginAt',
        cell: ({ row }: { row: { original: { lastLoginAt?: string | null } } }) =>
          row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleString() : 'N/A',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage staff, admin, and listener accounts."
        actions={
          <Link className="text-sm text-brand-300 hover:underline" href="/users/roles">
            Roles and Permissions
          </Link>
        }
      />

      <DataTable
        data={usersQuery.data?.items ?? []}
        columns={columns}
        loading={usersQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />

      <PaginationControls
        page={usersQuery.data?.meta?.page ?? page}
        totalPages={usersQuery.data?.meta?.total ? Math.ceil((usersQuery.data.meta.total ?? 0) / 20) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}

