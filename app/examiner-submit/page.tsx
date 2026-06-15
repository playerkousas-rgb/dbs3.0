'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ExaminerSubmitInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [result, setResult] = useState<'PASS' | 'FAIL' | ''>('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const doSubmit = async () => {
    if (!token) {
      setStatus('error');
      setMessage('連結缺少驗證碼');
      return;
    }
    if (!result) {
      setStatus('error');
      setMessage('請選擇考核結果');
      return;
    }
    setStatus('loading');
    try {
      const res: any = await api.examinerSubmitResult(token, result, remarks);
      if (res.success) {
        setStatus('success');
        setMessage(res.message || '已成功提交考核結果');
      } else {
        setStatus('error');
        setMessage(res.error || '提交失敗');
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
        <h3 style={{ color: '#2e7d32' }}>結果已成功提交</h3>
        <p style={{ color: '#333', lineHeight: '1.6' }}>{message}</p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '16px' }}>感謝您完成考核工作！系統已通知考生及秘書。</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '40px 24px', borderRadius: '12px', maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ color: '#003366', marginBottom: '16px', textAlign: 'center' }}>提交考核結果</h2>

      {status === 'error' && (
        <div style={{ background: '#ffebee', padding: '12px', borderRadius: '8px', margin: '16px 0', color: '#c62828' }}>
          ❌ {message}
        </div>
      )}

      <div style={{ margin: '16px 0' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#333' }}>
          考核結果 <span style={{ color: '#c62828' }}>*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setResult('PASS')}
            style={{
              padding: '20px', borderRadius: '8px',
              border: result === 'PASS' ? '3px solid #2e7d32' : '2px solid #ddd',
              background: result === 'PASS' ? '#e8f5e9' : 'white',
              color: '#2e7d32', fontWeight: 600, fontSize: '18px', cursor: 'pointer'
            }}
          >
            ✅ 合格
          </button>
          <button
            type="button"
            onClick={() => setResult('FAIL')}
            style={{
              padding: '20px', borderRadius: '8px',
              border: result === 'FAIL' ? '3px solid #c62828' : '2px solid #ddd',
              background: result === 'FAIL' ? '#ffebee' : 'white',
              color: '#c62828', fontWeight: 600, fontSize: '18px', cursor: 'pointer'
            }}
          >
            ❌ 不合格
          </button>
        </div>
      </div>

      <div style={{ margin: '16px 0' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333' }}>
          評語 / 備註 {result === 'FAIL' && <span style={{ color: '#c62828' }}>（不合格時建議填寫）</span>}
        </label>
        <textarea
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          rows={4}
          placeholder="例：表現優秀、需要加強xxx、考核過程備註..."
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={doSubmit}
        disabled={status === 'loading' || !result}
        style={{
          width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
          background: status === 'loading' || !result ? '#999' : '#003366',
          color: 'white', fontWeight: 600, fontSize: '16px',
          cursor: status === 'loading' || !result ? 'not-allowed' : 'pointer',
          marginTop: '8px'
        }}
      >
        {status === 'loading' ? '⏳ 處理中...' : '提交考核結果'}
      </button>
    </div>
  );
}

export default function ExaminerSubmitPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>載入中...</div>}>
      <ExaminerSubmitInner />
    </Suspense>
  );
}
