// Supabase data access for substances + dose logs. RLS scopes everything to
// the signed-in user; we stamp user_id on insert so the WITH CHECK passes.
// Postgres `numeric` can come back as a string, so all numbers are coerced.

import { createClient } from '@/lib/supabase/client';
import type { Substance, TitrationStep } from '@/lib/substances';

interface SubRow {
  id: string;
  name: string;
  category: string;
  sub: string | null;
  route: string;
  hue: number | string;
  vial_mg: number | string;
  bac_ml: number | string;
  dose_mcg: number | string;
  unit: 'mcg' | 'mg';
  every: string;
  days: string[] | null;
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
    vialMg: Number(r.vial_mg),
    bacMl: Number(r.bac_ml),
    doseMcg: Number(r.dose_mcg),
    unit: r.unit,
    every: r.every as Substance['every'],
    days: r.days ?? [],
    time: r.time ?? '',
    period: (r.period as 'AM' | 'PM') ?? 'AM',
    remaining: Number(r.remaining),
    expiry: r.expiry ?? '',
    pricePerVial: Number(r.price_per_vial),
    lot: r.lot ?? '',
    titration: r.titration ?? null,
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

export async function createSubstance(s: Substance): Promise<Substance> {
  const user_id = await uid();
  const row = {
    user_id,
    name: s.name,
    category: s.category,
    sub: s.sub || null,
    route: s.route,
    hue: s.hue,
    vial_mg: s.vialMg,
    bac_ml: s.bacMl,
    dose_mcg: s.doseMcg,
    unit: s.unit,
    every: s.every,
    days: s.days,
    time: s.time || null,
    period: s.period,
    remaining: s.remaining,
    expiry: s.expiry || null,
    price_per_vial: s.pricePerVial,
    lot: s.lot || null,
    titration: s.titration,
  };
  const { data, error } = await createClient()
    .from('substances')
    .insert(row)
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
}

export async function listLogsForDate(dateISO: string): Promise<DoseLogRow[]> {
  const { data, error } = await createClient()
    .from('dose_logs')
    .select('id,substance_id,scheduled_date,status')
    .eq('scheduled_date', dateISO);
  if (error) throw error;
  return data as DoseLogRow[];
}

export async function setLog(
  substanceId: string,
  dateISO: string,
  status: 'taken' | 'skipped',
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
