'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface DashboardSummary {
  totalSermons: number;
  draftSermons: number;
  processingSermons: number;
  publishedSermons: number;
  pendingAiReviews: number;
  failedUploadJobs: number;
  totalPrograms?: number;
  totalPreachers?: number;
}

export const useDashboardSummary = () =>
  useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardSummary>('/admin/dashboard/summary');
      return response.data;
    },
    staleTime: 30_000,
  });
