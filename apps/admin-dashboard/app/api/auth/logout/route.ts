import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api/v1';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('wc_admin_at')?.value;
  const refreshToken = cookieStore.get('wc_admin_rt')?.value;

  if (accessToken) {
    await fetch(`${API_BASE_URL}/admin/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('wc_admin_at');
  response.cookies.delete('wc_admin_rt');
  return response;
}
