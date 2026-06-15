import Link from 'next/link';
import { PLATFORM_COPYRIGHT } from '@/lib/district';

type UpdateLevel = 'required' | 'recommended' | 'optional' | 'info';

interface UpdateItem {
  version: string;
  title: string;
  date: string;
  level: UpdateLevel;
  summary: string;
  impact: string;
  action: string;
  downloadHref?: string;
}

const updates: UpdateItem[] = [
  {
    version: '3.0.0',
    title: 'DBS 3.0 多區版初始模板上線',
    date: '2026-06-15',
    level: 'info',
    summary: '首個多區版前端平台與初始 GS 模板已建立，可供新地區接入測試。',
    impact: '此為初始發布，不屬 patch，不需要在既有區內額外執行更新。新接入地區請直接使用最新模板。',
    action: '到 /downloads 下載初始 GS 模板，貼入 Apps Script 後執行 setupSystem()。',
    downloadHref: '/downloads/DBS_3_0_MULTI_DISTRICT.txt',
  },
];

const emptyPatchNotice = {
  title: '目前尚未發佈公開 patch',
  body: '日後如有新章、修補函數、證書更新或主考同步修正，會在此頁公告，並同步放到 /downloads/patches/ 供各區下載或複製。',
};

export default function UpdatesPage() {
  const required = updates.filter(u => u.level === 'required');
  const recommended = updates.filter(u => u.level === 'recommended');
  const optional = updates.filter(u => u.level === 'optional');
  const info = updates.filter(u => u.level === 'info');

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h2 style={{ marginTop: 0, color: '#003366' }}>📢 更新公告</h2>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          此頁專供各區維護者查看平台更新情況。日後如有新章、修補函數或維護 patch，會在這裡說明：
          <strong>更新級別、影響範圍、是否必須執行、應下載哪個檔案</strong>。
        </p>
      </section>

      <Legend />

      <UpdateSection title="必須更新" items={required} emptyText="目前沒有必須立即執行的更新。" />
      <UpdateSection title="建議更新" items={recommended} emptyText="目前沒有建議更新項目。" />
      <UpdateSection title="可選更新" items={optional} emptyText="目前沒有可選 patch。" />
      <UpdateSection title="版本資訊 / 發布公告" items={info} emptyText="目前沒有其他公告。" />

      <section style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>{emptyPatchNotice.title}</h3>
        <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: '14px' }}>{emptyPatchNotice.body}</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/downloads" style={linkBtnStyle('#003366', 'white', 'none')}>
            前往下載區
          </Link>
          <Link href="/setup" style={linkBtnStyle('white', '#003366', '1px solid #003366')}>
            查看接入教學
          </Link>
        </div>
      </section>

      <section style={{ background: '#fff8e1', padding: '24px', borderRadius: '16px', border: '1px solid #f0d98a' }}>
        <h3 style={{ marginTop: 0, color: '#8d6e00' }}>建議閱讀方式</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.8, color: '#6d4c41' }}>
          <li><strong>必須更新</strong>：建議盡快執行，否則可能影響正常使用。</li>
          <li><strong>建議更新</strong>：不會立即壞，但建議跟進，通常涉及優化或修正。</li>
          <li><strong>可選更新</strong>：通常是新章或額外功能，不更新也不會令現有系統失效。</li>
          <li><strong>版本資訊 / 發布公告</strong>：只作記錄用途，幫助維護者知道目前平台狀態。</li>
          <li><strong>{PLATFORM_COPYRIGHT}</strong></li>
        </ul>
      </section>
    </div>
  );
}

function Legend() {
  const items = [
    { label: '必須更新', color: '#c62828', bg: '#ffebee' },
    { label: '建議更新', color: '#ef6c00', bg: '#fff3e0' },
    { label: '可選更新', color: '#1565c0', bg: '#e3f2fd' },
    { label: '版本資訊', color: '#2e7d32', bg: '#e8f5e9' },
  ];

  return (
    <section style={{ background: 'white', padding: '22px', borderRadius: '16px' }}>
      <h3 style={{ marginTop: 0, color: '#003366' }}>更新標籤說明</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {items.map(item => (
          <span key={item.label} style={{ background: item.bg, color: item.color, padding: '8px 14px', borderRadius: '999px', fontWeight: 700, fontSize: '13px' }}>
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function UpdateSection({ title, items, emptyText }: { title: string; items: UpdateItem[]; emptyText: string }) {
  return (
    <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
      <h3 style={{ marginTop: 0, color: '#003366' }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 0 }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {items.map(item => <UpdateCard key={`${item.version}-${item.title}`} item={item} />)}
        </div>
      )}
    </section>
  );
}

function UpdateCard({ item }: { item: UpdateItem }) {
  const tone = getTone(item.level);

  return (
    <div style={{ border: `1px solid ${tone.border}`, borderRadius: '14px', padding: '18px', background: tone.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{item.date} · v{item.version}</div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#003366' }}>{item.title}</div>
        </div>
        <span style={{ background: tone.badgeBg, color: tone.color, padding: '5px 12px', borderRadius: '999px', fontWeight: 700, fontSize: '12px' }}>
          {tone.label}
        </span>
      </div>

      <div style={{ marginTop: '14px', display: 'grid', gap: '10px', color: '#333', lineHeight: 1.7, fontSize: '14px' }}>
        <div><strong>內容：</strong>{item.summary}</div>
        <div><strong>影響：</strong>{item.impact}</div>
        <div><strong>處理方式：</strong>{item.action}</div>
      </div>

      {item.downloadHref && (
        <div style={{ marginTop: '14px' }}>
          <a href={item.downloadHref} target="_blank" rel="noreferrer" style={linkBtnStyle('#003366', 'white', 'none')}>
            查看 / 下載相關檔案
          </a>
        </div>
      )}
    </div>
  );
}

function getTone(level: UpdateLevel) {
  switch (level) {
    case 'required':
      return { label: '必須更新', color: '#c62828', bg: '#fff8f8', badgeBg: '#ffebee', border: '#ef9a9a' };
    case 'recommended':
      return { label: '建議更新', color: '#ef6c00', bg: '#fffaf3', badgeBg: '#fff3e0', border: '#ffcc80' };
    case 'optional':
      return { label: '可選更新', color: '#1565c0', bg: '#f8fbff', badgeBg: '#e3f2fd', border: '#90caf9' };
    default:
      return { label: '版本資訊', color: '#2e7d32', bg: '#f8fff9', badgeBg: '#e8f5e9', border: '#a5d6a7' };
  }
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
