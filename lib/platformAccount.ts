/**
 * 平台帳戶（後備通道）— 伺服器端憑證處理
 *
 * 設計（2026-09 簡化版）：
 * - 平台密碼只存在 Vercel 環境變數 SUPER_KEY（明文，直接對密碼）。
 * - 使用者在該區登入頁（ADC 密鑰／秘書 STAFF_TOKEN 欄）**直接打平台密碼**即可。
 * - 本代理核對成功後，會移除該欄位，改為注入 platformAdmin = true。
 * - 密碼永遠唔會送到 Google Sheet（Vercel 比對成功即丟棄）。
 * - 各區 Config 的 SUPER_ACCOUNT（預設 sheep）只作標籤／開關：清空＝停用該區後備通道。
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

/** 固定時間比較，避免 timing attack（明文直接比對，不使用雜湊） */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** 是否為平台密碼 */
export function isPlatformPassword(value: unknown): boolean {
  const key = getPlatformKey();
  if (!key) return false;
  const raw = value == null ? '' : String(value);
  if (!raw) return false;
  return safeEqual(raw, key);
}

/** 是否已設定平台密碼（未設定時後備通道完全停用） */
export function isPlatformPasswordConfigured(): boolean {
  return getPlatformKey().length > 0;
}
