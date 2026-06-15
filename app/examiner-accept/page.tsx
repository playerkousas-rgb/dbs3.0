'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ExaminerAcceptInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const doAccept = async () => {
    if (!token) {
      setStatus('error');
      setMessage('連結缺少驗證碼');
      return;
    }
    setStatus('loading');
    try {
      const res: any = await api.examinerAccept(token);
      if (res.success) {
        setStatus('success');
        setMessage(res.message || '已確認接受指派');
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
        <h3 style={{ color: '#2e7d32' }}>已確認接受指派</h3>
        <p style={{ color: '#333', lineHeight: '1.6' }}>{message}</p>
        <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', margin: '24px 0', textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
            考生已收到您的聯絡方式。請於 90 天內完成考核。<br/>
            考核完成後，請從電郵內的「提交成績」連結回報結果。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '40px 24px', borderRadius: '12px', maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ color: '#003366', marginBottom: '16px', textAlign: 'center' }}>主考接受指派</h2>

      {status === 'error' && (
        <div style={{ background: '#ffebee', padding: '12px', borderRadius: '8px', margin: '16px 0', color: '#c62828' }}>
          ❌ {message}
        </div>
      )}

      <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px', margin: '16px 0' }}>
        <p style={{ margin: 0, color: '#333', lineHeight: '1.6' }}>
          您即將確認接受區會指派的專章考核工作。<br/>
          接受後，考生會收到您的聯絡資料並主動安排考核。
        </p>
      </div>

      <button
        onClick={doAccept}
        disabled={status === 'loading'}
        style={{
          width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
          background: status === 'loading' ? '#999' : '#2e7d32',
          color: 'white', fontWeight: 600, fontSize: '16px', cursor: status === 'loading' ? 'wait' : 'pointer'
        }}
      >
        {status === 'loading' ? '⏳ 處理中...' : '✅ 確認接受指派'}
      </button>
    </div>
  );
}

export default function ExaminerAcceptPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>載入中...</div>}>
      <ExaminerAcceptInner />
    </Suspense>
  );
}
