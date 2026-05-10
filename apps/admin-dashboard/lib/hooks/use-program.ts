'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface ProgramDetail {
  id: string;
  name: string;
  year: number | null;
  theme: string | null;
  organizer: string | null;
  programType: string;
  location: string | null;
  description: string | null;
  coverImage: string | null;
  startDate: string | null;
  endDate: string | null;
  sessions: Array<{
    id: string;
    name: string;
    sessionLabel: string;
    sessionOrder: number;
    sessionDate: string | null;
  }>;
  sermonGroups?: Array<{
    sessionId: string | null;
    sessionName: string | null;
    sermons: Array<{ id: string; title: string; preacherName?: string | null }>;
  }>;
  featuredPreachers?: Array<{
    id: string;
    displayName: string;
    profileImageUrl?: string | null;
  }>;
  playAll?: {
    sermonCount: number;
  };
}

export const useProgram = (id?: string) =>
  useQuery<ProgramDetail>({
    queryKey: ['program', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing program id');
      }
      const response = await apiClient.get<ProgramDetail>(`/programs/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
