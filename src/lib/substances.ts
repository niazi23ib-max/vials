// Domain model + helpers for Vial.
// A substance's "form" (how it's taken) is derived from its route and decides
// which fields/UX apply:
//   inject (Subcutaneous/Intramuscular) → reconstituted vial: mg + BAC water → units
//   oral   (Oral)                       → capsules/tablets: count + strength
//   dose   (Intranasal/Sublingual/...)  → measured: amount (mg) + dose, no BAC water

import { addDays, startOfWeek } from 'date-fns';

export interface TitrationStep {
  label: string;
  mcg: number;
  current?: boolean;
  /** ISO date this step takes effect. When set, the current step is derived by date. */
  start?: string;
}

export type Form = 'inject' | 'oral' | 'dose';
export type ScheduleKind = 'weekly' | 'interval' | 'cycle';

export const CATEGORIES = ['Peptide', 'Medication', 'Vitamin', 'Multivitamin', 'Supplement', 'Other'] as const;

export const ROUTES_BY_CATEGORY: Record<string, string[]> = {
  Peptide: ['Subcutaneous', 'Intramuscular', 'Intranasal', 'Oral'],
  Medication: ['Oral', 'Sublingual', 'Subcutaneous', 'Intramuscular', 'Intranasal', 'Topical'],
  Vitamin: ['Oral', 'Sublingual'],
  Multivitamin: ['Oral', 'Sublingual'],
  Supplement: ['Oral', 'Sublingual'],
  Other: ['Oral', 'Subcutaneous', 'Intramuscular', 'Intranasal', 'Sublingual', 'Topical'],
};

export function routesFor(category: string): string[] {
  return ROUTES_BY_CATEGORY[category] ?? ROUTES_BY_CATEGORY.Other;
}

/** Categories with no single per-capsule strength (e.g. multivitamins have many). */
export const categoryHasStrength = (category: string): boolean => category !== 'Multivitamin';

export function formOf(route: string): Form {
  if (route === 'Subcutaneous' || route === 'Intramuscular') return 'inject';
  if (route === 'Oral') return 'oral';
  return 'dose';
}

export interface Substance {
  id: string;
  name: string;
  category: string;
  sub: string;
  route: string;
  /** oklch hue for this substance's fill gauge + monogram. */
  hue: number;
  /** inject/dose: amount in the vial (mg). Unused for oral. */
  vialMg: number;
  /** inject only: bacteriostatic water (mL). */
  bacMl: number;
  /** oral: capsules/tablets in the container. */
  count: number;
  /** oral: units (capsules) per administration. */
  capsPerDose: number;
  /** inject/dose: dose per administration (mcg). oral: strength per capsule (value, in `unit`). */
  doseMcg: number;
  unit: 'mg' | 'mcg' | 'IU';
  every: 'week' | 'wk-days' | 'day';
  /** How dosing days are computed. */
  scheduleKind: ScheduleKind;
  /** weekly: the dosing weekdays (Mon…Sun). */
  days: string[];
  /** interval: dose every N days from `anchor`. */
  intervalDays: number;
  /** cycle: N days on, then M days off, repeating from `anchor`. */
  cycleOn: number;
  cycleOff: number;
  /** interval/cycle reference date (ISO). Falls back to `created`. */
  anchor: string;
  /** optional course window: first dosing day (ISO) and length in weeks (0 = ongoing). */
  courseStart: string;
  courseWeeks: number;
  time: string;
  period: 'AM' | 'PM';
  /** amount left — mcg for inject/dose, capsules for oral. */
  remaining: number;
  expiry: string;
  pricePerVial: number;
  lot: string;
  titration: TitrationStep[] | null;
  /** ISO date the vial was added — the floor for adherence/history (no "missed" before this). */
  created: string;
}

export const substanceForm = (s: Substance): Form => formOf(s.route);

export const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const ok = (l: number, c: number, h: number) => `oklch(${l} ${c} ${h})`;

/** Local YYYY-MM-DD (the canonical key for dose logs — avoids UTC day-shift). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today's weekday name (Mon…Sun) from the real date. */
export function todayName(now = new Date()): string {
  return DAY_ORDER[(now.getDay() + 6) % 7];
}

/** Weekday name (Mon…Sun) for an ISO date string. */
export function weekdayOf(iso: string): string {
  return DAY_ORDER[(new Date(iso + 'T00:00:00').getDay() + 6) % 7];
}

