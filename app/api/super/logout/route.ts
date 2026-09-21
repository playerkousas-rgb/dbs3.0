import { NextResponse } from 'next/server';
import { superCookieBase } from '@/lib/superAuth';

/**
 * POST /api/super/logout — 清除超管 session cookie
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
  response.cookies.set({ ...superCookieBase(), value: '', maxAge: 0 });
  return response;
}
