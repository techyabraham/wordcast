import { cn } from '@/lib/cn';

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border border-surface-500 bg-surface-700/70 p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
