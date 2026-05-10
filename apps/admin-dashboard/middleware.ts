import { type NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

// Mobile UA patterns — block phones and tablets from the admin dashboard
const MOBILE_UA_PATTERN =
  /android.*mobile|iphone|ipod|blackberry|iemobile|opera mini|mobile safari|windows phone/i;

const ACCESS_COOKIE = 'wc_admin_at';
const REFRESH_COOKIE = 'wc_admin_rt';
const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 60;
const ACCESS_COOKIE_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface RefreshTokenPayload {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt?: string;
}

const isDashboardRoute = (pathname: string) =>
  pathname === '/' ||
  pathname.startsWith('/sermons') ||
  pathname.startsWith('/programs') ||
  pathname.startsWith('/sessions') ||
  pathname.startsWith('/preachers') ||
  pathname.startsWith('/topics') ||
  pathname.startsWith('/uploads') ||
  pathname.startsWith('/upload-jobs') ||
  pathname.startsWith('/ai-review') ||
  pathname.startsWith('/users') ||
  pathname.startsWith('/audit-logs') ||
  pathname.startsWith('/settings');

const decodeBase64Url = (value: string) => {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
};

const getJwtExpiry = (token: string): number | null => {
  const parts = token.split('.');
  const payloadSegment = parts[1];
  if (!payloadSegment) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as { exp?: number };
    if (!payload.exp) {
      return null;
    }
    return payload.exp;
  } catch {
    return null;
  }
};

const shouldRefreshAccessToken = (token: string) => {
  const exp = getJwtExpiry(token);
  if (!exp) {
    return true;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp - nowSeconds <= ACCESS_TOKEN_REFRESH_BUFFER_SECONDS;
};

const resolveRefreshMaxAge = (refreshTokenExpiresAt?: string): number => {
  if (!refreshTokenExpiresAt) {
    return REFRESH_COOKIE_MAX_AGE_SECONDS;
  }

  const expiresAtMs = new Date(refreshTokenExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return REFRESH_COOKIE_MAX_AGE_SECONDS;
  }

  const deltaSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);
  return Math.max(0, deltaSeconds);
};

const setAuthCookies = (response: NextResponse, tokens: RefreshTokenPayload) => {
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
    maxAge: resolveRefreshMaxAge(tokens.refreshTokenExpiresAt),
  });
};

const clearAuthCookies = (response: NextResponse) => {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
};

const requestTokenRotation = async (request: NextRequest, refreshToken: string) => {
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

  if (
    !backendResponse.ok ||
    payload?.success === false ||
    !payload?.data?.tokens?.accessToken ||
    !payload?.data?.tokens?.refreshToken
  ) {
    return {
      ok: false,
      status: backendResponse.status,
      message: payload?.message ?? 'Unable to refresh admin session',
    };
  }

  return {
    ok: true,
    tokens: payload.data.tokens,
  };
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === '/login';
  const isProtectedRoute = isDashboardRoute(pathname);
  const isMobileBlockedPage = pathname === '/mobile-blocked';

  // Block mobile devices from the admin dashboard — it is desktop-only
  if (!isMobileBlockedPage && !pathname.startsWith('/api/')) {
    const ua = request.headers.get('user-agent') ?? '';
    if (MOBILE_UA_PATTERN.test(ua)) {
      return NextResponse.redirect(new URL('/mobile-blocked', request.url));
    }
  }

  if (!isLoginRoute && !isProtectedRoute) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const accessTokenNeedsRefresh = accessToken ? shouldRefreshAccessToken(accessToken) : true;

  if (accessToken && !accessTokenNeedsRefresh) {
    if (isLoginRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (refreshToken) {
    const rotation = await requestTokenRotation(request, refreshToken);
    if (rotation.ok && rotation.tokens) {
      const response = isLoginRoute
        ? NextResponse.redirect(new URL('/', request.url))
        : NextResponse.next();
      setAuthCookies(response, rotation.tokens);
      return response;
    }
  }

  if (isProtectedRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.next();
  clearAuthCookies(response);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
