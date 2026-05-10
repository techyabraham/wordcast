import { Badge } from '@/components/ui/badge';

export function MetadataReviewPanel({
  description,
  summary,
  topics,
  tags,
  scriptureReferences,
  confidence,
}: {
  description?: string | null | undefined;
  summary?: string | null | undefined;
  topics?: string[] | undefined;
  tags?: string[] | undefined;
  scriptureReferences?: string[] | undefined;
  confidence?: number | null | undefined;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-surface-500 bg-surface-700/60 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Description</p>
        <p className="mt-2 text-sm text-ink-200">{description ?? 'No description generated.'}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Summary</p>
        <p className="mt-2 text-sm text-ink-200">{summary ?? 'No summary generated.'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(topics ?? []).map((topic) => (
          <Badge key={topic} tone="info">
            {topic}
          </Badge>
        ))}
        {(tags ?? []).map((tag) => (
          <Badge key={tag} tone="default">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(scriptureReferences ?? []).map((ref) => (
          <Badge key={ref} tone="warning">
            {ref}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-ink-400">
        Confidence score: {confidence !== null && confidence !== undefined ? confidence.toFixed(2) : 'N/A'}
      </p>
    </div>
  );
}
