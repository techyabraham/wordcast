'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';

interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  permissions: Array<{ code: string; name: string }>;
}

export default function RolesPage() {
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await apiClient.get<{ items: RoleRecord[] }>('/admin/roles');
      return response.data.items;
    },
  });

  const permissions: string[] = Array.from(
    new Set<string>(
      (rolesQuery.data ?? []).flatMap((role: RoleRecord) =>
        role.permissions.map((permission: { code: string; name: string }) => permission.code),
      ),
    ),
  ).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles and Permissions"
        subtitle="Visibility into RBAC configuration."
      />

      <div className="space-y-4">
        {rolesQuery.data?.map((role: RoleRecord) => (
          <Card key={role.id}>
            <h3 className="text-sm font-semibold text-ink-100">{role.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-400">{role.code}</p>
            {role.description ? <p className="mt-2 text-sm text-ink-300">{role.description}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-300">
              {role.permissions.map((perm: { code: string; name: string }) => (
                <span key={perm.code} className="rounded-full border border-surface-500 px-2 py-1">
                  {perm.code}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-ink-100">Permission Matrix</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm text-ink-300">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface-800 px-3 py-2 text-left text-xs uppercase tracking-[0.2em] text-ink-400">
                  Permission
                </th>
                {(rolesQuery.data ?? []).map((role: RoleRecord) => (
                  <th
                    key={role.id}
                    className="px-3 py-2 text-left text-xs uppercase tracking-[0.2em] text-ink-400"
                  >
                    {role.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission} className="border-t border-surface-600">
                  <td className="sticky left-0 bg-surface-800 px-3 py-3 text-ink-100">{permission}</td>
                  {(rolesQuery.data ?? []).map((role: RoleRecord) => {
                    const hasPermission = role.permissions.some(
                      (entry: { code: string; name: string }) => entry.code === permission,
                    );
                    return (
                      <td key={`${role.id}-${permission}`} className="px-3 py-3">
                        <span
                          className={
                            hasPermission
                              ? 'rounded-full bg-brand-500/15 px-2 py-1 text-xs text-brand-200'
                              : 'rounded-full bg-surface-700 px-2 py-1 text-xs text-ink-500'
                          }
                        >
                          {hasPermission ? 'Yes' : 'No'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
