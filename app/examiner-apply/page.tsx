'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useDistrict } from '@/lib/useDistrict';

interface BadgeInfo {
  badgeName: string;
  badgeCode: string;
  badgeNameEn: string;
  category: string;
  fullTitle: string;
}

interface GroupInfo {
  groupId: string;
  groupNumber: number;
  groupName: string;
}

// 每個被選專章的狀態：用 fullTitle 當唯一識別（因為語言/手藝/通訊會共用 badge_code）
interface SelectedBadge {
  fullTitle: string;
  code: string;
  scope: 'D' | 'G';
}

export default function ExaminerApplyPage() {
  const { district, withDistrict } = useDistrict();
  const districtName = district?.name || '本區';

  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    title: '先生',
    email: '',
    phone: '',
    groupId: '',
    rank: '',
    yearsOfService: '',
    selectedBadges: [] as SelectedBadge[],
    qualifications: '',
    remarks: ''
  });

  const [certFiles, setCertFiles] = useState<File[]>([]);

  useEffect(() => {
    setDataLoading(true);
    Promise.all([
      api.getBadgeCodes().catch(() => ({ success: false })),
      api.getGroups().catch(() => ({ success: false }))
    ]).then(([badgeRes, groupRes]) => {
      if (badgeRes.success) setBadges(badgeRes.badges || []);
      if (groupRes.success) setGroups(groupRes.groups || []);
      setDataLoading(false);
    });
  }, []);

  const badgeCategories = [...new Set(badges.map(b => b.category).filter(Boolean))];
  const [filterCategory, setFilterCategory] = useState('');
  const filteredBadges = filterCategory ? badges.filter(b => b.category === filterCategory) : badges;

  // 用 fullTitle 判斷是否已選（唯一）
  const isSelected = (fullTitle: string) => form.selectedBadges.some(b => b.fullTitle === fullTitle);

  // 勾選 / 取消勾選一個章（預設級別 G = 旅團主考）
  const toggleBadge = (b: BadgeInfo) => {
    setForm(prev => {
      if (prev.selectedBadges.some(s => s.fullTitle === b.fullTitle)) {
        return { ...prev, selectedBadges: prev.selectedBadges.filter(s => s.fullTitle !== b.fullTitle) };
      }
      return {
        ...prev,
        selectedBadges: [...prev.selectedBadges, { fullTitle: b.fullTitle, code: b.badgeCode, scope: 'G' }]
      };
    });
  };

  // 切換某章的 D / G（用 fullTitle 定位）
  const setScope = (fullTitle: string, scope: 'D' | 'G') => {
    setForm(prev => ({
      ...prev,
      selectedBadges: prev.selectedBadges.map(s => (s.fullTitle === fullTitle ? { ...s, scope } : s))
    }));
  };

  const addCertFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('每個檔案不能超過 5MB'); return; }
    if (certFiles.length >= 5) { setError('最多上傳 5 個證書檔案'); return; }
    setCertFiles(prev => [...prev, file]);
    setError('');
  };

  const removeCertFile = (index: number) => {
    setCertFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.selectedBadges.length === 0) { setError('請至少選擇一個申請專章'); return; }
    setLoading(true);
    setError('');

    try {
      const certFilesData = [];
      for (const file of certFiles) {
        const base64 = await fileToBase64(file);
        certFilesData.push({ name: file.name, size: file.size, data: base64 });
      }

      // 給人看的字串：「服務 - 語言 (英語) (SIN) [區主考]」
      const badgesLabel = form.selectedBadges
        .map(s => `${s.fullTitle} (${s.code}) [${s.scope === 'D' ? '區主考' : '旅團主考'}]`)
        .join(', ');

      // 姓名 + 稱謂組合（稱謂選「不適用」則不加），統一格式避免重複行
      const fullName = (form.title && form.title !== '不適用')
        ? `${form.name.trim()}${form.title}`
        : form.name.trim();

      const res = await api.submitExaminerApplication({
        name: fullName, email: form.email, phone: form.phone,
        groupId: form.groupId, rank: form.rank, yearsOfService: form.yearsOfService,
        badges: badgesLabel,
        badgeCodes: form.selectedBadges.map(s => s.code).join(','),
        // ★ 機器讀：逐章 D/G（用 fullTitle 唯一識別）
        badgeScopes: form.selectedBadges.map(s => ({ code: s.code, fullTitle: s.fullTitle, scope: s.scope })),
        qualifications: form.qualifications, remarks: form.remarks,
        certFiles: certFilesData
      });

      if (res.success) { setSubmitted(true); setResultData(res); }
      else { setError(res.error || '提交失敗'); }
    } catch (err) { setError('網絡錯誤，請稍後重試'); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
        <h2 style={{ color: '#2e7d32' }}>✅ 主考申請已提交</h2>
        <p style={{ fontSize: '16px', margin: '16px 0', color: '#333' }}>感謝您申請成為{districtName}專科徽章主考！</p>
        {resultData?.appointmentId && (
          <p style={{ fontSize: '14px', color: '#666' }}>申請編號：<strong>{resultData.appointmentId}</strong></p>
        )}
        <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px', margin: '16px 0', textAlign: 'left' }}>
          <h4 style={{ margin: '0 0 8px', color: '#003366' }}>📋 接下來的流程</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>
            <li>助理區總監（童軍）將審閱您的申請及資歷證書</li>
            <li>ADC 會逐章批准或否決（以您申請的級別 D/G 為準）</li>
            <li>批准的專章將自動加入主考名冊</li>
            <li>您會收到電郵通知批准結果</li>
          </ol>
        </div>
        <a href={withDistrict('/')} style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', background: '#003366', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>返回首頁</a>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
        <p style={{ color: '#666', fontSize: '16px' }}>⏳ 載入系統資料中...</p>
      </div>
    );
  }

  const rankOptions = ['教練員', '童軍副團長', '童軍團長', '其他支部領袖', '老師', '其他'];

  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '12px' }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>👨‍🏫 專科徽章主考申請</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
        歡迎{districtName}領袖申請成為專科徽章主考。填寫以下資料後，助理區總監（童軍）將審閱您的申請。
        <br />ADC 會根據您的資歷逐章批准，批准後將自動加入主考名冊。
      </p>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ===== 個人資料 ===== */}
        <Section title="個人資料">
          <Row>
            {/* 姓名（不含稱謂）+ 稱謂下拉，送出時自動組合，統一姓名格式 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '8px' }}>
              <Input label="姓名（不含稱謂）" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required placeholder="例如：陳大文" />
              <div>
                <label style={labelStyle}>稱謂 <span style={{ color: '#c62828' }}>*</span></label>
                <select value={form.title} required onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={selectStyle}>
                  <option value="先生">先生</option>
                  <option value="女士">女士</option>
                  <option value="不適用">不適用</option>
                </select>
              </div>
            </div>
            <Input label="電郵" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} required type="email" placeholder="接收審批結果及考核通知" />
          </Row>
          <Row>
            <Input label="電話" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} required />
            <div>
              <label style={labelStyle}>所屬旅團 <span style={{ color: '#c62828' }}>*</span></label>
              <select value={form.groupId} required onChange={e => setForm(p => ({ ...p, groupId: e.target.value }))} style={selectStyle}>
                <option value="">請選擇...</option>
                {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.groupName} ({g.groupNumber}th)</option>)}
                <option value="DISTRICT">區職員（不屬於特定旅團）</option>
              </select>
            </div>
          </Row>
          <Row>
            <div>
              <label style={labelStyle}>職級 <span style={{ color: '#c62828' }}>*</span></label>
              <select value={form.rank} required onChange={e => setForm(p => ({ ...p, rank: e.target.value }))} style={selectStyle}>
                <option value="">請選擇...</option>
                {rankOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Input label="童軍服務年資" value={form.yearsOfService} onChange={v => setForm(p => ({ ...p, yearsOfService: v }))} placeholder="例如：8年" />
          </Row>
        </Section>

        {/* ===== 申請專章 ===== */}
        <Section title="申請主考的專章（可多選，並選擇級別）">
          <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
            <strong>💡 提示：</strong>每個專章可選擇申請成為
            <strong style={{ color: '#1565c0' }}> 區主考(D)</strong> 或
            <strong style={{ color: '#e65100' }}> 旅團主考(G)</strong>。
            <br />• <strong>旅團主考(G)</strong>：只考核本旅團的童軍成員。
            <br />• <strong>區主考(D)</strong>：可考核全區童軍成員。
            <br />ADC 會根據您的資歷逐項審批，不符合的會被剔除。
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>按類別篩選</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <FilterBtn active={filterCategory === ''} onClick={() => setFilterCategory('')} label="全部" />
              {badgeCategories.map(c => <FilterBtn key={c} active={filterCategory === c} onClick={() => setFilterCategory(c)} label={c} />)}
            </div>
          </div>

          {/* 已選清單 + 逐章 D/G */}
          {form.selectedBadges.length > 0 && (
            <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <strong style={{ fontSize: '14px' }}>已選 {form.selectedBadges.length} 個專章（請逐章選擇級別）：</strong>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {form.selectedBadges.map(s => (
                  <div key={s.fullTitle} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '8px', background: 'white', padding: '6px 10px', borderRadius: '6px', flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, minWidth: '140px' }}>
                      {s.fullTitle}
                      <span style={{ color: '#999', fontWeight: 400, marginLeft: '6px' }}>({s.code})</span>
                    </span>
                    <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ccc' }}>
                      <ScopeBtn active={s.scope === 'G'} onClick={() => setScope(s.fullTitle, 'G')} label="旅團主考 G" color="#e65100" />
                      <ScopeBtn active={s.scope === 'D'} onClick={() => setScope(s.fullTitle, 'D')} label="區主考 D" color="#1565c0" />
                    </div>
                    <button type="button" onClick={() => toggleBadge({ fullTitle: s.fullTitle, badgeCode: s.code, badgeName: s.fullTitle, badgeNameEn: '', category: '' })} style={{
                      background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px',
                      padding: '4px 10px', cursor: 'pointer', fontSize: '12px'
                    }}>移除</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '4px' }}>
            {filteredBadges.map(b => {
              const sel = isSelected(b.fullTitle);
              return (
                <label key={b.fullTitle} style={{
                  display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer',
                  borderBottom: '1px solid #f5f5f5', background: sel ? '#e8f5e9' : 'transparent'
                }}>
                  <input type="checkbox" checked={sel} onChange={() => toggleBadge(b)} style={{ marginRight: '10px', width: '18px', height: '18px' }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: sel ? 700 : 400 }}>{b.fullTitle || b.badgeName}</span>
                    <span style={{ color: '#999', fontSize: '12px', marginLeft: '6px' }}>({b.badgeCode})</span>
                  </span>
                  <span style={{
                    padding: '1px 8px', borderRadius: '4px', fontSize: '11px',
                    background: b.category === '興趣' ? '#e8f5e9' : b.category === '技能' ? '#e3f2fd' : b.category === '服務' ? '#fff3e0' : b.category === '教導' ? '#f3e5f5' : '#f5f5f5',
                    color: b.category === '興趣' ? '#2e7d32' : b.category === '技能' ? '#1565c0' : b.category === '服務' ? '#e65100' : b.category === '教導' ? '#7b1fa2' : '#666'
                  }}>{b.category || '其他'}</span>
                </label>
              );
            })}
          </div>
        </Section>

        {/* ===== 資歷說明 ===== */}
        <Section title="資歷說明">
          <textarea value={form.qualifications} onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))} required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '100px', boxSizing: 'border-box' }}
            placeholder={'請說明您的相關資歷及經驗，例如：\n- 持有聖約翰急救證書（2023）\n- 露營經驗 5 年，曾帶領旅團參加大露營\n- 完成先鋒工程導師訓練課程'} />
        </Section>

        {/* ===== 證書附件 ===== */}
        <Section title="資歷證書附件">
          <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
            <strong>📎 請上傳相關資歷證書：</strong>例如急救證書、訓練班結業證書、專業資格證明等。
            <br />支援 JPG / PNG / PDF，每個檔案上限 5MB，最多 5 個。
          </div>

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={e => { addCertFile(e.target.files?.[0] || null); e.target.value = ''; }}
            style={{ marginBottom: '12px' }}
          />

          {certFiles.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {certFiles.map((file, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px', marginBottom: '4px', fontSize: '13px'
                }}>
                  <span>📄 {file.name} <span style={{ color: '#999' }}>({(file.size / 1024).toFixed(1)} KB)</span></span>
                  <button type="button" onClick={() => removeCertFile(idx)} style={{
                    background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px',
                    padding: '2px 10px', cursor: 'pointer', fontSize: '12px'
                  }}>移除</button>
                </div>
              ))}
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>已上傳 {certFiles.length}/5 個檔案</p>
            </div>
          )}

          {certFiles.length === 0 && (
            <p style={{ fontSize: '13px', color: '#999' }}>尚未上傳任何證書（選填，但建議附上以加快審批）</p>
          )}
        </Section>

        {/* ===== 備註 ===== */}
        <Section title="備註（選填）">
          <textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '60px', boxSizing: 'border-box' }}
            placeholder="如有其他補充事項" />
        </Section>

        <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          <strong>📋 審批流程：</strong><br />
          提交申請 → ADC 審閱資歷 → <strong>逐項批准/剔除專章</strong> → 批准的自動加入主考名冊 → 開始接受考核指派
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', background: loading ? '#ccc' : '#003366',
          color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px',
          fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
        }}>{loading ? '提交中...' : '提交主考申請'}</button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 };
const selectStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', boxSizing: 'border-box' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #eee' }}>
    <h3 style={{ color: '#003366', fontSize: '16px', marginBottom: '16px' }}>{title}</h3>{children}</div>);
}
function Row({ children }: { children: React.ReactNode }) {
  return (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>{children}</div>);
}
function Input({ label, value, onChange, required, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (<div><label style={labelStyle}>{label} {required && <span style={{ color: '#c62828' }}>*</span>}</label>
    <input type={type} value={value} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }} /></div>);
}
function FilterBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (<button type="button" onClick={onClick} style={{
    padding: '4px 14px', borderRadius: '16px', border: 'none', fontSize: '13px', fontWeight: 600,
    background: active ? '#003366' : '#e0e0e0', color: active ? 'white' : '#333', cursor: 'pointer'
  }}>{label}</button>);
}
function ScopeBtn({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (<button type="button" onClick={onClick} style={{
    padding: '4px 10px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
    background: active ? color : '#f0f0f0', color: active ? 'white' : '#666'
  }}>{label}</button>);
}
