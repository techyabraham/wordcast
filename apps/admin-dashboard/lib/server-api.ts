import { cookies } from 'next/headers';

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

export const apiClient = {
  async get(path: string) {
    const cookieStore = await cookies();
    const token = cookieStore.get('wc_admin_at')?.value;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      cache: 'no-store',
      ...(token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {}),
    });

    return this.parse(res);
  },

  async post(path: string, body: unknown) {
    const cookieStore = await cookies();
    const token = cookieStore.get('wc_admin_at')?.value;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    return this.parse(res);
  },

  async patch(path: string, body: unknown) {
    const cookieStore = await cookies();
    const token = cookieStore.get('wc_admin_at')?.value;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    return this.parse(res);
  },

  async parse(res: Response) {
    const payload = (await res.json().catch(() => null)) as
      | { success?: boolean; data?: unknown; message?: string }
      | null;

    if (!res.ok || payload?.success === false) {
      throw new Error(payload?.message ?? `Request failed (${res.status})`);
    }

    return payload?.data ?? payload;
  },
};
