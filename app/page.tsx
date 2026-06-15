'use client';

import Link from 'next/link';
import DistrictPicker from '@/components/DistrictPicker';
import { PLATFORM_COPYRIGHT } from '@/lib/district';
import { useDistrict } from '@/lib/useDistrict';

export default function HomePage() {
  const { district, hasDistrict, withDistrict } = useDistrict();

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '999px', background: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: '12px', marginBottom: '14px' }}>
          DBS 3.0 多區版
        </div>
        <h2 style={{ color: '#003366', marginBottom: '12px' }}>
          {district ? `${district.name}童軍專科徽章全自動管理系統` : '多區專科徽章管理平台'}
        </h2>
        <p style={{ color: '#666', maxWidth: '760px', margin: '0 auto 16px', lineHeight: 1.7 }}>
          同一個前端平台，配合各區獨立的 Google Sheet + Apps Script 後台運作。<br />
          考生、家長、團長、主考、ADC 及秘書均可按所屬地區進入對應系統。
        </p>
        <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>
          {PLATFORM_COPYRIGHT}
        </p>
      </div>

      {!hasDistrict ? (
        <div style={{ display: 'grid', gap: '24px' }}>
          <DistrictPicker />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <InfoCard title="🧩 區接入教學" desc="其他區如欲使用本平台，可先查看接入流程、初始化方式及提交 URL 方法。" href="/setup" btn="查看接入教學" />
            <InfoCard title="⬇️ 模板下載" desc="直接下載或複製初始 GS 模板，供其他區建立空白 Sheet 後快速接入。" href="/downloads" btn="下載 GS 模板" />
            <InfoCard title="🌏 現已使用地區" desc="查看目前已開通或測試中的地區，亦可把此頁轉發給你所屬地區作參考。" href="/districts" btn="查看地區名單" />
            <InfoCard title="📢 更新公告" desc="讓區維護者直接查看平台是否有必須、建議或可選更新，避免逐區個別查詢。" href="/updates" btn="查看更新公告" />
            <InfoCard title="📖 使用指南" desc="未選地區前亦可先閱讀考生、家長、主考及 ADC 的基本操作說明。" href="/guide" btn="閱讀使用指南" />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <Card title="📝 報考專章" desc="查看本區主考名單，填寫申請表，系統自動通知家長及團長。" href={withDistrict('/apply')} btn="立即報考" primary />
          <Card title="🔍 進度查詢" desc="輸入申請編號及 YMIS 編號，隨時追蹤本區專章考核進度。" href={withDistrict('/status')} btn="查詢進度" />
          <Card title="📋 待領證書" desc="公開查詢本區已製作完成、待領取的專科徽章證書列表。" href={withDistrict('/certificates')} btn="查看列表" />
          <Card title="👨‍🏫 主考申請" desc="本區領袖可申請成為專科徽章主考，經審批後加入主考名冊。" href={withDistrict('/examiner-apply')} btn="申請主考" />
          <Card title="🗂️ 主考專區" desc="查詢主考申請進度；助理區總監（ADC）可登入審批主考委任。" href={withDistrict('/adc')} btn="進度查詢 / ADC 審批" />
          <Card title="📖 使用指南" desc="考生、家長、主考及 ADC 的操作說明與權責一覽。" href={withDistrict('/guide')} btn="查看指南" />
          <Card title="⚙️ 秘書後台" desc="審批申請、指派主考、管理證書隊列、查看統計報表。" href={withDistrict('/admin')} btn="進入後台" />
          <Card title="🌏 其他地區 / 區接入" desc="查看現已使用地區，或把本平台介紹給其他有興趣接入的地區。" href="/districts" btn="查看接入地區" />
        </div>
      )}
    </div>
  );
}

function Card({ title, desc, href, btn, primary = false }: any) {
  return (
    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 8px', color: '#003366', fontSize: '18px' }}>{title}</h3>
      <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px', minHeight: '44px', lineHeight: 1.6 }}>{desc}</p>
      <Link href={href}>
        <button style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: primary ? '#003366' : '#e0e0e0', color: primary ? 'white' : '#333', fontWeight: 600, cursor: 'pointer' }}>
          {btn}
        </button>
      </Link>
    </div>
  );
}

function InfoCard({ title, desc, href, btn }: any) {
  return <Card title={title} desc={desc} href={href} btn={btn} />;
}
