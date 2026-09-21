/**
 * API 呼叫封裝（DBS 3.0 多區版）
 * - 一般模式：所有請求經 /api/proxy 轉發，區 API Key 不經前端
 * - 超管模式：登入 /super 後，請求改經 /api/super/proxy，
 *   由伺服器從 Vercel 環境變數注入區 API Key / STAFF_KEY / ADC_KEY，
 *   超管唔需要亦唔應該在前端持有任何區密鑰。
 * - 區碼從 localStorage 讀取
 */

import { DISTRICT_STORAGE_KEY } from './district';

function getDistrictCode(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(DISTRICT_STORAGE_KEY) || '';
}

// ============================================================
// 超管模式
// ============================================================
let superModeActive = false;
let superDistrictCode: string | null = null;

export function setSuperMode(active: boolean, districtCode?: string | null) {
  superModeActive = !!active;
  if (districtCode !== undefined) superDistrictCode = districtCode || null;
}

/** 超管模式下要操作的區碼；非超管模式回傳 null */
export function getSuperModeTarget(): string | null {
  if (!superModeActive) return null;
  return superDistrictCode || getDistrictCode() || null;
}

export function isSuperMode(): boolean {
  return superModeActive;
}

function endpointFor(target: string | null, action: string): string {
  return target ? '/api/super/proxy' : '/api/proxy';
}

async function callGet(action: string, params?: Record<string, string>) {
  const target = getSuperModeTarget();
  const districtCode = target || getDistrictCode();
  const url = new URL(endpointFor(target, action), window.location.origin);
  url.searchParams.set('districtCode', districtCode);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString(), { cache: 'no-store', credentials: 'same-origin' });
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('GET Error:', error);
    throw error;
  }
}

async function callPost(action: string, body: any) {
  const target = getSuperModeTarget();
  const districtCode = target || getDistrictCode();
  const postBody = target
    ? { districtCode: target, action, ...body }
    : { districtCode, action, ...body };

  try {
    const res = await fetch(endpointFor(target, action), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(postBody),
    });
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('POST Error:', error);
    throw error;
  }
}

export const api = {
  // === GET ===
  getStatus: (appId: string, ymNumber: string) =>
    callGet('getStatus', { appId, ymNumber }),

  getPendingCertificates: () =>
    callGet('getPendingCertificates'),

  getActiveExaminers: () =>
    callGet('getActiveExaminers'),

  getBadgeCodes: () =>
    callGet('getBadgeCodes'),

  getGroups: () =>
    callGet('getGroups'),

  getHealthCheck: () =>
    callGet('getHealthCheck'),

  // === POST ===
  submitApplication: (data: any) =>
    callPost('submitApplication', data),

  parentConfirm: (token: string) =>
    callPost('parentConfirm', { token }),

  leaderConfirm: (token: string) =>
    callPost('leaderConfirm', { token }),

  examinerAccept: (token: string) =>
    callPost('examinerAccept', { token }),

  examinerDecline: (token: string, reason: string) =>
    callPost('examinerDecline', { token, reason }),

  examinerSubmitResult: (token: string, result: string, remarks: string) =>
    callPost('examinerSubmitResult', { token, result, remarks }),

  // === 秘書後台 ===
  adminGetPending: (staffToken: string) =>
    callPost('adminGetPendingApplications', { staffToken }),

  adminGetDashboard: (staffToken: string) =>
    callPost('adminGetDashboard', { staffToken }),

  adminGetSettings: (staffToken: string) =>
    callPost('adminGetSettings', { staffToken }),

  adminSetAssignmentMode: (staffToken: string, assignmentMode: 'GROUP_PRIORITY' | 'DISTRICT_PRIORITY' | 'NO_SAME_GROUP') =>
    callPost('adminSetAssignmentMode', { staffToken, assignmentMode, updatedBy: '秘書後台' }),

  districtApprove: (staffToken: string, applicationId: string, approvedBy?: string, overrideExaminerId?: string) =>
    callPost('districtApprove', { staffToken, applicationId, approvedBy, overrideExaminerId }),

  adminGetCertificates: (staffToken: string, status?: string) =>
    callPost('adminGetCertificates', { staffToken, status }),

  getCertificate: (certificateId: string, staffToken: string) =>
    callPost('getCertificate', { certificateId, staffToken }),

  markCertificateReady: (staffToken: string, certificateId: string) =>
    callPost('markCertificateReady', { staffToken, certificateId }),

  markCertificatePickedUp: (staffToken: string, certificateId: string, pickedUpBy?: string) =>
    callPost('markCertificatePickedUp', { staffToken, certificateId, pickedUpBy }),

  getPrintList: (staffToken: string) =>
    callPost('getPrintList', { staffToken }),

  reprintCertificate: (staffToken: string, applicationId: string) =>
    callPost('reprintCertificate', { staffToken, applicationId }),

  submitExaminerApplication: (data: any) =>
    callPost('submitExaminerApplication', data),

  recordPrintAction: (staffToken: string, certificateId: string, certData?: any) =>
    callPost('recordPrintAction', {
      staffToken,
      certificateId,
      certData: certData || {},
    }),

  syncCertificatePrintList: (staffToken: string, applicationId: string, certData?: any) =>
    callPost('syncCertificatePrintList', {
      staffToken,
      applicationId,
      certData: certData || {},
    }),

  adcVerify: (adcToken: string) =>
    callPost('adcVerify', { adcToken }),

  adcGetPending: (adcToken: string) =>
    callPost('adcGetPending', { adcToken }),

  adcApprove: (
    adcToken: string,
    appointmentId: string,
    approvedBadges: Array<{ fullTitle: string; code?: string; scope: 'D' | 'G' }>,
    approvedBy?: string
  ) =>
    callPost('adcApprove', { adcToken, appointmentId, approvedBadges, approvedBy }),

  getExaminerAppointmentStatus: (appointmentId: string) =>
    callPost('getExaminerAppointmentStatus', { appointmentId }),
};
