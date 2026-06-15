'use client';

/* ============================================================================
 *  使用指南（公開）/guide
 *  - 分頁：考生 / 家長、主考
 *  放到 repo：  app/guide/page.tsx
 * ========================================================================== */

import { useState } from 'react';

export default function GuidePage() {
  const [tab, setTab] = useState<'student' | 'examiner'>('student');

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h2 style={{ color: '#003366', marginBottom: '4px' }}>📖 使用指南</h2>
      <p style={{ color: '#666', fontSize: '14px', marginTop: 0 }}>請選擇您的身份查看操作說明。</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <TabBtn active={tab === 'student'} onClick={() => setTab('student')} label="🧒 考生 / 家長" />
        <TabBtn active={tab === 'examiner'} onClick={() => setTab('examiner')} label="👨‍🏫 主考" />
      </div>

      {tab === 'student' ? <StudentGuide /> : <ExaminerGuide />}
    </div>
  );
}

function StudentGuide() {
  return (
    <Card>
      <H>🧒 考生 / 家長指南</H>

      <Sub>你可以做什麼</Sub>
      <Ul items={[
        '報考專章：首頁 →「📝 報考專章」',
        '查詢考核進度：首頁 →「🔍 進度查詢」（輸入 申請編號 + YMIS 童軍編號）',
        '查看待領證書：首頁 →「📋 待領證書」',
      ]} />

      <Sub>報考流程</Sub>
      <Ol items={[
        '進入「報考專章」，填寫個人 / 旅團 / 專章資料。',
        '選擇考驗安排：自行安排主考（只能選本旅團且具該章資格的主考）／由區會派發（系統自動安排）／其他安排（認可訓練班、專章考驗日、證書換章，不需派主考）。',
        '送出後，系統自動通知家長與團長確認。',
        '雙方確認 → 區會批核 → 指派主考 → 考核 → 合格製證書 → 領取。',
      ]} />

      <Sub>你的責任</Sub>
      <Ul items={[
        '確保 YMIS、電郵、家長電郵正確（所有通知靠它）。',
        '妥善保存「申請編號」，查詢進度時要用。',
      ]} />
    </Card>
  );
}

function ExaminerGuide() {
  return (
    <Card>
      <H>👨‍🏫 主考指南</H>

      <Sub>你可以做什麼</Sub>
      <Ul items={[
        '申請成為主考：首頁 →「👨‍🏫 主考申請」',
        '查詢申請審批進度：首頁 →「🗂️ 主考專區」→ 主考申請進度查詢',
        '接受 / 拒絕考核指派、回報成績：透過系統電郵內的連結',
      ]} />

      <Sub>申請主考流程</Sub>
      <Ol items={[
        '進入「主考申請」，填寫姓名（只填名字）+ 稱謂（先生／女士／不適用，系統自動組合）、電郵、電話、所屬旅團、職級、年資。',
        '勾選想申請的專章，每章再選級別：旅團主考(G) 只考核本旅團童軍；區主考(D) 可考核全區童軍。',
        '填寫資歷、上傳證書附件（建議附上，加快審批）。',
        '送出後會收到申請編號（APT-xxxxxx-xxxx），ADC 會收到通知。',
        '可隨時用申請編號到「主考專區」查進度。',
        'ADC 審批後，你會收到電郵，列明獲委任 / 未批准的專章與級別。',
      ]} />

      <Sub>收到考核指派後</Sub>
      <Ul items={[
        '電郵內有「接受」「拒絕」連結，請盡快回應。',
        '考核完成後，用電郵連結回報成績（合格／不合格 + 備註）。',
      ]} />

      <Sub>你的責任</Sub>
      <Ul items={[
        '只考核自己「獲委任級別」範圍內的考生（G 主考勿跨旅）。',
        '在考核限期（90 天）內完成並回報。',
        '申請時如實填寫資歷。',
      ]} />
    </Card>
  );
}

/* ---------- 共用小元件 ---------- */
function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (<button onClick={onClick} style={{
    padding: '10px 18px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    background: active ? '#003366' : '#e0e0e0', color: active ? 'white' : '#333'
  }}>{label}</button>);
}
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'white', padding: '28px', borderRadius: '12px', lineHeight: 1.7 }}>{children}</div>;
}
function H({ children }: { children: React.ReactNode }) {
  return <h3 style={{ color: '#003366', marginTop: 0 }}>{children}</h3>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <h4 style={{ color: '#1565c0', margin: '20px 0 8px', fontSize: '15px' }}>{children}</h4>;
}
function Ul({ items }: { items: string[] }) {
  return <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>{items.map((t, i) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}</ul>;
}
function Ol({ items }: { items: string[] }) {
  return <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#333' }}>{items.map((t, i) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}</ol>;
}
