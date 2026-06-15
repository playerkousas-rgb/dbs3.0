'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DistrictPicker from '@/components/DistrictPicker';
import {
  DISTRICT_LIST,
  PLATFORM_COPYRIGHT,
  PLATFORM_NAME,
  clearStoredDistrictCode,
  getDistrictInfo,
  isDistrictCode,
  setStoredDistrictCode,
  withDistrictParam,
} from '@/lib/district';
import { useDistrict } from '@/lib/useDistrict';

const PUBLIC_PATHS = ['/', '/setup', '/onboard', '/districts', '/guide'];

const navItems = [
  { href: '/apply', label: '📝 報考' },
  { href: '/status', label: '🔍 查詢' },
  { href: '/certificates', label: '📋 證書' },
  { href: '/examiner-apply', label: '👨‍🏫 主考申請' },
  { href: '/adc', label: '🗂️ 主考專區' },
  { href: '/guide', label: '📖 指南' },
  { href: '/admin', label: '⚙️ 後台' },
  { href: '/setup', label: '🧩 區接入' },
  { href: '/downloads', label: '⬇️ 下載' },
  { href: '/updates', label: '📢 更新' },
  { href: '/districts', label: '🌏 使用地區' },
];

export default function DistrictShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { district, districtCode, hasDistrict, withDistrict } = useDistrict();

  const isPublicPath = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/admin/print-cert/');
  const currentTitle = district ? `${district.name}專科徽章管理系統` : PLATFORM_NAME;

  const currentQuery = useMemo(() => searchParams.toString(), [searchParams]);

  const changeDistrict = (nextCode: string) => {
    if (!isDistrictCode(nextCode)) return;
    setStoredDistrictCode(nextCode);
    const params = new URLSearchParams(currentQuery);
    params.set('d', nextCode);
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearDistrict = () => {
    clearStoredDistrictCode();
    const params = new URLSearchParams(currentQuery);
    params.delete('d');
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`);
  };

  const districtGateNeeded = !hasDistrict && !isPublicPath;

  return (
    <>
      <header className="no-print" style={{ background: '#003366', color: 'white', padding: '12px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <Link href={withDistrict('/')} style={{ color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '18px' }}>
              🏕️ {currentTitle}
            </Link>
            <div style={{ fontSize: '12px', color: '#bbdefb', marginTop: '4px' }}>
              {district ? `目前地區：${district.name} (${district.code})` : '未選擇地區'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={districtCode || ''}
              onChange={e => changeDistrict(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'white',
                color: '#003366',
                fontWeight: 600,
              }}
            >
              <option value="">選擇地區...</option>
              {DISTRICT_LIST.map(d => (
                <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>
            {districtCode && (
              <button
                onClick={clearDistrict}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                清除地區
              </button>
            )}
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '12px', fontSize: '14px', flexWrap: 'wrap', marginTop: '12px' }}>
          {navItems.map(item => (
            <Link key={item.href} href={withDistrict(item.href)} style={{ color: '#bbdefb', textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px' }}>
        {districtGateNeeded ? (
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <DistrictPicker
              title="這個功能需要先選擇地區"
              description="由於每個地區都有自己獨立的 Google Sheet / Apps Script 後台，請先選擇你所屬地區，再繼續使用報考、查詢或主考相關功能。"
            />
          </div>
        ) : children}
      </main>

      <footer className="no-print" style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '13px' }}>
        <div>{PLATFORM_COPYRIGHT}</div>
        <div style={{ marginTop: '6px' }}>
          {district ? `${district.name} · Multi-district platform powered by SKWSCOUT SYSTEM` : 'Multi-district platform powered by SKWSCOUT SYSTEM'}
        </div>
      </footer>
    </>
  );
}
