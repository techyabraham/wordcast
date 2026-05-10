'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { usePrograms } from '@/lib/hooks/use-programs';
import { useSession } from '@/lib/hooks/use-session';

const sessionSchema = z.object({
  programId: z.string().min(1),
  name: z.string().min(2),
  dayNumber: z.string().optional(),
  sessionLabel: z.string().min(1),
  customLabel: z.string().optional(),
  sessionOrder: z.string().min(1),
  sessionDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type SessionValues = z.infer<typeof sessionSchema>;

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const queryClient = useQueryClient();
  const sessionQuery = useSession(sessionId);
  const programsQuery = usePrograms({ page: 1, pageSize: 200 });
  const form = useForm<SessionValues>({ resolver: zodResolver(sessionSchema) });

  useEffect(() => {
    if (!sessionQuery.data) {
      return;
    }

    form.reset({
      programId: sessionQuery.data.program?.id ?? '',
      name: sessionQuery.data.name,
      dayNumber: sessionQuery.data.dayNumber?.toString() ?? '',
      sessionLabel: sessionQuery.data.sessionLabel,
      customLabel: sessionQuery.data.customLabel ?? '',
      sessionOrder: sessionQuery.data.sessionOrder.toString(),
      sessionDate: sessionQuery.data.sessionDate?.slice(0, 10) ?? '',
      startTime: sessionQuery.data.startTime?.slice(0, 16) ?? '',
      endTime: sessionQuery.data.endTime?.slice(0, 16) ?? '',
    });
  }, [sessionQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: SessionValues) =>
      apiClient.patch(`/admin/sessions/${sessionId}`, {
        ...values,
        dayNumber: values.dayNumber ? Number(values.dayNumber) : undefined,
        sessionOrder: Number(values.sessionOrder),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  if (!sessionQuery.data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={sessionQuery.data.name}
        subtitle={sessionQuery.data.program?.name ?? 'Session'}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/sessions">Back to sessions</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Edit Session</h3>
          <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="mt-4 grid grid-cols-2 gap-3">
            <Select value={form.watch('programId')} onValueChange={(value) => form.setValue('programId', value)}>
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
            <Input placeholder="Day" type="number" {...form.register('dayNumber')} />
            <Select value={form.watch('sessionLabel')} onValueChange={(value) => form.setValue('sessionLabel', value)}>
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
            <Input placeholder="Custom label" {...form.register('customLabel')} />
            <Input placeholder="Order" type="number" {...form.register('sessionOrder')} />
            <Input type="date" {...form.register('sessionDate')} />
            <Input type="datetime-local" {...form.register('startTime')} />
            <Input type="datetime-local" {...form.register('endTime')} />
            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                Save Session
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Attached Sermons</h3>
          <div className="mt-4 space-y-2 text-sm text-ink-300">
            {sessionQuery.data.sermons.length ? (
              sessionQuery.data.sermons.map((sermon) => (
                <div key={sermon.id} className="flex items-center justify-between">
                  <Link className="text-brand-300 hover:underline" href={`/sermons/${sermon.id}`}>
                    {sermon.title}
                  </Link>
                  <span className="text-ink-500">{sermon.preacher?.displayName ?? 'N/A'}</span>
                </div>
              ))
            ) : (
              <p>No sermons attached.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
