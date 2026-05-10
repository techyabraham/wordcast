import * as React from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  asChild?: boolean;
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-brand-500 text-white shadow-glow hover:bg-brand-400 focus-visible:ring-brand-300',
  secondary:
    'bg-surface-600 text-ink-100 border border-surface-400 hover:bg-surface-500 focus-visible:ring-ink-200',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 focus-visible:ring-danger-500',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', asChild = false, children, ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-800 disabled:cursor-not-allowed disabled:opacity-60',
      variants[variant],
      className,
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown> & { className?: string }>;
      return React.cloneElement(child, {
        ...props,
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
