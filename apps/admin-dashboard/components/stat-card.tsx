import { Card } from '@/components/ui/card';

export function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: 'default' | 'highlight' }) {
  return (
    <Card className={tone === 'highlight' ? 'border-brand-500/40' : undefined}>
      <p className="text-xs uppercase tracking-[0.2em] text-ink-300">{label}</p>
      <p className="mt-4 text-2xl font-semibold text-ink-100">{value}</p>
    </Card>
  );
}
