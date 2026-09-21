import { NextRequest, NextResponse } from 'next/server';
import {
  SUPER_SESSION_MAX_AGE,
  createSuperSessionToken,
  isSuperKeyConfigured,
  superCookieBase,
  verifySuperKey,
} from '@/lib/superAuth';

/**
 * POST /api/super/login
 * body: { password }
 *
 * 密碼只在伺服器與 Vercel 環境變數（SUPER_KEY）比對，
 * 前端永遠不會取得密碼，也不會取得可重用的 token 明文。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

type AttemptRecord = { count: number; resetAt: number };
const attempts = new Map<string, AttemptRecord>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim();
  return ip || request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || record.resetAt <= now) return { allowed: true, retryAfterSeconds: 0 };
  if (record.count < MAX_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) };
}

function recordFailure(ip: string) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || record.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  record.count += 1;
  if (attempts.size > 500) {
    attempts.forEach((value, key) => {
      if (value.resetAt <= now) attempts.delete(key);
    });
  }
}

export async function POST(request: NextRequest) {
  if (!isSuperKeyConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          '伺服器未設定 SUPER_KEY。請到 Vercel → Project → Settings → Environment Variables 新增 SUPER_KEY 後重新部署。',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const ip = clientIp(request);
  const gate = checkRateLimit(ip);
  if (!gate.allowed) {
    return NextResponse.json(
      { success: false, error: `嘗試次數過多，請於 ${gate.retryAfterSeconds} 秒後再試。` },
      { status: 429, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!verifySuperKey(body?.password)) {
    recordFailure(ip);
    return NextResponse.json(
      { success: false, error: '超管密碼錯誤' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  attempts.delete(ip);

  const response = NextResponse.json(
    { success: true, role: 'super', expiresIn: SUPER_SESSION_MAX_AGE },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );

  response.cookies.set({
    ...superCookieBase(),
    value: createSuperSessionToken(),
    maxAge: SUPER_SESSION_MAX_AGE,
  });

  return response;
}
