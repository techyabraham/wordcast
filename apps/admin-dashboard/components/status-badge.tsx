import { Badge } from '@/components/ui/badge';

const toneMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PUBLISHED: 'success',
  REVIEW_PENDING: 'warning',
  PROCESSING: 'info',
  FAILED: 'danger',
  DRAFT: 'default',
  QUARANTINE: 'warning',
  VALIDATING: 'info',
  TRANSCODING: 'info',
  AI_PROCESSING: 'info',
  INDEXING: 'info',
  COMPLETED: 'success',
  ACCEPTED: 'default',
  PENDING: 'warning',
  DOWNLOADING: 'info',
  PROCESSING_AUDIO: 'info',
  UPLOADING: 'info',
  TRANSCRIBING: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVIEWED: 'warning',
  GENERATED: 'info',
  PENDING_AI_REVIEW: 'warning',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = toneMap[status] ?? 'default';
  return <Badge tone={tone}>{status.replace(/_/g, ' ')}</Badge>;
}
