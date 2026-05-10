'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface TopicDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  aliases: string[];
  sermonCount: number;
  sermons: Array<{
    id: string;
    title: string;
    status: string;
    preacher?: { id: string; displayName: string } | null;
  }>;
}

export const useTopic = (id?: string) =>
  useQuery<TopicDetail>({
    queryKey: ['topic', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Missing topic id');
      }
      const response = await apiClient.get<TopicDetail>(`/admin/topics/detail/${id}`);
      return response.data;
    },
    enabled: Boolean(id),
  });
