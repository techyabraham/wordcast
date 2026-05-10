'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface AiReviewItem {
  id: string;
  sermonId: string;
  confidenceScore: number | null;
  generatedDescription: string | null;
  detectedTopics: unknown;
  generatedTags?: unknown;
  scriptureReferences?: unknown;
  status: string;
  sermon: { id: string; title: string; status: string; preacher: { displayName: string } };
}

export interface AiReviewDetail {
  sermon: {
    id: string;
    title: string;
    status: string;
    preacher: { id: string; displayName: string } | null;
    transcript: string | null;
    description: string | null;
    topics: Array<{ id: string; name: string; slug: string }>;
  };
  aiMetadata: {
    id: string;
    generatedDescription: string | null;
    summary: string | null;
    transcript: string | null;
    detectedTopics: unknown;
    generatedTags: unknown;
    scriptureReferences: unknown;
    confidenceScore: number | null;
    status: string;
  };
  topicSuggestions: Array<{
    id: string;
    proposedName: string;
    confidenceScore: number | null;
    matchedTopicId: string | null;
    status: string;
  }>;
}

type AiReviewQueueResult = {
  items: AiReviewItem[];
  meta?: ApiMeta;
};

export const useAiReviewQueue = (params?: {
  page?: number | undefined;
  pageSize?: number | undefined;
  status?: string | undefined;
}) =>
  useQuery<AiReviewQueueResult>({
    queryKey: ['ai-review', params],
    queryFn: async (): Promise<AiReviewQueueResult> => {
      const response = await apiClient.get<{ items: AiReviewItem[] }>('/admin/ai-review', params);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });

export const useAiReviewDetail = (sermonId?: string) =>
  useQuery<AiReviewDetail>({
    queryKey: ['ai-review-detail', sermonId],
    queryFn: async (): Promise<AiReviewDetail> => {
      if (!sermonId) {
        throw new Error('Missing sermon id');
      }
      const response = await apiClient.get<AiReviewDetail>(`/admin/ai-review/${sermonId}`);
      return response.data;
    },
    enabled: Boolean(sermonId),
  });
