'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  status: string;
  createdAt: string;
  roles: string[];
  lastLoginAt?: string | null;
  subscriptionPlan?: { code: string; name: string } | null;
}

type UsersResult = {
  items: UserRow[];
  meta?: ApiMeta;
};

export const useUsers = (params?: {
  page?: number | undefined;
  pageSize?: number | undefined;
  status?: string | undefined;
}) =>
  useQuery<UsersResult>({
    queryKey: ['users', params],
    queryFn: async (): Promise<UsersResult> => {
      const response = await apiClient.get<{ items: UserRow[] }>('/admin/users', params);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
