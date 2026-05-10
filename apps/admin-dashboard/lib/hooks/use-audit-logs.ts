'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ApiMeta } from '../api/types';

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  severity: string;
  createdAt: string;
  ipAddress?: string | null;
  actor: { id: string; email: string; displayName: string } | null;
  metadata?: Record<string, unknown> | null;
}

type AuditLogsResult = {
  items: AuditLogRow[];
  meta?: ApiMeta;
};

export const useAuditLogs = (params?: {
  page?: number | undefined;
  pageSize?: number | undefined;
  action?: string | undefined;
  entityType?: string | undefined;
  entityId?: string | undefined;
  actorId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}) =>
  useQuery<AuditLogsResult>({
    queryKey: ['audit-logs', params],
    queryFn: async (): Promise<AuditLogsResult> => {
      const response = await apiClient.get<{ items: AuditLogRow[] }>('/admin/audit-logs', params);
      return {
        items: response.data.items ?? [],
        ...(response.meta !== undefined ? { meta: response.meta } : {}),
      };
    },
    placeholderData: keepPreviousData,
  });
