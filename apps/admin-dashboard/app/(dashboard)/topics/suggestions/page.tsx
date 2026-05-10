'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { useTopicSuggestions } from '@/lib/hooks/use-topic-suggestions';
import { useTopics } from '@/lib/hooks/use-topics';

export default function TopicSuggestionsPage() {
  const [selectedTopicIds, setSelectedTopicIds] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const suggestionsQuery = useTopicSuggestions({ page: 1, pageSize: 50, status: 'PENDING' });
  const topicsQuery = useTopics({ page: 1, pageSize: 200 });

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; action: string; topicId?: string }) =>
      apiClient.post(`/admin/topics/suggestions/${payload.id}/${payload.action}`, {
        topicId: payload.topicId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['topic-suggestions'] });
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const columns = useMemo(
    () => [
      { header: 'Proposed', accessorKey: 'proposedName' },
      {
        header: 'Sermon',
        accessorKey: 'sermon',
        cell: ({ row }: { row: { original: { sermon: { title: string } | null } } }) =>
          row.original.sermon?.title ?? 'N/A',
      },
      {
        header: 'Confidence',
        accessorKey: 'confidenceScore',
        cell: ({ row }: { row: { original: { confidenceScore: number | null } } }) =>
          row.original.confidenceScore ? row.original.confidenceScore.toFixed(2) : 'N/A',
      },
      {
        header: 'Actions',
        accessorKey: 'actions',
        cell: ({ row }: { row: { original: { id: string } } }) => (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => mutation.mutate({ id: row.original.id, action: 'approve' })}
            >
              Approve
            </Button>
            <div className="w-44">
              <Select
                value={selectedTopicIds[row.original.id]}
                onValueChange={(value) => setSelectedTopicIds((prev) => ({ ...prev, [row.original.id]: value }))}
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
                const topicId = selectedTopicIds[row.original.id];
                if (topicId) {
                  mutation.mutate({ id: row.original.id, action: 'merge', topicId });
                }
              }}
            >
              Merge
            </Button>
            <Button variant="danger" onClick={() => mutation.mutate({ id: row.original.id, action: 'reject' })}>
              Reject
            </Button>
          </div>
        ),
      },
    ],
    [mutation, selectedTopicIds, topicsQuery.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Topic Suggestions"
        subtitle="Review AI-detected topics and merge them into the active taxonomy."
      />

      <DataTable
        data={suggestionsQuery.data?.items ?? []}
        columns={columns}
        loading={suggestionsQuery.isLoading}
        getRowId={(row: { id: string }) => row.id}
      />
    </div>
  );
}
