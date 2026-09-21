'use client';

/* ============================================================================
 *  使用指南（公開）/guide
 *  版面原則：先講「做咩」→ 幾步做完 → 最後才注意事項
 * ========================================================================== */

import { useState } from 'react';

export default function GuidePage() {
  const [tab, setTab] = useState<'student' | 'examiner'>('student');

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h2 style={{ color: '#003366', marginBottom: '4px' }}>📖 使用指南</h2>
      <p style={{ color: '#666', fontSize: '14px', marginTop: 0 }}>請選擇您的身份，跟住步驟做就可以。</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <TabBtn active={tab === 'student'} onClick={() => setTab('student')} label="🧒 考生 / 家長" />
        <TabBtn active={tab === 'examiner'} onClick={() => setTab('examiner')} label="👨‍🏫 主考" />
      </div>

      {tab === 'student' ? <StudentGuide /> : <ExaminerGuide />}
    </div>
  );
}

/* ══════════════════ 考生 / 家長 ══════════════════ */
function StudentGuide() {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <Card>
        <H>🧒 考生 / 家長：三步完成</H>
        <Step n={1} title="報考" desc={<>首頁按 <strong>「📝 報考專章」</strong>，填寫考生、旅團及所選專章資料。</>} />
        <Step n={2} title="等確認" desc={<>送出後系統會自動通知<strong>家長</strong>及<strong>團長</strong>，兩邊確認後由區會批核。</>} />
        <Step n={3} title="查進度" desc={<>首頁按 <strong>「🔍 進度查詢」</strong>，輸入<strong>申請編號 + YMIS 童軍編號</strong>。</>} />
      </Card>

      <Card>
        <H>考核安排有幾種？</H>
        <Ul items={[
          '自行安排主考：只可選本旅團具該章資格的 G 主考，或全區資格的 D 主考。',
          '由區會派發：系統按本區設定自動安排主考。',
          '其他安排：認可訓練班、專章考驗日、證書換章（不需派主考）。',
        ]} />
      </Card>

      <Card>
        <H>證書</H>
        <p style={P}>考核合格並完成製證後，可到首頁 <strong>「📋 待領證書」</strong> 查看，之後由區會安排領取。</p>
      </Card>

      <Note>
        <strong>請注意：</strong>
        <Ul items={[
          'YMIS 編號、電郵、家長電郵要填對，所有通知都靠它們。',
          '「申請編號」請自己保存好，查進度時要用。',
        ]} />
      </Note>
    </div>
  );
}

/* ══════════════════ 主考 ══════════════════ */
function ExaminerGuide() {
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <Card>
        <H>👨‍🏫 主考：三步完成</H>
        <Step n={1} title="申請" desc={<>首頁按 <strong>「👨‍🏫 主考申請」</strong>，填姓名、稱謂、電郵、電話、旅團、職級，並勾選想考的專章。</>} />
        <Step n={2} title="等 ADC 審批" desc={<>送出後會取得申請編號（APT-xxxxxx-xxxx）。審批結果會用電郵通知你。</>} />
        <Step n={3} title="接受指派、回報成績" desc={<>收到考核指派電郵 → 按電郵內連結<strong>接受或拒絕</strong> → 考核完成後用連結<strong>回報成績</strong>。</>} />
      </Card>

      <Card>
        <H>兩種主考級別</H>
        <div style={{ display: 'grid', gap: '10px' }}>
          <Row label="G 旅團主考" tone="#e65100" desc="只可以考核本旅團童軍。" />
          <Row label="D 區主考" tone="#1565c0" desc="可以考核全區童軍。" />
        </div>
      </Card>

      <Card>
        <H>查進度</H>
        <p style={P}>首頁 <strong>「🗂️ 主考專區」</strong> → 主考申請進度查詢，輸入申請編號即可。</p>
      </Card>

      <Note>
        <strong>請注意：</strong>
        <Ul items={[
          '只考核自己獲委任級別範圍內的考生（G 主考勿跨旅）。',
          '請於考核限期內完成並回報（預設 90 天）。',
          '申請時請如實填寫資歷；附上證書附件可加快審批。',
        ]} />
      </Note>
    </div>
  );
}

/* ---------- 共用小元件 ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'white', padding: '22px 26px', borderRadius: '14px' }}>{children}</div>;
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 style={{ color: '#003366', marginTop: 0, marginBottom: '14px', fontSize: '16px' }}>{children}</h3>;
}

function Step({ n, title, desc }: { n: number; title: string; desc: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{
        flexShrink: 0, width: '34px', height: '34px', borderRadius: '50%',
        background: '#003366', color: 'white', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 700, fontSize: '16px',
      }}>{n}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#003366', fontSize: '14.5px' }}>{title}</div>
        <div style={{ color: '#555', fontSize: '14px', lineHeight: 1.75, marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
  );
}

function Row({ label, tone, desc }: { label: string; tone: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ background: tone, color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#555' }}>{desc}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff8e1', border: '1px solid #f0d98a', padding: '18px 24px', borderRadius: '14px', color: '#6d4c41', fontSize: '14px' }}>
      {children}
    </div>
  );
}

function Ul({ items }: { items: string[] }) {
  return <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '14px', color: '#333', lineHeight: 1.9 }}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

const P: React.CSSProperties = { margin: 0, color: '#555', fontSize: '14px', lineHeight: 1.8 };

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (<button onClick={onClick} style={{
    padding: '10px 18px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    background: active ? '#003366' : '#e0e0e0', color: active ? 'white' : '#333'
  }}>{label}</button>);
}
