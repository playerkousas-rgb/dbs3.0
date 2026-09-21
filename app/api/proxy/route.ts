import { NextRequest, NextResponse } from 'next/server';
import { DISTRICTS } from '@/lib/district';

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
 * 診斷：GET /api/proxy?districtCode=SKW&action=proxyDebug
 *       需要 request header「x-dbs-super-key: <SUPER_KEY>」，否則一律 401。
 *       （原本無需驗證，會公開外洩環境變數名稱及 Key 前綴，已收緊。）
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 平台密鑰（與選單「🔐 設定平台萬用密鑰」用的同一組；只讀伺服器端環境變數） */
function readPlatformKey(): string {
  const names = ['SUPER_KEY', 'DBS_SUPER_KEY', 'super_key'];
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
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

  // 診斷端點：只限知道平台密鑰的人（header 傳入，不會留在 URL／瀏覽器記錄）
  if (action === 'proxyDebug') {
    const platformKey = readPlatformKey();
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

  // Build target URL for GET
  const url = new URL(district.apiBase);
  url.searchParams.set('action', action);
  url.searchParams.set('apiKey', apiKey);
  searchParams.forEach((value, key) => {
    if (key !== 'districtCode' && key !== 'action') {
      url.searchParams.set(key, value);
    }
  });

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
