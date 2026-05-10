import * as React from 'react';
import { cn } from '@/lib/cn';

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'h-4 w-4 rounded border border-surface-400 bg-surface-700 text-brand-400 focus:ring-2 focus:ring-brand-500/40',
      className,
    )}
    {...props}
  />
));

Checkbox.displayName = 'Checkbox';
