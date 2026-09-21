'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PLATFORM_COPYRIGHT } from '@/lib/district';

const TEMPLATE_PATH = '/downloads/DBS_3_0_MULTI_DISTRICT.txt';
const PATCH_README_PATH = '/downloads/patches/README.txt';

export default function DownloadsPage() {
  const [message, setMessage] = useState('');

  const copyFile = async (path: string, successText: string) => {
    try {
      const res = await fetch(path);
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setMessage(successText);
      setTimeout(() => setMessage(''), 2500);
    } catch {
      setMessage('複製失敗，請改用下載或直接查看內容。');
      setTimeout(() => setMessage(''), 2500);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h2 style={{ marginTop: 0, color: '#003366' }}>⬇️ 下載區</h2>
        <p style={{ color: '#666', lineHeight: 1.7, marginBottom: 0 }}>
          接入要用的 GS 模板，以及日後更新檔的位置。不熟 GitHub 也可以直接在這裡下載或複製。
        </p>
        {message && (
          <div style={{ marginTop: '14px', background: '#e8f5e9', color: '#2e7d32', padding: '10px 12px', borderRadius: '10px', fontSize: '14px' }}>
            {message}
          </div>
        )}
      </section>

      <StepCard n={1} title="下載 GS 模板">
        <p style={pStyle}>
          這份就是各區後台的完整模板，內含最新 <strong>2026 訓練綱要獎章表</strong>、主考表、證書及流程函數。
        </p>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', background: '#fcfdff' }}>
          <div style={{ fontWeight: 700, color: '#003366', fontSize: '16px' }}>DBS_3_0_MULTI_DISTRICT</div>
          <div style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>
            用途：建立一個全新地區的 Google Sheet / Apps Script 後台
          </div>
          <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
            已包括：獎章表預載、ExaminerMatrix 表頭自動建立、新手 README 工作表、進階工作表預設隱藏
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
            <a href={TEMPLATE_PATH} download style={linkBtnStyle('#003366', 'white', 'none')}>
              下載模板
            </a>
            <a href={TEMPLATE_PATH} target="_blank" rel="noreferrer" style={linkBtnStyle('white', '#003366', '1px solid #003366')}>
              直接查看內容
            </a>
            <button
              onClick={() => copyFile(TEMPLATE_PATH, '已複製 GS 模板內容')}
              style={buttonStyle('#e8f5e9', '#2e7d32', '1px solid #c8e6c9')}
            >
              複製模板內容
            </button>
          </div>
        </div>
      </StepCard>

      <StepCard n={2} title="貼入 Apps Script 並儲存">
        <p style={pStyle}>
          在該區的 Google Sheet 開「擴充功能 → Apps Script」，把整份模板貼上（取代原有內容），按 💾 儲存。
          詳細圖文步驟見 <Link href="/setup" style={inlineLinkStyle}>接入教學</Link>。
        </p>
      </StepCard>

      <StepCard n={3} title="執行 setupSystem()（第一次接入）">
        <p style={pStyle}>
          在 Apps Script 上方函數選單選 <code>setupSystem</code>，按 ▶️ 執行一次。系統會自動建立所有工作表、Config 及預設獎章表。
          之後再到「部署 → 新增部署」發佈為網頁應用程式，把 <strong>/exec URL</strong> 交給平台管理員開通。
        </p>
      </StepCard>

      <StepCard n={4} title="舊區要更新獎章表／程式碼時">
        <p style={pStyle}>
          已有後台的地區，把同一份模板重新貼入 Apps Script（Config、STAFF_TOKEN、考生資料都不會受影響），
          然後在 Google Sheet 選單執行 <strong>🏕️ DBS 管理 → 📚 更新獎章表（2026 新綱要）</strong>。
          此函數會加入新章、停用已取消的章，並保留已發出的證書記錄，可安心重複執行。
        </p>
        <div style={{ border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '18px', background: '#f8fafc' }}>
          <div style={{ fontWeight: 700, color: '#334155', fontSize: '15px' }}>尚未發佈其他公開 Patch</div>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
            日後如有小修補，會放在 <code>/downloads/patches/</code>，並在 <Link href="/updates" style={inlineLinkStyle}>更新公告</Link> 說明要做甚麼。
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
            <a href={PATCH_README_PATH} target="_blank" rel="noreferrer" style={linkBtnStyle('white', '#475569', '1px solid #94a3b8')}>
              查看 patch 說明
            </a>
            <button
              onClick={() => copyFile(PATCH_README_PATH, '已複製 patch 區說明')}
              style={buttonStyle('#f1f5f9', '#475569', '1px solid #cbd5e1')}
            >
              複製說明
            </button>
          </div>
        </div>
      </StepCard>

      <section style={{ background: '#fff8e1', padding: '22px', borderRadius: '16px', border: '1px solid #f0d98a' }}>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.8, color: '#6d4c41', fontSize: '14px' }}>
          <li>模板只供接入本平台使用，請勿公開發佈。</li>
          <li>更新時<strong>不需重建整個 Sheet</strong>，考生資料及證書記錄會保留。</li>
          <li><strong>{PLATFORM_COPYRIGHT}</strong></li>
        </ul>
      </section>
    </div>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: 'white', padding: '26px', borderRadius: '16px', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
      <div style={{
        flex: '0 0 auto',
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: '#003366',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '18px',
      }}>
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '6px 0 12px', color: '#003366', fontSize: '18px' }}>{title}</h3>
        {children}
      </div>
    </section>
  );
}

const pStyle: React.CSSProperties = { color: '#555', lineHeight: 1.8, fontSize: '14px', marginTop: 0 };

const inlineLinkStyle: React.CSSProperties = { color: '#1565c0', fontWeight: 600 };

function linkBtnStyle(background: string, color: string, border: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '10px 16px',
    borderRadius: '10px',
    background,
    color,
    border,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '14px',
  };
}

function buttonStyle(background: string, color: string, border: string): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: '10px',
    background,
    color,
    border,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
  };
}
