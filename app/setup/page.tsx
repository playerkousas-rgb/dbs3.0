import Link from 'next/link';
import { PLATFORM_COPYRIGHT } from '@/lib/district';

const quickItems = [
  'Google 帳號 1 個',
  '空白 Google Sheet 1 張',
  '區碼（例如 CHW）',
  '區名（例如 柴灣區）',
  '本區聯絡 Email',
  '旅團資料',
  '如有主考，可準備主考名單',
];

const configItems = [
  { key: 'DISTRICT_CODE', note: '必填，例如 CHW' },
  { key: 'DISTRICT_NAME', note: '必填，例如 柴灣區' },
  { key: 'EMAIL_REPLY_TO', note: '必填，秘書通知 Email' },
  { key: 'ADC_EMAIL', note: '必填，ADC 主考申請通知 Email' },
  { key: 'STAFF_TOKEN', note: '必填，秘書後台密鑰（請立即更改）' },
  { key: 'ADC_TOKEN', note: '必填，ADC 審批密鑰（請立即更改）' },
  { key: 'FRONTEND_URL', note: '已預設平台網址，不用改' },
  { key: 'WEB_APP_URL', note: 'Deploy 後把 /exec URL 貼回此欄' },
  { key: 'API_KEY_HASH', note: 'setup 自動生成，不要修改' },
];

export default function SetupPage() {
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h2 style={{ marginTop: 0, color: '#003366' }}>🧩 區接入教學</h2>
        <p style={{ color: '#666', lineHeight: 1.8 }}>
          這個平台採用「統一前端 + 各區獨立 Google Sheet / Apps Script 後台」模式。<br />
          你不用寫前端程式，只要照步驟建立自己區的 Sheet 後台，再把 <strong>/exec URL 和 API Key</strong> 提交給平台管理員即可接入。
        </p>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>你需要先準備</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.9, color: '#333' }}>
          {quickItems.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>詳細步驟</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.95, color: '#333' }}>
          <li>先到 <strong>/downloads</strong> 下載或複製初始 GS 模板。</li>
          <li>建立一張全新的空白 Google Sheet。</li>
          <li>在上方選單按：<strong>Extensions → Apps Script</strong>。</li>
          <li>把模板內容整份貼上，儲存。</li>
          <li>在函數列表選擇 <code>setupSystem</code>，然後按 Run。</li>
          <li>Google 會要求授權：請按 <strong>Review permissions → 選擇你的帳戶 → Advanced → Go to project → Allow</strong>。</li>
          <li>⚠️ <strong>彈窗會顯示你的 API Key（只顯示一次！請立即複製！）</strong></li>
          <li>跑完後，回到 Google Sheet，你會看到：
            <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: 1.8 }}>
              <li><strong>README_新手必看</strong>（紫色）</li>
              <li><strong>Config</strong>（黃色）</li>
              <li><strong>Groups</strong>（綠色）</li>
              <li><strong>BadgeCodes</strong>（橙色，已預載最新章目）</li>
              <li><strong>ExaminerMatrix</strong>（藍色，已自動按章目建好表頭）</li>
            </ul>
          </li>
          <li>先打開 <strong>README_新手必看</strong>，再到黃色 <strong>Config</strong> 按指示填資料。</li>
          <li>再到綠色 <strong>Groups</strong> 把例子資料改成你區真正旅團資料。</li>
          <li>如你區<strong>本身已有主考名單</strong>，請直接把主考資料批量填到藍色 <strong>ExaminerMatrix</strong>，不用叫他們重新申請。</li>
          <li>當你填好 ExaminerMatrix 後，可用選單：<code>🏕️ DBS 管理 → 🔄 同步主考資料</code>，讓前端讀取用的 Examiners 自動同步。</li>
          <li>回到 Apps Script，按：<strong>Deploy → New deployment → 類型選 Web App</strong>。</li>
          <li>設定：
            <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: 1.8 }}>
              <li><strong>Execute as：</strong> Me</li>
              <li><strong>Who has access：</strong> Anyone</li>
            </ul>
          </li>
          <li>按 Deploy 後，複製 <strong>/exec URL</strong>，貼回黃色 Config 的 <code>WEB_APP_URL</code>。</li>
          <li>到前端 <strong>/onboard</strong>，填入區名、區碼、/exec URL、<strong>API Key</strong>，提交給平台管理員。</li>
          <li>等平台管理員開通，即可使用。</li>
        </ol>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>Config 你最需要填的欄位</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {configItems.map((item) => (
            <div key={item.key} style={{ border: '1px solid #eee', borderRadius: '12px', padding: '14px', background: '#fcfdff' }}>
              <div style={{ fontWeight: 700, color: '#003366' }}>{item.key}</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '6px', lineHeight: 1.6 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>🛡️ 你的資料有多安全？</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.85, color: '#444' }}>
          <li>你的資料存在 <strong>Google 伺服器</strong>（Google Sheet），不是某台不知名的電腦</li>
          <li>API Key 只存在 <strong>Vercel 伺服器環境變數</strong>，不會出現在任何前端代碼</li>
          <li>Config 只存 API Key 的雜湊值（API_KEY_HASH），連管理員也無法還原明文</li>
          <li>要取得你的資料，攻擊者要麼攻破 Google 伺服器，要麼攻破 Vercel 伺服器</li>
          <li>這比把資料存在自己家裡的電腦更安全</li>
        </ul>
      </section>

      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>更新方式（平台日後會提供 patch）</h3>
        <p style={{ color: '#666', lineHeight: 1.8 }}>
          日後若有新章或小更新，平台會在 <strong>/updates</strong> 公告，並在 <strong>/downloads</strong> 提供 patch。
        </p>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: 1.8 }}>
          <strong>正確流程：</strong><br />
          新章 = <strong>貼更新檔 GS + Run 1 次</strong><br />
          如再改主考資格 = <strong>改 ExaminerMatrix + 同步主考資料</strong>
        </div>
        <p style={{ color: '#666', lineHeight: 1.8 }}>
          不更新通常不會令整個系統失效，但新章或新功能可能未能使用。
        </p>
      </section>

      <section style={{ background: '#fff8e1', padding: '24px', borderRadius: '16px', border: '1px solid #f0d98a' }}>
        <h3 style={{ marginTop: 0, color: '#8d6e00' }}>重要提醒</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.85, color: '#6d4c41' }}>
          <li><strong>FRONTEND_URL 已預設平台網址，不用改。</strong></li>
          <li>Deploy 後把 /exec URL 貼回 Config 的 WEB_APP_URL，再到 <strong>/onboard</strong> 提交 /exec URL 和 API Key。</li>
          <li>API Key 在 setup 彈窗只顯示一次。忘記了？到 Sheet 選單 → 重新生成 API Key。</li>
          <li>前端 district mapping 由平台管理員統一維護。</li>
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
        <Link href="/updates" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #003366', background: 'white', color: '#003366', fontWeight: 700, cursor: 'pointer' }}>
            查看更新公告
          </button>
        </Link>
        <Link href="/onboard" style={{ textDecoration: 'none' }}>
          <button style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #003366', background: 'white', color: '#003366', fontWeight: 700, cursor: 'pointer' }}>
            提交區接入申請
          </button>
        </Link>
      </div>
    </div>
  );
}
