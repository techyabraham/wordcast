import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

async function forward(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('wc_admin_at')?.value;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin/, '');
  const targetUrl = `${API_BASE_URL}${path}${url.search}`;

  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('content-type') ?? 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    const body = await request.text();
    if (body.length) {
      init.body = body;
    }
  }

  const response = await fetch(targetUrl, init);
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  }

  const text = await response.text();
  return new NextResponse(text, { status: response.status });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
