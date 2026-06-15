'use client';

import { CertBase, CertField } from './CertBase';

interface Props {
  data: any;
  showBg?: boolean;
}

/**
 * 宗教章證書 (Religious Badge Certificate)
 *
 * 與標準版差異：無組別欄、無證書編號。
 *
 * 背景關鍵橫線實測 (public/cert-bg/religious.jpg, 1200×845):
 *   姓名線      y ≈ 43.08%   (mid x ≈ 49.46%)
 *   旅號線      y ≈ 52.66%   (mid x ≈ 49.50%)
 *   考獲線      y ≈ 68.76%   (mid x ≈ 48.67%) — 後接「宗教章 Religious Badge」
 *   左下日期線  y ≈ 82.37%
 *   右下簽名線  y ≈ 82.37%   (mid x ≈ 73.1%)
 *
 * 文字偏移沿用 CertStandard 已校準規則:
 *   姓名中文 top = 線 − 7.55  / 姓名英文 = 線 − 3.55
 *   旅號     top = 線 − 5.14
 *   專章中文 top = 線 − 7.11  / 專章英文 = 線 − 3.11
 *   日期     top = 線 − 4.26
 *   簽發人姓名 top = 簽名線 − 4.26  / 職銜在其下方 4pp
 */
export function CertReligious({ data, showBg = true }: Props) {
  const fmtDate = (s: string) => {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const memberName = String(data.memberName || '');
  const memberNameEn = String(data.memberNameEn || '');
  const groupNameCn = String(data.groupNameCn || data.groupId || '');
  const badgeName = String(data.badgeName || '');
  const badgeNameEn = String(data.badgeNameEn || '');
  const resultDateStr = fmtDate(data.resultDate || data.readyAt || '');

  const signerLine1 = '楊德銘 Yeung Tak Ming';
  const signerLine2 = '助理區總監(童軍)';

  const fields: CertField[] = [
    // 1. 中文姓名
    memberName && {
      text: memberName,
      left: 49.46, top: 35.53,
      width: 50,
      size: 5, weight: 600, align: 'center',
    },
    // 2. 英文姓名
    memberNameEn && {
      text: memberNameEn,
      left: 49.46, top: 39.53,
      width: 50,
      size: 3.5, weight: 400, align: 'center',
      font: 'Times New Roman, serif',
    },
    // 3. 旅號
    groupNameCn && {
      text: groupNameCn,
      left: 49.5, top: 47.52,
      width: 50,
      size: 4.5, weight: 600, align: 'center',
    },
    // 4. 專章中文（置中於考獲線）
    badgeName && {
      text: badgeName,
      left: 48.67, top: 61.65,
      width: 26,
      size: 4.5, weight: 600, align: 'center',
    },
    // 5. 專章英文
    badgeNameEn && {
      text: badgeNameEn,
      left: 48.67, top: 65.65,
      width: 26,
      size: 4.5, weight: 700, align: 'center',
      font: 'Times New Roman, serif',
    },
    // 6. 日期（左下）
    resultDateStr && {
      text: resultDateStr,
      left: 12, top: 78.11,
      size: 4, weight: 700, align: 'left',
    },
    // 7. 簽發人姓名（右下簽名線上方）
    {
      text: signerLine1,
      left: 73.1, top: 78.11,
      width: 22,
      size: 3.2, weight: 600, align: 'center',
    },
    // 8. 簽發人職銜
    {
      text: signerLine2,
      left: 73.1, top: 82.11,
      width: 22,
      size: 3, weight: 400, align: 'center',
    },
  ].filter(Boolean) as CertField[];

  return <CertBase bgUrl="/cert-bg/religious.jpg" fields={fields} showBg={showBg} />;
}
