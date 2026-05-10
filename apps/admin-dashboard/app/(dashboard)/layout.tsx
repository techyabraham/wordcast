import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { HeaderBar } from '@/components/header-bar';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('wc_admin_at')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <div className="mobile-guard">
        This dashboard is available on desktop screens only. Please use a larger display.
      </div>
      <div className="desktop-shell">
        <Sidebar />
        <main className="ml-64 min-h-screen bg-dashboard-grid bg-[size:30px_30px] px-8 py-6">
          <HeaderBar title="Wordcast Administration" />
          {children}
        </main>
      </div>
    </div>
  );
}
