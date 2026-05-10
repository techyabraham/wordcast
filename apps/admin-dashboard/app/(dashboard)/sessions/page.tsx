'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { apiClient } from '@/lib/api/client';
import { usePrograms } from '@/lib/hooks/use-programs';
import { useSessions } from '@/lib/hooks/use-sessions';

const sessionSchema = z.object({
  programId: z.string().min(1),
  name: z.string().min(2),
  dayNumber: z.string().optional(),
  sessionLabel: z.string().min(1),
  sessionOrder: z.string().min(1),
  sessionDate: z.string().optional(),
});

type SessionValues = z.infer<typeof sessionSchema>;

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const sessionsQuery = useSessions();
  const programsQuery = usePrograms({ page: 1, pageSize: 200 });
  const form = useForm<SessionValues>({ resolver: zodResolver(sessionSchema) });

  const createMutation = useMutation({
    mutationFn: async (values: SessionValues) =>
      apiClient.post('/admin/sessions', {
        ...values,
        dayNumber: values.dayNumber ? Number(values.dayNumber) : undefined,
        sessionOrder: Number(values.sessionOrder),
      }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const columns = useMemo(
    () => [
      {
        header: 'Program',
        accessorKey: 'program',
        cell: ({ row }: { row: { original: { program?: { name: string } } } }) =>
          row.original.program?.name ?? 'N/A',
      },
      {
        header: 'Session',
        accessorKey: 'name',
        cell: ({ row }: { row: { original: { id: string; name: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/sessions/${row.original.id}`}>
            {row.original.name}
          </Link>
        ),
      },
      { header: 'Day', accessorKey: 'dayNumber' },
      { header: 'Label', accessorKey: 'sessionLabel' },
      { header: 'Order', accessorKey: 'sessionOrder' },
      { header: 'Sermons', accessorKey: 'sermonCount' },
      {
        header: 'Date',
        accessorKey: 'sessionDate',
        cell: ({ row }: { row: { original: { sessionDate: string | null } } }) =>
          row.original.sessionDate ? new Date(row.original.sessionDate).toLocaleDateString() : 'N/A',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        subtitle="Manage program sessions, schedules, and ordering."
      />

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Create Session</h3>
        <form onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="mt-4 grid grid-cols-3 gap-3">
          <Select onValueChange={(value) => form.setValue('programId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              {programsQuery.data?.items.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Session name" {...form.register('name')} />
          <Input placeholder="Order" type="number" {...form.register('sessionOrder')} />
          <Input placeholder="Day" type="number" {...form.register('dayNumber')} />
          <Select onValueChange={(value) => form.setValue('sessionLabel', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              {['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'CUSTOM'].map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" {...form.register('sessionDate')} />
          <div className="col-span-3 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              Create Session
            </Button>
          </div>
        </form>
      </Card>

      <DataTable
        data={sessionsQuery.data ?? []}
        columns={columns}
        loading={sessionsQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />
    </div>
  );
}
