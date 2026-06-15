'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useDistrict } from '@/lib/useDistrict';

export default function AdminPage() {
  const { withDistrict } = useDistrict();
  const [token, setToken] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pending' | 'certificates' | 'printList' | 'examiners' | 'badges' | 'help'>('dashboard');
  const [pendingApps, setPendingApps] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<Record<string, number> | null>(null);
  const [printList, setPrintList] = useState<any[]>([]);
  const [examiners, setExaminers] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [certFilter, setCertFilter] = useState<'all' | 'pending' | 'ready' | 'picked'>('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const login = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetDashboard(token);
      if (res.success) {
        setLoggedIn(true);
        setDashboard(res.stats || {});
      } else {
        setMessage('登入失敗：' + (res.error || '請檢查密鑰'));
      }
    } catch (e) {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetPending(token);
      if (res.success) setPendingApps(res.applications || []);
      else setMessage('載入失敗');
    } catch (e) {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const loadPrintList = async () => {
    setLoading(true);
    try {
      const res = await api.getPrintList(token);
      if (res.success) setPrintList(res.printList || []);
      else setMessage('載入失敗');
    } catch (e) {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const loadExaminers = async () => {
    setLoading(true);
    try {
      const res = await api.getActiveExaminers();
      if (res.success) setExaminers(res.examiners || []);
      else setMessage('載入失敗');
    } catch (e) {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const loadBadges = async () => {
    setLoading(true);
    try {
      const res = await api.getBadgeCodes();
      if (res.success) setBadges(res.badges || []);
      else setMessage('載入失敗');
    } catch (e) {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const loadCerts = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetCertificates(token);
      if (res.success) setCerts(res.certificates || []);
      else setMessage('載入失敗：' + (res.error || ''));
    } catch (e) {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const approve = async (appId: string, overrideExaminerId?: string, examinerName?: string) => {
    const app = pendingApps.find(a => a.applicationId === appId);
    const preview = app?.examinerPreview;

    let confirmMsg = `確定要批核 ${appId} 嗎？\n\n考生：${app?.memberName}\n專章：${app?.badgeName}\n`;
    if (overrideExaminerId && examinerName) {
      confirmMsg += `\n指派主考：${examinerName}（人手指派）`;
    } else if (preview?.mode === 'no_examiner') {
      confirmMsg += `\n${preview.label}（${preview.detail}）`;
    } else if (preview?.examinerId) {
      confirmMsg += `\n指派主考：${preview.label}\n${preview.detail}`;
    } else {
      confirmMsg += `\n⚠️ 注意：${preview?.label || ''} ${preview?.detail || ''}`;
    }
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await api.districtApprove(token, appId, '秘書後台', overrideExaminerId);
      if (res.success) {
        setMessage(`✅ 已批核 ${appId}` + (res.assignedExaminer ? `，指派主考：${res.assignedExaminer.name}` : ''));
        loadPending();
      } else {
        setMessage('❌ 批核失敗：' + (res.error || '未知錯誤'));
      }
    } catch (e) {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const handleMarkReady = async (certId: string, memberName: string) => {
    if (!confirm(`確定將 ${memberName} 的證書標記為「已製作完成」？\n系統會自動：\n- 加進證書列印清單\n- 通知考生來領取\n- 顯示在公開待領頁`)) return;
    setLoading(true);
    try {
      const res = await api.markCertificateReady(token, certId);
      if (res.success) {
        setMessage(`✅ 已標記完成，證書編號：${res.certificateNumber}`);
        loadCerts();
      } else {
        setMessage('❌ ' + (res.error || '失敗'));
      }
    } catch {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const handleMarkPicked = async (certId: string, memberName: string) => {
    const pickedBy = prompt(`領取人姓名（預設：${memberName}）`, memberName);
    if (pickedBy === null) return;
    setLoading(true);
    try {
      const res = await api.markCertificatePickedUp(token, certId, pickedBy || memberName);
      if (res.success) {
        setMessage(`✅ ${memberName} 已標記領取`);
        loadCerts();
      } else {
        setMessage('❌ ' + (res.error || '失敗'));
      }
    } catch {
      setMessage('網絡錯誤');
    }
    setLoading(false);
  };

  const openPrint = (certId: string) => {
    const url = withDistrict(`/admin/print-cert/${encodeURIComponent(certId)}?token=${encodeURIComponent(token)}`);
    window.open(url, '_blank');
  };

  if (!loggedIn) {
    return (
      <div style={{ background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ color: '#003366', marginTop: 0 }}>⚙️ 秘書後台登入</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
          請輸入系統管理密鑰
        </p>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="輸入 STAFF_TOKEN"
          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '16px', boxSizing: 'border-box' }}
        />
        <button
          onClick={login}
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? '驗證中...' : '登入'}
        </button>
        {message && <p style={{ color: '#c62828', marginTop: '12px', fontSize: '14px' }}>{message}</p>}
      </div>
    );
  }

  const filteredCerts = certs.filter(c => {
    if (certFilter === 'all') return true;
    if (certFilter === 'pending') return c.printStatus === 'PENDING_PRINT';
    if (certFilter === 'ready') return c.printStatus === 'READY';
    if (certFilter === 'picked') return c.printStatus === 'PICKED_UP';
    return true;
  });

  return (
    <div>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#003366', margin: 0 }}>📊 秘書控制台</h2>
        <button onClick={() => { setLoggedIn(false); setToken(''); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
          登出
        </button>
      </div>

      {message && (
        <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {message}
          <button onClick={() => setMessage('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <StatCard label="待家長確認" value={dashboard['待家長確認'] || 0} color="#e91e63" />
          <StatCard label="待團長確認" value={dashboard['待團長確認'] || 0} color="#ff9800" />
          <StatCard label="待區批核" value={dashboard['待區批核'] || 0} color="#f44336" />
          <StatCard label="已指派待接受" value={dashboard['已指派待主考接受'] || 0} color="#9c27b0" />
          <StatCard label="考核進行中" value={dashboard['已派主考進行中'] || 0} color="#2196f3" />
          <StatCard label="合格待製證書" value={dashboard['考驗合格待製證書'] || 0} color="#4caf50" />
          <StatCard label="待領取證書" value={dashboard['證書待領取'] || 0} color="#ff5722" />
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="總覽" />
        <TabButton active={activeTab === 'pending'} onClick={() => { setActiveTab('pending'); loadPending(); }} label="待批核" />
        <TabButton active={activeTab === 'certificates'} onClick={() => { setActiveTab('certificates'); loadCerts(); }} label="🏆 證書管理" />
        <TabButton active={activeTab === 'printList'} onClick={() => { setActiveTab('printList'); loadPrintList(); }} label="📋 列印清單" />
        <TabButton active={activeTab === 'examiners'} onClick={() => { setActiveTab('examiners'); loadExaminers(); }} label="主考名單" />
        <TabButton active={activeTab === 'badges'} onClick={() => { setActiveTab('badges'); loadBadges(); }} label="專章代碼" />
        <TabButton active={activeTab === 'help'} onClick={() => setActiveTab('help')} label="📖 說明" />
      </div>

      {activeTab === 'pending' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#003366', marginTop: 0 }}>待批核申請列表</h3>
          <p style={{ color: '#666', fontSize: '13px', marginTop: 0 }}>
            💡 系統會預先計算每筆申請的主考分配建議，您可確認後批核，或改派其他主考。
          </p>
          {pendingApps.length === 0 ? (
            <p style={{ color: '#666' }}>目前沒有待批核的申請</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingApps.map((app, idx) => (
                <PendingCard
                  key={idx}
                  app={app}
                  onApprove={approve}
                  loading={loading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'certificates' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#003366', marginTop: 0 }}>🏆 證書管理</h3>
          <p style={{ color: '#666', fontSize: '13px', marginTop: 0 }}>
            點「🖨️ 列印」會開新分頁顯示證書 → 用瀏覽器 Ctrl+P 列印（可套印預印紙）
          </p>

          {/* 篩選 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <FilterChip label="全部" active={certFilter === 'all'} onClick={() => setCertFilter('all')} count={certs.length} />
            <FilterChip label="待製作" active={certFilter === 'pending'} onClick={() => setCertFilter('pending')} color="#ff9800" count={certs.filter(c => c.printStatus === 'PENDING_PRINT').length} />
            <FilterChip label="待領取" active={certFilter === 'ready'} onClick={() => setCertFilter('ready')} color="#4caf50" count={certs.filter(c => c.printStatus === 'READY').length} />
            <FilterChip label="已領取" active={certFilter === 'picked'} onClick={() => setCertFilter('picked')} color="#666" count={certs.filter(c => c.printStatus === 'PICKED_UP').length} />
            <button onClick={loadCerts} style={{ marginLeft: 'auto', padding: '6px 12px', background: 'white', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
              🔄 重新載入
            </button>
          </div>

          {filteredCerts.length === 0 ? (
            <p style={{ color: '#666' }}>沒有資料</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredCerts.map((c, idx) => (
                <CertCard
                  key={idx}
                  cert={c}
                  onMarkReady={handleMarkReady}
                  onMarkPicked={handleMarkPicked}
                  onPrint={openPrint}
                  loading={loading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'printList' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#003366', marginTop: 0 }}>📋 證書列印清單（CSV / Word 合併列印用）</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            如需大量列印或用 Word 合併列印，可從此清單取得資料。
          </p>
          {printList.length === 0 ? (
            <p style={{ color: '#666' }}>列印清單為空</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#003366', color: 'white' }}>
                    <th style={{ padding: '8px' }}>序</th>
                    <th style={{ padding: '8px' }}>考獲日期</th>
                    <th style={{ padding: '8px' }}>證書編號</th>
                    <th style={{ padding: '8px' }}>姓名</th>
                    <th style={{ padding: '8px' }}>旅團</th>
                    <th style={{ padding: '8px' }}>專章</th>
                    <th style={{ padding: '8px' }}>類別</th>
                    <th style={{ padding: '8px' }}>代碼</th>
                  </tr>
                </thead>
                <tbody>
                  {printList.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{p.seq}</td>
                      <td style={{ padding: '8px' }}>{p.resultDate}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '11px' }}>{p.certNumber}</td>
                      <td style={{ padding: '8px' }}>{p.memberName}</td>
                      <td style={{ padding: '8px' }}>{p.groupNameCn}</td>
                      <td style={{ padding: '8px' }}>{p.badgeName}</td>
                      <td style={{ padding: '8px' }}>{p.category}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.badgeCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'examiners' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#003366', marginTop: 0 }}>👨‍🏫 主考名單（動態讀取）</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            資料來源：ExaminerMatrix → Examiners（自動同步）。<strong style={{ color: '#1565c0' }}>D</strong> = 區主考，
            <strong style={{ color: '#e65100' }}>G</strong> = 旅團主考。
          </p>
          {examiners.length === 0 ? <p>載入中或沒有資料...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#003366', color: 'white' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>姓名</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>單位</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>D 專章</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>G 專章</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>負荷</th>
                  </tr>
                </thead>
                <tbody>
                  {examiners.map((ex, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{ex.name}</td>
                      <td style={{ padding: '8px' }}>{ex.unit || '—'}</td>
                      <td style={{ padding: '8px' }}>
                        {ex.districtBadges.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {ex.districtBadges.map((b: string, bi: number) => (
                              <span key={bi} style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '11px', background: '#e3f2fd', color: '#1565c0' }}>{b}</span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        {ex.groupBadges.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {ex.groupBadges.map((b: string, bi: number) => (
                              <span key={bi} style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '11px', background: '#fff3e0', color: '#e65100' }}>{b}</span>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{ex.currentLoad}/{ex.maxLoad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'badges' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#003366', marginTop: 0 }}>🎖️ 專章代碼表</h3>
          {badges.length === 0 ? <p>載入中...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#003366', color: 'white' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>代碼</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>中文名稱</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>類別</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>完整名稱</th>
                  </tr>
                </thead>
                <tbody>
                  {badges.map((b, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{b.badgeCode}</td>
                      <td style={{ padding: '8px' }}>{b.badgeName}</td>
                      <td style={{ padding: '8px' }}>{b.category}</td>
                      <td style={{ padding: '8px' }}>{b.fullTitle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>共 {badges.length} 個</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'help' && <DbsHelp />}

      {activeTab === 'dashboard' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#003366', marginTop: 0 }}>📈 系統概覽</h3>
          <p style={{ color: '#666' }}>點上方分頁查看各項管理功能。</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DBS 後台說明（DBS 指南 + 維護 + 程式說明）
// ============================================================
function DbsHelp() {
  const [doc, setDoc] = useState<'dbs' | 'maintain' | 'script'>('dbs');
  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <HBtn active={doc === 'dbs'} onClick={() => setDoc('dbs')} label="🗂️ DBS 操作指南" />
        <HBtn active={doc === 'maintain'} onClick={() => setDoc('maintain')} label="🛠️ 後台維護說明" />
        <HBtn active={doc === 'script'} onClick={() => setDoc('script')} label="💻 程式說明" />
      </div>
      {doc === 'dbs' && (
        <HCard>
          <HH>🗂️ DBS（專章秘書）操作指南</HH>
          <HSub>你可以做什麼</HSub>
          <HUl items={[
            '報考審批、指派主考、證書管理、報表：本「秘書後台」各分頁。',
            '主考名單管理、新增專章、同步：Google 試算表「🏕️ 主考管理」選單。',
          ]} />
          <HSub>日常重點</HSub>
          <HOl items={[
            '報考審批/派主考/證書：在本後台操作（沿用原流程）。',
            '主考委任：ADC 在 /adc 審批後系統已自動寫入並同步，你只會收到通知信，通常不用手動同步。',
            '新增專科徽章：見「後台維護說明」的新增專章步驟。',
            '取消主考資格：到試算表 ExaminerMatrix 把該主考該章的格清空，再按選單「🔄 同步主考資料」。',
          ]} />
          <HSub>你的責任</HSub>
          <HUl items={['維護 BadgeCodes（章的增減）。', '處理取消主考、異常名單。', '保管秘書密鑰。']} />
        </HCard>
      )}
      {doc === 'maintain' && (
        <HCard>
          <HH>🛠️ 後台維護說明</HH>
          <HSub>核心原則</HSub>
          <HUl items={[
            'BadgeCodes 是唯一真理。',
            'full_title 是章識別鑰匙（唯一）；badge_code 可重複（同章細分共用，用於證書編號，屬正確設計）。',
            'full_title 只在 BadgeCodes 填一次，其餘程式複製 → 全形/半形不會出錯。',
            '報考只讀 Examiners；Matrix 是人工維護主表。',
          ]} />
          <HSub>新增專章 SOP</HSub>
          <HOl items={[
            '新章不建議各區自行手改 BadgeCodes，應使用平台提供的 patch 更新。',
            '正確做法：貼上平台提供的更新檔 GS。',
            '執行指定 patch function 1 次。',
            '如之後要為現有主考加新章資格，請改 ExaminerMatrix，然後按「🔄 同步主考資料」。',
          ]} />
          <HSub>其他</HSub>
          <HUl items={[
            '新章更新：貼 patch GS → Run 1 次。',
            '取消主考某章：Matrix 清空該格 → 同步。',
            '重複行：確保姓名一致(含稱謂)、單位格式一致，再同步。',
          ]} />
          <HNote>同步＝清空 Examiners 後依 Matrix 重建；ADC 審批會自動補欄+自動同步。完整版見 repo docs/。</HNote>
        </HCard>
      )}
      {doc === 'script' && (
        <HCard>
          <HH>💻 程式說明（Apps Script）</HH>
          <HSub>主要路由</HSub>
          <HUl items={[
            'submitExaminerApplication / adcGetPending / adcApprove / getExaminerAppointmentStatus / adcVerify',
          ]} />
          <HSub>選單工具</HSub>
          <HUl items={[
            'autoComposeFullTitles、rebuildMatrixHeaderFromBadgeCodes、syncExaminerMatrixDirect',
          ]} />
          <HSub>關鍵函式</HSub>
          <HUl items={[
            'normalizeUnit_（group_id→統一旅團格式）、writeBadgesToMatrix_（缺欄自動補）、validateBadgeCodes_',
          ]} />
          <HSub>修改注意</HSub>
          <HUl items={[
            '章比對一律用 full_title；Examiners 章名存 full_title、unit 存統一旅團格式。',
            '主考姓名三表須一致(含稱謂)。Apps Script 改完務必重新部署。',
          ]} />
          <HNote>完整版見 repo docs/ 內三份 MD。</HNote>
        </HCard>
      )}
    </div>
  );
}
function HBtn({ active, onClick, label }: any) {
  return (<button onClick={onClick} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: active ? '#1565c0' : '#e0e0e0', color: active ? 'white' : '#333' }}>{label}</button>);
}
function HCard({ children }: any) { return <div style={{ background: 'white', padding: '24px', borderRadius: '12px', lineHeight: 1.7 }}>{children}</div>; }
function HH({ children }: any) { return <h3 style={{ color: '#003366', marginTop: 0 }}>{children}</h3>; }
function HSub({ children }: any) { return <h4 style={{ color: '#1565c0', margin: '18px 0 8px', fontSize: '15px' }}>{children}</h4>; }
function HUl({ items }: any) { return <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>{items.map((t: string, i: number) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}</ul>; }
function HOl({ items }: any) { return <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>{items.map((t: string, i: number) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}</ol>; }
function HNote({ children }: any) { return <p style={{ marginTop: '14px', fontSize: '12px', color: '#999', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>{children}</p>; }

// ============================================================
// 證書卡片
// ============================================================
function CertCard({ cert, onMarkReady, onMarkPicked, onPrint, loading }: any) {
  const status = cert.printStatus;
  const statusColor =
    status === 'PENDING_PRINT' ? '#ff9800' :
    status === 'READY' ? '#4caf50' :
    status === 'PICKED_UP' ? '#666' : '#999';
  const statusLabel =
    status === 'PENDING_PRINT' ? '待製作' :
    status === 'READY' ? '待領取' :
    status === 'PICKED_UP' ? '已領取' : status;

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '14px', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: statusColor, color: 'white' }}>
              {statusLabel}
            </span>
            <code style={{ fontSize: '11px', color: '#666' }}>{cert.certificateId}</code>
            {cert.certificateNumber && (
              <code style={{ fontSize: '11px', background: '#003366', color: 'white', padding: '2px 6px', borderRadius: '3px' }}>
                {cert.certificateNumber}
              </code>
            )}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#003366' }}>
            {cert.memberName}
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
            🏕️ {cert.groupId} · 🎖️ <strong>{cert.badgeName}</strong>
          </div>
          {cert.readyAt && (
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
              製作完成：{new Date(cert.readyAt).toLocaleString('zh-HK')}
            </div>
          )}
          {cert.pickedUpAt && (
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
              領取：{new Date(cert.pickedUpAt).toLocaleString('zh-HK')} by {cert.pickedUpBy || '-'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onPrint(cert.certificateId)}
            disabled={loading}
            style={{ padding: '8px 14px', background: '#003366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
          >
            🖨️ 列印
          </button>

          {status === 'PENDING_PRINT' && (
            <button
              onClick={() => onMarkReady(cert.certificateId, cert.memberName)}
              disabled={loading}
              style={{ padding: '8px 14px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              ✅ 標記已製作
            </button>
          )}

          {status === 'READY' && (
            <button
              onClick={() => onMarkPicked(cert.certificateId, cert.memberName)}
              disabled={loading}
              style={{ padding: '8px 14px', background: '#ff5722', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              📬 標記已領取
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, count, color = '#003366' }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: active ? color : 'white',
        color: active ? 'white' : '#333',
        border: `1px solid ${active ? color : '#ddd'}`,
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 600 : 400
      }}
    >
      {label} {count !== undefined && <span style={{ opacity: 0.8 }}>({count})</span>}
    </button>
  );
}

// ============================================================
// 待批核卡片
// ============================================================
function PendingCard({ app, onApprove, loading }: { app: any; onApprove: (id: string, overrideId?: string, name?: string) => void; loading: boolean }) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [selectedExaminerId, setSelectedExaminerId] = useState('');
  const [allExaminers, setAllExaminers] = useState<any[]>([]);

  const preview = app.examinerPreview || {};
  const isWaiting = app.status === '待家長確認' || app.status === '待團長確認';

  const loadAllExaminers = async () => {
    if (allExaminers.length > 0) return;
    const res = await api.getActiveExaminers();
    if (res.success) setAllExaminers(res.examiners || []);
  };

  const eligibleExaminers = allExaminers.filter((ex: any) =>
    ex.qualifiedBadges?.some((qb: any) => qb.badgeName === app.badgeName)
  );

  const previewColor =
    preview.severity === 'error' ? '#c62828' :
    preview.severity === 'warn'  ? '#e65100' :
    preview.valid                ? '#2e7d32' : '#666';

  const previewBg =
    preview.severity === 'error' ? '#ffebee' :
    preview.severity === 'warn'  ? '#fff3e0' :
    preview.valid                ? '#e8f5e9' : '#f5f5f5';

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', background: '#fafafa' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
            <code style={{ background: '#003366', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
              {app.applicationId}
            </code>
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
              background: app.status === '待團長確認' ? '#fff3e0' : '#e8f5e9',
              color: app.status === '待團長確認' ? '#e65100' : '#2e7d32'
            }}>
              {app.status}
            </span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#003366' }}>
            {app.memberName} <span style={{ color: '#999', fontWeight: 400, fontSize: '13px' }}>({app.ymNumber})</span>
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            🏕️ {app.groupId} · 🎖️ <strong>{app.badgeName}</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
            安排：{app.examArrangementType === 'SELF_APPLY' ? '自行報考' :
                  app.examArrangementType === 'APPROVED_COURSE' ? '訓練班' :
                  app.examArrangementType === 'EXAM_DAY' ? '考驗日' :
                  app.examArrangementType === 'CERTIFICATE_EXCHANGE' ? '證書換領' : '其他'}
            {app.selfExaminerName ? ` · 申請時選：${app.selfExaminerName}` : ''}
          </div>
        </div>

        <div style={{ background: previewBg, padding: '10px', borderRadius: '6px', border: `1px solid ${previewColor}` }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>建議主考</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: previewColor }}>
            {preview.label || '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            {preview.detail || ''}
          </div>
        </div>
      </div>

      {overrideMode && !isWaiting && (
        <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '10px' }}>
          <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>
            選擇其他主考（共 {eligibleExaminers.length} 位合資格）
          </label>
          <select
            value={selectedExaminerId}
            onChange={e => setSelectedExaminerId(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
          >
            <option value="">-- 請選擇 --</option>
            {eligibleExaminers.map((ex: any) => {
              const qb = ex.qualifiedBadges?.find((q: any) => q.badgeName === app.badgeName);
              return (
                <option key={ex.examinerId} value={ex.examinerId}>
                  {ex.name} ({qb?.scope || '?'} 主考) · 負荷 {ex.currentLoad}/{ex.maxLoad} {ex.unit ? `· ${ex.unit}` : ''}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {isWaiting ? (
          <span style={{ color: '#999', fontSize: '13px', alignSelf: 'center' }}>
            ⏳ 等待 {app.status === '待家長確認' ? '家長' : '團長'} 確認中
          </span>
        ) : (
          <>
            {!overrideMode && preview.mode !== 'no_examiner' && (
              <button
                onClick={() => { setOverrideMode(true); loadAllExaminers(); }}
                disabled={loading}
                style={{
                  padding: '8px 14px', background: 'white', color: '#003366',
                  border: '1px solid #003366', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
                }}
              >
                🔄 改派其他主考
              </button>
            )}
            {overrideMode && (
              <>
                <button
                  onClick={() => { setOverrideMode(false); setSelectedExaminerId(''); }}
                  disabled={loading}
                  style={{
                    padding: '8px 14px', background: '#999', color: 'white',
                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  取消改派
                </button>
                <button
                  onClick={() => {
                    if (!selectedExaminerId) { alert('請選擇主考'); return; }
                    const ex = eligibleExaminers.find((e: any) => e.examinerId === selectedExaminerId);
                    onApprove(app.applicationId, selectedExaminerId, ex?.name);
                  }}
                  disabled={loading || !selectedExaminerId}
                  style={{
                    padding: '8px 14px', background: selectedExaminerId ? '#1565c0' : '#ccc',
                    color: 'white', border: 'none', borderRadius: '4px',
                    cursor: selectedExaminerId ? 'pointer' : 'not-allowed', fontSize: '13px'
                  }}
                >
                  ✅ 用選定主考批核
                </button>
              </>
            )}
            {!overrideMode && (
              <button
                onClick={() => onApprove(app.applicationId)}
                disabled={loading || !preview.valid}
                style={{
                  padding: '8px 16px',
                  background: preview.valid ? '#4caf50' : '#ccc',
                  color: 'white', border: 'none', borderRadius: '4px',
                  cursor: preview.valid ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600
                }}
                title={!preview.valid ? '主考無效，請改派' : ''}
              >
                {preview.mode === 'no_examiner' ? '✅ 批核（不需主考）' : '✅ 確認批核'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', borderLeft: `4px solid ${color}`, textAlign: 'center' }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color }}>{value || 0}</div>
      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{label}</div>
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
