import Link from 'next/link';
import { PLATFORM_COPYRIGHT } from '@/lib/district';

const steps = [
  '建立一個全新的空白 Google Sheet',
  '開啟 Extensions → Apps Script',
  '貼上平台提供的標準 GS 檔',
  '執行 setupSystem() 完成基本工作表與欄位初始化',
  '回到 Config 工作表，填寫區名、區碼、Email、Token、FRONTEND_URL 等資料',
  'Deploy 為 Web App，取得 exec URL',
  '測試 getHealthCheck 確認設定正確',
  '到「提交區接入申請」頁面，把 URL 電郵給平台管理員',
];

export default function SetupPage() {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h2 style={{ marginTop: 0, color: '#003366' }}>🧩 區接入教學</h2>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          這個平台採用「統一前端 + 各區獨立 Google Sheet / Apps Script 後台」模式。<br />
          各區無需維護 Next.js 前端，只需按步驟建立本區後台，之後把 Web App URL 交回平台管理員即可接入。
        </p>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>你需要準備</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.8, color: '#333' }}>
          <li>一個 Google 帳號</li>
          <li>一個空白 Google Sheet</li>
          <li>區名及區碼（建議 3-4 個英文字，例如 SKW / CHW）</li>
          <li>聯絡人姓名與 Email</li>
          <li>基本群組資料、主考資料（如有）</li>
        </ul>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>接入步驟</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.9, color: '#333' }}>
          {steps.map((step, idx) => <li key={idx}>{step}</li>)}
        </ol>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>更新方式（平台日後會提供 patch）</h3>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          日後若有新章或小更新，平台會提供更新 GS / patch function。一般情況下，只需貼上更新碼並執行指定函數即可。
          即使暫時未更新，通常亦不會令整個系統失效，只會令最新章目暫時未能報考。
        </p>
      </section>

      <section style={{ background: '#fff8e1', padding: '24px', borderRadius: '16px', border: '1px solid #f0d98a' }}>
        <h3 style={{ marginTop: 0, color: '#8d6e00' }}>注意事項</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.8, color: '#6d4c41' }}>
          <li>前端平台之 district mapping 由平台管理員統一維護。</li>
          <li>各區只需維護本區 Google Sheet / Apps Script 及資料內容。</li>
          <li>平台版權固定保留，不屬各區自行更改項目。</li>
          <li><strong>{PLATFORM_COPYRIGHT}</strong></li>
        </ul>
      </section>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/downloads" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: '#003366', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
            下載初始 GS 模板
          </button>
        </Link>
        <Link href="/onboard" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #003366', background: 'white', color: '#003366', fontWeight: 700, cursor: 'pointer' }}>
            提交區接入申請
          </button>
        </Link>
        <Link href="/districts" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #003366', background: 'white', color: '#003366', fontWeight: 700, cursor: 'pointer' }}>
            查看現已使用地區
          </button>
        </Link>
      </div>
    </div>
  );
}
