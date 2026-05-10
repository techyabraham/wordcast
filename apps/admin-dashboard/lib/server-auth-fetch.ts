import { cookies } from 'next/headers';

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

export const getApiBaseUrl = () => API_BASE_URL;

export const getAccessToken = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('wc_admin_at')?.value;
};

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        data?: T;
        message?: string;
      }
    | null;

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message ?? `Request failed (${response.status})`);
  }

  return (payload?.data ?? payload) as T;
}
