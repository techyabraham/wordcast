'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface SermonDetail {
  id: string;
  title: string;
  churchName: string | null;
  description: string | null;
  status: string;
  sourceType: string;
  preacherId: string;
  programId: string | null;
  sessionId: string | null;
  datePreached: string | null;
  language: string;
  speakerRole: string;
  transcript: string | null;
  createdAt: string;
  updatedAt: string;
  preacher: { id: string; displayName: string } | null;
  program: { id: string; name: string } | null;
  session: { id: string; name: string } | null;
  topics: Array<{ id: string; name: string; slug: string }>;
  aiMetadata: Array<{
    id: string;
    generatedDescription: string | null;
    summary: string | null;
    transcript: string | null;
    detectedTopics: unknown;
    generatedTags: unknown;
    scriptureReferences: unknown;
    confidenceScore: number | null;
    status: string;
  }>;
  mediaAssets: Array<{
    id: string;
    type: string;
    status: string;
    cdnUrl: string | null;
    createdAt: string;
    durationSeconds: number | null;
  }>;
}

export const useSermon = (id?: string) =>
  useQuery<SermonDetail>({
    queryKey: ['sermon', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing sermon id');
      }
      const response = await apiClient.get<SermonDetail>(`/admin/sermons/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
