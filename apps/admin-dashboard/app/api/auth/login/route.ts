import { type NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as
    | {
        success?: boolean;
        data?: {
          tokens?: {
            accessToken: string;
            refreshToken: string;
          };
        };
        message?: string;
      }
    | null;

  if (!res.ok || payload?.success === false) {
    return NextResponse.json(
      { error: payload?.message ?? 'Invalid credentials' },
      { status: res.status },
    );
  }

  const tokens = payload?.data?.tokens;

  if (!tokens?.accessToken || !tokens?.refreshToken) {
    return NextResponse.json({ error: 'Token payload missing' }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set('wc_admin_at', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });

  response.cookies.set('wc_admin_rt', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
