'use client';

/* ============================================================================
 *  主考專區 /adc
 *  - 分頁 1：主考申請進度查詢（公開，用申請編號）
 *  - 分頁 2：ADC 審批後台（用 ADC_TOKEN 登入）
 *  - 分頁 3：說明（ADC 指南 + 後台維護 + 程式說明，需 ADC 密鑰）
 *  放到 repo：  app/adc/page.tsx
 * ========================================================================== */

import { useState } from 'react';
import { api } from '@/lib/api';

interface ReqBadge { code?: string; fullTitle: string; scope: 'D' | 'G'; }
interface AdcApplication {
  appointmentId: string;
  name: string;
  email: string;
  phone: string;
  groupId: string;
  rank: string;
  yearsOfService: string;
  qualifications: string;
  submittedAt: string;
  certFileUrls: string[];
  badges: ReqBadge[];
}

export default function AdcPage() {
  const [tab, setTab] = useState<'query' | 'admin' | 'help'>('query');

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <h2 style={{ color: '#003366', marginBottom: '4px' }}>👨‍🏫 主考專區</h2>
      <p style={{ color: '#666', fontSize: '14px', marginTop: 0 }}>查詢主考申請進度，或由助理區總監（ADC）登入審批。</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <TabBtn active={tab === 'query'} onClick={() => setTab('query')} label="🔍 主考申請進度查詢" />
        <TabBtn active={tab === 'admin'} onClick={() => setTab('admin')} label="🔐 ADC 審批後台" />
        <TabBtn active={tab === 'help'} onClick={() => setTab('help')} label="📖 說明" />
      </div>

      {tab === 'query' && <QueryPanel />}
      {tab === 'admin' && <AdminPanel />}
      {tab === 'help' && <HelpPanel />}
    </div>
  );
}

