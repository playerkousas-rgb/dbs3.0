'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminConsole } from '@/components/AdminConsole';
import { api } from '@/lib/api';
import { detectSuperSession, superLogout } from '@/lib/superClient';

/**
 * /admin — 區秘書後台入口
 *
 * 兩種登入方式：
 *  1. 區秘書：輸入該區 Google Sheet Config 內的 STAFF_TOKEN
 *  2. 平台超管：在 /super 以 SUPER_KEY（Vercel 環境變數）登入後，
 *     回到本頁會自動以超管全域模式進入，無需輸入任何區密鑰。
 */

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [superMode, setSuperMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const login = async (tk: string) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.adminGetDashboard(tk);
      if (res.success) {
        setLoggedIn(true);
      } else {
        setMessage('登入失敗：' + (res.error || '請檢查密鑰'));
      }
    } catch (e: any) {
      setMessage('登入失敗：' + (e?.message || '網絡錯誤'));
    }
    setLoading(false);
  };

  // 先檢查超管 session：有就免密鑰直接進入（權限由伺服器端注入）
  useEffect(() => {
    let alive = true;
    (async () => {
      const isSuper = await detectSuperSession();
      if (!alive) return;
      setSuperMode(isSuper);
      if (isSuper) await login('');
      if (alive) setChecking(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    if (superMode) {
      await superLogout();
      setSuperMode(false);
    }
    setLoggedIn(false);
    setToken('');
    setMessage('');
  };

  if (checking) {
    return (
      <div style={{ background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', color: '#666' }}>
        檢查登入狀態...
      </div>
    );
  }

  if (loggedIn) {
    return <AdminConsole token={token} superMode={superMode} onLogout={handleLogout} />;
  }

  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>⚙️ 秘書後台登入</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
        請輸入系統管理密鑰
      </p>
      <input
        type="password"
        value={token}
        onChange={e => setToken(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && login(token)}
        placeholder="輸入 STAFF_TOKEN"
        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '16px', boxSizing: 'border-box' }}
      />
      <button
        onClick={() => login(token)}
        disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
      >
        {loading ? '驗證中...' : '登入'}
      </button>
      {message && <p style={{ color: '#c62828', marginTop: '12px', fontSize: '14px' }}>{message}</p>}

      <p style={{ marginTop: '20px', fontSize: '13px', color: '#888', lineHeight: 1.7, borderTop: '1px solid #eee', paddingTop: '14px' }}>
        平台超管請改用 <Link href="/super" style={{ color: '#1565c0', fontWeight: 600 }}>/super</Link> 以 SUPER_KEY 登入，
        登入後全域通行，唔需要知道任何區的密鑰。
      </p>
    </div>
  );
}
