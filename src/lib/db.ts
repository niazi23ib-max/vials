// Supabase data access for substances + dose logs. RLS scopes everything to
// the signed-in user; we stamp user_id on insert so the WITH CHECK passes.
// Postgres `numeric` can come back as a string, so all numbers are coerced.

import { createClient } from '@/lib/supabase/client';
import type { Substance, TitrationStep } from '@/lib/substances';
import type { BodyMetric } from '@/lib/metrics';

interface SubRow {
  id: string;
  name: string;
  category: string;
  sub: string | null;
  route: string;
  hue: number | string;
  vial_mg: number | string | null;
  bac_ml: number | string | null;
  count: number | string | null;
  caps_per_dose: number | string | null;
  dose_mcg: number | string;
  unit: 'mcg' | 'mg' | 'IU';
  every: string;
  schedule_kind: string | null;
  days: string[] | null;
  interval_days: number | string | null;
  cycle_on: number | string | null;
  cycle_off: number | string | null;
  anchor_date: string | null;
  course_start: string | null;
  course_weeks: number | string | null;
  time: string | null;
  period: string | null;
  remaining: number | string;
  expiry: string | null;
  price_per_vial: number | string;
  lot: string | null;
  titration: TitrationStep[] | null;
  created_at: string;
}

function rowToSubstance(r: SubRow): Substance {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    sub: r.sub ?? '',
    route: r.route,
    hue: Number(r.hue),
    vialMg: Number(r.vial_mg) || 0,
    bacMl: Number(r.bac_ml) || 0,
    count: Number(r.count) || 0,
    capsPerDose: Number(r.caps_per_dose) || 0,
    doseMcg: Number(r.dose_mcg) || 0,
    unit: r.unit,
    every: r.every as Substance['every'],
    scheduleKind: (r.schedule_kind as Substance['scheduleKind']) ?? 'weekly',
    days: r.days ?? [],
    intervalDays: Number(r.interval_days) || 0,
    cycleOn: Number(r.cycle_on) || 0,
    cycleOff: Number(r.cycle_off) || 0,
    anchor: r.anchor_date ?? '',
    courseStart: r.course_start ?? '',
    courseWeeks: Number(r.course_weeks) || 0,
    time: r.time ?? '',
    period: (r.period as 'AM' | 'PM') ?? 'AM',
    remaining: Number(r.remaining),
    expiry: r.expiry ?? '',
    pricePerVial: Number(r.price_per_vial),
    lot: r.lot ?? '',
    titration: r.titration ?? null,
    created: r.created_at ? r.created_at.slice(0, 10) : '',
  };
}

async function uid(): Promise<string> {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

/* ----------------------------- Substances ----------------------------- */
export async function listSubstances(): Promise<Substance[]> {
  const { data, error } = await createClient()
    .from('substances')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as SubRow[]).map(rowToSubstance);
}

/** Substance → DB columns (shared by insert + update). */
function subToRow(s: Substance) {
  return {
    name: s.name,
    category: s.category,
    sub: s.sub || null,
    route: s.route,
    hue: s.hue,
    vial_mg: s.vialMg > 0 ? s.vialMg : null,
    bac_ml: s.bacMl > 0 ? s.bacMl : null,
    count: s.count > 0 ? s.count : null,
    caps_per_dose: s.capsPerDose > 0 ? s.capsPerDose : null,
    dose_mcg: s.doseMcg,
    unit: s.unit,
    every: s.every,
    schedule_kind: s.scheduleKind || 'weekly',
    days: s.days,
    interval_days: s.scheduleKind === 'interval' && s.intervalDays > 0 ? s.intervalDays : null,
    cycle_on: s.scheduleKind === 'cycle' && s.cycleOn > 0 ? s.cycleOn : null,
    cycle_off: s.scheduleKind === 'cycle' ? Math.max(0, s.cycleOff) : null,
    anchor_date: s.anchor || null,
    course_start: s.courseStart || null,
    course_weeks: s.courseWeeks > 0 ? s.courseWeeks : null,
    time: s.time || null,
    period: s.period,
    remaining: s.remaining,
    expiry: s.expiry || null,
    price_per_vial: s.pricePerVial,
    lot: s.lot || null,
    titration: s.titration,
  };
}

