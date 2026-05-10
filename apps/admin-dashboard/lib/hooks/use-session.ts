'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface SessionDetail {
  id: string;
  name: string;
  dayNumber: number | null;
  sessionLabel: string;
  customLabel?: string | null;
  sessionOrder: number;
  sessionDate: string | null;
  startTime?: string | null;
  endTime?: string | null;
  program?: { id: string; name: string; slug: string } | null;
  sermons: Array<{
    id: string;
    title: string;
    status: string;
    preacher?: { id: string; displayName: string } | null;
  }>;
}

export const useSession = (id?: string) =>
  useQuery<SessionDetail>({
    queryKey: ['session', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing session id');
      }
      const response = await apiClient.get<SessionDetail>(`/admin/sessions/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
