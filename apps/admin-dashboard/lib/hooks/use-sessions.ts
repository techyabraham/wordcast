'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface SessionRow {
  id: string;
  name: string;
  dayNumber: number | null;
  sessionLabel: string;
  sessionOrder: number;
  sessionDate: string | null;
  sermonCount?: number;
  program?: { id: string; name: string; slug: string };
}

export const useSessions = (programId?: string) =>
  useQuery<SessionRow[]>({
    queryKey: ['sessions', programId],
    queryFn: async () => {
      const response = await apiClient.get<SessionRow[]>('/sessions', programId ? { programId } : undefined);
      return response.data ?? [];
    },
  });
