import * as React from 'react';
import { cn } from '@/lib/cn';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-surface-400 bg-surface-700 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40',
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
