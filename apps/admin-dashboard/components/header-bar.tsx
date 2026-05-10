'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { Breadcrumbs } from '@/components/breadcrumbs';

export function HeaderBar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const router = useRouter();
  const { data } = useCurrentUser();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between border-b border-surface-600 bg-surface-800/70 px-8 py-5 backdrop-blur">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-ink-300">{subtitle}</p> : <Breadcrumbs />}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className={cn('hidden items-center gap-2 text-sm text-ink-300 md:flex')}>
          <span>{data?.displayName ?? data?.email ?? 'Staff'}</span>
          <span className="text-xs uppercase tracking-[0.2em] text-brand-200">
            {data?.roles?.[0] ?? 'staff'}
          </span>
        </div>
        <Button variant="secondary" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
