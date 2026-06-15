'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ExaminerContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const [result, setResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!token) {
      setError('缺少驗證連結，請檢查電郵內的專屬網址。');
      setLoading(false);
      return;
    }
    setTimeout(() => {
      setVerified(true);
      setLoading(false);
    }, 500);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.examinerSubmitResult(token, result, remarks);
      if (res.success) {
        setSubmitted(true);
      } else {
        setError('提交失敗：' + (res.error || '請稍後重試'));
      }
    } catch (err) {
      setError('網絡錯誤，請稍後重試');
    }
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>驗證連結中...</div>;
  if (error) return <div style={{ background: '#ffebee', color: '#c62828', padding: '20px', borderRadius: '8px' }}>{error}</div>;
  if (submitted) return (
    <div style={{ background: '#e8f5e9', padding: '32px', borderRadius: '12px', textAlign: 'center' }}>
      <h2 style={{ color: '#2e7d32' }}>✅ 成績已提交</h2>
      <p>感謝您的評核，系統已自動通知區會及考生。</p>
    </div>
  );

  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>📝 主考成績回報</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
        請填寫考核結果。提交後系統將自動通知專章秘書處理證書事宜。<br/>
        如有疑問請聯絡助理區總監（童軍）。
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>考核結果 *</label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ 
              flex: 1, padding: '16px', borderRadius: '8px', border: result === 'PASS' ? '2px solid #4caf50' : '2px solid #eee',
              background: result === 'PASS' ? '#e8f5e9' : 'white', cursor: 'pointer', textAlign: 'center'
            }}>
              <input 
                type="radio" name="result" value="PASS" checked={result === 'PASS'} 
                onChange={() => setResult('PASS')} style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#4caf50' }}>合格 ✓</span>
            </label>
            <label style={{ 
              flex: 1, padding: '16px', borderRadius: '8px', border: result === 'FAIL' ? '2px solid #f44336' : '2px solid #eee',
              background: result === 'FAIL' ? '#ffebee' : 'white', cursor: 'pointer', textAlign: 'center'
            }}>
              <input 
                type="radio" name="result" value="FAIL" checked={result === 'FAIL'} 
                onChange={() => setResult('FAIL')} style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#f44336' }}>不合格 ✗</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>評語 / 備註</label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="請簡述考核表現及建議（如需重考請註明原因）"
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '100px' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? '#ccc' : result === 'PASS' ? '#4caf50' : '#f44336',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '提交中...' : '確認提交成績'}
        </button>
      </form>
    </div>
  );
}

export default function ExaminerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>載入中...</div>}>
      <ExaminerContent />
    </Suspense>
  );
}