import { NextRequest, NextResponse } from 'next/server';
import { DISTRICTS } from '@/lib/district';
import { isSameOriginRequest, isSuperRequest } from '@/lib/superAuth';

/**
 * POST /api/super/proxy   （超管全域代理）
 * GET  /api/super/proxy?districtCode=SKW&action=getPrintList&...
 *
 * 設計：
 * - 只在「已通過 /api/super/login 並持有超管 session cookie」時才可用。
 * - 前端不需要（亦不應該）知道任何區的 STAFF_TOKEN / ADC_TOKEN：
 *   由伺服器從 Vercel 環境變數注入：
 *     DBS_{區碼}_APIKEY      （必填）區 API Key
 *     DBS_{區碼}_STAFF_KEY   （選填）該區秘書 STAFF_TOKEN，可令超管免密鑰操作該區後台
 *     DBS_{區碼}_ADC_KEY     （選填）該區 ADC_TOKEN，可令超管免密鑰使用 ADC 審批
 * - 前端送來的 apiKey / staffToken / adcToken 一律被覆寫，唔會回傳原值。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getDistrict(districtCode: string | null | undefined) {
  if (!districtCode) return null;
  return DISTRICTS[districtCode as keyof typeof DISTRICTS] || null;
}

function envSuffix(districtCode: string) {
  return districtCode.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function readKey(districtCode: string, kind: 'APIKEY' | 'STAFF_KEY' | 'ADC_KEY') {
  const suffix = envSuffix(districtCode);
  const names = [`DBS_${suffix}_${kind}`, `DBS_${suffix.toLowerCase()}_${kind}`];
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: '需要超管登入（請先到 /super 登入）' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } }
  );
}

async function forward(district: { apiBase: string }, body: Record<string, any>) {
  const res = await fetch(district.apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const text = await res.text();
  if (/<!doctype html|<html/i.test(text)) {
    return NextResponse.json(
      { success: false, error: 'Apps Script 未公開（Deploy → Anyone）' },
      { status: 502 }
    );
  }
  try {
    return NextResponse.json(JSON.parse(text), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Apps Script 回傳格式錯誤' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSuperRequest(request)) return unauthorized();
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, error: '來源不合法' }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { districtCode, action, ...rest } = body || {};
  const district = getDistrict(districtCode);
  if (!district) {
    return NextResponse.json({ success: false, error: 'Missing / unknown districtCode' }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
  }

  const apiKey = readKey(districtCode, 'APIKEY');
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: `此區未設定 API Key：請在 Vercel 環境變數加入 DBS_${districtCode}_APIKEY 後重新部署。`,
      },
      { status: 500 }
    );
  }

  const staffKey = readKey(districtCode, 'STAFF_KEY');
  const adcKey = readKey(districtCode, 'ADC_KEY');

  const payload: Record<string, any> = { ...rest, action, apiKey };
  delete payload.districtCode;

  // 伺服器端注入權限；環境變數優先，其次才接受超管在畫面手動輸入（作後備）
  payload.staffToken = staffKey || String(rest?.staffToken || '');
  payload.adcToken = adcKey || String(rest?.adcToken || '');

  try {
    return await forward(district, payload);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Proxy fetch failed' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isSuperRequest(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const districtCode = searchParams.get('districtCode');
  const action = searchParams.get('action') || 'getHealthCheck';
  const district = getDistrict(districtCode);
  if (!district) {
    return NextResponse.json({ success: false, error: 'Missing / unknown districtCode' }, { status: 400 });
  }

  const apiKey = readKey(districtCode as string, 'APIKEY');
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: `此區未設定 API Key：請在 Vercel 環境變數加入 DBS_${districtCode}_APIKEY 後重新部署。`,
      },
      { status: 500 }
    );
  }

  const url = new URL(district.apiBase);
  url.searchParams.set('action', action);
  url.searchParams.set('apiKey', apiKey);

  const staffKey = readKey(districtCode as string, 'STAFF_KEY');
  const adcKey = readKey(districtCode as string, 'ADC_KEY');

  searchParams.forEach((value, key) => {
    if (key === 'districtCode' || key === 'action') return;
    url.searchParams.set(key, value);
  });

  // 需要權限的 GET action：由伺服器補上權限
  if (!url.searchParams.get('token') && !url.searchParams.get('staffToken')) {
    if (staffKey) url.searchParams.set('token', staffKey);
  }
  if (!url.searchParams.get('adcToken') && adcKey) {
    url.searchParams.set('adcToken', adcKey);
  }

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const text = await res.text();
    if (/<!doctype html|<html/i.test(text)) {
      return NextResponse.json(
        { success: false, error: 'Apps Script 未公開（Deploy → Anyone）' },
        { status: 502 }
      );
    }
    return NextResponse.json(JSON.parse(text), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Proxy fetch failed' },
      { status: 502 }
    );
  }
}
