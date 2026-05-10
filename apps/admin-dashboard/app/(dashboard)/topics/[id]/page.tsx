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
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { useTopic } from '@/lib/hooks/use-topic';

const topicSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  aliases: z.string().optional(),
  isActive: z.boolean().optional(),
});

type TopicValues = z.infer<typeof topicSchema>;

export default function TopicDetailPage() {
  const params = useParams();
  const topicId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const queryClient = useQueryClient();
  const topicQuery = useTopic(topicId);
  const form = useForm<TopicValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: { name: '', description: '', aliases: '' },
  });

  useEffect(() => {
    if (!topicQuery.data) {
      return;
    }
    form.reset({
      name: topicQuery.data.name,
      description: topicQuery.data.description ?? '',
      aliases: topicQuery.data.aliases.join(', '),
      isActive: topicQuery.data.isActive,
    });
  }, [topicQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: TopicValues) =>
      apiClient.patch(`/admin/topics/${topicId}`, {
        name: values.name,
        description: values.description,
        isActive: values.isActive,
        aliases: values.aliases
          ? values.aliases.split(',').map((alias) => alias.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['topic', topicId] });
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  if (!topicQuery.data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={topicQuery.data.name}
        subtitle={topicQuery.data.slug}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/topics">Back to topics</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Edit Topic</h3>
          <form onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))} className="mt-4 space-y-3">
            <Input placeholder="Topic name" {...form.register('name')} />
            <Input placeholder="Aliases (comma separated)" {...form.register('aliases')} />
            <Textarea placeholder="Description" rows={4} {...form.register('description')} />
            <label className="flex items-center gap-2 text-sm text-ink-300">
              <input type="checkbox" {...form.register('isActive')} />
              Active topic
            </label>
            <Button type="submit" disabled={updateMutation.isPending}>
              Save Topic
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Linked Sermons</h3>
          <div className="mt-4 space-y-2 text-sm text-ink-300">
            {topicQuery.data.sermons.length ? (
              topicQuery.data.sermons.map((sermon) => (
                <div key={sermon.id} className="flex items-center justify-between">
                  <Link className="text-brand-300 hover:underline" href={`/sermons/${sermon.id}`}>
                    {sermon.title}
                  </Link>
                  <span className="text-ink-500">{sermon.preacher?.displayName ?? 'N/A'}</span>
                </div>
              ))
            ) : (
              <p>No sermons linked yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
