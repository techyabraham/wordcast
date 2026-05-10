'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
import { useProgram } from '@/lib/hooks/use-program';
import { apiClient } from '@/lib/api/client';

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

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const queryClient = useQueryClient();
  const { data: program } = useProgram(programId);

  const form = useForm<ProgramValues>({ resolver: zodResolver(programSchema) });

  useEffect(() => {
    if (!program) {
      return;
    }
    form.reset({
      name: program.name,
      year: program.year?.toString() ?? '',
      theme: program.theme ?? '',
      organizer: program.organizer ?? '',
      programType: program.programType,
      location: program.location ?? '',
      startDate: program.startDate ? program.startDate.slice(0, 10) : '',
      endDate: program.endDate ? program.endDate.slice(0, 10) : '',
      description: program.description ?? '',
      coverImage: program.coverImage ?? '',
    });
  }, [program, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: ProgramValues) =>
      apiClient.patch(`/admin/programs/${programId}`, {
        ...values,
        year: values.year ? Number(values.year) : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['program', programId] });
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });

  if (!program) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={program.name}
        subtitle="Program overview, sessions, and sermons."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/sessions?programId=${program.id}`}>Create Session</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/programs">Back to programs</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Edit Program</h3>
        <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="mt-4 grid grid-cols-3 gap-3">
          <Input placeholder="Program name" {...form.register('name')} />
          <Input placeholder="Year" type="number" {...form.register('year')} />
          <Select value={form.watch('programType')} onValueChange={(value) => form.setValue('programType', value)}>
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
            <Button type="submit" disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Sessions</h3>
          <div className="mt-4 space-y-2 text-sm text-ink-300">
            {program.sessions.length ? (
              program.sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <span>{session.name}</span>
                  <span className="text-ink-500">{session.sessionLabel}</span>
                </div>
              ))
            ) : (
              <p>No sessions yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Sermons by Session</h3>
          <div className="mt-4 space-y-3 text-sm text-ink-300">
            {program.sermonGroups?.length ? (
              program.sermonGroups.map((group) => (
                <div key={group.sessionId ?? 'unscheduled'}>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-400">{group.sessionName ?? 'Unassigned'}</p>
                  <ul className="mt-2 space-y-1">
                    {group.sermons.map((sermon) => (
                      <li key={sermon.id}>{sermon.title}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p>No sermons linked yet.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Featured Preachers</h3>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink-300">
          {program.featuredPreachers?.length ? (
            program.featuredPreachers.map((preacher) => (
              <span key={preacher.id} className="rounded-full border border-surface-500 px-3 py-1">
                {preacher.displayName}
              </span>
            ))
          ) : (
            <p>No featured preachers yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

