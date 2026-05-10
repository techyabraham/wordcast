import * as React from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-surface-500 bg-surface-700/80 p-5 shadow-subtle backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-xs font-semibold uppercase tracking-[0.2em] text-ink-300', className)}
      {...props}
    />
  );
}

export function Value({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-3 text-2xl font-semibold text-ink-100', className)} {...props} />;
}
