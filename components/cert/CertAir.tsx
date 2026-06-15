'use client';

import { CertBase, CertField } from './CertBase';

interface Props {
  data: any;
  showBg?: boolean;
}

/**
 * 航空活動徽章證書 (Air Activity Badge Certificate)
 *
 * 與標準版差異：無組別欄、無證書編號；版面置中。
 *
 * 背景關鍵橫線實測 (public/cert-bg/air.jpg, 1200×845):
 *   姓名線      y ≈ 42.20%   (mid x ≈ 50.50%)
 *   旅號線      y ≈ 53.49%   (mid x ≈ 50.50%)
 *   考獲線      y ≈ 69.59%   (mid x ≈ 50.42%) — 整條長線
 *   左下日期線  y ≈ 84.97%
 *   右下簽名線  y ≈ 84.97%   (mid x ≈ 75.54%)
 *
 * 文字偏移沿用 CertStandard 已校準規則。
 */
export function CertAir({ data, showBg = true }: Props) {
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
      left: 50.5, top: 34.65,
      width: 50,
      size: 5, weight: 600, align: 'center',
    },
    memberNameEn && {
      text: memberNameEn,
      left: 50.5, top: 38.65,
      width: 50,
      size: 3.5, weight: 400, align: 'center',
      font: 'Times New Roman, serif',
    },
    groupNameCn && {
      text: groupNameCn,
      left: 50.5, top: 48.35,
      width: 55,
      size: 4.5, weight: 600, align: 'center',
    },
    badgeName && {
      text: badgeName,
      left: 50.42, top: 62.48,
      width: 38,
      size: 4.5, weight: 600, align: 'center',
    },
    badgeNameEn && {
      text: badgeNameEn,
      left: 50.42, top: 66.48,
      width: 38,
      size: 4.5, weight: 700, align: 'center',
      font: 'Times New Roman, serif',
    },
    resultDateStr && {
      text: resultDateStr,
      left: 12, top: 80.71,
      size: 4, weight: 700, align: 'left',
    },
    {
      text: signerLine1,
      left: 75.54, top: 80.71,
      width: 22,
      size: 3.2, weight: 600, align: 'center',
    },
    {
      text: signerLine2,
      left: 75.54, top: 84.71,
      width: 22,
      size: 3, weight: 400, align: 'center',
    },
  ].filter(Boolean) as CertField[];

  return <CertBase bgUrl="/cert-bg/air.jpg" fields={fields} showBg={showBg} />;
}
