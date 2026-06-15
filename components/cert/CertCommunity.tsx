'use client';

import { CertBase, CertField } from './CertBase';

interface Props {
  data: any;
  showBg?: boolean;
}

/**
 * 社區參與章證書 (Community Involvement Badge Certificate)
 *
 * 與標準版差異：無組別欄、無證書編號。
 *
 * 背景關鍵橫線實測 (public/cert-bg/community.jpg, 1200×845):
 *   姓名線      y ≈ 43.67%   (mid x ≈ 49.88%)
 *   旅號線      y ≈ 53.25%   (mid x ≈ 49.58%)
 *   考獲線      y ≈ 69.30%   (mid x ≈ 42.50%) — 後接「社區參與章 Community Involvement Badge」
 *   左下日期線  y ≈ 82.96%
 *   右下簽名線  y ≈ 82.96%   (mid x ≈ 71.9%)
 *
 * 文字偏移沿用 CertStandard 已校準規則。
 */
export function CertCommunity({ data, showBg = true }: Props) {
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
    memberName && {
      text: memberName,
      left: 49.88, top: 36.12,
      width: 50,
      size: 5, weight: 600, align: 'center',
    },
    memberNameEn && {
      text: memberNameEn,
      left: 49.88, top: 40.12,
      width: 50,
      size: 3.5, weight: 400, align: 'center',
      font: 'Times New Roman, serif',
    },
    groupNameCn && {
      text: groupNameCn,
      left: 49.58, top: 48.11,
      width: 50,
      size: 4.5, weight: 600, align: 'center',
    },
    badgeName && {
      text: badgeName,
      left: 42.5, top: 62.19,
      width: 22,
      size: 4.5, weight: 600, align: 'center',
    },
    badgeNameEn && {
      text: badgeNameEn,
      left: 42.5, top: 66.19,
      width: 22,
      size: 4.5, weight: 700, align: 'center',
      font: 'Times New Roman, serif',
    },
    resultDateStr && {
      text: resultDateStr,
      left: 12, top: 78.7,
      size: 4, weight: 700, align: 'left',
    },
    {
      text: signerLine1,
      left: 71.9, top: 78.7,
      width: 22,
      size: 3.2, weight: 600, align: 'center',
    },
    {
      text: signerLine2,
      left: 71.9, top: 82.7,
      width: 22,
      size: 3, weight: 400, align: 'center',
    },
  ].filter(Boolean) as CertField[];

  return <CertBase bgUrl="/cert-bg/community.jpg" fields={fields} showBg={showBg} />;
}
