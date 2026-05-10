'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface ProgramSummary {
  id: string;
  name: string;
  year: number | null;
  theme: string | null;
  organizer: string | null;
  programType: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImage: string | null;
}

type ProgramsResult = {
  items: ProgramSummary[];
  meta?: ApiMeta;
};

export const usePrograms = (
  params?: { page?: number | undefined; pageSize?: number | undefined },
) =>
  useQuery<ProgramsResult>({
    queryKey: ['programs', params],
    queryFn: async (): Promise<ProgramsResult> => {
      const response = await apiClient.get<{ items: ProgramSummary[] }>('/programs', params);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