export async function createSubstance(s: Substance): Promise<Substance> {
  const user_id = await uid();
  const { data, error } = await createClient()
    .from('substances')
    .insert({ user_id, ...subToRow(s) })
    .select()
    .single();
  if (error) throw error;
  return rowToSubstance(data as SubRow);
}

export async function updateSubstance(id: string, s: Substance): Promise<Substance> {
  const { data, error } = await createClient()
    .from('substances')
    .update(subToRow(s))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToSubstance(data as SubRow);
}

export async function updateRemaining(id: string, remaining: number): Promise<void> {
  const { error } = await createClient()
    .from('substances')
    .update({ remaining })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSubstance(id: string): Promise<void> {
  const { error } = await createClient().from('substances').delete().eq('id', id);
  if (error) throw error;
}

/* ----------------------------- Dose logs ------------------------------ */
export interface DoseLogRow {
  id: string;
  substance_id: string;
  scheduled_date: string;
  status: 'taken' | 'skipped';
  site: string | null;
  consumed: boolean | null;
}

/** All of the user's dose logs on or after `sinceISO` (for history, the week view, and stats). */
export async function listLogs(sinceISO: string): Promise<DoseLogRow[]> {
  const { data, error } = await createClient()
    .from('dose_logs')
    .select('id,substance_id,scheduled_date,status,site,consumed')
    .gte('scheduled_date', sinceISO)
    .order('scheduled_date', { ascending: false });
  if (error) throw error;
  return data as DoseLogRow[];
}

export async function setLog(
  substanceId: string,
  dateISO: string,
  status: 'taken' | 'skipped',
  site?: string | null,
  consumed = true,
): Promise<void> {
  const user_id = await uid();
  const { error } = await createClient()
    .from('dose_logs')
    .upsert(
      {
        user_id,
        substance_id: substanceId,
        scheduled_date: dateISO,
        status,
        site: status === 'taken' ? site ?? null : null,
        consumed: status === 'taken' ? consumed : true,
        taken_at: status === 'taken' ? new Date().toISOString() : null,
      },
      { onConflict: 'substance_id,scheduled_date' },
    );
  if (error) throw error;
}

export async function deleteLog(substanceId: string, dateISO: string): Promise<void> {
  const { error } = await createClient()
    .from('dose_logs')
    .delete()
    .eq('substance_id', substanceId)
    .eq('scheduled_date', dateISO);
  if (error) throw error;
}

/* ---------------------------- Body metrics ---------------------------- */
interface BodyMetricRow {
  id: string;
  date: string;
  weight: number | string | null;
  waist: number | string | null;
  body_fat: number | string | null;
  note: string | null;
}
const numOrNull = (v: number | string | null): number | null =>
  v == null || v === '' ? null : Number(v);

function rowToMetric(r: BodyMetricRow): BodyMetric {
  return {
    id: r.id,
    date: r.date,
    weight: numOrNull(r.weight),
    waist: numOrNull(r.waist),
    bodyFat: numOrNull(r.body_fat),
    note: r.note ?? '',
  };
}

export async function listMetrics(): Promise<BodyMetric[]> {
  const { data, error } = await createClient()
    .from('body_metrics')
    .select('id,date,weight,waist,body_fat,note')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data as BodyMetricRow[]).map(rowToMetric);
}

/** Insert or update the entry for a given day (one row per user per date). */
export async function upsertMetric(
  date: string,
  fields: { weight: number | null; waist: number | null; bodyFat: number | null; note: string },
): Promise<BodyMetric> {
  const user_id = await uid();
  const { data, error } = await createClient()
    .from('body_metrics')
    .upsert(
      { user_id, date, weight: fields.weight, waist: fields.waist, body_fat: fields.bodyFat, note: fields.note || null },
      { onConflict: 'user_id,date' },
    )
    .select('id,date,weight,waist,body_fat,note')
    .single();
  if (error) throw error;
  return rowToMetric(data as BodyMetricRow);
}

export async function deleteMetric(date: string): Promise<void> {
  const { error } = await createClient().from('body_metrics').delete().eq('date', date);
  if (error) throw error;
}
