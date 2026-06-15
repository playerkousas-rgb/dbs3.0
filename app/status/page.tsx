'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useDistrict } from '@/lib/useDistrict';

function StatusContent() {
  const searchParams = useSearchParams();
  const { districtCode, district } = useDistrict();
  const prefillAppId = searchParams.get('appId') || '';

  const [appId, setAppId] = useState(prefillAppId);
  const [ymNumber, setYmNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId || !ymNumber) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getStatus(appId, ymNumber);
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || '查詢失敗');
        setResult(null);
      }
    } catch {
      setError('網絡錯誤，請稍後重試');
    }
    setLoading(false);
  };

  const statusFlow = [
    { key: 'PENDING_PARENT', label: '待家長確認', statusText: '待家長確認' },
    { key: 'PENDING_LEADER', label: '待團長確認', statusText: '待團長確認' },
    { key: 'PENDING_DISTRICT', label: '待區批核', statusText: '待區批核' },
    { key: 'PENDING_EXAMINER_ACCEPT', label: '已指派待主考接受', statusText: '已指派待主考接受' },
    { key: 'ASSIGNED_EXAMINER', label: '已派主考進行中', statusText: '已派主考進行中' },
    { key: 'EXAM_COMPLETED_PASS', label: '考驗合格待製證書', statusText: '考驗合格待製證書' },
    { key: 'CERTIFICATE_READY', label: '證書待領取', statusText: '證書待領取' },
    { key: 'COMPLETED', label: '已完成', statusText: '已完成' },
  ];

  const getCurrentStep = (status: string) => {
    const idx = statusFlow.findIndex(s => s.statusText === status);
    if (status === '已批核待派主考') return 3;
    return idx >= 0 ? idx : statusFlow.length;
  };

  const examplePrefix = districtCode || 'XXX';

  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '12px' }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>🔍 報考進度查詢</h2>
      <p style={{ color: '#666', marginTop: 0, fontSize: '14px' }}>
        {district ? `目前查詢地區：${district.name}` : '請輸入申請編號及 YMIS 童軍成員編號。'}
      </p>

      <form onSubmit={handleQuery} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>申請編號 *</label>
            <input
              value={appId}
              onChange={e => setAppId(e.target.value.toUpperCase())}
              placeholder={`例如：${examplePrefix}-250520-0001`}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>童軍成員編號(YMIS) *</label>
            <input
              value={ymNumber}
              onChange={e => setYmNumber(e.target.value)}
              placeholder="YMIS 編號"
              required
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '12px 24px', background: loading ? '#ccc' : '#003366', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '查詢中...' : '查詢'}
          </button>
        </div>
      </form>

      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

      {result && (
        <div>
          <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px', color: '#003366' }}>{result.memberName} · {result.badgeName}</h3>
            <p style={{ margin: '4px 0', color: '#666' }}>申請編號：<strong>{result.applicationId}</strong></p>
            <p style={{ margin: '4px 0', color: '#666' }}>YMIS：{result.ymNumber}</p>
            <p style={{ margin: '4px 0', color: '#666' }}>所屬旅團：{result.groupId}</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#003366', marginBottom: '16px' }}>進度追蹤</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {statusFlow.map((step, idx) => {
                const currentStep = getCurrentStep(result.status);
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                const isFailed = (result.status === '不合格' || result.status === '逾期不合格') && idx >= 5;

                return (
                  <div
                    key={step.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: isActive ? '#e8f5e9' : isCompleted ? '#f5f5f5' : 'white',
                      borderLeft: isActive ? '4px solid #2e7d32' : isCompleted ? '4px solid #bdbdbd' : '4px solid transparent',
                      opacity: idx > currentStep && !isFailed ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: '20px', marginRight: '12px' }}>
                      {isFailed && idx === 5 ? '❌' : isCompleted ? '✓' : isActive ? '▶' : '○'}
                    </span>
                    <span style={{ fontWeight: isActive ? 700 : 400, color: isActive ? '#2e7d32' : '#333' }}>{step.label}</span>
                    {isActive && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#2e7d32', fontWeight: 600 }}>目前狀態</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {result.result && (
            <div style={{ background: result.result === 'PASS' ? '#e8f5e9' : '#ffebee', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <strong>考核結果：</strong>{result.result === 'PASS' ? '合格 ✓' : '不合格 ✗'}
            </div>
          )}

          {result.certificateNumber && (
            <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <strong>證書編號：</strong>{result.certificateNumber}
              <br />
              {result.pickedUpAt ? `已於 ${result.pickedUpAt.toString().split('T')[0]} 領取` : '尚未領取'}
            </div>
          )}

          <div style={{ fontSize: '13px', color: '#666', marginTop: '16px' }}>
            <p>提交時間：{result.submittedAt ? result.submittedAt.toString().replace('T', ' ').slice(0, 16) : '—'}</p>
            {result.parentConfirmedAt && <p>家長確認：{result.parentConfirmedAt.toString().replace('T', ' ').slice(0, 16)}</p>}
            {result.leaderConfirmedAt && <p>團長確認：{result.leaderConfirmedAt.toString().replace('T', ' ').slice(0, 16)}</p>}
            {result.districtApprovedAt && <p>區會批核：{result.districtApprovedAt.toString().replace('T', ' ').slice(0, 16)}</p>}
            {result.examDeadline && <p>考核限期：{result.examDeadline}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>載入中...</div>}>
      <StatusContent />
    </Suspense>
  );
}
