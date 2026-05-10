'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { apiClient } from '@/lib/api/client';

interface UploadJobDetail {
  id: string;
  source: string;
  status: string;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: string | number | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  totalItems?: number;
  processedItems?: number;
  failedItemsCount?: number;
  canRetry?: boolean;
  itemResults?: Array<Record<string, unknown>>;
  failedItems?: Array<Record<string, unknown>>;
  linkedSermons?: Array<{ id: string; title: string; status: string }>;
  sermon: { id: string; title: string; status: string } | null;
  requestedBy: { id: string; displayName: string; email: string } | null;
  metadata?: Record<string, unknown> | null;
}

export default function UploadJobDetailPage() {
  const params = useParams();
  const jobId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const queryClient = useQueryClient();

  const jobQuery = useQuery({
    queryKey: ['upload-job', jobId],
    queryFn: async () => {
      if (!jobId) {
        throw new Error('Missing job id');
      }
      const response = await apiClient.get<UploadJobDetail>(`/admin/upload-jobs/${jobId}`);
      return response.data;
    },
    enabled: Boolean(jobId),
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) {
        throw new Error('Missing job id');
      }
      return apiClient.post<{ ok: boolean; status: string }>(`/admin/upload-jobs/${jobId}/retry`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['upload-job', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['upload-jobs'] });
    },
  });

  const job = jobQuery.data;

  if (!job) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Upload Job ${job.id.slice(0, 8)}`}
        subtitle="Inspect job metadata, linked sermon, and errors."
        actions={
          <div className="flex gap-2">
            {job.canRetry ? (
              <Button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
                Retry Job
              </Button>
            ) : null}
            <Button variant="secondary" asChild>
              <Link href="/upload-jobs">Back to jobs</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-100">Job Overview</h3>
            <StatusBadge status={job.status} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-ink-300">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Source</dt>
              <dd className="mt-1 text-ink-100">{job.source}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Requested By</dt>
              <dd className="mt-1 text-ink-100">{job.requestedBy?.displayName ?? job.requestedBy?.email ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Created</dt>
              <dd className="mt-1 text-ink-100">{new Date(job.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Updated</dt>
              <dd className="mt-1 text-ink-100">{new Date(job.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">File</dt>
              <dd className="mt-1 text-ink-100">{job.fileName ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Mime Type</dt>
              <dd className="mt-1 text-ink-100">{job.mimeType ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Total Items</dt>
              <dd className="mt-1 text-ink-100">{job.totalItems ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Processed</dt>
              <dd className="mt-1 text-ink-100">{job.processedItems ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Failed</dt>
              <dd className="mt-1 text-ink-100">{job.failedItemsCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Source URL</dt>
              <dd className="mt-1 text-ink-100">{job.sourceUrl ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Size</dt>
              <dd className="mt-1 text-ink-100">{job.sizeBytes ?? 'N/A'}</dd>
            </div>
          </dl>
          {job.errorMessage ? (
            <div className="mt-4 rounded-lg border border-danger-500/40 bg-danger-500/10 p-3 text-sm text-danger-500">
              {job.errorMessage}
            </div>
          ) : null}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Linked Sermons</h3>
          {job.linkedSermons?.length ? (
            <div className="mt-4 space-y-2 text-sm text-ink-300">
              {job.linkedSermons.map((sermon: { id: string; title: string; status: string }) => (
                <div key={sermon.id} className="space-y-1">
                  <Link className="text-brand-300 hover:underline" href={`/sermons/${sermon.id}`}>
                    {sermon.title}
                  </Link>
                  <StatusBadge status={sermon.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-400">No sermon linked yet.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Item-Level Results</h3>
          <div className="mt-4 space-y-3 text-sm text-ink-300">
            {job.itemResults?.length ? (
              job.itemResults.map((item: Record<string, unknown>, index: number) => (
                <div key={`${job.id}-result-${index}`} className="rounded-lg border border-surface-600 p-3">
                  <p className="font-medium text-ink-100">
                    {String(item.title ?? item.name ?? item.fileName ?? item.id ?? `Item ${index + 1}`)}
                  </p>
                  <p>Status: {String(item.status ?? 'UNKNOWN')}</p>
                  {'message' in item ? <p>Message: {String(item.message ?? '')}</p> : null}
                </div>
              ))
            ) : (
              <p>No item-level results captured for this job.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Failed Items</h3>
          <div className="mt-4 space-y-3 text-sm text-ink-300">
            {job.failedItems?.length ? (
              job.failedItems.map((item: Record<string, unknown>, index: number) => (
                <div key={`${job.id}-failed-${index}`} className="rounded-lg border border-danger-500/30 p-3">
                  <p className="font-medium text-ink-100">
                    {String(item.title ?? item.name ?? item.fileName ?? item.id ?? `Failed item ${index + 1}`)}
                  </p>
                  <p>Status: {String(item.status ?? 'FAILED')}</p>
                  {'message' in item ? <p>Message: {String(item.message ?? '')}</p> : null}
                </div>
              ))
            ) : (
              <p>No failed items recorded.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Metadata</h3>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-surface-900 p-4 text-xs text-ink-300">
          {JSON.stringify(job.metadata ?? {}, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
