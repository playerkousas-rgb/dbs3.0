'use client';

import { useMemo, useState } from 'react';

export default function OnboardPage() {
  const [districtName, setDistrictName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [notes, setNotes] = useState('');

  const mailto = useMemo(() => {
    const subject = `[DBS 區接入申請] ${districtName || '未填區名'} (${districtCode || '未填區碼'})`;
    const body = [
      '區名稱：' + (districtName || ''),
      '區碼：' + (districtCode || '').toUpperCase(),
      '聯絡人姓名：' + (contactName || ''),
      '聯絡人 Email：' + (contactEmail || ''),
      'Apps Script Web App URL：' + (webAppUrl || ''),
      '備註：' + (notes || ''),
    ].join('\n');
    return `mailto:ai@skwscout.org.hk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [districtName, districtCode, contactName, contactEmail, webAppUrl, notes]);

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', background: 'white', padding: '28px', borderRadius: '16px' }}>
      <h2 style={{ marginTop: 0, color: '#003366' }}>📮 提交區接入申請</h2>
      <p style={{ color: '#666', lineHeight: 1.7 }}>
        完成 Google Sheet + Apps Script 建置後，請在此填妥資料。按下「開啟電郵送出」後，系統會用你的電郵程式自動組合內容，寄到 <strong>ai@skwscout.org.hk</strong>。
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
備註：${notes}`}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
        <a href={mailto} style={{ textDecoration: 'none' }}>
          <button style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: '#003366', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
            開啟電郵送出
          </button>
        </a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(webAppUrl || '');
            alert('已複製 Apps Script URL');
          }}
          style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #003366', background: 'white', color: '#003366', fontWeight: 700, cursor: 'pointer' }}
        >
          複製 URL
        </button>
      </div>
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
