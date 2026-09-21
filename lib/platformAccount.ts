/**
 * 平台帳戶（後備通道）— 伺服器端憑證處理
 *
 * 設計：
 * - 帳戶名寫在各區 Google Sheet 的 Config（SUPER_ACCOUNT，預設 sheep），只是一個名。
 * - 密碼只存在這裡（Vercel 環境變數 SUPER_KEY），唔會傳去 Google Sheet，亦唔會入前端 JS。
 * - 使用者於該區登入頁輸入「帳號:密碼」→ 本模組核對密碼 → 才在轉發的請求加上 superAccount。
 * - 各區 GS 只核對帳戶名；冇密碼一樣入唔到，而區方亦永遠拎唔到平台密碼。
 */

import crypto from 'crypto';

const PLATFORM_KEY_ENV_NAMES = ['SUPER_KEY', 'DBS_SUPER_KEY', 'super_key'];

/** 讀取平台密碼（只讀伺服器端環境變數） */
export function getPlatformKey(): string {
  for (const name of PLATFORM_KEY_ENV_NAMES) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

/** 固定時間比較，避免 timing attack（比較明文，不使用雜湊） */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface ParsedCredential {
  account: string;
  password: string;
}

/**
 * 解析「帳號:密碼」格式。
 * 只在確實有分隔號、且帳號非空時才視為平台帳戶憑證；
 * 其他情況（例如某區 token 本身含冒號）一律回 null，交由原本流程處理。
 */
export function parseCredential(value: unknown): ParsedCredential | null {
  const raw = value == null ? '' : String(value);
  const idx = raw.indexOf(':');
  if (idx <= 0) return null;
  const account = raw.slice(0, idx).trim();
  const password = raw.slice(idx + 1);
  if (!account || !password) return null;
  return { account, password };
}

/** 密碼是否正確 */
export function verifyPlatformPassword(password: string): boolean {
  const key = getPlatformKey();
  if (!key) return false;
  return safeEqual(password, key);
}

/**
 * 若憑證屬平台帳戶（帳號:密碼 且密碼正確），回傳要注入 GS 的 superAccount；
 * 否則回 null（包括：格式不符、密碼錯、未設定 SUPER_KEY）。
 */
export function resolveSuperAccount(value: unknown): string | null {
  const parsed = parseCredential(value);
  if (!parsed) return null;
  if (!verifyPlatformPassword(parsed.password)) return null;
  return parsed.account;
}

/** 是否屬「疑似平台帳戶嘗試」（有帳號:密碼格式但密碼錯）— 用於防暴力破解計數 */
export function isFailedPlatformAttempt(value: unknown): boolean {
  const parsed = parseCredential(value);
  if (!parsed) return false;
  if (!getPlatformKey()) return false;
  return !verifyPlatformPassword(parsed.password);
}

/* ---------- 防暴力破解（記憶體計數，每個 instance 獨立） ---------- */
const MAX_ATTEMPTS = 30;
const WINDOW_MS = 10 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

export function noteFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record || record.resetAt <= now) {
    failedAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  record.count += 1;
  if (failedAttempts.size > 1000) {
    failedAttempts.forEach((value, key) => {
      if (value.resetAt <= now) failedAttempts.delete(key);
    });
  }
}

/** 該憑證是否屬「平台帳戶形狀」（帳號:密碼）— 只有這種形狀才會受限流影響 */
export function isPlatformShaped(value: unknown): boolean {
  return parseCredential(value) !== null;
}

export function isRateLimited(ip: string): boolean {
  const record = failedAttempts.get(ip);
  if (!record || record.resetAt <= Date.now()) return false;
  return record.count >= MAX_ATTEMPTS;
}

export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim();
  return ip || request.headers.get('x-real-ip') || 'unknown';
}
