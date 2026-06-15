export const PLATFORM_NAME = 'DBS 3.0 多區專科徽章平台';
export const PLATFORM_COPYRIGHT = '© 2026 SKWSCOUT SYSTEM';
export const DISTRICT_STORAGE_KEY = 'dbs3_selected_district';

export type DistrictStatus = 'live' | 'testing';

export interface DistrictInfo {
  code: string;
  name: string;
  apiBase: string;
  status: DistrictStatus;
  note?: string;
}

export const DISTRICTS = {
  SKW: {
    code: 'SKW',
    name: '筲箕灣區',
    apiBase: 'https://script.google.com/macros/s/AKfycby9YxshCODYJKymkCD6IuiMiKHswQDySswQPsDC36SLN55XQEdtn_Ik_ja1ES_g7l0/exec',
    status: 'live',
    note: '首個已接入及實際使用區。',
  },
} as const satisfies Record<string, DistrictInfo>;

export type DistrictCode = keyof typeof DISTRICTS;

export const DISTRICT_LIST: DistrictInfo[] = Object.values(DISTRICTS);

export function isDistrictCode(value: string | null | undefined): value is DistrictCode {
  return !!value && value in DISTRICTS;
}

export function getDistrictInfo(code: string | null | undefined): DistrictInfo | null {
  if (!isDistrictCode(code)) return null;
  return DISTRICTS[code];
}

export function getLiveDistricts() {
  return DISTRICT_LIST.filter(d => d.status === 'live');
}

export function getTestingDistricts() {
  return DISTRICT_LIST.filter(d => d.status === 'testing');
}

export function getStoredDistrictCode(): DistrictCode | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(DISTRICT_STORAGE_KEY);
  return isDistrictCode(value) ? value : null;
}

export function setStoredDistrictCode(code: DistrictCode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISTRICT_STORAGE_KEY, code);
}

export function clearStoredDistrictCode() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DISTRICT_STORAGE_KEY);
}

export function resolveDistrictCode(): DistrictCode | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('d');
  if (isDistrictCode(fromQuery)) {
    setStoredDistrictCode(fromQuery);
    return fromQuery;
  }
  return getStoredDistrictCode();
}

export function getApiBase(): string {
  const code = resolveDistrictCode();
  if (!code) {
    throw new Error('DISTRICT_NOT_SELECTED');
  }
  return DISTRICTS[code].apiBase;
}

export function withDistrictParam(path: string, code: string | null | undefined): string {
  if (!path || !code) return path;

  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const base = hashIndex >= 0 ? path.slice(0, hashIndex) : path;

  try {
    const url = new URL(base, 'https://placeholder.local');
    url.searchParams.set('d', code);
    const next = `${url.pathname}${url.search}`;
    return `${next}${hash}`;
  } catch {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}d=${encodeURIComponent(code)}${hash}`;
  }
}

export function getDistrictStatusLabel(status: DistrictStatus) {
  return status === 'live' ? '已開通' : '測試中';
}

export function getDistrictStatusColor(status: DistrictStatus) {
  return status === 'live' ? '#2e7d32' : '#ef6c00';
}
