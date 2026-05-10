import { Sidebar } from '@/components/sidebar';
import { HeaderBar } from '@/components/header-bar';

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headerProps = {
    title,
    ...(subtitle !== undefined ? { subtitle } : {}),
    ...(actions !== undefined ? { actions } : {}),
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-72 min-h-screen">
        <HeaderBar {...headerProps} />
        <main className="bg-dashboard-grid bg-[size:32px_32px] px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
