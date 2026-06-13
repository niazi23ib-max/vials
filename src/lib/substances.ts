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

/** One active in a blend (e.g. BPC-157 5 mg). The vial's vialMg is the sum. */
export interface BlendComponent {
  name: string;
  mg: number;
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
  /** HH:MM dose times for a due day. Empty or single → one dose at `time` (legacy);
   *  length > 1 → multiple doses per day, each its own log + reminder. */
  times: string[];
  /** amount left — mcg for inject/dose, capsules for oral. */
  remaining: number;
  expiry: string;
  pricePerVial: number;
  lot: string;
  /** inject only: ISO date the vial was reconstituted (mixed). '' if not tracked. */
  reconstitutedAt: string;
  /** inject only: days a mixed vial stays good (refrigerated). 0 → app default. */
  budDays: number;
  /** whether dose-reminder pushes fire for this substance. */
  remindersEnabled: boolean;
  titration: TitrationStep[] | null;
  /** inject/dose blends: the actives + their mg in the vial. vialMg equals the sum.
   *  null / fewer than 2 entries → a single-active substance. */
  components?: BlendComponent[] | null;
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
  const perDay = dosesPerDay(s);
  if (s.scheduleKind === 'interval') return (s.intervalDays > 0 ? 7 / s.intervalDays : 7) * perDay;
  if (s.scheduleKind === 'cycle') {
    const on = s.cycleOn > 0 ? s.cycleOn : 0;
    const period = on + (s.cycleOff >= 0 ? s.cycleOff : 0);
    return (period > 0 ? (on * 7) / period : 7) * perDay;
  }
  return s.days.length * perDay;
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

// ── Blends (multi-active vials) ──────────────────────────────────
/** True when this vial holds ≥2 actives (a blend). */
export function isBlend(s: Substance): boolean {
  return !!s.components && s.components.length >= 2;
}
/** Combined mg of a blend's components. */
export function blendTotalMg(s: Substance): number {
  return (s.components ?? []).reduce((a, c) => a + (Number(c.mg) || 0), 0);
}
/** Per-component dose on a date — splits the combined dose by each active's mg share. */
export function blendComponentDoses(s: Substance, iso: string): { name: string; mg: number; mcg: number }[] {
  const comps = s.components ?? [];
  const total = comps.reduce((a, c) => a + (Number(c.mg) || 0), 0);
  if (!comps.length || total <= 0) return [];
  const dose = effectiveDoseMcg(s, iso);
  return comps.map((c) => ({ name: c.name, mg: c.mg, mcg: (c.mg / total) * dose }));
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

// ── Reconstitution shelf-life (injectables) ──────────────────────
/** Default beyond-use window (days) for a reconstituted vial, refrigerated. */
export const RECON_DEFAULT_BUD = 28;
/** Beyond-use date for a mixed vial, or '' if not an injectable / not mixed. */
export function reconBUDDate(s: Substance): string {
  if (formOf(s.route) !== 'inject' || !s.reconstitutedAt) return '';
  return addDaysISO(s.reconstitutedAt, s.budDays > 0 ? s.budDays : RECON_DEFAULT_BUD);
}
/** Days until the mixed vial's beyond-use date (negative = already past it). */
export function reconDaysLeft(s: Substance, now = new Date()): number {
  const bud = reconBUDDate(s);
  return bud ? daysUntil(bud, now) : Infinity;
}
/** Whole days since the vial was reconstituted, or -1 if not tracked. */
export function daysSinceRecon(s: Substance, now = new Date()): number {
  if (formOf(s.route) !== 'inject' || !s.reconstitutedAt) return -1;
  return -daysUntil(s.reconstitutedAt, now);
}
export type ReconStatus = 'none' | 'fresh' | 'soon' | 'expired';
/** Shelf-life status of a mixed vial: fresh / soon (≤7d) / expired (past BUD). */
export function reconStatus(s: Substance, now = new Date()): ReconStatus {
  const bud = reconBUDDate(s);
  if (!bud) return 'none';
  const d = daysUntil(bud, now);
  if (d < 0) return 'expired';
  if (d <= 7) return 'soon';
  return 'fresh';
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

/** Units to draw on a U-100 syringe for this substance's (date-correct) dose.
 *  0 when it isn't an injectable or isn't reconstituted yet (no BAC water / mg) —
 *  guards the /0 → Infinity case. */
export function drawUnits(s: Substance, iso: string): number {
  if (formOf(s.route) !== 'inject' || s.bacMl <= 0 || s.vialMg <= 0) return 0;
  return recon(s.vialMg, s.bacMl, effectiveDoseMcg(s, iso)).units;
}

export interface ReconSuggestion {
  bacMl: number;
  units: number;
  mlDraw: number;
  round: boolean; // the draw lands on a whole-unit mark
}
/** Suggest BAC-water volumes (clean 0.5 mL steps) that make each `doseMcg` dose land on
 *  a readable mark on a U-100 syringe. Best first; [] when no option fits a 1 mL syringe. */
export function suggestReconOptions(vialMg: number, doseMcg: number): ReconSuggestion[] {
  if (vialMg <= 0 || doseMcg <= 0) return [];
  const cands: { bacMl: number; units: number; score: number }[] = [];
  for (let q = 1; q <= 10; q++) {              // BAC water 0.5–5.0 mL in 0.5 steps
    const bacMl = q * 0.5;
    const units = (doseMcg * bacMl) / (vialMg * 10);
    if (units < 4 || units > 100) continue;    // must fit a 1 mL syringe and stay readable
    const ru = Math.round(units);
    const frac = Math.abs(units - ru);
    let score = 0;
    if (frac < 0.04) score += 4; else if (frac < 0.1) score += 1;
    if (frac < 0.1) { if (ru % 10 === 0) score += 3; else if (ru % 5 === 0) score += 2; else if (ru % 2 === 0) score += 1; }
    if (units >= 15 && units <= 60) score += 3; else if (units >= 10 && units <= 80) score += 1;
    cands.push({ bacMl, units, score });
  }
  cands.sort((a, b) => b.score - a.score || Math.abs(a.units - 35) - Math.abs(b.units - 35));
  return cands.slice(0, 3).map((c) => ({
    bacMl: c.bacMl,
    units: c.units,
    mlDraw: c.units / 100,
    round: Math.abs(c.units - Math.round(c.units)) < 0.04,
  }));
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
/** Logs keyed by `${substanceId}|${isoDate}` (single dose/day) or
 *  `${substanceId}|${isoDate}|${slot}` where slot is the HH:MM of a specific dose
 *  (multi-dose days). Single-dose substances use the empty slot → legacy keys. */
export type LogMap = Record<string, DoseStatus>;
export const logKey = (subId: string, iso: string, slot = '') => (slot ? `${subId}|${iso}|${slot}` : `${subId}|${iso}`);

/** The dose times for a due day, sorted ascending. Falls back to the legacy single `time`. */
export function doseTimes(s: Substance): string[] {
  const t = s.times && s.times.length ? s.times : (s.time ? [s.time] : []);
  return [...t].sort();
}
export function dosesPerDay(s: Substance): number {
  return Math.max(1, doseTimes(s).length);
}
export const periodOf = (time: string): 'AM' | 'PM' => (Number(time.slice(0, 2)) < 12 ? 'AM' : 'PM');

export interface DayDose { time: string; period: 'AM' | 'PM'; slot: string; }
/** The doses on a due day, one per time. `slot` is '' for a single-dose substance
 *  (preserving legacy log keys) or the HH:MM time when there are several per day. */
export function dayDoses(s: Substance): DayDose[] {
  const times = doseTimes(s);
  const multi = times.length > 1;
  return times.map((t) => ({ time: t, period: periodOf(t), slot: multi ? t : '' }));
}
/** The log slots a due day expects ('' for single-dose; each HH:MM for multi-dose). */
export const daySlots = (s: Substance): string[] => dayDoses(s).map((d) => d.slot);

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
    const sts = daySlots(sub).map((slot) => logs[logKey(sub.id, iso, slot)]);
    const status: HistoryStatus =
      sts.every((s) => s === 'taken') ? 'taken'
      : sts.every((s) => s === 'skipped') ? 'skipped'
      : sts.some((s) => s === 'taken' || s === 'skipped') ? 'taken' // partially-handled past day
      : iso === todayIso ? 'pending'
      : 'missed';
    return {
      iso,
      label: new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status,
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
      for (const slot of daySlots(sub)) {
        const s = logs[logKey(sub.id, iso, slot)];
        if (s === 'taken') taken++;
        else if (s === 'skipped') skipped++;
        else if (iso < todayIso) missed++; // today's pending doses don't count as missed yet
      }
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
    const statuses = due.flatMap((s) => daySlots(s).map((slot) => logs[logKey(s.id, iso, slot)]));
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
  const st = due.flatMap((s) => daySlots(s).map((slot) => logs[logKey(s.id, iso, slot)]));
  const total = st.length;
  const taken = st.filter((x) => x === 'taken').length;
  const handled = st.filter((x) => x === 'taken' || x === 'skipped').length;
  if (taken === total) return 'done';
  if (taken > 0 || handled === total) return 'partial';
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
