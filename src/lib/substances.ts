// Domain model + helpers for Vial. Ported from the design handoff
// (vial-data.jsx) into typed TS. Values are illustrative seed data.

import { addDays, startOfWeek } from 'date-fns';

export interface TitrationStep {
  label: string;
  mcg: number;
  current?: boolean;
}

export interface Substance {
  id: string;
  name: string;
  category: string;
  sub: string;
  route: string;
  /** oklch hue for this substance's vial fill + monogram. */
  hue: number;
  vialMg: number;
  bacMl: number;
  doseMcg: number;
  unit: 'mg' | 'mcg';
  every: 'week' | 'wk-days' | 'day';
  days: string[];
  time: string;
  period: 'AM' | 'PM';
  /** micrograms left in the active vial. */
  remaining: number;
  expiry: string;
  pricePerVial: number;
  lot: string;
  titration: TitrationStep[] | null;
}

export const SEED_SUBSTANCES: Substance[] = [
  {
    id: 'reta',
    name: 'Retatrutide',
    category: 'Metabolic',
    sub: 'GLP-1 / GIP / GCG agonist',
    route: 'Subcutaneous',
    hue: 62,
    vialMg: 10,
    bacMl: 2,
    doseMcg: 4000,
    unit: 'mg',
    every: 'week',
    days: ['Sun'],
    time: '20:00',
    period: 'PM',
    remaining: 4400,
    expiry: '2026-11-04',
    pricePerVial: 185,
    lot: 'RT-4471',
    titration: [
      { label: 'Wk 1–4', mcg: 2000 },
      { label: 'Wk 5–8', mcg: 4000, current: true },
      { label: 'Wk 9–12', mcg: 6000 },
      { label: 'Wk 13+', mcg: 8000 },
    ],
  },
  {
    id: 'motsc',
    name: 'MOTS-c',
    category: 'Mitochondrial',
    sub: 'Mitochondrial-derived peptide',
    route: 'Subcutaneous',
    hue: 28,
    vialMg: 10,
    bacMl: 2,
    doseMcg: 5000,
    unit: 'mg',
    every: 'wk-days',
    days: ['Mon', 'Wed', 'Fri'],
    time: '08:30',
    period: 'AM',
    remaining: 6000,
    expiry: '2026-09-18',
    pricePerVial: 95,
    lot: 'MC-2209',
    titration: null,
  },
  {
    id: 'semax',
    name: 'Semax',
    category: 'Nootropic',
    sub: 'ACTH(4–10) analog',
    route: 'Intranasal',
    hue: 88,
    vialMg: 30,
    bacMl: 3,
    doseMcg: 600,
    unit: 'mcg',
    every: 'day',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    time: '08:00',
    period: 'AM',
    remaining: 21300,
    expiry: '2027-02-12',
    pricePerVial: 60,
    lot: 'SX-8841',
    titration: null,
  },
  {
    id: 'selank',
    name: 'Selank',
    category: 'Anxiolytic',
    sub: 'Tuftsin heptapeptide analog',
    route: 'Intranasal',
    hue: 152,
    vialMg: 30,
    bacMl: 3,
    doseMcg: 300,
    unit: 'mcg',
    every: 'day',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    time: '21:00',
    period: 'PM',
    remaining: 10200,
    expiry: '2026-06-20',
    pricePerVial: 65,
    lot: 'SL-3307',
    titration: null,
  },
];

export const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const ok = (l: number, c: number, h: number) => `oklch(${l} ${c} ${h})`;

/** Today's weekday name (Mon…Sun) from the real date. */
export function todayName(now = new Date()): string {
  return DAY_ORDER[(now.getDay() + 6) % 7];
}

export interface WeekDay {
  name: string;
  d: number;
  mo: string;
  iso: string;
  isToday: boolean;
}

/** The current Mon–Sun week with real dates. */
export function currentWeek(now = new Date()): WeekDay[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const tn = todayName(now);
  return DAY_ORDER.map((name, i) => {
    const date = addDays(monday, i);
    return {
      name,
      d: date.getDate(),
      mo: date.toLocaleDateString('en-US', { month: 'short' }),
      iso: date.toISOString().slice(0, 10),
      isToday: name === tn,
    };
  });
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good\nmorning';
  if (h < 18) return 'Good\nafternoon';
  return 'Good\nevening';
}

export function longDate(now = new Date()): string {
  return now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Derived helpers ──────────────────────────────────────────────
export const totalMcg = (s: Substance) => s.vialMg * 1000;
export const fillPct = (s: Substance) =>
  Math.max(0, Math.min(1, s.remaining / totalMcg(s)));
export const weeklyUse = (s: Substance) => s.days.length * s.doseMcg;
export const dosesLeft = (s: Substance) => Math.floor(s.remaining / s.doseMcg);
export function daysLeft(s: Substance): number {
  if (s.days.length <= 0) return 999;
  return Math.floor((dosesLeft(s) * 7) / s.days.length);
}

export function daysUntil(dateStr: string, now = new Date()): number {
  const then = new Date(dateStr + 'T00:00:00');
  return Math.round((then.getTime() - now.getTime()) / 86_400_000);
}

export type StockStatus = 'critical' | 'low' | 'ok';
export function stockStatus(s: Substance): StockStatus {
  const d = daysLeft(s);
  if (d <= 7) return 'critical';
  if (d <= 14) return 'low';
  return 'ok';
}
export function expiryStatus(s: Substance): 'soon' | 'ok' {
  return daysUntil(s.expiry) <= 30 ? 'soon' : 'ok';
}

export interface Recon {
  totMcg: number;
  concMcgPerMl: number;
  mcgPerUnit: number;
  units: number;
  mlDraw: number;
  dosesPerVial: number;
}
/** U-100 insulin syringe (100 units = 1 mL). */
export function recon(vialMg: number, bacMl: number, doseMcg: number): Recon {
  const totMcg = vialMg * 1000;
  const concMcgPerMl = totMcg / bacMl;
  const mcgPerUnit = concMcgPerMl / 100;
  const units = doseMcg / mcgPerUnit;
  const mlDraw = doseMcg / concMcgPerMl;
  const dosesPerVial = totMcg / doseMcg;
  return { totMcg, concMcgPerMl, mcgPerUnit, units, mlDraw, dosesPerVial };
}

export function doseLabel(s: Substance): string {
  return s.unit === 'mg' ? `${s.doseMcg / 1000} mg` : `${s.doseMcg} mcg`;
}

export const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US');
export function fmtExpiry(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
