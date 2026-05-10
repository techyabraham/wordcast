'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface TopicSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  isSystem?: boolean;
  aliases?: string[];
  sermonCount?: number;
}

type TopicsResult = {
  items: TopicSummary[];
  meta?: ApiMeta;
};

export const useTopics = (
  params?: { page?: number; pageSize?: number; includeInactive?: boolean },
) =>
  useQuery<TopicsResult>({
    queryKey: ['topics', params],
    queryFn: async (): Promise<TopicsResult> => {
      const { includeInactive, ...query } = params ?? {};
      const response = await apiClient.get<{ items: TopicSummary[] }>(
        includeInactive ? '/admin/topics' : '/topics',
        query,
      );
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
