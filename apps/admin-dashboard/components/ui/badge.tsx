import * as React from 'react';
import { cn } from '@/lib/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const toneStyles: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'border-surface-500 bg-surface-600/70 text-ink-200',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  warning: 'border-gold-500/40 bg-gold-500/15 text-gold-100',
  danger: 'border-danger-500/40 bg-danger-500/15 text-danger-500',
  info: 'border-brand-500/40 bg-brand-500/15 text-brand-200',
};

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
