'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DISTRICT_LIST,
  DistrictCode,
  getDistrictStatusColor,
  getDistrictStatusLabel,
  isDistrictAvailable,
  setStoredDistrictCode,
} from '@/lib/district';

interface Props {
  title?: string;
  description?: string;
  mode?: 'card' | 'inline';
  redirectToCurrentPath?: boolean;
  onPicked?: (code: DistrictCode) => void;
}

export default function DistrictPicker({
  title = '請先選擇所屬地區',
  description = '系統會根據你所選地區，自動連接對應的 Google Sheet / Apps Script 後台。',
  mode = 'card',
  redirectToCurrentPath = true,
  onPicked,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('d');
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ''}`;
  }, [pathname, searchParams]);

  const pick = (code: DistrictCode) => {
    if (!isDistrictAvailable(code)) return;
    setStoredDistrictCode(code);
    onPicked?.(code);
    if (!redirectToCurrentPath) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('d', code);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: mode === 'card' ? '28px' : '20px',
      boxShadow: mode === 'card' ? '0 4px 18px rgba(0,0,0,0.06)' : 'none',
      border: '1px solid #e5e7eb',
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#003366', fontSize: '22px' }}>{title}</h3>
      <p style={{ marginTop: 0, color: '#666', fontSize: '14px', lineHeight: 1.6 }}>{description}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '18px' }}>
        {DISTRICT_LIST.map((district) => {
          const color = getDistrictStatusColor(district.status);
          const disabled = district.status === 'disabled';
          return (
            <button
              key={district.code}
              onClick={() => pick(district.code as DistrictCode)}
              disabled={disabled}
              style={{
                textAlign: 'left',
                background: disabled ? '#fafafa' : '#f9fbff',
                border: `1px solid ${disabled ? '#e7d5d5' : '#d8e4f0'}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.8 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <strong style={{ color: '#003366', fontSize: '16px' }}>{district.name}</strong>
                <span style={{
                  background: `${color}18`,
                  color,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {getDistrictStatusLabel(district.status)}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#555' }}>區碼：{district.code}</div>
              <div style={{ fontSize: '13px', color: '#777', marginTop: '6px', lineHeight: 1.5 }}>
                {district.note || (disabled ? '此區目前未開放使用。' : '已接入此平台，可直接進行報考、查詢及主考申請。')}
              </div>
            </button>
          );
        })}
      </div>

      {basePath === '/' && (
        <p style={{ marginTop: '14px', color: '#999', fontSize: '12px' }}>
          如你的地區未在列表中，可到「區接入教學」查看接入方法。
        </p>
      )}
    </div>
  );
}
