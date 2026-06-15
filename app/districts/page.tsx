import Link from 'next/link';
import {
  DISTRICT_LIST,
  getDistrictStatusColor,
  getDistrictStatusLabel,
  PLATFORM_COPYRIGHT,
} from '@/lib/district';

export default function DistrictsPage() {
  const live = DISTRICT_LIST.filter(d => d.status === 'live');
  const testing = DISTRICT_LIST.filter(d => d.status === 'testing');

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
        <h2 style={{ marginTop: 0, color: '#003366' }}>🌏 現已使用地區</h2>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          此頁用作展示目前已接入或測試中的地區。若你所屬地區未在列表中，可把本平台資料轉發給區內負責人，邀請他們試用接入。
        </p>
      </section>

      <Section title="已開通使用" emptyText="目前尚未有已開通地區。" items={live} />
      <Section title="測試中" emptyText="目前沒有測試中地區。" items={testing} />

      <section style={{ background: '#f7fafc', padding: '24px', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
        <h3 style={{ marginTop: 0, color: '#003366' }}>你的地區尚未接入？</h3>
        <p style={{ color: '#666', lineHeight: 1.7 }}>
          平台採用「Google Sheet + Apps Script」接入方式，各區只需部署自己的後台並提交 URL，即可接入。
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/setup" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '12px 18px', borderRadius: '10px', border: 'none', background: '#003366', color: 'white', fontWeight: 700, cursor: 'pointer' }}>查看接入教學</button>
          </Link>
          <Link href="/onboard" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #003366', background: 'white', color: '#003366', fontWeight: 700, cursor: 'pointer' }}>提交接入申請</button>
          </Link>
        </div>
        <p style={{ marginBottom: 0, marginTop: '14px', fontSize: '12px', color: '#999' }}>{PLATFORM_COPYRIGHT}</p>
      </section>
    </div>
  );
}

function Section({ title, emptyText, items }: any) {
  return (
    <section style={{ background: 'white', padding: '28px', borderRadius: '16px' }}>
      <h3 style={{ marginTop: 0, color: '#003366' }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ color: '#999', marginBottom: 0 }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {items.map((district: any) => {
            const color = getDistrictStatusColor(district.status);
            return (
              <div key={district.code} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', background: '#fcfdff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <strong style={{ color: '#003366', fontSize: '16px' }}>{district.name}</strong>
                  <span style={{ background: `${color}18`, color, padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                    {getDistrictStatusLabel(district.status)}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#555' }}>區碼：{district.code}</div>
                <div style={{ fontSize: '13px', color: '#777', marginTop: '8px', lineHeight: 1.6 }}>
                  {district.note || '已接入本平台。'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
