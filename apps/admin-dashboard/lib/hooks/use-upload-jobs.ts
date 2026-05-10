'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface UploadJobRow {
  id: string;
  source: string;
  status: string;
  sourceUrl: string | null;
  fileName: string | null;
  totalItems?: number;
  processedItems?: number;
  failedItemsCount?: number;
  canRetry?: boolean;
  createdAt: string;
  updatedAt?: string;
  sermon: { id: string; title: string; status: string } | null;
  requestedBy: { id: string; displayName: string; email: string };
  metadata?: Record<string, unknown>;
}

type UploadJobsResult = {
  items: UploadJobRow[];
  meta?: ApiMeta;
};

export const useUploadJobs = (params?: {
  page?: number | undefined;
  pageSize?: number | undefined;
  status?: string | undefined;
  source?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}) =>
  useQuery<UploadJobsResult>({
    queryKey: ['upload-jobs', params],
    queryFn: async (): Promise<UploadJobsResult> => {
      const response = await apiClient.get<{ items: UploadJobRow[] }>('/admin/upload-jobs', params);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
