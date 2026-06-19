/**
 * API 呼叫封裝（DBS 3.0 多區版）
 * - 所有請求經 /api/proxy 轉發，API Key 不經前端
 * - 區碼從 localStorage 讀取
 */

import { DISTRICT_STORAGE_KEY } from './district';

function getDistrictCode(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(DISTRICT_STORAGE_KEY) || '';
}

async function callGet(action: string, params?: Record<string, string>) {
  const districtCode = getDistrictCode();
  const url = new URL('/api/proxy', window.location.origin);
  url.searchParams.set('districtCode', districtCode);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('GET Error:', error);
    throw error;
  }
}

async function callPost(action: string, body: any) {
  const districtCode = getDistrictCode();
  const postBody = { districtCode, action, ...body };

  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
