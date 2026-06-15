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
        <h2 style={{ marginTop: 0, color: '#003366' }}>⬇️ 區接入檔案下載</h2>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          這裡提供其他區接入本平台所需的初始 GS 模板，以及日後更新 patch 的下載位置。<br />
          不熟 GitHub 的使用者，可直接在這裡下載或複製內容。
        </p>
        {message && (
          <div style={{ marginTop: '14px', background: '#e8f5e9', color: '#2e7d32', padding: '10px 12px', borderRadius: '10px', fontSize: '14px' }}>
            {message}
          </div>
        )}
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>1. 初始 GS 模板</h3>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          其他區第一次接入時，請使用這份模板。做法為：
          <strong>下載 / 複製 → 貼入 Apps Script → 執行 setupSystem()</strong>。
        </p>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', background: '#fcfdff' }}>
          <div style={{ fontWeight: 700, color: '#003366', fontSize: '16px' }}>DBS_3_0_MULTI_DISTRICT</div>
          <div style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>
            用途：建立全新地區的 Google Sheet / Apps Script 後台模板
          </div>
          <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
            內容：setupSystem()、getHealthCheck、Config 初始化、d= 區碼 email links、證書及主考流程
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
            <a href={TEMPLATE_PATH} download style={linkBtnStyle('#003366', 'white', 'none')}>
              下載模板
            </a>
            <a href={TEMPLATE_PATH} target="_blank" rel="noreferrer" style={linkBtnStyle('white', '#003366', '1px solid #003366')}>
              直接查看內容
            </a>
            <button
              onClick={() => copyFile(TEMPLATE_PATH, '已複製初始 GS 模板內容')}
              style={buttonStyle('#e8f5e9', '#2e7d32', '1px solid #c8e6c9')}
            >
              複製模板內容
            </button>
          </div>
        </div>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>2. 更新 Patch 區</h3>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          日後如有新章、修補或小更新，會在這裡提供 patch 檔。一般情況下，其他區只需貼上 patch 並執行指定函數即可。
          不更新通常不會令整個系統失效，但新章或新功能可能未能使用。
        </p>

        <div style={{ border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '18px', background: '#f8fafc' }}>
          <div style={{ fontWeight: 700, color: '#334155', fontSize: '15px' }}>目前尚未發佈公開 Patch</div>
          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
            如日後發佈 patch，將會出現在 <code>/downloads/patches/</code>。
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
            <a href={PATCH_README_PATH} target="_blank" rel="noreferrer" style={linkBtnStyle('white', '#475569', '1px solid #94a3b8')}>
              查看 patch 說明
            </a>
            <Link href="/updates" style={linkBtnStyle('white', '#003366', '1px solid #003366')}>
              查看更新公告
            </Link>
            <button
              onClick={() => copyFile(PATCH_README_PATH, '已複製 patch 區說明')}
              style={buttonStyle('#f1f5f9', '#475569', '1px solid #cbd5e1')}
            >
              複製說明
            </button>
          </div>
        </div>
      </section>

      <section style={{ background: '#fff8e1', padding: '24px', borderRadius: '16px', border: '1px solid #f0d98a' }}>
        <h3 style={{ marginTop: 0, color: '#8d6e00' }}>使用提醒</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.8, color: '#6d4c41' }}>
          <li>請先使用初始模板建立本區後台，再提交 Apps Script Web App URL。</li>
          <li>若日後平台發佈 patch，請按 patch 說明執行，不需重建整個 Sheet。</li>
          <li>初始模板及 patch 只供接入本平台使用。</li>
          <li><strong>{PLATFORM_COPYRIGHT}</strong></li>
        </ul>
      </section>
    </div>
  );
}

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