// ── Scheduling (weekly / interval / cycle + optional course) ──────
const MS_DAY = 86_400_000;
/** Whole days from ISO `a` to ISO `b` (negative if b is before a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / MS_DAY);
}
export function addDaysISO(iso: string, n: number): string {
  return isoDate(new Date(new Date(iso + 'T00:00:00').getTime() + n * MS_DAY));
}
/** Reference date for interval/cycle math. */
export const anchorOf = (s: Substance): string => s.anchor || s.courseStart || s.created || '';
/** Last dosing date of a fixed-length course, or '' if ongoing/none. */
export function courseEndISO(s: Substance): string {
  if (!s.courseStart || !(s.courseWeeks > 0)) return '';
  return addDaysISO(s.courseStart, s.courseWeeks * 7 - 1);
}

/** Whether a dose is scheduled on ISO date `iso` (pattern + course + created bounds). */
export function isDueOn(s: Substance, iso: string): boolean {
  if (s.created && iso < s.created) return false;
  if (s.courseStart && iso < s.courseStart) return false;
  const end = courseEndISO(s);
  if (end && iso > end) return false;

  if (s.scheduleKind === 'interval') {
    const n = s.intervalDays > 0 ? s.intervalDays : 1;
    const a = anchorOf(s);
    if (!a) return false;
    const d = daysBetween(a, iso);
    return d >= 0 && d % n === 0;
  }
  if (s.scheduleKind === 'cycle') {
    const on = s.cycleOn > 0 ? s.cycleOn : 1;
    const off = s.cycleOff >= 0 ? s.cycleOff : 0;
    const a = anchorOf(s);
    if (!a) return false;
    const d = daysBetween(a, iso);
    if (d < 0) return false;
    return d % (on + off) < on;
  }
  return s.days.includes(weekdayOf(iso));
}

/** Average doses per week implied by the schedule (for runway math). */
export function dosesPerWeek(s: Substance): number {
  if (s.scheduleKind === 'interval') return s.intervalDays > 0 ? 7 / s.intervalDays : 7;
  if (s.scheduleKind === 'cycle') {
    const on = s.cycleOn > 0 ? s.cycleOn : 0;
    const period = on + (s.cycleOff >= 0 ? s.cycleOff : 0);
    return period > 0 ? (on * 7) / period : 7;
  }
  return s.days.length;
}

export interface CourseInfo { active: boolean; week: number; total: number; ended: boolean; }
/** "Week X of Y" progress for a course, or null if no course set. */
export function courseInfo(s: Substance, now = new Date()): CourseInfo | null {
  if (!s.courseStart) return null;
  const today = isoDate(now);
  const total = s.courseWeeks > 0 ? s.courseWeeks : 0;
  const end = courseEndISO(s);
  const ended = !!end && today > end;
  const started = today >= s.courseStart;
  const week = started ? Math.floor(daysBetween(s.courseStart, today) / 7) + 1 : 0;
  return { active: started && !ended, week: Math.max(1, week), total, ended };
}

/** Human label for the schedule, e.g. "Daily", "3× / week", "Every 3 days", "5 on / 2 off". */
export function scheduleLabel(s: Substance): string {
  if (s.scheduleKind === 'interval') {
    const n = s.intervalDays > 0 ? s.intervalDays : 1;
    return n === 1 ? 'Daily' : n === 2 ? 'Every other day' : `Every ${n} days`;
  }
  if (s.scheduleKind === 'cycle') return `${s.cycleOn} on / ${s.cycleOff} off`;
  return s.days.length === 7 ? 'Daily' : `${s.days.length}× / week`;
}

