'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { apiClient } from '@/lib/api/client';
import { usePreachers } from '@/lib/hooks/use-preachers';

const preacherSchema = z.object({
  displayName: z.string().min(2),
  biography: z.string().optional(),
  ministryName: z.string().optional(),
  country: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

type PreacherValues = z.infer<typeof preacherSchema>;

export default function PreachersPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const preachersQuery = usePreachers({ page, pageSize: 20 });
  const form = useForm<PreacherValues>({ resolver: zodResolver(preacherSchema) });

  const createMutation = useMutation({
    mutationFn: async (values: PreacherValues) => apiClient.post('/admin/preachers', values),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['preachers'] });
    },
  });

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'displayName',
        cell: ({ row }: { row: { original: { id: string; displayName: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/preachers/${row.original.id}`}>
            {row.original.displayName}
          </Link>
        ),
      },
      { header: 'Ministry', accessorKey: 'ministryName' },
      { header: 'Country', accessorKey: 'country' },
      { header: 'Sermons', accessorKey: 'sermonCount' },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }: { row: { original: { createdAt: string } } }) => new Date(row.original.createdAt).toLocaleDateString(),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preachers"
        subtitle="Manage preacher profiles, ministries, and featured status."
      />

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Create Preacher</h3>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="mt-4 grid grid-cols-3 gap-3">
          <Input placeholder="Full name" {...form.register('displayName')} />
          <Input placeholder="Ministry" {...form.register('ministryName')} />
          <Input placeholder="Country" {...form.register('country')} />
          <Input placeholder="Profile image URL" {...form.register('profileImageUrl')} className="col-span-3" />
          <Textarea placeholder="Bio" rows={3} {...form.register('biography')} className="col-span-3" />
          <div className="col-span-3 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              Create Preacher
            </Button>
          </div>
        </form>
      </Card>

      <DataTable
        data={preachersQuery.data?.items ?? []}
        columns={columns}
        loading={preachersQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />

      <PaginationControls
        page={preachersQuery.data?.meta?.page ?? page}
        totalPages={preachersQuery.data?.meta?.total ? Math.ceil((preachersQuery.data.meta.total ?? 0) / 20) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}

