'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function LeaderConfirmInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('連結缺少驗證碼，請重新從電郵點擊');
      return;
    }
    api.leaderConfirm(token)
      .then((res: any) => {
        if (res.success) {
          setStatus('success');
          setMessage(res.message || '已成功確認，申請已送往區會審批。');
        } else {
          setStatus('error');
          setMessage(res.error || '確認失敗，請聯絡專章秘書 dbs@skwscout.org.hk');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('網絡錯誤，請稍後重試或聯絡專章秘書 dbs@skwscout.org.hk');
      });
  }, [token]);

  return (
    <div style={{ background: 'white', padding: '40px 24px', borderRadius: '12px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ color: '#003366', marginBottom: '16px' }}>團長確認</h2>

      {status === 'loading' && (
        <div>
          <p style={{ fontSize: '48px', margin: '24px 0' }}>⏳</p>
          <p style={{ color: '#666' }}>處理中，請稍候...</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <p style={{ fontSize: '48px', margin: '24px 0' }}>✅</p>
          <h3 style={{ color: '#2e7d32', marginBottom: '16px' }}>團長確認成功！</h3>
          <p style={{ color: '#333', lineHeight: '1.6' }}>{message}</p>
          <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', margin: '24px 0', textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
              <strong>下一步：</strong>申請已送交區會專章秘書審批。<br/>
              審批通過後，系統會自動派發主考，並通知考生及主考。
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#666' }}>
              💡 此電郵確認等同團長簽署及蓋印。
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div>
          <p style={{ fontSize: '48px', margin: '24px 0' }}>❌</p>
          <h3 style={{ color: '#c62828', marginBottom: '16px' }}>確認失敗</h3>
          <p style={{ color: '#333', lineHeight: '1.6' }}>{message}</p>
        </div>
      )}
    </div>
  );
}

export default function LeaderConfirmPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>載入中...</div>}>
      <LeaderConfirmInner />
    </Suspense>
  );
}
