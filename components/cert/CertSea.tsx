'use client';

import { CertBase, CertField } from './CertBase';

interface Props {
  data: any;
  showBg?: boolean;
}

/**
 * 海上活動徽章證書 (Sea Activity Badge Certificate)
 *
 * 與標準版差異：無組別欄、無證書編號；「考獲」線較長,文字置中於線中央。
 *
 * 背景關鍵橫線實測 (public/cert-bg/sea.jpg, 1200×845):
 *   姓名線      y ≈ 42.49%   (mid x ≈ 48.83%)
 *   旅號線      y ≈ 53.96%   (mid x ≈ 48.96%) — 較長
 *   考獲線      y ≈ 70.06%   (mid x ≈ 49.17%) — 整條長線
 *   左下日期線  y ≈ 85.44%
 *   右下簽名線  y ≈ 85.44%   (mid x ≈ 72.71%)
 *
 * 文字偏移沿用 CertStandard 已校準規則。
 */
export function CertSea({ data, showBg = true }: Props) {
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
      left: 48.83, top: 34.94,
      width: 50,
      size: 5, weight: 600, align: 'center',
    },
    memberNameEn && {
      text: memberNameEn,
      left: 48.83, top: 38.94,
      width: 50,
      size: 3.5, weight: 400, align: 'center',
      font: 'Times New Roman, serif',
    },
    groupNameCn && {
      text: groupNameCn,
      left: 48.96, top: 48.82,
      width: 55,
      size: 4.5, weight: 600, align: 'center',
    },
    badgeName && {
      text: badgeName,
      left: 49.17, top: 62.95,
      width: 38,
      size: 4.5, weight: 600, align: 'center',
    },
    badgeNameEn && {
      text: badgeNameEn,
      left: 49.17, top: 66.95,
      width: 38,
      size: 4.5, weight: 700, align: 'center',
      font: 'Times New Roman, serif',
    },
    resultDateStr && {
      text: resultDateStr,
      left: 12, top: 81.18,
      size: 4, weight: 700, align: 'left',
    },
    {
      text: signerLine1,
      left: 72.71, top: 81.18,
      width: 22,
      size: 3.2, weight: 600, align: 'center',
    },
    {
      text: signerLine2,
      left: 72.71, top: 85.18,
      width: 22,
      size: 3, weight: 400, align: 'center',
    },
  ].filter(Boolean) as CertField[];

  return <CertBase bgUrl="/cert-bg/sea.jpg" fields={fields} showBg={showBg} />;
}
