'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface AuditDetail {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  severity: string;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  actor?: { id: string; displayName: string; email: string } | null;
}

export default function AuditLogDetailPage() {
  const params = useParams();
  const logId = typeof params.id === 'string' ? params.id : params.id?.[0];

  const logQuery = useQuery({
    queryKey: ['audit-log', logId],
    queryFn: async () => {
      if (!logId) {
        throw new Error('Missing log id');
      }
      const response = await apiClient.get<AuditDetail>(`/admin/audit-logs/${logId}`);
      return response.data;
    },
    enabled: Boolean(logId),
  });

  const log = logQuery.data;

  if (!log) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Detail"
        subtitle={log.action}
        actions={
          <Link className="text-sm text-brand-300 hover:underline" href="/audit-logs">
            Back to logs
          </Link>
        }
      />

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm text-ink-300">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Actor</dt>
            <dd className="mt-1 text-ink-100">{log.actor?.displayName ?? log.actor?.email ?? 'System'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Severity</dt>
            <dd className="mt-1 text-ink-100">{log.severity}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Entity</dt>
            <dd className="mt-1 text-ink-100">
              {log.entityType}{log.entityId ? `:${log.entityId}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Timestamp</dt>
            <dd className="mt-1 text-ink-100">{new Date(log.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">IP</dt>
            <dd className="mt-1 text-ink-100">{log.ipAddress ?? 'N/A'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">User Agent</dt>
            <dd className="mt-1 text-ink-100">{log.userAgent ?? 'N/A'}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Metadata</h3>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-surface-900 p-4 text-xs text-ink-300">
          {JSON.stringify(log.metadata ?? {}, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
