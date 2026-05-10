'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { StatusBadge } from '@/components/status-badge';
import { MetadataReviewPanel } from '@/components/metadata-review-panel';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { AuditEventCard } from '@/components/audit-event-card';
import { apiClient } from '@/lib/api/client';
import { useSermon } from '@/lib/hooks/use-sermon';
import { usePreachers } from '@/lib/hooks/use-preachers';
import { usePrograms } from '@/lib/hooks/use-programs';
import { useSessions } from '@/lib/hooks/use-sessions';
import { useTopics } from '@/lib/hooks/use-topics';
import { useAuditLogs } from '@/lib/hooks/use-audit-logs';

const sermonSchema = z.object({
  title: z.string().min(2),
  churchName: z.string().optional(),
  description: z.string().optional(),
  sourceType: z.string().optional(),
  preacherId: z.string().min(1),
  programId: z.string().optional(),
  sessionId: z.string().optional(),
  datePreached: z.string().optional(),
  language: z.string().optional(),
  speakerRole: z.string().optional(),
});

type SermonFormValues = z.infer<typeof sermonSchema>;

export default function SermonDetailPage() {
  const params = useParams();
  const sermonId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const queryClient = useQueryClient();
  const { data: sermon } = useSermon(sermonId);
  const preachersQuery = usePreachers({ page: 1, pageSize: 200 });
  const programsQuery = usePrograms({ page: 1, pageSize: 200 });
  const sessionsQuery = useSessions(sermon?.programId ?? undefined);
  const topicsQuery = useTopics({ page: 1, pageSize: 200 });
  const auditQuery = useAuditLogs({ page: 1, pageSize: 6, entityType: 'Sermon', entityId: sermonId });

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const form = useForm<SermonFormValues>({
    resolver: zodResolver(sermonSchema),
    defaultValues: {
      title: '',
      churchName: '',
      description: '',
      sourceType: 'MANUAL_UPLOAD',
      preacherId: '',
      programId: 'none',
      sessionId: 'none',
      datePreached: '',
      language: 'en',
      speakerRole: 'OTHER',
    },
  });

  useEffect(() => {
    if (!sermon) {
      return;
    }

    form.reset({
      title: sermon.title,
      churchName: sermon.churchName ?? '',
      description: sermon.description ?? '',
      sourceType: sermon.sourceType,
      preacherId: sermon.preacherId,
      programId: sermon.programId ?? 'none',
      sessionId: sermon.sessionId ?? 'none',
      datePreached: sermon.datePreached ? sermon.datePreached.slice(0, 10) : '',
      language: sermon.language ?? 'en',
      speakerRole: sermon.speakerRole ?? 'OTHER',
    });
    setSelectedTopics(sermon.topics.map((topic) => topic.id));
  }, [sermon, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: SermonFormValues) =>
      apiClient.patch(`/admin/sermons/${sermonId}`, {
        ...values,
        programId: values.programId === 'none' ? null : values.programId,
        sessionId: values.sessionId === 'none' ? null : values.sessionId,
        datePreached: values.datePreached || null,
        topicIds: selectedTopics,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sermon', sermonId] });
      await queryClient.invalidateQueries({ queryKey: ['sermons'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => apiClient.post(`/admin/sermons/${sermonId}/publish`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sermon', sermonId] });
      await queryClient.invalidateQueries({ queryKey: ['sermons'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => apiClient.post(`/admin/sermons/${sermonId}/archive`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sermon', sermonId] });
      await queryClient.invalidateQueries({ queryKey: ['sermons'] });
    },
  });

  const aiMetadata = sermon?.aiMetadata?.[0];

  const topicOptions = useMemo(() => topicsQuery.data?.items ?? [], [topicsQuery.data]);

  if (!sermonId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={sermon?.title ?? 'Sermon Detail'}
        subtitle="Review metadata, AI suggestions, media assets, and publishing controls."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/sermons">Back to list</Link>
            </Button>
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              Publish
            </Button>
            <Button variant="danger" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
              Archive
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-100">Metadata</h3>
            {sermon ? <StatusBadge status={sermon.status} /> : null}
          </div>
          <form
            onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
            className="mt-4 grid grid-cols-2 gap-4"
          >
            <div className="col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Title</label>
              <Input {...form.register('title')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Church</label>
              <Input {...form.register('churchName')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Date Preached</label>
              <Input type="date" {...form.register('datePreached')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Language</label>
              <Input {...form.register('language')} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Speaker Role</label>
              <Select value={form.watch('speakerRole')} onValueChange={(value) => form.setValue('speakerRole', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {['LEAD_PASTOR', 'GUEST_MINISTER', 'EVANGELIST', 'TEACHER', 'PROPHET', 'APOSTLE', 'OTHER'].map(
                    (role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Source Type</label>
              <Select value={form.watch('sourceType')} onValueChange={(value) => form.setValue('sourceType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {['MANUAL_UPLOAD', 'YOUTUBE_IMPORT', 'GOOGLE_DRIVE_IMPORT', 'EXTERNAL_LINK'].map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Preacher</label>
              <Select value={form.watch('preacherId')} onValueChange={(value) => form.setValue('preacherId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preacher" />
                </SelectTrigger>
                <SelectContent>
                  {preachersQuery.data?.items.map((preacher) => (
                    <SelectItem key={preacher.id} value={preacher.id}>
                      {preacher.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Program</label>
              <Select value={form.watch('programId')} onValueChange={(value) => form.setValue('programId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {programsQuery.data?.items.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Session</label>
              <Select value={form.watch('sessionId')} onValueChange={(value) => form.setValue('sessionId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {sessionsQuery.data?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Description</label>
              <Textarea rows={5} {...form.register('description')} />
            </div>

            <div className="col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Topics</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {topicOptions.map((topic) => {
                  const isSelected = selectedTopics.includes(topic.id);
                  return (
                    <label key={topic.id} className="flex items-center gap-2 text-sm text-ink-200">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedTopics((prev) => [...prev, topic.id]);
                          } else {
                            setSelectedTopics((prev) => prev.filter((id) => id !== topic.id));
                          }
                        }}
                      />
                      {topic.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-ink-100">Media Assets</h3>
            <div className="mt-3 space-y-2 text-sm text-ink-300">
              {sermon?.mediaAssets?.length ? (
                sermon.mediaAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <span>{asset.type}</span>
                    <span className="text-ink-400">{asset.status}</span>
                  </div>
                ))
              ) : (
                <p>No media assets attached yet.</p>
              )}
            </div>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-ink-100">Audit Timeline</h3>
            <div className="mt-3 space-y-3">
              {auditQuery.data?.items?.length ? (
                auditQuery.data.items.map((log) => (
                  <AuditEventCard
                    key={log.id}
                    action={log.action}
                    actor={log.actor?.displayName ?? log.actor?.email}
                    entity={log.entityId ? `${log.entityType}:${log.entityId.slice(0, 8)}` : log.entityType}
                    timestamp={log.createdAt}
                    severity={log.severity}
                  />
                ))
              ) : (
                <p className="text-sm text-ink-400">No audit events yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Transcript</h3>
          <div className="mt-4">
            <TranscriptViewer transcript={sermon?.transcript ?? ''} />
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-ink-100">AI Suggestions</h3>
            <div className="mt-4">
              <MetadataReviewPanel
                description={aiMetadata?.generatedDescription}
                summary={aiMetadata?.summary}
                topics={Array.isArray(aiMetadata?.detectedTopics) ? (aiMetadata?.detectedTopics as string[]) : []}
                tags={Array.isArray(aiMetadata?.generatedTags) ? (aiMetadata?.generatedTags as string[]) : []}
                scriptureReferences={
                  Array.isArray(aiMetadata?.scriptureReferences)
                    ? (aiMetadata?.scriptureReferences as string[])
                    : []
                }
                confidence={aiMetadata?.confidenceScore ?? null}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
