'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const labelMap: Record<string, string> = {
  sermons: 'Sermons',
  uploads: 'Uploads',
  'upload-jobs': 'Upload Jobs',
  'ai-review': 'AI Review',
  programs: 'Programs',
  sessions: 'Sessions',
  preachers: 'Preachers',
  topics: 'Topics',
  users: 'Users',
  'audit-logs': 'Audit Logs',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-xs uppercase tracking-[0.2em] text-ink-400">Dashboard</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-400">
      <Link href="/" className="hover:text-ink-200">
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const label = labelMap[segment] ?? segment.replace(/[-_]/g, ' ');
        return (
          <span key={href} className="flex items-center gap-2">
            <span>/</span>
            <Link href={href} className="hover:text-ink-200">
              {label}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
