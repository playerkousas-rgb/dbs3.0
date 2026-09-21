import { NextRequest, NextResponse } from 'next/server';
import { DISTRICTS } from '@/lib/district';
import {
  clearFailedAttempts,
  clientIp,
  getPlatformKey,
  isPlatformShaped,
  isRateLimited,
  noteFailedAttempt,
  resolveSuperAccount,
} from '@/lib/platformAccount';

/**
 * DBS 3.0 — API Proxy
 * 
 * 前端不直接呼叫 Google Apps Script，而是經此代理。
 * API Key 存在 Vercel 環境變數，不會出現在前端 JS。
 * 
 * 環境變數命名：DBS_{區碼}_APIKEY
 * 例如：DBS_SKW_APIKEY=ak_xxxxxxxx
 * 
 * GET: /api/proxy?districtCode=SKW&action=xxx&...
 * POST: /api/proxy (body: { districtCode, action, ... })
 *
 * ── 平台帳戶（後備通道）────────────────────────────
 * 如使用者輸入「帳號:密碼」（例如 sheep:xxxxxxxx），本代理會：
 *   1. 以 Vercel 環境變數 SUPER_KEY 直接比對密碼（明文比對，不經 Google）
 *   2. 密碼正確 → 移除憑證，改為在請求加上 superAccount（帳戶名）
 *   3. 密碼錯誤 → 憑證原樣轉發（各區 GS 自然拒絕），並計入防暴力破解
 * 密碼永遠不會送到 Google Sheet；各區只會見到帳戶名。
 *
 * 診斷：GET /api/proxy?districtCode=SKW&action=proxyDebug
 *       需要 request header「x-dbs-super-key: <SUPER_KEY>」，否則一律 401。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 憑證欄位：平台帳戶可以用在秘書（staffToken）或 ADC（adcToken）登入欄 */
const CREDENTIAL_KEYS = ['staffToken', 'adcToken', 'token'] as const;

/**
 * 檢查 body 內是否有平台帳戶憑證。
 * 回傳：{ superAccount } 或 { failed: true } 或 null
 */
