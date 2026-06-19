'use client';

import { useMemo, useState } from 'react';

export default function OnboardPage() {
  const [districtName, setDistrictName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [notes, setNotes] = useState('');

  const canSubmit = districtName && districtCode && contactEmail && webAppUrl && apiKey;

  const mailto = useMemo(() => {
    const subject = `[DBS 區接入申請] ${districtName || '未填區名'} (${districtCode || '未填區碼'})`;
    const body = [
      '區名稱：' + (districtName || ''),
      '區碼：' + (districtCode || '').toUpperCase(),
      '聯絡人姓名：' + (contactName || ''),
      '聯絡人 Email：' + (contactEmail || ''),
      'Apps Script Web App URL：' + (webAppUrl || ''),
      'API Key：' + (apiKey || ''),
      '備註：' + (notes || ''),
    ].join('\n');
    return `mailto:ai@skwscout.org.hk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [districtName, districtCode, contactName, contactEmail, webAppUrl, apiKey, notes]);

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', background: 'white', padding: '28px', borderRadius: '16px' }}>
      <h2 style={{ marginTop: 0, color: '#003366' }}>📮 提交區接入申請</h2>
      <p style={{ color: '#666', lineHeight: 1.7 }}>
        完成 Google Sheet + Apps Script 建置後，請在此填妥資料提交給平台管理員。開通後你區就可以使用。
      </p>

      <div style={{ display: 'grid', gap: '16px' }}>
        <TwoCol>
          <Field label="區名稱" required value={districtName} onChange={setDistrictName} placeholder="例如：柴灣區" />
          <Field label="區碼" required value={districtCode} onChange={(v: string) => setDistrictCode(v.toUpperCase())} placeholder="例如：CHW" />
        </TwoCol>
        <TwoCol>
          <Field label="聯絡人姓名" required value={contactName} onChange={setContactName} placeholder="例如：陳大文" />
          <Field label="聯絡人 Email" required value={contactEmail} onChange={setContactEmail} placeholder="例如：abc@example.com" type="email" />
        </TwoCol>
        <Field label="Apps Script Web App URL" required value={webAppUrl} onChange={setWebAppUrl} placeholder="https://script.google.com/macros/s/.../exec" />
        <div>
          <label style={labelStyle}>API Key <span style={{ color: '#c62828' }}>*</span></label>
          <input
            type="text"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="ak_xxxxxxxx（setup 彈窗顯示的 Key）"
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: 13, color: '#888', marginTop: 6, lineHeight: 1.6 }}>
            💡 API Key 在執行 setupSystem() 後的彈窗只顯示一次。忘記了？到 Sheet 選單 → 🏕️ DBS 管理 → 🔑 重新生成 API Key。
            Config 裡只有雜湊值，無法還原明文。
          </p>
        </div>
        <div>
          <label style={labelStyle}>備註（選填）</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="例如：已完成初步測試 / 請協助加入 mapping / 其他補充說明"
            style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ marginTop: '20px', background: '#f7fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 700, color: '#003366', marginBottom: '8px' }}>預覽寄出內容</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', color: '#444', fontSize: '14px', lineHeight: 1.7 }}>
{`區名稱：${districtName}
區碼：${districtCode.toUpperCase()}
聯絡人姓名：${contactName}
聯絡人 Email：${contactEmail}
Apps Script Web App URL：${webAppUrl}
API Key：${apiKey}
備註：${notes}`}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
        <a href={canSubmit ? mailto : undefined} style={{ textDecoration: 'none', opacity: canSubmit ? 1 : 0.5, pointerEvents: canSubmit ? 'auto' : 'none' }}>
          <button style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: '#003366', color: 'white', fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            📧 開啟電郵送出
          </button>
        </a>
        {!canSubmit && <p style={{ fontSize: 12, color: '#c62828', alignSelf: 'center' }}>請填寫所有必填欄位</p>}
      </div>

      <section style={{ marginTop: '24px', background: '#f0f4ff', padding: '20px', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
        <h4 style={{ marginTop: 0, color: '#003366' }}>🛡️ 你的資料有多安全？</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.8, color: '#444', fontSize: 14 }}>
          <li>你的資料存在 <strong>Google 伺服器</strong>，不是某台不知名的電腦</li>
          <li>API Key 只存在 <strong>Vercel 伺服器環境變數</strong>，不出現在任何前端代碼</li>
          <li>Config 只存 API Key 的雜湊值（API_KEY_HASH），連管理員也無法還原明文</li>
          <li>要取得你的資料，攻擊者要麼攻破 Google，要麼攻破 Vercel。比存在自己家裡的電腦更安全。</li>
        </ul>
      </section>
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label} {required && <span style={{ color: '#c62828' }}>*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: 700,
};
