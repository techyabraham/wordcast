'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useDashboardSummary } from '@/lib/hooks/use-dashboard-summary';
import { useUploadJobs } from '@/lib/hooks/use-upload-jobs';
import { useSermons } from '@/lib/hooks/use-sermons';

export default function DashboardPage() {
  const { data: summary } = useDashboardSummary();
  const uploadJobs = useUploadJobs({ page: 1, pageSize: 6 });
  const recentSermons = useSermons({ page: 1, pageSize: 6, sort: 'UPDATED_AT_DESC' });

  const jobColumns = useMemo(
    () => [
      {
        header: 'Job',
        accessorKey: 'id',
        cell: ({ row }: { row: { original: { id: string } } }) => row.original.id.slice(0, 8),
      },
      {
        header: 'Source',
        accessorKey: 'source',
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: { row: { original: { status: string } } }) => (
          <StatusBadge status={row.original.status} />
        ),
      },
      {
        header: 'Sermon',
        accessorKey: 'sermon',
        cell: ({ row }: { row: { original: { sermon: { id: string; title: string } | null } } }) =>
          row.original.sermon ? (
            <Link className="text-brand-300 hover:underline" href={`/sermons/${row.original.sermon.id}`}>
              {row.original.sermon.title}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        header: 'Requested By',
        accessorKey: 'requestedBy',
        cell: ({ row }: { row: { original: { requestedBy: { displayName: string; email: string } } } }) =>
          row.original.requestedBy.displayName ?? row.original.requestedBy.email,
      },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }: { row: { original: { createdAt: string } } }) =>
          new Date(row.original.createdAt).toLocaleString(),
      },
    ],
    [],
  );

  const sermonColumns = useMemo(
    () => [
      {
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }: { row: { original: { id: string; title: string } } }) => (
          <Link className="text-brand-300 hover:underline" href={`/sermons/${row.original.id}`}>
            {row.original.title}
          </Link>
        ),
      },
      {
        header: 'Preacher',
        accessorKey: 'preacher',
        cell: ({ row }: { row: { original: { preacher: { displayName: string } | null } } }) =>
          row.original.preacher?.displayName ?? '—',
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }: { row: { original: { status: string } } }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Updated',
        accessorKey: 'updatedAt',
        cell: ({ row }: { row: { original: { updatedAt: string } } }) =>
          new Date(row.original.updatedAt).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Operational snapshot for Wordcast staff."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/sermons">Create Sermon</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/uploads">Upload Audio</Link>
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="Total Sermons" value={summary?.totalSermons ?? 0} />
        <StatCard label="Draft Sermons" value={summary?.draftSermons ?? 0} />
        <StatCard label="Processing Sermons" value={summary?.processingSermons ?? 0} />
        <StatCard label="Published Sermons" value={summary?.publishedSermons ?? 0} />
        <StatCard label="Pending AI Reviews" value={summary?.pendingAiReviews ?? 0} />
        <StatCard label="Failed Upload Jobs" value={summary?.failedUploadJobs ?? 0} />
        <StatCard label="Total Programs" value={summary?.totalPrograms ?? 0} />
        <StatCard label="Total Preachers" value={summary?.totalPreachers ?? 0} />
      </section>

      <section className="grid grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-100">Recent Upload Jobs</h3>
            <Button asChild variant="secondary">
              <Link href="/upload-jobs">View all</Link>
            </Button>
          </div>
          <DataTable
            data={uploadJobs.data?.items ?? []}
            columns={jobColumns}
            loading={uploadJobs.isLoading}
            emptyMessage="No upload activity yet."
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-100">Recent Sermon Updates</h3>
            <Button asChild variant="secondary">
              <Link href="/sermons">View all</Link>
            </Button>
          </div>
          <DataTable
            data={recentSermons.data?.items ?? []}
            columns={sermonColumns}
            loading={recentSermons.isLoading}
            emptyMessage="No sermon edits yet."
          />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-surface-500 bg-surface-800/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Quick Actions</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="secondary">
              <Link href="/sermons">Create Sermon</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/uploads">Upload Audio</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/uploads#youtube">Import YouTube</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/uploads#google-drive">Import Google Drive</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/preachers">Create Preacher</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/programs">Create Program</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-400">AI Review Queue</p>
          <p className="mt-4 text-3xl font-semibold text-ink-100">
            {summary?.pendingAiReviews ?? 0}
          </p>
          <p className="mt-2 text-sm text-ink-300">Sermons waiting for metadata approval.</p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/ai-review">Review now</Link>
          </Button>
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Upload Failures</p>
          <p className="mt-4 text-3xl font-semibold text-ink-100">
            {summary?.failedUploadJobs ?? 0}
          </p>
          <p className="mt-2 text-sm text-ink-300">Jobs that need attention or retry.</p>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/upload-jobs">Inspect jobs</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

