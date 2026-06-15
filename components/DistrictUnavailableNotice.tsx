'use client';

interface Props {
  districtName?: string;
  message: string;
}

export default function DistrictUnavailableNotice({ districtName, message }: Props) {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', background: 'white', borderRadius: '18px', padding: '32px', boxShadow: '0 6px 20px rgba(0,0,0,0.06)', border: '1px solid #f3d0d0' }}>
      <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '999px', background: '#ffebee', color: '#c62828', fontWeight: 700, fontSize: '12px', marginBottom: '14px' }}>
        暫停服務
      </div>
      <h2 style={{ marginTop: 0, marginBottom: '10px', color: '#8e0000' }}>
        {districtName ? `${districtName}暫時未能使用` : '此區暫時未能使用'}
      </h2>
      <p style={{ color: '#555', lineHeight: 1.9, marginBottom: '14px' }}>
        {message}
      </p>
      <div style={{ background: '#f8f8f8', borderRadius: '12px', padding: '16px', color: '#666', lineHeight: 1.8, fontSize: '14px' }}>
        平台管理員已暫停此區的前端連通服務。<br />
        如你屬於該區，請直接向區方查詢後續安排；如你希望自行建立後台，亦可參考本平台的接入教學與模板，自行構建。
      </div>
    </div>
  );
}
