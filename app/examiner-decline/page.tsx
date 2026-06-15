'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ExaminerDeclineInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const doDecline = async () => {
    if (!token) {
      setStatus('error');
      setMessage('連結缺少驗證碼');
      return;
    }
    if (!reason.trim()) {
      setStatus('error');
      setMessage('請填寫拒絕原因');
      return;
    }
    setStatus('loading');
    try {
      const res: any = await api.examinerDecline(token, reason);
      if (res.success) {
        setStatus('success');
        setMessage(res.message || '已拒絕指派，系統將重新分配主考。');
      } else {
        setStatus('error');
        setMessage(res.error || '操作失敗');
      }
    } catch {
      setStatus('error');
      setMessage('網絡錯誤');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ background: 'white', padding: '40px 24px', borderRadius: '12px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <p style={{ fontSize: '48px', margin: '24px 0' }}>✅</p>
        <h3 style={{ color: '#2e7d32' }}>已拒絕指派</h3>
        <p style={{ color: '#333', lineHeight: '1.6' }}>{message}</p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '16px' }}>感謝您的回覆，系統會自動重新分配主考。</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '40px 24px', borderRadius: '12px', maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ color: '#003366', marginBottom: '16px', textAlign: 'center' }}>拒絕考核指派</h2>

      {status === 'error' && (
        <div style={{ background: '#ffebee', padding: '12px', borderRadius: '8px', margin: '16px 0', color: '#c62828' }}>
          ❌ {message}
        </div>
      )}

      <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px', margin: '16px 0' }}>
        <p style={{ margin: 0, color: '#333', lineHeight: '1.6', fontSize: '14px' }}>
          請說明拒絕原因，方便系統及秘書處理。系統會自動重新派發給其他合資格主考。
        </p>
      </div>

      <div style={{ margin: '16px 0' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333' }}>
          拒絕原因 <span style={{ color: '#c62828' }}>*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          placeholder="例：時間無法配合、健康狀況、其他工作繁忙..."
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={doDecline}
        disabled={status === 'loading'}
        style={{
          width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
          background: status === 'loading' ? '#999' : '#c62828',
          color: 'white', fontWeight: 600, fontSize: '16px', cursor: status === 'loading' ? 'wait' : 'pointer'
        }}
      >
        {status === 'loading' ? '⏳ 處理中...' : '提交拒絕'}
      </button>
    </div>
  );
}

export default function ExaminerDeclinePage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>載入中...</div>}>
      <ExaminerDeclineInner />
    </Suspense>
  );
}
