import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { LoginForm } from '@/components/login-form';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('wc_admin_at')?.value;

  if (token) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-dashboard-grid bg-[size:32px_32px]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-8">
        <section className="w-full max-w-md rounded-2xl border border-surface-500 bg-surface-700/80 p-8 shadow-glow">
          <p className="text-xs uppercase tracking-[0.35em] text-brand-200">Wordcast</p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-ink-100">
            Staff Operations
          </h1>
          <p className="mt-2 text-sm text-ink-300">
            Sign in with a staff or admin account to manage sermons, uploads, and AI review.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
