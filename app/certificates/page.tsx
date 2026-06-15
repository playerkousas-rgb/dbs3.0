'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useDistrict } from '@/lib/useDistrict';

export default function CertificatesPage() {
  const { district, withDistrict } = useDistrict();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPendingCertificates()
      .then((r: any) => {
        if (r.success) setCertificates(r.certificates || []);
        else setError(r.error || '載入失敗');
      })
      .catch(() => setError('網絡錯誤'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>載入中...</div>;

  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '12px' }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>🏆 待領取專章證書</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        {district ? `以下為${district.name}已製作完成的證書，請於辦公時間內到區會領取。` : '以下證書已製作完成，請於辦公時間內到區會領取。'}請攜帶申請編號以便核對。
      </p>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {certificates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          目前沒有待領取的證書
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#003366', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>旅團</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>姓名</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>專章</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>可領取日期</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px' }}>{cert.groupId}</td>
                  <td style={{ padding: '12px' }}>{cert.memberName}</td>
                  <td style={{ padding: '12px' }}>{cert.badgeName}</td>
                  <td style={{ padding: '12px' }}>{cert.readyAt ? cert.readyAt.split('T')[0] : '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <a 
                      href={withDistrict(`/status?appId=${cert.applicationId}`)}
                      style={{ color: '#003366', textDecoration: 'none', fontWeight: 600 }}
                    >
                      查詢進度 →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}