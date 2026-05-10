'use client';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { useCurrentUser } from '@/lib/hooks/use-current-user';

export default function SettingsPage() {
  const { data } = useCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Admin session, account, and entitlement visibility."
      />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Account</h3>
          <dl className="mt-4 space-y-3 text-sm text-ink-300">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Display Name</dt>
              <dd className="mt-1 text-ink-100">{data?.displayName ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Email</dt>
              <dd className="mt-1 text-ink-100">{data?.email ?? 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Roles</dt>
              <dd className="mt-1 text-ink-100">{data?.roles?.join(', ') || 'N/A'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Entitlements</h3>
          <dl className="mt-4 space-y-3 text-sm text-ink-300">
            <div className="flex items-center justify-between">
              <dt>Transcript access</dt>
              <dd className="text-ink-100">{data?.entitlements?.transcriptAccess ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Download access</dt>
              <dd className="text-ink-100">{data?.entitlements?.downloadAccess ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Ad free</dt>
              <dd className="text-ink-100">{data?.entitlements?.adFree ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Enhanced linking</dt>
              <dd className="text-ink-100">{data?.entitlements?.enhancedLinking ? 'Enabled' : 'Disabled'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Subscription</h3>
        <div className="mt-4 text-sm text-ink-300">
          {data?.subscription ? (
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Plan</p>
                <p className="mt-1 text-ink-100">{data.subscription.planName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Status</p>
                <p className="mt-1 text-ink-100">{data.subscription.status}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Interval</p>
                <p className="mt-1 text-ink-100">{data.subscription.interval}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-400">Ends</p>
                <p className="mt-1 text-ink-100">
                  {data.subscription.endsAt ? new Date(data.subscription.endsAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <p>No subscription metadata attached to this admin account.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
