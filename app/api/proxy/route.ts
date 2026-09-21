import { NextRequest, NextResponse } from 'next/server';
import { DISTRICTS } from '@/lib/district';
import { getPlatformKey, isPlatformPassword } from '@/lib/platformAccount';

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
 * 使用者在該區登入頁（ADC 密鑰／秘書 STAFF_TOKEN 欄）直接輸入平台密碼即可：
 *   1. 本代理以 Vercel 環境變數 SUPER_KEY 直接比對該輸入（明文比對，不經 Google）
 *   2. 正確 → 移除該欄位，改為注入 platformAdmin = true
 *   3. 不正確 → 原樣轉發（各區 GS 自然拒絕；該區自己的密鑰照舊運作）
 * 密碼永遠唔會送到 Google Sheet；各區只會知道「這是平台帳戶」。
 *
 * 診斷：GET /api/proxy?districtCode=SKW&action=proxyDebug
 *       需要 request header「x-dbs-super-key: <SUPER_KEY>」，否則一律 401。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 憑證欄位：平台帳戶可以用在秘書（staffToken）或 ADC（adcToken）登入欄 */
const CREDENTIAL_KEYS = ['staffToken', 'adcToken', 'token'] as const;

/**
 * 檢查 body 內是否有平台密碼。
 * 回傳 { platformAdmin: true } 代表已通過核對；否則 null（原樣放行）。
 */
function inspectCredentials(body: Record<string, any>): { platformAdmin?: true } | null {
  if (!getPlatformKey()) return null;

  for (const key of CREDENTIAL_KEYS) {
    const value = body?.[key];
    if (value == null || value === '') continue;
    if (!isPlatformPassword(value)) continue;

    // 成功：移除使用者輸入（密碼不外流），改為注入平台身份標記
    delete body[key];
    delete body.platformAdmin;
    body.platformAdmin = true;
    return { platformAdmin: true };
  }

  return null;
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
  // 安全：客戶端自行送上的 platformAdmin 一律刪除，只有本代理核對密碼成功後才會注入
  delete params.platformAdmin;
  const inspected = inspectCredentials(params);

  // Build target URL for GET
  const url = new URL(district.apiBase);
  url.searchParams.set('action', action);
  url.searchParams.set('apiKey', apiKey);
  searchParams.forEach((value, key) => {
    if (key === 'districtCode' || key === 'action' || key === 'platformAdmin') return;
    if (inspected?.platformAdmin && (CREDENTIAL_KEYS as readonly string[]).includes(key)) return;
    url.searchParams.set(key, value);
  });
  if (inspected?.platformAdmin) url.searchParams.set('platformAdmin', 'true');

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
  // 安全：客戶端自行送上的 platformAdmin 一律刪除，只有本代理核對密碼成功後才會注入
  delete rest.platformAdmin;
  inspectCredentials(rest);

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
