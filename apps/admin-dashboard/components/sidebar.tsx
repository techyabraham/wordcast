'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  AudioLines,
  Database,
  FileText,
  LayoutDashboard,
  ScanSearch,
  ScrollText,
  Settings,
  Tags,
  UploadCloud,
  Users,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { cn } from '@/lib/cn';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sermons', label: 'Sermons', icon: AudioLines, permission: 'sermon.edit' },
  { href: '/uploads', label: 'Uploads', icon: UploadCloud, permission: 'upload.manage' },
  { href: '/upload-jobs', label: 'Upload Jobs', icon: FileText, permission: 'upload.manage' },
  { href: '/ai-review', label: 'AI Review', icon: ScanSearch, permission: 'ai.review' },
  { href: '/programs', label: 'Programs', icon: ScrollText, permission: 'program.edit' },
  { href: '/sessions', label: 'Sessions', icon: Database, permission: 'session.edit' },
  { href: '/preachers', label: 'Preachers', icon: Activity, permission: 'preacher.edit' },
  { href: '/topics', label: 'Topics', icon: Tags, permission: 'topic.edit' },
  { href: '/users', label: 'Users', icon: Users, permission: 'user.manage' },
  { href: '/audit-logs', label: 'Audit Logs', icon: Settings, permission: 'audit.view' },
  { href: '/settings', label: 'Settings', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useCurrentUser();
  const permissions = data?.permissions ?? [];

  const items = useMemo(() => {
    return navItems.filter((item) => !item.permission || permissions.includes(item.permission));
  }, [permissions]);

  return (
    <aside className="fixed inset-y-0 left-0 w-72 border-r border-surface-600 bg-surface-800/95 backdrop-blur">
      <div className="border-b border-surface-600 px-6 py-6">
        <p className="text-xs uppercase tracking-[0.35em] text-brand-200">Wordcast</p>
        <h1 className="mt-3 font-display text-lg font-semibold text-ink-100">Staff Dashboard</h1>
        <p className="mt-1 text-xs text-ink-300">Operational console</p>
      </div>

      <nav className="px-4 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                isActive
                  ? 'bg-surface-600 text-ink-100 shadow-glow'
                  : 'text-ink-300 hover:bg-surface-700 hover:text-ink-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
