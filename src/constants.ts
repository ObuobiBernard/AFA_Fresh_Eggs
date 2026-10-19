import { Role, UserProfile, AppStateData } from './types';

export const ROLE_LABELS: Record<Role, string> = {
  ceo: 'CEO',
  data_entry: 'Data Entry',
  attendant: 'Shop Attendant',
  driver: 'Driver',
  pending: 'Pending Approval'
};

export interface RolePermissions {
  viewShops?: string[];
  sell: number;
  collect: number;
  pay: number;
  customer: number;
  cost: number;
  prices: number;
  transfer: number;
  del: number;
  delOwn: number;
  backup: number;
  export: number;
  team: number;
  home: number;
}

export const PERMS: Record<Role, RolePermissions> = {
  ceo: {
    viewShops: ['Main Shop', 'Market Shop'],
    sell: 1,
    collect: 1,
    pay: 1,
    customer: 1,
    cost: 1,
    prices: 1,
    transfer: 1,
    del: 1,
    delOwn: 1,
    backup: 1,
    export: 1,
    team: 1,
    home: 1
  },
  data_entry: {
    viewShops: ['Main Shop', 'Market Shop'],
    sell: 1,
    collect: 1,
    pay: 1,
    customer: 1,
    cost: 1,
    prices: 1,
    transfer: 1,
    del: 0,
    delOwn: 0,
    backup: 0,
    export: 0,
    team: 0,
    home: 1
  },
  attendant: {
    sell: 1,
    collect: 0,
    pay: 1,
    customer: 1,
    cost: 0,
    prices: 0,
    transfer: 0,
    del: 0,
    delOwn: 1,
    backup: 0,
    export: 0,
    team: 0,
    home: 1
  },
  driver: {
    viewShops: ['Main Shop', 'Market Shop'],
    sell: 0,
    collect: 1,
    pay: 0,
    customer: 0,
    cost: 1,
    prices: 0,
    transfer: 0,
    del: 0,
    delOwn: 0,
    backup: 0,
    export: 0,
    team: 0,
    home: 1
  },
  pending: {
    sell: 0,
    collect: 0,
    pay: 0,
    customer: 0,
    cost: 0,
    prices: 0,
    transfer: 0,
    del: 0,
    delOwn: 0,
    backup: 0,
    export: 0,
    team: 0,
    home: 0
  }
};

export const SHOPS = ['Main Shop', 'Market Shop'] as const;

export interface CountryDialCode {
  code: string;
  country: string;
  flag: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+225', country: 'Ivory Coast', flag: '🇨🇮' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+1', country: 'US / Canada', flag: '🇺🇸' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+', country: 'Other (Custom)', flag: '🌍' }
];

export const SB_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://vitalucvobokjkdogwiq.supabase.co').trim();
export const SB_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_H57950cizG2oEs2q6O2_fQ_gv7v8DgB').trim();

export const TB_MAP: Record<string, string> = {
  prices: 'prices',
  col: 'collections',
  sales: 'sales',
  pay: 'payments',
  costs: 'costs',
  customers: 'customers'
};

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sanitizeText(str?: string | null, maxLen = 255): string {
  if (!str) return '';
  const clean = String(str).replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  return clean.slice(0, maxLen);
}

export function localDateStr(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

export function parseDate(s?: string): Date {
  const p = (s || td()).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
}

export function td(): string {
  return localDateStr(new Date());
}

export function plus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

export function wkRange(dateStr?: string): { start: string; end: string } {
  const x = parseDate(dateStr || td());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  const start = localDateStr(x);
  const y = new Date(x);
  y.setDate(y.getDate() + 6); // Sunday
  const end = localDateStr(y);
  return { start, end };
}

export function gh(n: number | string | undefined | null): string {
  const val = Math.round((Number(n) || 0) * 100) / 100;
  return 'GH₵ ' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function sum<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, curr) => acc + (fn(curr) || 0), 0);
}

export function formatPhone(p?: string | null): string {
  if (!p) return '';
  const raw = String(p).trim();
  if (raw.startsWith('+')) {
    return raw.replace(/\D/g, '');
  }
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '233' + clean.slice(1);
  } else if (clean.length === 9) {
    clean = '233' + clean;
  }
  return clean;
}

export function downloadFile(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const INACTIVITY_TIMEOUT_MS = 25 * 60 * 1000;

export const EMPTY_USER: UserProfile = {
  id: '',
  email: '',
  name: '',
  phone: '',
  role: 'pending',
  shop: '',
  active: false
};

export const EMPTY_APP_STATE: AppStateData = {
  prices: [],
  col: [],
  sales: [],
  pay: [],
  costs: [],
  customers: [],
  profiles: []
};
