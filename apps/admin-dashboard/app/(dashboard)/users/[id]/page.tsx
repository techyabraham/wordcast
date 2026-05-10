'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { RoleBadge } from '@/components/role-badge';
import { apiClient } from '@/lib/api/client';

interface UserDetail {
  id: string;
  email: string;
  displayName: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string | null;
  roles: string[];
  entitlements?: Array<{ type: string; isActive: boolean }>;
  subscriptions?: Array<{
    id: string;
    status: string;
    startsAt: string;
    endsAt?: string | null;
    plan: { code: string; name: string };
  }>;
  recentSessions?: Array<{
    id: string;
    createdAt: string;
    lastActivityAt: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    isRevoked: boolean;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = typeof params.id === 'string' ? params.id : params.id?.[0];

  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('Missing user id');
      }
      const response = await apiClient.get<UserDetail>(`/admin/users/${userId}`);
      return response.data;
    },
    enabled: Boolean(userId),
  });

  const user = userQuery.data;

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.displayName}
        subtitle={user.email}
        actions={
          <Link className="text-sm text-brand-300 hover:underline" href="/users">
            Back to users
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Profile</h3>
          <dl className="mt-4 space-y-3 text-sm text-ink-300">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Status</dt>
              <dd className="mt-1 text-ink-100">{user.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Created</dt>
              <dd className="mt-1 text-ink-100">{new Date(user.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-ink-400">Last Login</dt>
              <dd className="mt-1 text-ink-100">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Roles</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
          </div>
          {user.entitlements?.length ? (
            <div className="mt-6">
              <h4 className="text-xs uppercase tracking-[0.2em] text-ink-400">Entitlements</h4>
              <ul className="mt-2 space-y-1 text-sm text-ink-300">
                {user.entitlements.map((ent) => (
                  <li key={ent.type}>
                    {ent.type} - {ent.isActive ? 'Active' : 'Inactive'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Subscriptions</h3>
          <div className="mt-4 space-y-2 text-sm text-ink-300">
            {user.subscriptions?.length ? (
              user.subscriptions.map((subscription) => (
                <div key={subscription.id} className="rounded-lg border border-surface-600 p-3">
                  <p className="font-medium text-ink-100">{subscription.plan.name}</p>
                  <p>Status: {subscription.status}</p>
                  <p>Starts: {new Date(subscription.startsAt).toLocaleString()}</p>
                  <p>Ends: {subscription.endsAt ? new Date(subscription.endsAt).toLocaleString() : 'N/A'}</p>
                </div>
              ))
            ) : (
              <p>No subscriptions recorded.</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink-100">Recent Sessions</h3>
          <div className="mt-4 space-y-2 text-sm text-ink-300">
            {user.recentSessions?.length ? (
              user.recentSessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-surface-600 p-3">
                  <p className="font-medium text-ink-100">{session.isRevoked ? 'Revoked' : 'Active'}</p>
                  <p>Started: {new Date(session.createdAt).toLocaleString()}</p>
                  <p>Last activity: {new Date(session.lastActivityAt).toLocaleString()}</p>
                  <p>IP: {session.ipAddress ?? 'N/A'}</p>
                </div>
              ))
            ) : (
              <p>No recent sessions.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

