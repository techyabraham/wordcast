'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface TopicSuggestionRow {
  id: string;
  proposedName: string;
  confidenceScore: number | null;
  status: string;
  matchedTopicId: string | null;
  sermon: { id: string; title: string } | null;
  createdAt: string;
}

type TopicSuggestionsResult = {
  items: TopicSuggestionRow[];
  meta?: ApiMeta;
};

export const useTopicSuggestions = (params?: {
  page?: number | undefined;
  pageSize?: number | undefined;
  status?: string | undefined;
}) =>
  useQuery<TopicSuggestionsResult>({
    queryKey: ['topic-suggestions', params],
    queryFn: async (): Promise<TopicSuggestionsResult> => {
      const response = await apiClient.get<{ items: TopicSuggestionRow[] }>('/admin/topics/suggestions', params);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
