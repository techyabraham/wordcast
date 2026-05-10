import { Badge } from '@/components/ui/badge';

const toneMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  admin: 'warning',
  staff: 'info',
  listener: 'default',
};

export function RoleBadge({ role }: { role: string }) {
  const tone = toneMap[role] ?? 'default';
  return <Badge tone={tone}>{role}</Badge>;
}