function inspectCredentials(body: Record<string, any>): { superAccount?: string; failed?: boolean; shaped?: boolean } | null {
  if (!getPlatformKey()) return null;

  let shaped = false;

  for (const key of CREDENTIAL_KEYS) {
    const value = body?.[key];
    if (value == null || value === '') continue;

    // 只有「帳號:密碼」形狀才與平台帳戶有關；其他（例如區自己的 token）一律照舊轉發
    if (!isPlatformShaped(value)) continue;
    shaped = true;

    const superAccount = resolveSuperAccount(value);
    if (superAccount) {
      // 成功：移除憑證（密碼不外流），改注入帳戶名
      delete body[key];
      delete body.superAccount;
      body.superAccount = superAccount;
      return { superAccount, shaped: true };
    }

    // 平台帳戶形狀但密碼錯：移除憑證，唔會送去 Google
    delete body[key];
    return { failed: true, shaped: true };
  }

  return shaped ? { shaped: true } : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const districtCode = searchParams.get('districtCode');
  const action = searchParams.get('action') || 'getHealthCheck';

  if (!districtCode) {
    return NextResponse.json({ success: false, error: 'Missing districtCode' }, { status: 400 });
  }

  const district = DISTRICTS[districtCode as keyof typeof DISTRICTS];
  if (!district) {
    return NextResponse.json({ success: false, error: 'Unknown district' }, { status: 400 });
  }

  const envVarName = `DBS_${districtCode}_APIKEY`;
  const apiKey = process.env[envVarName] || '';

  // 診斷端點：只限知道平台密碼的人（header 傳入，不會留在 URL／瀏覽器記錄）
  if (action === 'proxyDebug') {
    const platformKey = getPlatformKey();
    const provided = request.headers.get('x-dbs-super-key') || '';
    if (!platformKey || provided !== platformKey) {
      return NextResponse.json(
        { success: false, error: 'Not available' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json({
      success: true, debug: true,
      districtCode, districtName: district.name,
      envVarName, apiKeyFound: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 4) + '…' : '(empty)',
      allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('DBS_')),
      apiBaseMasked: (() => {
        try {
          const url = new URL(district.apiBase);
          return `${url.origin}/macros/s/…/exec`;
        } catch {
          return '(invalid url)';
        }
      })(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: `District API Key not set (need env var ${envVarName}), please contact platform admin`,
    }, { status: 500 });
  }

  // 平台帳戶（GET 形式）
  const params: Record<string, any> = {};
  searchParams.forEach((value, key) => { params[key] = value; });
  // 安全：一律先刪除客戶端自行送上的 superAccount（只有本代理核對密碼成功後才會補回）
  delete params.superAccount;
  const ip = clientIp(request);
  const inspected = inspectCredentials(params);
  if (inspected?.shaped && isRateLimited(ip)) {
    // 只有「帳號:密碼」形狀的嘗試才會被限流，區自己的 token 不受影響
    return NextResponse.json({ success: false, error: '嘗試次數過多，請稍後再試' }, { status: 429 });
  }
  if (inspected?.failed) {
    noteFailedAttempt(ip);
    return NextResponse.json({ success: false, error: '權限不足' }, { status: 401 });
  }
  if (inspected?.superAccount) clearFailedAttempts(ip);

  // Build target URL for GET
  const url = new URL(district.apiBase);
  url.searchParams.set('action', action);
  url.searchParams.set('apiKey', apiKey);
  searchParams.forEach((value, key) => {
    if (key === 'districtCode' || key === 'action' || key === 'superAccount') return;
    if (inspected?.superAccount && (CREDENTIAL_KEYS as readonly string[]).includes(key)) return;
    url.searchParams.set(key, value);
  });
  if (inspected?.superAccount) {
    url.searchParams.delete('superAccount');
    url.searchParams.set('superAccount', inspected.superAccount);
  }

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const text = await res.text();
    if (/<!doctype html|<html/i.test(text)) {
      return NextResponse.json({ success: false, error: 'Apps Script not public (Deploy → Anyone)' }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Proxy fetch failed' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { districtCode, action, ...rest } = body;

  if (!districtCode) {
    return NextResponse.json({ success: false, error: 'Missing districtCode' }, { status: 400 });
  }

  const district = DISTRICTS[districtCode as keyof typeof DISTRICTS];
  if (!district) {
    return NextResponse.json({ success: false, error: 'Unknown district' }, { status: 400 });
  }

  const envVarName = `DBS_${districtCode}_APIKEY`;
  const apiKey = process.env[envVarName] || '';

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: `District API Key not set (need env var ${envVarName}), please contact platform admin`,
    }, { status: 500 });
  }

  // 平台帳戶（POST 形式）
  // 安全：一律先刪除客戶端自行送上的 superAccount（只有本代理核對密碼成功後才會補回）
  delete rest.superAccount;
  const ip = clientIp(request);
  const inspected = inspectCredentials(rest);
  if (inspected?.shaped && isRateLimited(ip)) {
    // 只有「帳號:密碼」形狀的嘗試才會被限流，區自己的 token 不受影響
    return NextResponse.json({ success: false, error: '嘗試次數過多，請稍後再試' }, { status: 429 });
  }
  if (inspected?.failed) {
    noteFailedAttempt(ip);
    return NextResponse.json({ success: false, error: '權限不足' }, { status: 401 });
  }
  if (inspected?.superAccount) clearFailedAttempts(ip);

  // POST to Apps Script with apiKey in body
  const postBody = { action, apiKey, ...rest };

  try {
    const res = await fetch(district.apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(postBody),
    });
    const text = await res.text();
    if (/<!doctype html|<html/i.test(text)) {
      return NextResponse.json({ success: false, error: 'Apps Script not public (Deploy → Anyone)' }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Proxy fetch failed' }, { status: 502 });
  }
}
