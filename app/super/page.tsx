'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminConsole } from '@/components/AdminConsole';
import { DISTRICT_LIST, getStoredDistrictCode, isDistrictCode, setStoredDistrictCode } from '@/lib/district';
import { setSuperMode } from '@/lib/api';
import type { SuperDistrictOverview } from '@/lib/superClient';
import {
  fetchSuperSession,
  fetchSuperOverview,
  superLogin,
  superLogout,
} from '@/lib/superClient';

/**
 * /super — 平台超管控制台（最高權限）
 *
 * 安全要點：
 * - 超管密碼只存 Vercel 環境變數 SUPER_KEY，由 /api/super/login 於伺服器端比對。
 * - 登入後簽發 HttpOnly session cookie；密碼不會進入 localStorage / URL / 前端 JS。
 * - 全域操作時，各區的 API Key / STAFF_KEY / ADC_KEY 由伺服器端注入，前端完全不接觸。
 */

type Tab = 'overview' | 'console' | 'env';

export default function SuperPage() {
  const [phase, setPhase] = useState<'checking' | 'login' | 'ready'>('checking');
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const [overview, setOverview] = useState<SuperDistrictOverview[] | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  const [districtCode, setDistrictCode] = useState<string>(() => {
    const stored = getStoredDistrictCode();
    return stored && isDistrictCode(stored) ? stored : DISTRICT_LIST[0]?.code || '';
  });

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError('');
    const res = await fetchSuperOverview();
    if (res.success && res.districts) {
      setOverview(res.districts);
    } else {
      setOverviewError(res.error || '載入失敗');
    }
    setOverviewLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await fetchSuperSession();
      if (!alive) return;
      setConfigured(session.configured);
      if (session.active) {
        // 同步開啟超管模式（api.* 之後會走 /api/super/proxy）
        if (isDistrictCode(districtCode)) setStoredDistrictCode(districtCode);
        setSuperMode(true, districtCode || null);
        setPhase('ready');
      } else {
        setPhase('login');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (phase === 'ready' && tab === 'overview') loadOverview();
  }, [phase, tab, loadOverview]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const res = await superLogin(password);
    setLoading(false);
    if (res.success) {
      setPassword('');
      setPhase('ready');
      setTab('overview');
      await loadOverview();
    } else {
      setError(res.error || '登入失敗');
    }
  };

  const handleLogout = async () => {
    await superLogout();
    setPhase('login');
    setOverview(null);
    setPassword('');
    setError('');
  };

  const selectDistrict = (code: string) => {
    if (!isDistrictCode(code)) return;
    setStoredDistrictCode(code);
    setSuperMode(true, code);
    setDistrictCode(code);
  };

  // ============================================================
  // 檢查中
  // ============================================================
  if (phase === 'checking') {
    return (
      <div style={{ background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '420px', margin: '0 auto', textAlign: 'center', color: '#666' }}>
        檢查超管登入狀態...
      </div>
    );
  }

  // ============================================================
  // 登入畫面
  // ============================================================
  if (phase === 'login') {
    return (
      <div style={{ background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '420px', margin: '0 auto' }}>
        <h2 style={{ color: '#003366', marginTop: 0 }}>🔐 平台超管登入</h2>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.8, marginBottom: '16px' }}>
          超管密碼只存放於 Vercel 環境變數 <code>SUPER_KEY</code>，不會出現在前端、Google Sheet 或 Git。
          <br />登入後可全域通行所有已接入地區，並使用最高權限功能。
        </p>

        {!configured && (
          <div style={{ background: '#fff3e0', border: '1px solid #ffb74d', color: '#e65100', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', lineHeight: 1.7 }}>
            ⚠️ 此部署尚未設定 <code>SUPER_KEY</code>。請到 Vercel → Project → Settings → Environment Variables 新增後重新部署。
          </div>
        )}

        <input
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && password) handleLogin(); }}
          placeholder="輸入超管密碼（SUPER_KEY）"
          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '16px', boxSizing: 'border-box' }}
        />
        <button
          onClick={handleLogin}
          disabled={loading || !password}
          style={{
            width: '100%', padding: '12px', background: loading || !password ? '#9aa7b4' : '#003366',
            color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600,
            cursor: loading || !password ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '驗證中...' : '超管登入'}
        </button>

        {error && <p style={{ color: '#c62828', marginTop: '12px', fontSize: '14px' }}>{error}</p>}

        <p style={{ marginTop: '20px', fontSize: '13px', color: '#888', lineHeight: 1.7, borderTop: '1px solid #eee', paddingTop: '14px' }}>
          區秘書（非超管）請返回 <Link href="/admin" style={{ color: '#1565c0', fontWeight: 600 }}>秘書後台</Link> 輸入該區 STAFF_TOKEN。
        </p>
      </div>
    );
  }

  // ============================================================
  // 超管已登入
  // ============================================================
  const current = overview?.find(d => d.code === districtCode);
  const staffKeySet = current?.env.staffKeySet;

  return (
    <div>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ color: '#003366', margin: 0 }}>🔐 平台超管控制台</h2>
          <div style={{ fontSize: '13px', color: '#2e7d32', marginTop: '4px' }}>
            ✅ 已登入（最高權限・全域通行）· session 有效期 8 小時
          </div>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
          登出超管
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} label="🌐 平台總覽" />
        <TabButton active={tab === 'console'} onClick={() => setTab('console')} label="📊 秘書後台（全域）" />
        <TabButton active={tab === 'env'} onClick={() => setTab('env')} label="🔑 環境變數" />
      </div>

      {tab === 'overview' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ color: '#003366', marginTop: 0, marginBottom: 0 }}>🌐 平台總覽</h3>
            <button onClick={loadOverview} disabled={overviewLoading} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #003366', background: 'white', color: '#003366', fontWeight: 700, cursor: 'pointer' }}>
              {overviewLoading ? '檢查中...' : '🔄 重新檢查'}
            </button>
          </div>
          <p style={{ color: '#666', fontSize: '13px', lineHeight: 1.7 }}>
            顯示各區連通狀態、環境變數是否齊全。<strong>不會顯示任何金鑰內容</strong>（只顯示有無設定）。
          </p>

          {overviewError && (
            <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px' }}>
              {overviewError}
            </div>
          )}

          {!overview && !overviewError && <p style={{ color: '#666' }}>{overviewLoading ? '檢查中...' : '沒有資料'}</p>}

          {overview && overview.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#003366', color: 'white' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>區碼</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>區名</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>狀態</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>API Key</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>秘書 Key</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>ADC Key</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>系統連通</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map((d, idx) => (
                    <tr key={d.code} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>{d.code}</td>
                      <td style={{ padding: '8px' }}>{d.name}</td>
                      <td style={{ padding: '8px' }}>{d.status === 'live' ? '已開通' : d.status === 'testing' ? '測試中' : '暫停'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{d.env.apiKeySet ? '✅' : '❌'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{d.env.staffKeySet ? '✅' : '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{d.env.adcKeySet ? '✅' : '—'}</td>
                      <td style={{ padding: '8px' }}>
                        {d.health.ok ? (
                          <span style={{ color: '#2e7d32' }}>
                            ✅ 已連通{d.health.ready ? '' : '（設定未完整）'}
                            <span style={{ color: '#666' }}> · {d.health.systemVersion || ''}{d.health.assignmentModeLabel ? ` · ${d.health.assignmentModeLabel}` : ''}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#c62828' }}>❌ {d.health.error || '連線失敗'}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          onClick={() => { selectDistrict(d.code); setTab('console'); }}
                          style={{ padding: '6px 12px', background: '#003366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          進入後台
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: '12px', fontSize: '12px', color: '#888', lineHeight: 1.7 }}>
                提示：若要免密鑰進入某區後台，請在 Vercel 加入 <code>DBS_區碼_STAFF_KEY</code>（值 = 該區 Google Sheet Config 的 STAFF_TOKEN）；
                如需 ADC 審批，另加 <code>DBS_區碼_ADC_KEY</code>。
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'console' && (
        <div>
          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ color: '#003366' }}>選擇地區：</strong>
            <select
              value={districtCode}
              onChange={e => selectDistrict(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontWeight: 600, color: '#003366' }}
            >
              {DISTRICT_LIST.map(d => (
                <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>
            <span style={{ fontSize: '12px', color: '#888' }}>
              （此選擇會同步到全站區碼，方便直接使用報考／查詢／主考等功能）
            </span>
          </div>

          {staffKeySet === false && (
            <div style={{ background: '#fff3e0', border: '1px solid #ffb74d', color: '#e65100', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.7 }}>
              ⚠️ 未偵測到 <code>DBS_{districtCode}_STAFF_KEY</code>：此區的後台操作（批核／證書／列印清單等）會失敗。
              請到 Vercel 環境變數加入該區的 STAFF_TOKEN 後重新部署，或改用該區秘書帳號登入。
            </div>
          )}

          {districtCode && (
            <AdminConsole
              key={districtCode}
              token=""
              superMode
              onLogout={handleLogout}
            />
          )}
        </div>
      )}

      {tab === 'env' && <EnvHelp />}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        background: active ? '#003366' : '#e0e0e0',
        color: active ? 'white' : '#333',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '13px'
      }}
    >
      {label}
    </button>
  );
}

function EnvHelp() {
  const rows = [
    { name: 'SUPER_KEY', required: '必填', desc: '超管登入密碼。只存 Vercel，不會出現在前端／Sheet／Git。' },
    { name: 'SUPER_SESSION_SECRET', required: '選填', desc: 'session cookie 簽名用 secret。未設會用 SUPER_KEY 派生；建議另設一組隨機值。' },
    { name: 'DBS_{區碼}_APIKEY', required: '必填', desc: '區 API Key（現有設定）。例如 DBS_SKW_APIKEY。' },
    { name: 'DBS_{區碼}_STAFF_KEY', required: '選填', desc: '該區 STAFF_TOKEN。設定後超管可免密鑰操作該區秘書後台。' },
    { name: 'DBS_{區碼}_ADC_KEY', required: '選填', desc: '該區 ADC_TOKEN。設定後超管可免密鑰使用 ADC 審批。' },
  ];

  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', lineHeight: 1.8 }}>
      <h3 style={{ color: '#003366', marginTop: 0 }}>🔑 環境變數設定</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Vercel → 選擇本專案 → <strong>Settings → Environment Variables</strong> → 逐項新增 → 儲存後
        <strong> 重新部署（Redeploy）</strong>。
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '8px' }}>
          <thead>
            <tr style={{ background: '#003366', color: 'white' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>名稱</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>需要</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>用途</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700 }}>{r.name}</td>
                <td style={{ padding: '8px' }}>{r.required}</td>
                <td style={{ padding: '8px' }}>{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#334155' }}>
        <strong>安全須知</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          <li>超管密碼請用長密碼（建議 20 字以上），唔好同其他服務共用。</li>
          <li>只在一部你信任的裝置登入；共用電腦請用完按「登出超管」。</li>
          <li>如需強制所有人重新登入：改 <code>SUPER_KEY</code> 或重新部署即可令舊 session 失效。</li>
          <li>Vercel 上的環境變數只會傳到伺服器函數，不會打包進前端 JS。</li>
        </ul>
      </div>
    </div>
  );
}
