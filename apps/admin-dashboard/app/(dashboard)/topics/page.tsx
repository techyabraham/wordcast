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
import { useTopics } from '@/lib/hooks/use-topics';

const topicSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  aliases: z.string().optional(),
  isActive: z.boolean().optional(),
});

type TopicValues = z.infer<typeof topicSchema>;

export default function TopicsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const topicsQuery = useTopics({ page, pageSize: 50, includeInactive: true });
  const form = useForm<TopicValues>({ resolver: zodResolver(topicSchema) });

  const createMutation = useMutation({
    mutationFn: async (values: TopicValues) =>
      apiClient.post('/admin/topics', {
        ...values,
        aliases: values.aliases
          ? values.aliases.split(',').map((alias) => alias.trim()).filter(Boolean)
          : undefined,
      }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }: { row: { original: { id: string; name: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/topics/${row.original.id}`}>
            {row.original.name}
          </Link>
        ),
      },
      { header: 'Slug', accessorKey: 'slug' },
      {
        header: 'Type',
        accessorKey: 'isSystem',
        cell: ({ row }: { row: { original: { isSystem?: boolean } } }) => (row.original.isSystem ? 'Fixed' : 'Custom'),
      },
      {
        header: 'Aliases',
        accessorKey: 'aliases',
        cell: ({ row }: { row: { original: { aliases?: string[] } } }) =>
          row.original.aliases?.length ?? 0,
      },
      {
        header: 'Active',
        accessorKey: 'isActive',
        cell: ({ row }: { row: { original: { isActive: boolean } } }) => (row.original.isActive ? 'Yes' : 'No'),
      },
      { header: 'Sermons', accessorKey: 'sermonCount' },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Topics"
        subtitle="Create, merge, and curate sermon topics."
        actions={
          <Button asChild variant="secondary">
            <Link href="/topics/suggestions">Topic Suggestions</Link>
          </Button>
        }
      />

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Create Topic</h3>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="mt-4 grid grid-cols-3 gap-3">
          <Input placeholder="Topic name" {...form.register('name')} />
          <Input placeholder="Aliases (comma separated)" {...form.register('aliases')} />
          <Textarea placeholder="Description" rows={3} {...form.register('description')} className="col-span-3" />
          <div className="col-span-3 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              Create Topic
            </Button>
          </div>
        </form>
      </Card>

      <DataTable
        data={topicsQuery.data?.items ?? []}
        columns={columns}
        loading={topicsQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />

      <PaginationControls
        page={topicsQuery.data?.meta?.page ?? page}
        totalPages={topicsQuery.data?.meta?.total ? Math.ceil((topicsQuery.data.meta.total ?? 0) / 50) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}

