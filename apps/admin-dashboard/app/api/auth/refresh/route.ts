import { type NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

const ACCESS_COOKIE = 'wc_admin_at';
const REFRESH_COOKIE = 'wc_admin_rt';
const ACCESS_COOKIE_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface RefreshTokenPayload {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt?: string;
}

function setAuthCookies(response: NextResponse, tokens: RefreshTokenPayload) {
  const refreshMaxAge = resolveRefreshMaxAge(tokens.refreshTokenExpiresAt);

  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });

  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: refreshMaxAge,
  });
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

function resolveRefreshMaxAge(refreshTokenExpiresAt?: string): number {
  if (!refreshTokenExpiresAt) {
    return REFRESH_COOKIE_MAX_AGE_SECONDS;
  }

  const expiresAtMs = new Date(refreshTokenExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return REFRESH_COOKIE_MAX_AGE_SECONDS;
  }

  const deltaSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);
  return Math.max(0, deltaSeconds);
}

function sanitizeNextPath(rawNextPath: string | null): string {
  if (!rawNextPath || !rawNextPath.startsWith('/')) {
    return '/';
  }
  return rawNextPath;
}

async function requestTokenRotation(request: NextRequest): Promise<{
  ok: boolean;
  status: number;
  message?: string;
  tokens?: RefreshTokenPayload;
}> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return {
      ok: false,
      status: 401,
      message: 'Missing refresh token',
    };
  }

  const backendResponse = await fetch(`${API_BASE_URL}/admin/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': request.headers.get('user-agent') ?? 'wordcast-admin-dashboard',
    },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });

  const payload = (await backendResponse.json().catch(() => null)) as
    | {
        success?: boolean;
        data?: { tokens?: RefreshTokenPayload };
        message?: string;
      }
    | null;

  if (!backendResponse.ok || payload?.success === false) {
    return {
      ok: false,
      status: backendResponse.status,
      message: payload?.message ?? 'Unable to refresh admin session',
    };
  }

  const tokens = payload?.data?.tokens;
  if (!tokens?.accessToken || !tokens.refreshToken) {
    return {
      ok: false,
      status: 502,
      message: 'Refresh response missing token payload',
    };
  }

  return {
    ok: true,
    status: 200,
    tokens,
  };
}

export async function POST(request: NextRequest) {
  const refreshResult = await requestTokenRotation(request);

  if (!refreshResult.ok || !refreshResult.tokens) {
    const response = NextResponse.json(
      { error: refreshResult.message ?? 'Unable to refresh admin session' },
      { status: refreshResult.status },
    );
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ success: true });
  setAuthCookies(response, refreshResult.tokens);
  return response;
}

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'));
  const refreshResult = await requestTokenRotation(request);

  if (!refreshResult.ok || !refreshResult.tokens) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  setAuthCookies(response, refreshResult.tokens);
  return response;
}
