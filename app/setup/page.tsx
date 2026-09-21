import Link from 'next/link';
import { PLATFORM_COPYRIGHT } from '@/lib/district';

/**
 * 區接入教學（公開 /setup）
 * 版面原則：愈短愈好 —— 6 個大數字步驟，一眼睇完；
 * 技術細節收在「詳情」摺疊內，需要時才打開。
 */

const CHIPS = [
  'Google 帳號',
  '空白 Google Sheet',
  '區名（例如 柴灣區）',
  '區碼（例如 CHW）',
  '聯絡 Email',
  '旅團資料',
];

const AFTER_ITEMS = [
  {
    title: '加主考名單',
    desc: '把主考資料填到 ExaminerMatrix，再按選單「🔄 同步主考資料」。',
  },
  {
    title: '選主考機制',
    desc: '旅團主考優先 / 只用區主考 / 同旅團不能擔任主考，可在秘書後台一鍵切換。',
  },
  {
    title: '日後更新',
    desc: '有新章時，到 /downloads 下載更新檔 → 貼上 → Run 1 次即可。',
  },
];

export default function SetupPage() {
  return (
    <div style={{ display: 'grid', gap: '16px', maxWidth: '860px', margin: '0 auto' }}>
      {/* ── 標題 ── */}
      <section style={{ background: 'white', padding: '26px 28px', borderRadius: '16px' }}>
        <h2 style={{ margin: 0, color: '#003366' }}>🧩 區接入教學</h2>
        <p style={{ margin: '10px 0 0', color: '#555', lineHeight: 1.8 }}>
          跟住下面 <strong>6 步</strong>做，你區就可以使用本平台。
          每區都有自己的 Google Sheet 後台，資料由你區自行保管。
        </p>
      </section>

      {/* ── 需要準備 ── */}
      <section style={{ background: 'white', padding: '22px 28px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 12px', color: '#003366', fontSize: '16px' }}>需要準備</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CHIPS.map(item => (
            <span
              key={item}
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                background: '#eef3f9',
                color: '#003366',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── 6 步 ── */}
      <section style={{ display: 'grid', gap: '12px' }}>
        <Step n={1} title="下載 GS 模板" desc={<>到 <Link href="/downloads" style={link}>下載區</Link>複製或下載初始模板。</>} />

        <Step
          n={2}
          title="開一張空白 Google Sheet，貼上模板"
          desc={<>新開一張空白 Sheet → 上方選單 <strong>Extensions → Apps Script</strong> → 把模板內容整份貼上。</>}
        />

        <Step
          n={3}
          title="執行 setupSystem，抄低 API Key"
          desc={<>在 Apps Script 選 <code style={code}>setupSystem</code> → 按 Run → 依指示授權。</>}
          detail={
            <>
              <p style={detailP}>Google 會要求授權：<strong>Review permissions → 選你的帳戶 → Advanced → Go to project → Allow</strong>。</p>
              <p style={detailP}>⚠️ 跑完會彈出 <strong>API Key（只顯示一次）</strong>，請立即複製保存。忘記了可以到 Sheet 選單 → 重新生成。</p>
              <p style={{ ...detailP, marginBottom: 0 }}>之後 Sheet 會自動出現：README_新手必看、Config（黃）、Groups（綠）、BadgeCodes（橙）、ExaminerMatrix（藍）。</p>
            </>
          }
        />

        <Step
          n={4}
          title="填 Config"
          desc={<>最少填 <strong>區名、區碼、聯絡 Email、STAFF_TOKEN、ADC_TOKEN</strong>。</>}
          detail={
            <>
              {[
                ['DISTRICT_CODE', '必填，例如 CHW'],
                ['DISTRICT_NAME', '必填，例如 柴灣區'],
                ['EMAIL_REPLY_TO', '必填，秘書通知 Email'],
                ['ADC_EMAIL', '必填，主考申請通知 Email'],
                ['STAFF_TOKEN', '必填，秘書後台密碼（請改做你自己的）'],
                ['ADC_TOKEN', '必填，ADC 審批密碼（請改做你自己的）'],
                ['FRONTEND_URL', '已預設平台網址，不用改'],
                ['WEB_APP_URL', '第 5 步 Deploy 後貼回這裡'],
                ['API_KEY_HASH', 'setup 自動生成，不要改'],
                ['EXAMINER_ASSIGNMENT_MODE', '主考指派模式，可日後在後台切換'],
              ].map(([key, note]) => (
                <div key={key} style={{ display: 'flex', gap: '10px', padding: '6px 0', borderBottom: '1px solid #eef1f5' }}>
                  <code style={{ ...code, flexShrink: 0 }}>{key}</code>
                  <span style={{ fontSize: '13px', color: '#555' }}>{note}</span>
                </div>
              ))}
              <p style={{ ...detailP, marginTop: '10px', marginBottom: 0 }}>
                記得一併改綠色 <strong>Groups</strong>（旅團資料）及彈窗顯示的 API Key 要保存好。
              </p>
            </>
          }
        />

        <Step
          n={5}
          title="Deploy 為 Web App，複製 /exec URL"
          desc={<>Apps Script → <strong>Deploy → New deployment → Web App</strong> → 複製 <strong>/exec URL</strong>，貼回 Config 的 <code style={code}>WEB_APP_URL</code>。</>}
          detail={
            <p style={{ ...detailP, marginBottom: 0 }}>
              設定：<strong>Execute as：Me</strong>、<strong>Who has access：Anyone</strong>
              （唔選 Anyone 的話，前端會連唔到後台。）
            </p>
          }
        />

        <Step
          n={6}
          title="提交接入申請"
          desc={<>到 <Link href="/onboard" style={link}>接入申請</Link>填區名、區碼、/exec URL、API Key，寄給平台管理員。</>}
          detail={
            <p style={{ ...detailP, marginBottom: 0 }}>
              平台管理員核對後會為你區開通，之後就可以用平台的報考、查詢、主考等全部功能。
            </p>
          }
        />
      </section>

      {/* ── 完成之後 ── */}
      <section style={{ background: 'white', padding: '22px 28px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 6px', color: '#003366', fontSize: '16px' }}>完成之後</h3>
        <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
          {AFTER_ITEMS.map(item => (
            <div key={item.title} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
              <span style={{ color: '#2e7d32', fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: '14px', color: '#333' }}>
                <strong>{item.title}</strong>
                <span style={{ color: '#666' }}> — {item.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 資料放哪 ── */}
      <section style={{ background: 'white', padding: '22px 28px', borderRadius: '16px' }}>
        <h3 style={{ margin: '0 0 8px', color: '#003366', fontSize: '16px' }}>你的資料放哪？</h3>
        <p style={{ margin: 0, color: '#555', fontSize: '14px', lineHeight: 1.9 }}>
          全部放在<strong>你區自己的 Google Sheet</strong>；平台只負責前端畫面，
          各區的 API Key 只存在平台伺服器的環境變數，不會出現在網頁代碼。
        </p>
      </section>

      {/* ── 按鈕 ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link href="/downloads" style={{ textDecoration: 'none' }}>
          <button style={btnPrimary}>① 下載 GS 模板</button>
        </Link>
        <Link href="/onboard" style={{ textDecoration: 'none' }}>
          <button style={btnOutline}>⑥ 提交接入申請</button>
        </Link>
        <Link href="/updates" style={{ textDecoration: 'none' }}>
          <button style={btnOutline}>查看更新公告</button>
        </Link>
      </div>

      <p style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>{PLATFORM_COPYRIGHT}</p>
    </div>
  );
}

/* ---------- 步驟卡 ---------- */
function Step({
  n,
  title,
  desc,
  detail,
}: {
  n: number;
  title: string;
  desc: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '14px',
        padding: '18px 22px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: '#003366',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '17px',
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#003366', fontSize: '15px' }}>{title}</div>
        <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.8, marginTop: '4px' }}>{desc}</div>
        {detail && (
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', color: '#1565c0', fontSize: '13px', fontWeight: 600 }}>詳情</summary>
            <div style={{ marginTop: '8px' }}>{detail}</div>
          </details>
        )}
      </div>
    </div>
  );
}

/* ---------- 樣式 ---------- */
const code: React.CSSProperties = {
  background: '#f1f5f9',
  padding: '2px 6px',
  borderRadius: '5px',
  fontSize: '12.5px',
  color: '#0f172a',
};

const detailP: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '13px',
  color: '#555',
  lineHeight: 1.85,
};

const link: React.CSSProperties = { color: '#1565c0', fontWeight: 600 };

const btnPrimary: React.CSSProperties = {
  padding: '12px 18px',
  borderRadius: '10px',
  border: 'none',
  background: '#003366',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  padding: '12px 18px',
  borderRadius: '10px',
  border: '1px solid #003366',
  background: 'white',
  color: '#003366',
  fontWeight: 700,
  cursor: 'pointer',
};
