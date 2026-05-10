'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetadataReviewPanel } from '@/components/metadata-review-panel';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { StatusBadge } from '@/components/status-badge';
import { apiClient } from '@/lib/api/client';
import { useAiReviewDetail } from '@/lib/hooks/use-ai-review';
import { useTopics } from '@/lib/hooks/use-topics';

const reviewSchema = z.object({
  editedDescription: z.string().optional(),
  editedTranscript: z.string().optional(),
});

type ReviewValues = z.infer<typeof reviewSchema>;

export default function AiReviewDetailPage() {
  const [selectedTopicIds, setSelectedTopicIds] = useState<Record<string, string>>({});
  const params = useParams();
  const sermonId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const queryClient = useQueryClient();
  const { data } = useAiReviewDetail(sermonId);
  const topicsQuery = useTopics({ page: 1, pageSize: 200 });

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      editedDescription: '',
      editedTranscript: '',
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (values: ReviewValues) =>
      apiClient.post(`/admin/ai-review/${sermonId}/approve`, {
        ...values,
        topicIds: data?.sermon.topics.map((topic) => topic.id),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-review'] });
      await queryClient.invalidateQueries({ queryKey: ['ai-review-detail', sermonId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => apiClient.post(`/admin/ai-review/${sermonId}/reject`, { notes: 'Rejected by reviewer' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-review'] });
      await queryClient.invalidateQueries({ queryKey: ['ai-review-detail', sermonId] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => apiClient.post(`/admin/sermons/${sermonId}/publish`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sermon', sermonId] });
      await queryClient.invalidateQueries({ queryKey: ['ai-review-detail', sermonId] });
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: async (payload: { suggestionId: string; action: string; topicId?: string }) =>
      apiClient.post(`/admin/topics/suggestions/${payload.suggestionId}/${payload.action}`, {
        topicId: payload.topicId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-review-detail', sermonId] });
      await queryClient.invalidateQueries({ queryKey: ['topic-suggestions'] });
    },
  });

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Review Detail"
        subtitle={data.sermon.title}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/sermons/${data.sermon.id}`}>Open Sermon</Link>
            </Button>
            <StatusBadge status={data.aiMetadata.status} />
            <Button onClick={form.handleSubmit((values) => approveMutation.mutate(values))}>
              Approve
            </Button>
            <Button variant="secondary" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              Publish Sermon
            </Button>
            <Button variant="danger" onClick={() => rejectMutation.mutate()}>
              Reject
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">AI Metadata</h3>
          <div className="mt-4">
            <MetadataReviewPanel
              description={data.aiMetadata.generatedDescription}
              summary={data.aiMetadata.summary}
              topics={Array.isArray(data.aiMetadata.detectedTopics) ? (data.aiMetadata.detectedTopics as string[]) : []}
              tags={Array.isArray(data.aiMetadata.generatedTags) ? (data.aiMetadata.generatedTags as string[]) : []}
              scriptureReferences={
                Array.isArray(data.aiMetadata.scriptureReferences)
                  ? (data.aiMetadata.scriptureReferences as string[])
                  : []
              }
              confidence={data.aiMetadata.confidenceScore}
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Suggested Topics</h3>
          <div className="mt-4 space-y-3 text-sm text-ink-200">
            {data.topicSuggestions.length ? (
              data.topicSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-lg border border-surface-600 p-3">
                  <p className="font-semibold text-ink-100">{suggestion.proposedName}</p>
                  <p className="text-xs text-ink-400">
                    Confidence: {suggestion.confidenceScore ? suggestion.confidenceScore.toFixed(2) : 'N/A'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => suggestionMutation.mutate({ suggestionId: suggestion.id, action: 'approve' })}
                    >
                      Approve as New
                    </Button>
                    <div className="w-48">
                      <Select
                        value={selectedTopicIds[suggestion.id]}
                        onValueChange={(value) =>
                          setSelectedTopicIds((prev) => ({ ...prev, [suggestion.id]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {topicsQuery.data?.items.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const topicId = selectedTopicIds[suggestion.id];
                        if (topicId) {
                          suggestionMutation.mutate({ suggestionId: suggestion.id, action: 'merge', topicId });
                        }
                      }}
                    >
                      Merge
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => suggestionMutation.mutate({ suggestionId: suggestion.id, action: 'reject' })}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p>No topic suggestions pending.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Transcript Preview</h3>
          <div className="mt-4">
            <TranscriptViewer transcript={data.aiMetadata.transcript ?? data.sermon.transcript ?? ''} />
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Edit Before Approval</h3>
          <form className="mt-4 space-y-4" onSubmit={form.handleSubmit((values) => approveMutation.mutate(values))}>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Description</label>
              <Textarea rows={4} {...form.register('editedDescription')} defaultValue={data.aiMetadata.generatedDescription ?? ''} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Transcript</label>
              <Textarea rows={6} {...form.register('editedTranscript')} defaultValue={data.aiMetadata.transcript ?? ''} />
            </div>
            <Button type="submit">Save and Approve</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
