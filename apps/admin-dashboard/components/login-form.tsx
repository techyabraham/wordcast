'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@wordcast.dev',
      password: 'ChangeMe123!',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setLoading(false);

    if (!response.ok) {
      setError(payload?.error ?? 'Login failed');
      return;
    }

    router.push('/');
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
          Email
        </label>
        <Input type="email" {...register('email')} />
        {errors.email ? (
          <p className="mt-1 text-xs text-danger-500">{errors.email.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
          Password
        </label>
        <Input type="password" {...register('password')} />
        {errors.password ? (
          <p className="mt-1 text-xs text-danger-500">{errors.password.message}</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-danger-500">{error}</p> : null}

      <Button type="submit" className={cn('w-full', loading && 'opacity-80')} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
