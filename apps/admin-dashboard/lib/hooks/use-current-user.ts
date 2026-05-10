'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  subscription?: {
    id: string;
    status: string;
    planCode: string;
    planName: string;
    interval: string;
    endsAt?: string | null;
  } | null;
  entitlements?: {
    transcriptAccess: boolean;
    downloadAccess: boolean;
    adFree?: boolean;
    enhancedLinking?: boolean;
  };
}

interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    permissions: string[];
  };
  subscription?: CurrentUser['subscription'];
  entitlements?: CurrentUser['entitlements'];
}

export const useCurrentUser = () =>
  useQuery<CurrentUser>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await apiClient.get<CurrentUserResponse>('/admin/auth/me');
      return {
        ...response.data.user,
        subscription: response.data.subscription ?? null,
        entitlements: response.data.entitlements ?? {
          transcriptAccess: false,
          downloadAccess: false,
        },
      } satisfies CurrentUser;
    },
    staleTime: 60_000,
  });
