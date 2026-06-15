/**
 * API 呼叫封裝（DBS 3.0 多區版）
 * - 不再寫死單一 Apps Script URL
 * - 改為根據目前 d=區碼 / localStorage 決定對應 backend
 */

import { getApiBase } from './district';

async function callGet(action: string, params?: Record<string, string>) {
  const apiBase = getApiBase();
  const url = new URL(apiBase);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const res = await fetch(url.toString());
    return res.json();
  } catch (error) {
    console.error('GET Error:', error);
    throw error;
  }
}

async function callPost(action: string, body: any) {
  const apiBase = getApiBase();
  try {
    const res = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...body }),
    });
    return res.json();
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
