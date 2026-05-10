import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TableProps {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  className?: string;
}

export function SimpleTable({ headers, rows, className }: TableProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-surface-500 bg-surface-800/80 shadow-subtle', className)}>
      <table className="min-w-full divide-y divide-surface-600 text-sm">
        <thead className="bg-surface-700/80">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-ink-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-surface-700/60">
              {row.map((cell, cellIdx) => (
                <td key={`${idx}-${cellIdx}`} className="px-4 py-3 text-ink-100">
                  {cell ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
