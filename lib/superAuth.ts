/**
 * DBS 3.0 — 超管（Super Admin）伺服器端驗證
 *
 * 安全設計：
 * - 超管密碼只存在 Vercel 環境變數（SUPER_KEY），不會出現在前端 JS、不會存在 Google Sheet、不會入 Git。
 * - 驗證只在伺服器（Node runtime）進行，使用 timing-safe 比較。
 * - 登入成功後簽發 HttpOnly + SameSite=Lax 的 session cookie（HMAC-SHA256 簽名，預設 8 小時）。
 * - 未設定 SUPER_KEY 時一律拒絕（fail closed），避免「冇設就等於冇鎖」。
 *
 * 環境變數：
 *   SUPER_KEY             （必填）超管登入密碼
 *   SUPER_SESSION_SECRET  （選填）session 簽名用 secret；未設會用 SUPER_KEY 派生
 */

import crypto from 'crypto';
import type { NextRequest } from 'next/server';

export const SUPER_COOKIE_NAME = 'dbs_super_session';

/** session 有效期（秒）— 預設 8 小時 */
export const SUPER_SESSION_MAX_AGE = 60 * 60 * 8;

/** 接受多種命名，方便 Vercel 上大小寫不同 */
const SUPER_KEY_ENV_NAMES = ['SUPER_KEY', 'DBS_SUPER_KEY', 'super_key'];

function readSuperKey(): string {
  for (const name of SUPER_KEY_ENV_NAMES) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

export function isSuperKeyConfigured(): boolean {
  return readSuperKey().length > 0;
}

function sessionSecret(): string {
  const explicit = (process.env.SUPER_SESSION_SECRET || '').trim();
  if (explicit) return explicit;
  return readSuperKey();
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

/** 固定時間比較，避免 timing attack */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** 驗證超管密碼（只在伺服器呼叫） */
export function verifySuperKey(input: unknown): boolean {
  const key = readSuperKey();
  if (!key) return false;
  return safeEqual(String(input ?? ''), key);
}

/** 產生簽名 session token */
export function createSuperSessionToken(now: number = Date.now()): string {
  const payload = base64UrlEncode(
    JSON.stringify({ v: 1, role: 'super', iat: now, exp: now + SUPER_SESSION_MAX_AGE * 1000 })
  );
  const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/** 驗證 session token（簽名 + 到期） */
export function verifySuperSessionToken(
  token: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  if (!safeEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(base64UrlDecode(payload));
    return data?.v === 1 && typeof data.exp === 'number' && data.exp > now;
  } catch {
    return false;
  }
}

/** 由 request 檢查是否已以超管登入 */
export function isSuperRequest(request: NextRequest): boolean {
  return verifySuperSessionToken(request.cookies.get(SUPER_COOKIE_NAME)?.value);
}

/** cookie 設定（登入用） */
export function superCookieBase() {
  return {
    name: SUPER_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/** 簡單來源檢查（防 CSRF，SameSite=Lax 之外再加一層） */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // 非瀏覽器／同站請求可能沒有 Origin
  const host = request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
