'use client';

import React from 'react';

/**
 * CertBase — 所有證書的共用底盤
 * 規格：A5 橫向 = 210mm × 148mm
 * 內部用百分比座標定位，與背景圖完美對齊
 */

export interface CertField {
  /** 顯示文字（換行用 \n） */
  text: string;
  /** 左邊距 (% of width) */
  left: number;
  /** 上邊距 (% of height) */
  top: number;
  /** 寬度 (% of width)；預設 auto */
  width?: number;
  /** 字體大小 (mm) */
  size?: number;
  /** 字體粗細 */
  weight?: 'normal' | 'bold' | 500 | 600 | 700;
  /** 對齊 */
  align?: 'left' | 'center' | 'right';
  /** 字體 family */
  font?: string;
  /** 行高 */
  lineHeight?: number;
  /** 顏色（給特殊章用，預設黑）*/
  color?: string;
}

export interface CertBaseProps {
  bgUrl: string;
  fields: CertField[];
  showBg?: boolean;
}

export function CertBase({ bgUrl, fields, showBg = true }: CertBaseProps) {
  // A5 landscape: 210mm × 148mm
  const W = 210;
  const H = 148;

  return (
    <div
      className="cert-page"
      style={{
        position: 'relative',
        width: `${W}mm`,
        height: `${H}mm`,
        background: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        fontFamily: '"Microsoft JhengHei", "PingFang TC", "Heiti TC", sans-serif',
        color: '#000',
      }}
    >
      {/* 背景圖 — 列印 overlay 模式時會被隱藏 */}
      {showBg && (
        <img
          src={bgUrl}
          alt="cert background"
          className="cert-bg-image"
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* 文字欄位 */}
      {fields.map((f, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${f.left}%`,
            top: `${f.top}%`,
            width: f.width ? `${f.width}%` : 'auto',
            fontSize: `${f.size || 4}mm`,
            fontWeight: f.weight || 'normal',
            textAlign: f.align || 'center',
            fontFamily: f.font || 'inherit',
            lineHeight: f.lineHeight || 1.2,
            color: f.color || '#000',
            zIndex: 2,
            whiteSpace: 'pre-line',
            ...(f.align === 'center' && f.width ? { transform: 'translateX(-50%)', left: `${f.left}%` } : {}),
          }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
}
