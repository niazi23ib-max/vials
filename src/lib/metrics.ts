// Body metrics = a user's progress measurements over time. Weight is the
// primary series; waist + body-fat % are optional. Stored unit-agnostically
// (raw numbers); the display unit (lb/kg) is a per-device preference since this
// is a single-user personal tracker and one user sticks to one unit.

export interface BodyMetric {
  id: string;
  /** ISO yyyy-mm-dd (one entry per day). */
  date: string;
  weight: number | null;
  waist: number | null;
  bodyFat: number | null;
  note: string;
}

export type WeightUnit = 'lb' | 'kg';
const UNIT_KEY = 'vial.weightUnit';

export function getWeightUnit(): WeightUnit {
  if (typeof window === 'undefined') return 'lb';
  return window.localStorage.getItem(UNIT_KEY) === 'kg' ? 'kg' : 'lb';
}
export function setWeightUnit(u: WeightUnit): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(UNIT_KEY, u);
}

/** Entries with a recorded weight, oldest → newest. */
export function weightSeries(metrics: BodyMetric[]): { date: string; value: number }[] {
  return metrics
    .filter((m) => m.weight != null && !Number.isNaN(m.weight))
    .map((m) => ({ date: m.date, value: m.weight as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeightSummary {
  latest: number | null;
  latestDate: string | null;
  /** Change from the first recorded weight to the latest (latest − first). */
  change: number | null;
  min: number | null;
  max: number | null;
  count: number;
}
export function weightSummary(metrics: BodyMetric[]): WeightSummary {
  const s = weightSeries(metrics);
  if (!s.length) return { latest: null, latestDate: null, change: null, min: null, max: null, count: 0 };
  const values = s.map((p) => p.value);
  const latest = s[s.length - 1];
  return {
    latest: latest.value,
    latestDate: latest.date,
    change: +(latest.value - s[0].value).toFixed(1),
    min: Math.min(...values),
    max: Math.max(...values),
    count: s.length,
  };
}

/** Trim a number for display: 182.4 → "182.4", 182.0 → "182". */
export const fmtNum = (n: number): string => String(+n.toFixed(1));
