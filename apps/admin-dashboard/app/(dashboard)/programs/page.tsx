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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { PaginationControls } from '@/components/pagination-controls';
import { apiClient } from '@/lib/api/client';
import { usePrograms } from '@/lib/hooks/use-programs';

const programSchema = z.object({
  name: z.string().min(2),
  year: z.string().optional(),
  theme: z.string().optional(),
  organizer: z.string().optional(),
  programType: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
});

type ProgramValues = z.infer<typeof programSchema>;

export default function ProgramsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const programsQuery = usePrograms({ page, pageSize: 20 });

  const form = useForm<ProgramValues>({ resolver: zodResolver(programSchema) });

  const createMutation = useMutation({
    mutationFn: async (values: ProgramValues) =>
      apiClient.post('/admin/programs', {
        ...values,
        year: values.year ? Number(values.year) : undefined,
      }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }: { row: { original: { id: string; name: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/programs/${row.original.id}`}>
            {row.original.name}
          </Link>
        ),
      },
      {
        header: 'Year',
        accessorKey: 'year',
      },
      {
        header: 'Theme',
        accessorKey: 'theme',
      },
      {
        header: 'Organizer',
        accessorKey: 'organizer',
      },
      {
        header: 'Type',
        accessorKey: 'programType',
      },
      {
        header: 'Location',
        accessorKey: 'location',
      },
      {
        header: 'Date Range',
        accessorKey: 'startDate',
        cell: ({ row }: { row: { original: { startDate: string | null; endDate: string | null } } }) =>
          row.original.startDate ?
            `${new Date(row.original.startDate).toLocaleDateString()} - ${row.original.endDate ? new Date(row.original.endDate).toLocaleDateString() : ''}`
            : 'N/A',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs"
        subtitle="Manage conferences, crusades, and recurring services."
      />

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Create Program</h3>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="mt-4 grid grid-cols-3 gap-3">
          <Input placeholder="Program name" {...form.register('name')} />
          <Input placeholder="Year" type="number" {...form.register('year')} />
          <Select onValueChange={(value) => form.setValue('programType', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Program type" />
            </SelectTrigger>
            <SelectContent>
              {['CONFERENCE', 'RETREAT', 'CRUSADE', 'RECURRING_SERVICE', 'SPECIAL_EVENT'].map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Theme" {...form.register('theme')} />
          <Input placeholder="Organizer" {...form.register('organizer')} />
          <Input placeholder="Location" {...form.register('location')} />
          <Input type="date" {...form.register('startDate')} />
          <Input type="date" {...form.register('endDate')} />
          <Input placeholder="Cover image URL" {...form.register('coverImage')} className="col-span-3" />
          <Textarea rows={3} placeholder="Description" {...form.register('description')} className="col-span-3" />
          <div className="col-span-3 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              Create Program
            </Button>
          </div>
        </form>
      </Card>

      <DataTable
        data={programsQuery.data?.items ?? []}
        columns={columns}
        loading={programsQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />

      <PaginationControls
        page={programsQuery.data?.meta?.page ?? page}
        totalPages={programsQuery.data?.meta?.total ? Math.ceil((programsQuery.data.meta.total ?? 0) / 20) : 1}
        onPageChange={setPage}
      />
    </div>
  );
}
