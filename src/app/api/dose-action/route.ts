// Acts on a dose straight from a push notification (lock screen, no app open).
// The service worker POSTs here with credentials, so the request carries the
// user's Supabase session cookies → all writes are RLS-scoped to that user.
//
//   { action: 'taken'  | 'snooze', sub, date, slot }
//
// 'taken'  → log the dose as taken (decrementing the vial, idempotently) and
//            cancel any pending follow-up.
// 'snooze' → push a re-reminder 30 min out (the cron re-fires it via next_at).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { doseDecrementOn, type Substance, type TitrationStep } from '@/lib/substances';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SNOOZE_MIN = 30;

interface MiniSubRow {
  id: string;
  route: string;
  unit: string;
  dose_mcg: number | string;
  caps_per_dose: number | string | null;
  remaining: number | string;
  titration: TitrationStep[] | null;
}

/** Minimal row → Substance, only the fields the decrement math reads. */
function toSub(r: MiniSubRow): Substance {
  return {
    id: r.id, name: '', category: '', sub: '', route: r.route, hue: 0,
    vialMg: 0, bacMl: 0, count: 0, capsPerDose: Number(r.caps_per_dose) || 0,
    doseMcg: Number(r.dose_mcg) || 0, unit: (r.unit as Substance['unit']) || 'mcg',
    every: 'day', scheduleKind: 'weekly', days: [], intervalDays: 0,
    cycleOn: 0, cycleOff: 0, anchor: '', courseStart: '', courseWeeks: 0,
    time: '', period: 'AM', times: [], remaining: Number(r.remaining) || 0,
    expiry: '', pricePerVial: 0, lot: '', reconstitutedAt: '', budDays: 0,
    remindersEnabled: true, titration: r.titration ?? null, created: '',
  };
}

export async function POST(req: Request) {
  let body: { action?: string; sub?: string; date?: string; slot?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 });
  }
  const action = String(body.action || '');
  const subId = String(body.sub || '');
  const date = String(body.date || '');
  const slot = typeof body.slot === 'string' ? body.slot : '';
  if (!subId || !date || (action !== 'taken' && action !== 'snooze')) {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // Snooze: (re)arm a re-reminder 30 min out. RLS scopes this to the user; the
  // cron picks it up via next_at on its next tick.
  if (action === 'snooze') {
    const next = new Date(Date.now() + SNOOZE_MIN * 60_000).toISOString();
    const { error } = await supabase.from('reminder_log').upsert(
      { user_id: user.id, substance_id: subId, scheduled_date: date, slot, next_at: next },
      { onConflict: 'substance_id,scheduled_date,slot' },
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: 'snooze', next });
  }

  // Taken: no-op if already logged taken (prevents a double inventory hit).
  const { data: existing } = await supabase
    .from('dose_logs')
    .select('status')
    .eq('substance_id', subId)
    .eq('scheduled_date', date)
    .eq('slot', slot)
    .maybeSingle();
  if (existing?.status === 'taken') {
    return NextResponse.json({ ok: true, action: 'taken', already: true });
  }

  const { data: subRow } = await supabase
    .from('substances')
    .select('id,route,unit,dose_mcg,caps_per_dose,remaining,titration')
    .eq('id', subId)
    .maybeSingle();
  if (!subRow) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const sub = toSub(subRow as MiniSubRow);
  const dec = doseDecrementOn(sub, date);
  const newRemaining = Math.max(0, sub.remaining - dec); // skipped→taken or fresh: always consumes one

  const { error: logErr } = await supabase.from('dose_logs').upsert(
    {
      user_id: user.id,
      substance_id: subId,
      scheduled_date: date,
      slot,
      status: 'taken',
      site: null,
      consumed: true,
      taken_at: new Date().toISOString(),
    },
    { onConflict: 'substance_id,scheduled_date,slot' },
  );
  if (logErr) return NextResponse.json({ ok: false, error: logErr.message }, { status: 500 });

  if (newRemaining !== sub.remaining) {
    await supabase.from('substances').update({ remaining: newRemaining }).eq('id', subId);
  }
  // Cancel any pending follow-up for this dose.
  await supabase
    .from('reminder_log')
    .update({ next_at: null })
    .eq('substance_id', subId)
    .eq('scheduled_date', date)
    .eq('slot', slot);

  return NextResponse.json({ ok: true, action: 'taken', remaining: newRemaining });
}