/** Injection sites for rotation (subq/IM). */
export const INJECTION_SITES = [
  'Abdomen L', 'Abdomen R', 'Thigh L', 'Thigh R', 'Delt L', 'Delt R', 'Glute L', 'Glute R',
] as const;
/** Next site after the last-used one (simple rotation). */
export function nextSite(lastSite: string | undefined): string {
  if (!lastSite) return INJECTION_SITES[0];
  const i = INJECTION_SITES.indexOf(lastSite as (typeof INJECTION_SITES)[number]);
  return INJECTION_SITES[(i + 1) % INJECTION_SITES.length];
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
      iso: isoDate(date),
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

// ── Derived helpers (form-aware) ──────────────────────────────────
export const totalMcg = (s: Substance) => s.vialMg * 1000;

/** Full container amount, in the unit `remaining` uses (mcg, or capsules for oral). */
export function fullAmount(s: Substance): number {
  return formOf(s.route) === 'oral' ? s.count : s.vialMg * 1000;
}

export function fillPct(s: Substance): number {
  const total = fullAmount(s);
  return total > 0 ? Math.max(0, Math.min(1, s.remaining / total)) : 0;
}

/** How much one logged dose subtracts from `remaining`. */
export function doseDecrement(s: Substance): number {
  return formOf(s.route) === 'oral' ? s.capsPerDose || 1 : s.doseMcg;
}

export function dosesLeft(s: Substance): number {
  const per = doseDecrement(s);
  return per > 0 ? Math.floor(s.remaining / per) : 0;
}

/** Total doses a full container yields (for cost-per-dose). */
export function dosesPerContainer(s: Substance): number {
  const per = doseDecrement(s);
  return per > 0 ? fullAmount(s) / per : 0;
}

export function daysLeft(s: Substance): number {
  const dpw = dosesPerWeek(s);
  if (dpw <= 0) return 999;
  return Math.floor((dosesLeft(s) * 7) / dpw);
}

/** Effective dose (mcg) on a date, following the titration ramp if dates are set. */
export function effectiveDoseMcg(s: Substance, iso: string): number {
  const steps = s.titration;
  if (!steps || !steps.length) return s.doseMcg;
  const dated = steps.filter((t) => t.start);
  if (dated.length) {
    const reached = dated.filter((t) => t.start! <= iso).sort((a, b) => (a.start! < b.start! ? 1 : -1));
    return reached.length ? reached[0].mcg : s.doseMcg; // before the first step → base dose
  }
  const cur = steps.find((t) => t.current);
  return cur ? cur.mcg : s.doseMcg;
}

/** Whether titration step dates make the dose vary over time. */
export function hasTitrationSchedule(s: Substance): boolean {
  return !!s.titration && s.titration.some((t) => t.start);
}

/** Dose label on a specific date (follows titration for inject/dose forms). */
export function doseLabelOn(s: Substance, iso: string): string {
  if (formOf(s.route) === 'oral') return doseLabel(s);
  const mcg = effectiveDoseMcg(s, iso);
  return s.unit === 'mg' ? `${+(mcg / 1000).toFixed(4)} mg` : `${mcg} mcg`;
}

/** Decrement for a dose logged on a specific date (titration-aware for inject/dose). */
export function doseDecrementOn(s: Substance, iso: string): number {
  return formOf(s.route) === 'oral' ? s.capsPerDose || 1 : effectiveDoseMcg(s, iso);
}

export function daysUntil(dateStr: string, now = new Date()): number {
  const then = new Date(dateStr + 'T00:00:00');
  const today = new Date(isoDate(now) + 'T00:00:00'); // floor to local midnight so the count is stable through the day
  return Math.round((then.getTime() - today.getTime()) / 86_400_000);
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
/** U-100 insulin syringe (100 units = 1 mL). Injectable form only. */
export function recon(vialMg: number, bacMl: number, doseMcg: number): Recon {
  const totMcg = vialMg * 1000;
  const concMcgPerMl = totMcg / bacMl;
  const mcgPerUnit = concMcgPerMl / 100;
  const units = doseMcg / mcgPerUnit;
  const mlDraw = doseMcg / concMcgPerMl;
  const dosesPerVial = totMcg / doseMcg;
  return { totMcg, concMcgPerMl, mcgPerUnit, units, mlDraw, dosesPerVial };
}

/** Dose label for lists: "250 mcg", "4 mg", or "1 cap · 500 mg". */
export function doseLabel(s: Substance): string {
  if (formOf(s.route) === 'oral') {
    const n = s.capsPerDose || 1;
    const word = n === 1 ? 'cap' : 'caps';
    return s.doseMcg > 0 ? `${n} ${word} · ${s.doseMcg} ${s.unit}` : `${n} ${word}`;
  }
  return s.unit === 'mg' ? `${s.doseMcg / 1000} mg` : `${s.doseMcg} mcg`;
}

/** Container size label: "10 mg" or "60 caps". */
export function containerLabel(s: Substance): string {
  return formOf(s.route) === 'oral' ? `${s.count} caps` : `${s.vialMg} mg`;
}

export const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US');
export function fmtExpiry(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ── Dose-log model + adherence ───────────────────────────────────
export type DoseStatus = 'taken' | 'skipped';
/** Logs keyed by `${substanceId}|${isoDate}`. */
export type LogMap = Record<string, DoseStatus>;
export const logKey = (subId: string, iso: string) => `${subId}|${iso}`;

/** Most recent dates this substance is scheduled (today-or-earlier, on/after it was added), newest first. */
export function recentScheduledDates(sub: Substance, count: number, now = new Date()): string[] {
  const floor = sub.courseStart || sub.created || '';
  const out: string[] = [];
  const d = new Date(now);
  for (let i = 0; i < 730 && out.length < count; i++) {
    const iso = isoDate(d);
    if (floor && iso < floor) break;
    if (isDueOn(sub, iso)) out.push(iso);
    d.setDate(d.getDate() - 1);
  }
  return out;
}

export type HistoryStatus = 'taken' | 'skipped' | 'missed' | 'pending';
export interface HistoryEntry {
  iso: string;
  label: string;
  status: HistoryStatus;
}
/** Recent dose history for the detail screen: scheduled days mapped to taken/skipped/missed/pending. */
export function doseHistory(sub: Substance, logs: LogMap, count = 6, now = new Date()): HistoryEntry[] {
  const todayIso = isoDate(now);
  return recentScheduledDates(sub, count, now).map((iso) => {
    const s = logs[logKey(sub.id, iso)];
    return {
      iso,
      label: new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: s === 'taken' ? 'taken' : s === 'skipped' ? 'skipped' : iso === todayIso ? 'pending' : 'missed',
    };
  });
}

export interface Adherence {
  taken: number;
  skipped: number;
  missed: number;
  /** taken ÷ (taken + missed) — skips and not-yet-due doses excluded. */
  pct: number;
}
/** Adherence across all substances over the trailing `days` window (includes today). */
export function adherence(subs: Substance[], logs: LogMap, days: number, now = new Date()): Adherence {
  const todayIso = isoDate(now);
  let taken = 0, skipped = 0, missed = 0;
  const d = new Date(now);
  for (let i = 0; i < days; i++) {
    const iso = isoDate(d);
    for (const sub of subs) {
      if (!isDueOn(sub, iso)) continue;
      const s = logs[logKey(sub.id, iso)];
      if (s === 'taken') taken++;
      else if (s === 'skipped') skipped++;
      else if (iso < todayIso) missed++; // today's pending doses don't count as missed yet
    }
    d.setDate(d.getDate() - 1);
  }
  const denom = taken + missed;
  return { taken, skipped, missed, pct: denom ? taken / denom : 1 };
}

/** Consecutive most-recent scheduled days where every due dose was taken or skipped (not missed). */
export function streak(subs: Substance[], logs: LogMap, now = new Date()): number {
  const todayIso = isoDate(now);
  let count = 0;
  const d = new Date(now);
  for (let i = 0; i < 730; i++) {
    const iso = isoDate(d);
    const due = subs.filter((s) => isDueOn(s, iso));
    d.setDate(d.getDate() - 1);
    if (!due.length) continue; // rest day — doesn't break or extend the streak
    const statuses = due.map((s) => logs[logKey(s.id, iso)]);
    const allHandled = statuses.every((s) => s === 'taken' || s === 'skipped');
    const anyTaken = statuses.some((s) => s === 'taken');
    if (allHandled && anyTaken) { count++; continue; }
    // Today still pending doesn't break the streak; a past incomplete day does.
    if (iso === todayIso) continue;
    break;
  }
  return count;
}

export type DayStatus = 'none' | 'done' | 'partial' | 'missed' | 'pending' | 'future';
/** Completion of all due doses on a single day — drives the adherence heatmap. */
export function dayStatus(subs: Substance[], logs: LogMap, iso: string, now = new Date()): DayStatus {
  const todayIso = isoDate(now);
  if (iso > todayIso) return 'future';
  const due = subs.filter((s) => isDueOn(s, iso));
  if (!due.length) return 'none';
  const st = due.map((s) => logs[logKey(s.id, iso)]);
  const taken = st.filter((x) => x === 'taken').length;
  const handled = st.filter((x) => x === 'taken' || x === 'skipped').length;
  if (taken === due.length) return 'done';
  if (taken > 0 || handled === due.length) return 'partial';
  return iso === todayIso ? 'pending' : 'missed';
}

// ── New-vial helpers ─────────────────────────────────────────────
export const HUE_PALETTE = [62, 28, 88, 152, 200, 264, 320, 12, 110, 234];
export const pickHue = (index: number) => HUE_PALETTE[index % HUE_PALETTE.length];

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return 'sub-' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export function defaultExpiryISO(now = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
