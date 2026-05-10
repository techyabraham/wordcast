'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface SermonListItem {
  id: string;
  title: string;
  status: string;
  sourceType: string;
  datePreached: string | null;
  createdAt: string;
  updatedAt: string;
  preacher: { id: string; displayName: string } | null;
  program: { id: string; name: string } | null;
  session: { id: string; name: string } | null;
}

export interface SermonListResponse {
  items: SermonListItem[];
}

export interface SermonFilters {
  page?: number | undefined;
  pageSize?: number | undefined;
  status?: string | undefined;
  preacherId?: string | undefined;
  programId?: string | undefined;
  sessionId?: string | undefined;
  topic?: string | undefined;
  sourceType?: string | undefined;
  search?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  sort?: string | undefined;
}

type SermonsResult = {
  items: SermonListItem[];
  meta?: ApiMeta;
};

export const useSermons = (filters: SermonFilters) =>
  useQuery<SermonsResult>({
    queryKey: ['sermons', filters],
    queryFn: async (): Promise<SermonsResult> => {
      const response = await apiClient.get<SermonListResponse>('/admin/sermons', filters);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
