import { NextRequest, NextResponse } from 'next/server';
import { SUPER_SESSION_MAX_AGE, isSuperKeyConfigured, isSuperRequest } from '@/lib/superAuth';

/**
 * GET /api/super/session
 * 只回報「此瀏覽器是否已以超管登入」，不會回傳任何密碼或金鑰。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const active = isSuperRequest(request);
  return NextResponse.json(
    {
      success: true,
      active,
      configured: isSuperKeyConfigured(),
      maxAge: SUPER_SESSION_MAX_AGE,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
