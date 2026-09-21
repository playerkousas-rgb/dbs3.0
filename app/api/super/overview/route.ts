import { NextRequest, NextResponse } from 'next/server';
import { DISTRICT_LIST } from '@/lib/district';
import { isSuperKeyConfigured, isSuperRequest } from '@/lib/superAuth';

/**
 * GET /api/super/overview
 * 超管專用：一次過檢查所有已接入區的狀態。
 *
 * 只會回報「環境變數有無設定」（boolean）與 health check 結果，
 * 不會回傳任何金鑰、token 或完整 Apps Script URL。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readKey(districtCode: string, kind: string): string {
  const suffix = districtCode.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return String(process.env[`DBS_${suffix}_${kind}`] || '').trim();
}

function maskApiBase(apiBase: string): string {
  try {
    const url = new URL(apiBase);
    const parts = url.pathname.split('/').filter(Boolean);
    const scriptId = parts[parts.length - 2] || '';
    const maskedId = scriptId.length > 8 ? `${scriptId.slice(0, 4)}…${scriptId.slice(-4)}` : '…';
    return `${url.origin}/macros/s/${maskedId}/exec`;
  } catch {
    return '(invalid url)';
  }
}

async function fetchHealth(apiBase: string, apiKey: string) {
  if (!apiKey) return { ok: false, error: '未設定 API Key' };
  const url = new URL(apiBase);
  url.searchParams.set('action', 'getHealthCheck');
  url.searchParams.set('apiKey', apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url.toString(), { cache: 'no-store', signal: controller.signal });
    const text = await res.text();
    if (/<!doctype html|<html/i.test(text)) {
      return { ok: false, error: 'Apps Script 未公開（Deploy → Anyone）' };
    }
    const data = JSON.parse(text);
    return {
      ok: !!data.success,
      districtName: data.districtName || '',
      systemVersion: data.systemVersion || '',
      assignmentModeLabel: data.assignmentModeLabel || '',
      ready: !!data.ready,
      webAppUrlSet: !!data.checks?.webAppUrlSet,
      spreadsheetName: data.spreadsheetName || '',
    };
  } catch (err: any) {
    return { ok: false, error: err?.name === 'AbortError' ? '連線逾時' : err?.message || '連線失敗' };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  if (!isSuperRequest(request)) {
    return NextResponse.json(
      { success: false, error: '需要超管登入（請先到 /super 登入）' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const districts = await Promise.all(
    DISTRICT_LIST.map(async info => {
      const apiKey = readKey(info.code, 'APIKEY');
      const staffKey = readKey(info.code, 'STAFF_KEY');
      const adcKey = readKey(info.code, 'ADC_KEY');
      const health = await fetchHealth(info.apiBase, apiKey);
      return {
        code: info.code,
        name: info.name,
        status: info.status,
        note: info.note || '',
        apiBaseMasked: maskApiBase(info.apiBase),
        env: {
          apiKeySet: !!apiKey,
          staffKeySet: !!staffKey,
          adcKeySet: !!adcKey,
          envPrefix: `DBS_${info.code}`,
        },
        health,
      };
    })
  );

  return NextResponse.json(
    {
      success: true,
      superKeyConfigured: isSuperKeyConfigured(),
      districtCount: districts.length,
      districts,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
