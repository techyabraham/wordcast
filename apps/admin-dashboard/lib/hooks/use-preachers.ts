'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface PreacherSummary {
  id: string;
  displayName: string;
  slug: string;
  followerCount: number;
  country: string | null;
  profileImageUrl: string | null;
  ministryName?: string | null;
  sermonCount?: number;
  createdAt: string;
}

type PreachersResult = {
  items: PreacherSummary[];
  meta?: ApiMeta;
};

export const usePreachers = (
  params?: { page?: number | undefined; pageSize?: number | undefined },
) =>
  useQuery<PreachersResult>({
    queryKey: ['preachers', params],
    queryFn: async (): Promise<PreachersResult> => {
      const response = await apiClient.get<{ items: PreacherSummary[] }>('/preachers', params);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
