import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <div>
        <h3 className="font-display text-2xl font-semibold text-ink-100">{title}</h3>
        {subtitle ? <p className="mt-2 text-sm text-ink-300">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
