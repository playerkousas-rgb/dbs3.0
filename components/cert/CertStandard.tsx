'use client';

import { CertBase, CertField } from './CertBase';

interface Props {
  data: any;
  showBg?: boolean;
}

/**
 * 童軍專科徽章證書 — 標準版
 * 根據最終尺規數據微調座標
 */
export function CertStandard({ data, showBg = true }: Props) {
  const fmtDate = (s: string) => {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  // 直接使用數據
  const memberName = String(data.memberName || '');
  const memberNameEn = String(data.memberNameEn || '');
  const groupNameCn = String(data.groupNameCn || data.groupId || '');
  const badgeName = String(data.badgeName || '');
  const badgeNameEn = String(data.badgeNameEn || '');
  const category = String(data.category || '');
  const categoryEn = String(data.categoryEn || '');
  const certNo = String(data.certificateNumber || '');
  const resultDateStr = fmtDate(data.resultDate || data.readyAt || '');

  // ★ 簽發人格式：楊德銘 Yeung Tak Ming + 助理區總監(童軍)
  const signerLine1 = "楊德銘 Yeung Tak Ming";
  const signerLine2 = "助理區總監(童軍)";

  const fields: CertField[] = [
    // 1. 中文姓名 — 下移 2mm (Top 36%)
    memberName && {
      text: memberName,
      left: 50, top: 36,
      width: 50,
      size: 5,
      weight: 600,
      align: 'center',
    },
    // 2. 英文姓名 (Top 42%)
    memberNameEn && {
      text: memberNameEn,
      left: 50, top: 40,
      width: 50,
      size: 3.5,
      weight: 400,
      align: 'center',
      font: 'Times New Roman, serif',
    },
    // 3. 旅號 (Top 48%)
    groupNameCn && {
      text: groupNameCn,
      left: 50, top: 48,
      width: 50,
      size: 4.5,
      weight: 600,
      align: 'center',
    },
    // 4. 專章中文 — 下移 2mm (Top 62%)
    badgeName && {
      text: badgeName,
      left: 38, top: 62,
      width: 26,
      size: 4.5,
      weight: 600,
      align: 'center',
    },
    // 5. 專章英文 (Top 66%)
    badgeNameEn && {
      text: badgeNameEn,
      left: 38, top: 66,
      width: 26,
      size: 4.5,
      weight: 700,
      align: 'center',
      font: 'Times New Roman, serif',
    },
    // 6. 組別中文 — 左移至 11.5cm (Left 55%)，下移 2mm (Top 62%)
    category && {
      text: category,
      left: 58, top: 62,
      width: 20,
      size: 4.5,
      weight: 600,
      align: 'center',
    },
    // 7. 組別英文 (Left 58%, Top 66%)
    categoryEn && {
      text: categoryEn,
      left: 58, top: 66,
      width: 20,
      size: 4.5,
      weight: 700,
      align: 'center',
      font: 'Times New Roman, serif',
    },
    // 8. 日期 — 加回編號上方 5mm (Top 80%)
    resultDateStr && {
      text: resultDateStr,
      left: 12, top: 80,
      size: 4,
      weight: 700,
      align: 'left',
    },
    // 9. 證書編號 — 下移 (Top 85%)
    certNo && {
      text: certNo,
      left: 12, top: 85,
      size: 3.5,
      align: 'left',
      font: 'monospace',
    },
    // 10. 簽發人 — 下移 4mm (Top 85%)
    {
      text: signerLine1,
      left: 78, top: 85,
      width: 22,
      size: 3.2,
      weight: 600,
      align: 'center',
    },
    // 11. 簽發人職銜 — 下方 1-2mm (Top 89%)
    {
      text: signerLine2,
      left: 78, top: 89,
      width: 22,
      size: 3,
      weight: 400,
      align: 'center',
    },
  ].filter(Boolean) as CertField[];

  return <CertBase bgUrl="/cert-bg/standard.jpg" fields={fields} showBg={showBg} />;
}
