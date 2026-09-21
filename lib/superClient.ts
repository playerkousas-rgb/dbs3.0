'use client';

/**
 * 超管（Super Admin）前端客戶端
 * - 登入／登出／session 檢查／平台總覽
 * - 密碼只會送往 /api/super/login 由伺服器與 Vercel 環境變數比對，
 *   前端不會儲存密碼（亦不會放入 localStorage / URL）。
 */

import { DISTRICT_LIST, getStoredDistrictCode, setStoredDistrictCode, type DistrictCode } from './district';
import { setSuperMode } from './api';

export interface SuperHealth {
  ok: boolean;
  districtName?: string;
  systemVersion?: string;
  assignmentModeLabel?: string;
  ready?: boolean;
  webAppUrlSet?: boolean;
  spreadsheetName?: string;
  error?: string;
}

export interface SuperDistrictOverview {
  code: string;
  name: string;
  status: 'live' | 'testing' | 'disabled';
  note: string;
  apiBaseMasked: string;
  env: { apiKeySet: boolean; staffKeySet: boolean; adcKeySet: boolean; envPrefix: string };
  health: SuperHealth;
}

export async function fetchSuperSession(): Promise<{ active: boolean; configured: boolean }> {
  try {
    const res = await fetch('/api/super/session', { cache: 'no-store', credentials: 'same-origin' });
    const data = await res.json();
    return { active: !!data?.active, configured: data?.configured !== false };
  } catch {
    return { active: false, configured: true };
  }
}

/**
 * 確保超管模式有目標區碼（未選區時自動帶入第一個未暫停的區）
 * 回傳目前超管模式要操作的區碼。
 */
export function ensureSuperDistrictTarget(): string | null {
  const stored = getStoredDistrictCode();
  if (stored) {
    setSuperMode(true, stored);
    return stored;
  }
  const fallback = DISTRICT_LIST.find(d => d.status !== 'disabled') || DISTRICT_LIST[0];
  if (!fallback) return null;
  setStoredDistrictCode(fallback.code as DistrictCode);
  setSuperMode(true, fallback.code);
  return fallback.code;
}

/**
 * 檢查此瀏覽器有無有效超管 session；
 * 有的話即開啟「超管模式」，令 api.* 改經 /api/super/proxy。
 */
export async function detectSuperSession(): Promise<boolean> {
  const { active } = await fetchSuperSession();
  if (active) {
    ensureSuperDistrictTarget();
    return true;
  }
  setSuperMode(false, null);
  return false;
}

export async function superLogin(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/super/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `登入失敗（HTTP ${res.status}）` };
    }
    ensureSuperDistrictTarget();
    return { success: true };
  } catch {
    return { success: false, error: '網絡錯誤，請稍後重試' };
  }
}

export async function superLogout(): Promise<void> {
  try {
    await fetch('/api/super/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch {
    /* ignore */
  }
  setSuperMode(false, null);
}

export async function fetchSuperOverview(): Promise<{
  success: boolean;
  error?: string;
  districtCount?: number;
  districts?: SuperDistrictOverview[];
}> {
  try {
    const res = await fetch('/api/super/overview', { cache: 'no-store', credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `載入失敗（HTTP ${res.status}）` };
    }
    return data;
  } catch {
    return { success: false, error: '網絡錯誤' };
  }
}