/* ====================== 分頁 1：進度查詢 ====================== */
function QueryPanel() {
  const [appId, setAppId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const query = async () => {
    if (!appId.trim()) { setError('請輸入申請編號'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.getExaminerAppointmentStatus(appId.trim());
      if (res.success) setResult(res);
      else setError(res.error || '查詢失敗');
    } catch { setError('網絡錯誤，請稍後重試'); }
    setLoading(false);
  };

  const statusColor = (code: string) =>
    code === 'APPROVED' ? '#2e7d32'
      : code === 'PARTIALLY_APPROVED' ? '#e65100'
      : code === 'REJECTED' ? '#c62828'
      : '#1565c0';

  return (
    <div style={{ background: 'white', padding: '28px', borderRadius: '12px' }}>
      <p style={{ color: '#666', fontSize: '14px', marginTop: 0 }}>
        輸入您提交主考申請後收到的「申請編號」（格式：APT-xxxxxx-xxxx）即可查詢審批進度。
      </p>
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          value={appId} placeholder="APT-260531-XXXX"
          onChange={e => setAppId(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') query(); }}
          style={{ flex: 1, minWidth: '200px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}
        />
        <button onClick={query} disabled={loading} style={{
          padding: '12px 28px', background: loading ? '#ccc' : '#003366', color: 'white',
          border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
        }}>{loading ? '查詢中...' : '查詢'}</button>
      </div>

      {result && (
        <div style={{ marginTop: '20px', border: '1px solid #eee', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#999' }}>{result.appointmentId}</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#003366' }}>{result.applicantName} <span style={{ fontSize: '13px', fontWeight: 400, color: '#666' }}>{result.groupId}</span></div>
            </div>
            <span style={{
              padding: '6px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '14px',
              background: statusColor(result.statusCode) + '22', color: statusColor(result.statusCode)
            }}>{result.statusText}</span>
          </div>

          {(result.statusCode === 'APPROVED' || result.statusCode === 'PARTIALLY_APPROVED') && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#333' }}>
              主考編號：<strong>{result.examinerId}</strong><br />
              任期：{result.termStart} 至 {result.termEnd}<br />
              審批人：{result.approvedBy || 'ADC'}
            </div>
          )}

          {result.appliedBadges && result.appliedBadges.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#003366', marginBottom: '6px' }}>申請的專章</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {result.appliedBadges.map((b: ReqBadge, i: number) => (
                  <span key={i} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                    background: b.scope === 'D' ? '#e3f2fd' : '#fff3e0',
                    color: b.scope === 'D' ? '#1565c0' : '#e65100'
                  }}>{b.fullTitle}（{b.scope === 'D' ? '區 D' : '旅團 G'}）</span>
                ))}
              </div>
            </div>
          )}

          <p style={{ marginTop: '14px', fontSize: '12px', color: '#999' }}>
            提交時間：{result.submittedAt || '—'}
            <br />詳細批准/否決結果已以電郵通知申請人。
          </p>
        </div>
      )}
    </div>
  );
}

/* ====================== 分頁 2：ADC 審批 ====================== */
function AdminPanel() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apps, setApps] = useState<AdcApplication[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [submittingId, setSubmittingId] = useState('');

  const badgeKey = (b: ReqBadge) => b.fullTitle + '|' + b.scope;

  const loadAll = async (tk: string) => {
    const res = await api.adcGetPending(tk);
    if (res.success) {
      setApps(res.applications || []);
      const init: Record<string, Record<string, boolean>> = {};
      (res.applications || []).forEach((a: AdcApplication) => {
        init[a.appointmentId] = {};
        a.badges.forEach(b => { init[a.appointmentId][badgeKey(b)] = true; });
      });
      setChecks(init);
      return true;
    }
    setError(res.error || 'ADC 密鑰錯誤');
    return false;
  };

  const login = async () => {
    setError(''); setLoading(true);
    try { if (await loadAll(token)) setAuthed(true); }
    catch { setError('網絡錯誤，請稍後重試'); }
    setLoading(false);
  };

  const reload = async () => {
    setLoading(true); setMessage('');
    try { await loadAll(token); } catch {}
    setLoading(false);
  };

  const toggle = (appId: string, b: ReqBadge) => {
    setChecks(prev => ({ ...prev, [appId]: { ...prev[appId], [badgeKey(b)]: !prev[appId]?.[badgeKey(b)] } }));
  };
  const setAllChk = (appId: string, badges: ReqBadge[], value: boolean) => {
    setChecks(prev => {
      const next = { ...prev[appId] };
      badges.forEach(b => { next[badgeKey(b)] = value; });
      return { ...prev, [appId]: next };
    });
  };

  const submit = async (app: AdcApplication) => {
    const approved = app.badges.filter(b => checks[app.appointmentId]?.[badgeKey(b)]);
    const rejectedCount = app.badges.length - approved.length;
    const confirmMsg = approved.length === 0
      ? `確定「全部否決」${app.name} 的申請嗎？（${app.badges.length} 項全部不批准）`
      : `確定提交審批？\n\n${app.name}\n✅ 批准 ${approved.length} 項${rejectedCount > 0 ? `\n❌ 否決 ${rejectedCount} 項` : ''}`;
    if (!confirm(confirmMsg)) return;

    setSubmittingId(app.appointmentId); setMessage(''); setError('');
    try {
      const res = await api.adcApprove(
        token, app.appointmentId,
        approved.map(b => ({ fullTitle: b.fullTitle, code: b.code, scope: b.scope })),
        'ADC'
      );
      if (res.success) {
        setMessage(`✅ 已處理 ${app.name}：批准 ${res.approvedCount} 項` +
          (res.skippedCount ? `、原已具備 ${res.skippedCount} 項` : '') +
          (res.rejectedCount ? `、否決 ${res.rejectedCount} 項` : '') + `（${res.status}）`);
        setApps(prev => prev.filter(a => a.appointmentId !== app.appointmentId));
      } else setError(res.error || '審批失敗');
    } catch { setError('網絡錯誤，請稍後重試'); }
    setSubmittingId('');
  };

  // 登入畫面
  if (!authed) {
    return (
      <div style={{ maxWidth: '420px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '12px' }}>
        <h3 style={{ color: '#003366', marginTop: 0 }}>🔐 ADC 審批登入</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>助理區總監（童軍）專用。請輸入 ADC 審批密鑰。</p>
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}
        <input
          type="password" value={token} placeholder="ADC 密鑰"
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') login(); }}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        <button onClick={login} disabled={loading || !token} style={{
          width: '100%', padding: '12px', background: loading ? '#ccc' : '#003366', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
        }}>{loading ? '驗證中...' : '登入'}</button>
      </div>
    );
  }

  // 審批清單
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ color: '#003366', margin: 0 }}>待審批主考申請（{apps.length}）</h3>
        <button onClick={reload} disabled={loading} style={{
          padding: '8px 16px', background: '#e3f2fd', color: '#003366', border: 'none',
          borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
        }}>{loading ? '載入中...' : '🔄 重新整理'}</button>
      </div>

      {message && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>{message}</div>}
      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}

      {apps.length === 0 && (
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#666' }}>
          🎉 目前沒有待審批的主考申請。
        </div>
      )}

      {apps.map(app => {
        const appChecks = checks[app.appointmentId] || {};
        const approvedCount = app.badges.filter(b => appChecks[badgeKey(b)]).length;
        return (
          <div key={app.appointmentId} style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: '#003366' }}>{app.name}
                  <span style={{ fontSize: '12px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>{app.appointmentId}</span>
                </h3>
                <div style={{ fontSize: '13px', color: '#555' }}>
                  {app.groupId} · {app.rank} · 年資 {app.yearsOfService || '—'}<br />
                  📧 {app.email} · 📞 {app.phone}
                </div>
              </div>
            </div>

            <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '8px', margin: '12px 0', fontSize: '13px', color: '#333' }}>
              <strong>資歷說明：</strong><br />
              <span style={{ whiteSpace: 'pre-wrap' }}>{app.qualifications || '（未填寫）'}</span>
            </div>

            {app.certFileUrls.length > 0 && (
              <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                <strong>📎 證書附件：</strong>{' '}
                {app.certFileUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" style={{ color: '#1565c0', marginRight: '10px' }}>附件 {i + 1}</a>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px', color: '#003366' }}>申請專章（勾選 = 批准）</strong>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setAllChk(app.appointmentId, app.badges, true)} style={miniBtn('#e8f5e9', '#2e7d32')}>全選</button>
                <button onClick={() => setAllChk(app.appointmentId, app.badges, false)} style={miniBtn('#ffebee', '#c62828')}>全不選</button>
              </div>
            </div>

            <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
              {app.badges.map((b, idx) => {
                const checked = !!appChecks[badgeKey(b)];
                return (
                  <label key={idx} style={{
                    display: 'flex', alignItems: 'center', padding: '10px 12px', cursor: 'pointer',
                    borderBottom: idx < app.badges.length - 1 ? '1px solid #f5f5f5' : 'none',
                    background: checked ? '#f1f8e9' : '#fafafa'
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(app.appointmentId, b)}
                      style={{ marginRight: '12px', width: '18px', height: '18px' }} />
                    <span style={{ flex: 1, fontWeight: checked ? 600 : 400 }}>{b.fullTitle}
                      {b.code && <span style={{ color: '#999', fontSize: '12px', marginLeft: '6px' }}>({b.code})</span>}
                    </span>
                    <span style={{
                      padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                      background: b.scope === 'D' ? '#e3f2fd' : '#fff3e0',
                      color: b.scope === 'D' ? '#1565c0' : '#e65100'
                    }}>{b.scope === 'D' ? '區主考 D' : '旅團主考 G'}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#555' }}>
                將批准 <strong style={{ color: '#2e7d32' }}>{approvedCount}</strong> / {app.badges.length} 項
              </span>
              <button onClick={() => submit(app)} disabled={submittingId === app.appointmentId} style={{
                padding: '10px 24px', background: submittingId === app.appointmentId ? '#ccc' : '#003366',
                color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}>{submittingId === app.appointmentId ? '提交中...' : '✅ 確認審批'}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}


/* ====================== 分頁 3：說明（需 ADC 密鑰） ====================== */
function HelpPanel() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState<'adc' | 'maintain' | 'script'>('adc');

  const login = async () => {
    setError(''); setLoading(true);
    try {
      const res = await api.adcVerify(token);
      if (res.success) setAuthed(true);
      else setError(res.error || 'ADC 密鑰錯誤');
    } catch { setError('網絡錯誤，請稍後重試'); }
    setLoading(false);
  };

  if (!authed) {
    return (
      <div style={{ maxWidth: '420px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '12px' }}>
        <h3 style={{ color: '#003366', marginTop: 0 }}>📖 說明文件（需驗證）</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>此處含 ADC 操作指南與系統維護文件，請輸入 ADC 密鑰查看。</p>
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}
        <input
          type="password" value={token} placeholder="ADC 密鑰"
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') login(); }}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        <button onClick={login} disabled={loading || !token} style={{
          width: '100%', padding: '12px', background: loading ? '#ccc' : '#003366', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
        }}>{loading ? '驗證中...' : '查看說明'}</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <DocBtn active={doc === 'adc'} onClick={() => setDoc('adc')} label="🧑‍💼 ADC 操作指南" />
        <DocBtn active={doc === 'maintain'} onClick={() => setDoc('maintain')} label="🛠️ 後台維護說明" />
        <DocBtn active={doc === 'script'} onClick={() => setDoc('script')} label="💻 程式說明" />
      </div>
      {doc === 'adc' && <AdcGuideDoc />}
      {doc === 'maintain' && <MaintainDoc />}
      {doc === 'script' && <ScriptDoc />}
    </div>
  );
}

function AdcGuideDoc() {
  return (
    <DocCard>
      <DH>🧑‍💼 ADC 操作指南</DH>
      <DSub>你可以做什麼</DSub>
      <DUl items={['審批主考委任申請：主考專區 →「🔐 ADC 審批後台」（輸入 ADC 密鑰）']} />
      <DSub>審批流程</DSub>
      <DOl items={[
        '收到「新主考委任申請」電郵 → 點開主考專區。',
        '切到「ADC 審批後台」分頁，輸入 ADC 密鑰登入。',
        '查看每位申請人的個人資料、資歷說明、證書附件、逐章申請的級別 (D/G)。',
        '逐章勾選要批准的專章（不打勾＝否決該章），可用「全選／全不選」。',
        '按「✅ 確認審批」。',
      ]} />
      <DSub>系統自動處理（你不用管）</DSub>
      <DUl items={[
        '把批准的章寫入主考名冊（Examiners + ExaminerMatrix）。',
        '自動同步名單、寄審批結果給申請人、寄通知給 DBS。',
        '申請人已是某章某級主考→自動略過；同章級別改變(G↔D)→自動更新；全新章→加入。',
      ]} />
      <DSub>你的責任</DSub>
      <DUl items={['依資歷與證書判斷是否勝任，逐章批准/否決。', '妥善保管 ADC 密鑰。']} />
    </DocCard>
  );
}

function MaintainDoc() {
  return (
    <DocCard>
      <DH>🛠️ 後台維護說明（給維護者）</DH>
      <DSub>核心原則</DSub>
      <DUl items={[
        'BadgeCodes 是唯一真理（所有「章」的定義來源）。',
        'full_title 是全系統章識別鑰匙（唯一、不重複）；badge_code 可重複（同章細分共用，用於證書編號，屬正確設計）。',
        'full_title 只在 BadgeCodes 人手填一次，其餘由程式複製 → 全形/半形不會出錯。',
        '報考系統只讀 Examiners 表；Matrix 只是人看的視圖。',
      ]} />
      <DSub>主考相關工作表</DSub>
      <DUl items={[
        'BadgeCodes：章定義（badge_name, badge_code, category, full_title, active…）。',
        'ExaminerMatrix：人看視圖，A=姓名 B=單位 C+=各章 full_title，格內 D/G/空白。',
        'Examiners：機器讀真實來源；district_badges/group_badges 存 full_title 清單；unit 建議統一用「第XX旅」。',
        'ExaminerAppointments：申請暫存；notes 以「標籤：值 | …」存細節，含 badge_scopes(JSON)。',
        'Groups：旅團；申請存 group_id，寫入時由 normalizeUnit_ 轉為統一旅團名稱格式。',
      ]} />
      <DSub>Config（主考相關）</DSub>
      <DUl items={[
        'ADC_TOKEN：ADC 登入密鑰。',
        'ADC_EMAIL：主考申請通知收件人（沒填退回 dbs 信箱）。',
        'CERT_SIGNER_TITLE_CN：證書簽署人，也用來解析 ADC 稱呼名字。',
        'CURRENT_TERM_START/END、FRONTEND_URL、EMAIL_REPLY_TO。',
      ]} />
      <DSub>常見維護操作</DSub>
      <DOl items={[
        '新增專章：BadgeCodes 加列(active=TRUE) → 選單「✍️ 自動補 full_title」→「🔧 重建 Matrix 表頭」。',
        '停用某章：BadgeCodes 該列 active=FALSE。',
        '取消某主考某章：ExaminerMatrix 清空該格 → 選單「🔄 同步」。',
        '主考重複行：確保 Matrix/Examiners 姓名一致(含稱謂)、單位格式一致，再同步。',
      ]} />
      <DNote>同步＝清空 Examiners 後依 Matrix 重建。ADC 審批會自動補欄+自動同步，一般無需手動。</DNote>
    </DocCard>
  );
}

function ScriptDoc() {
  return (
    <DocCard>
      <DH>💻 程式說明（Apps Script）</DH>
      <DSub>主要路由（doPost action）</DSub>
      <DUl items={[
        'submitExaminerApplication → apiSubmitExaminerApplication（主考提交申請，通知 ADC_EMAIL）',
        'adcGetPending → apiAdcGetPending（讀待審批清單）',
        'adcApprove → apiAdcApprove（逐章審批，寫名冊+自動同步+通知DBS）',
        'getExaminerAppointmentStatus → apiGetExaminerAppointmentStatus（進度查詢）',
        'adcVerify → apiAdcVerify（密鑰驗證）',
      ]} />
      <DSub>選單工具</DSub>
      <DUl items={[
        'autoComposeFullTitles：補 full_title 空白列。',
        'rebuildMatrixHeaderFromBadgeCodes：依 BadgeCodes 重建 Matrix 表頭(先驗證)。',
        'syncExaminerMatrixDirect：Matrix→Examiners 同步。',
      ]} />
      <DSub>關鍵工具函式</DSub>
      <DUl items={[
        'normalizeUnit_：group_id → 統一旅團名稱格式（建議「第XX旅」）。',
        'writeBadgesToMatrix_：寫 D/G 進 Matrix，缺欄自動補。',
        'splitBadgeList_ / getActiveFullTitles_ / validateBadgeCodes_。',
      ]} />
      <DSub>已停用舊函式（勿用）</DSub>
      <DUl items={[
        'apiPartialApproveExaminer（寫 badge code，錯）',
        'apiApproveExaminerAppointment（不同步 Matrix）',
        'writeToExaminerMatrix（假設三行表頭）',
      ]} />
      <DSub>修改注意</DSub>
      <DUl items={[
        '章比對一律用 full_title，勿用 badge_code。',
        'Examiners 章名存 full_title、unit 存統一旅團名稱格式。',
        '主考姓名在三表須完全一致(含稱謂)。',
        'Apps Script 改完務必重新部署新版本。',
      ]} />
      <DNote>完整版見 repo docs/ 內的三份 MD。</DNote>
    </DocCard>
  );
}

/* ---------- 說明用小元件 ---------- */
function DocBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (<button onClick={onClick} style={{
    padding: '8px 14px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    background: active ? '#1565c0' : '#e0e0e0', color: active ? 'white' : '#333'
  }}>{label}</button>);
}
function DocCard({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'white', padding: '28px', borderRadius: '12px', lineHeight: 1.7 }}>{children}</div>;
}
function DH({ children }: { children: React.ReactNode }) { return <h3 style={{ color: '#003366', marginTop: 0 }}>{children}</h3>; }
function DSub({ children }: { children: React.ReactNode }) { return <h4 style={{ color: '#1565c0', margin: '18px 0 8px', fontSize: '15px' }}>{children}</h4>; }
function DUl({ items }: { items: string[] }) { return <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>{items.map((t, i) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}</ul>; }
function DOl({ items }: { items: string[] }) { return <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>{items.map((t, i) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}</ol>; }
function DNote({ children }: { children: React.ReactNode }) { return <p style={{ marginTop: '14px', fontSize: '12px', color: '#999', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>{children}</p>; }


function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (<button onClick={onClick} style={{
    padding: '10px 18px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    background: active ? '#003366' : '#e0e0e0', color: active ? 'white' : '#333'
  }}>{label}</button>);
}
function miniBtn(bg: string, color: string): React.CSSProperties {
  return { padding: '4px 12px', background: bg, color, border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' };
}
