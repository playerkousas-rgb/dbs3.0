import { NextRequest, NextResponse } from 'next/server';
import { DISTRICTS } from '@/lib/district';
import { isSuperRequest } from '@/lib/superAuth';

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
 * Debug: /api/proxy?districtCode=SKW&action=proxyDebug （只限超管 session，見下）
 *        超管請改用 /api/super/overview 或 /super 平台總覽
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  // 診斷端點：只限超管 session（避免公開外洩環境變數名稱、Key 前綴、Apps Script URL）
  if (action === 'proxyDebug') {
    if (!isSuperRequest(request)) {
      return NextResponse.json(
        { success: false, error: '此診斷端點只限超管使用（請先到 /super 登入）' },
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
