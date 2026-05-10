import { Card } from '@/components/ui/card';

export function AuditEventCard({
  action,
  actor,
  entity,
  timestamp,
  severity,
}: {
  action: string;
  actor?: string | null | undefined;
  entity?: string | null | undefined;
  timestamp: string;
  severity?: string | undefined;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-ink-100">{action}</p>
        <p className="mt-1 text-xs text-ink-400">
          {actor ?? 'System'} {entity ? ` | ${entity}` : ''} | {new Date(timestamp).toLocaleString()}
        </p>
      </div>
      {severity ? (
        <span className="text-xs uppercase tracking-[0.2em] text-ink-400">{severity}</span>
      ) : null}
    </Card>
  );
}
