'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';

const preacherSchema = z.object({
  displayName: z.string().min(2),
  biography: z.string().optional(),
  profileImageUrl: z.string().optional(),
  country: z.string().optional(),
  ministryName: z.string().optional(),
});

type PreacherValues = z.infer<typeof preacherSchema>;

export default function PreacherDetailPage() {
  const params = useParams();
  const preacherId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const queryClient = useQueryClient();

  const preacherQuery = useQuery({
    queryKey: ['preacher', preacherId],
    queryFn: async () => {
      if (!preacherId) {
        throw new Error('Missing preacher id');
      }
      const response = await apiClient.get<any>(`/preachers/${preacherId}`);
      return response.data;
    },
    enabled: Boolean(preacherId),
  });

  const form = useForm<PreacherValues>({ resolver: zodResolver(preacherSchema) });

  useEffect(() => {
    if (!preacherQuery.data) {
      return;
    }
    form.reset({
      displayName: preacherQuery.data.displayName,
      biography: preacherQuery.data.biography ?? '',
      profileImageUrl: preacherQuery.data.profileImageUrl ?? '',
      country: preacherQuery.data.country ?? '',
      ministryName: preacherQuery.data.ministryName ?? '',
    });
  }, [preacherQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: PreacherValues) => apiClient.patch(`/admin/preachers/${preacherId}`, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['preacher', preacherId] });
      await queryClient.invalidateQueries({ queryKey: ['preachers'] });
    },
  });

  if (!preacherQuery.data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={preacherQuery.data.displayName}
        subtitle="Profile details and sermon catalog."
        actions={
          <Button asChild variant="secondary">
            <Link href="/preachers">Back to preachers</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Edit Profile</h3>
          <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="mt-4 space-y-3">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Name</label>
              <Input {...form.register('displayName')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Country</label>
              <Input {...form.register('country')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Ministry</label>
              <Input {...form.register('ministryName')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Profile Image URL</label>
              <Input {...form.register('profileImageUrl')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Bio</label>
              <Textarea rows={4} {...form.register('biography')} />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              Save Changes
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Top Sermons</h3>
          <div className="mt-4 space-y-2 text-sm text-ink-300">
            {preacherQuery.data.topSermons?.length ? (
              preacherQuery.data.topSermons.map((sermon: any) => (
                <div key={sermon.id} className="flex items-center justify-between">
                  <span>{sermon.title}</span>
                  <span className="text-ink-500">{sermon.playCount ?? 0} plays</span>
                </div>
              ))
            ) : (
              <p>No sermons attached.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Related Programs</h3>
          <div className="mt-4 space-y-2 text-sm text-ink-300">
            {preacherQuery.data.relatedPrograms?.length ? (
              preacherQuery.data.relatedPrograms.map((program: any) => (
                <div key={program.id} className="flex items-center justify-between">
                  <span>{program.name}</span>
                  <span className="text-ink-500">{program.year ?? 'N/A'}</span>
                </div>
              ))
            ) : (
              <p>No related programs.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Top Topics</h3>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-300">
            {preacherQuery.data.topTopics?.length ? (
              preacherQuery.data.topTopics.map((topic: any) => (
                <span key={topic.id} className="rounded-full border border-surface-500 px-3 py-1">
                  {topic.name}
                </span>
              ))
            ) : (
              <p>No top topics.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

