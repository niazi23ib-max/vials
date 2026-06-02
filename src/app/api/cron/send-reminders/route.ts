// Dose-reminder sender. Triggered every minute by Supabase pg_cron (pg_net),
// authenticated with CRON_SECRET. Uses the service-role key to read all users'
// schedules + push subscriptions, then sends a web-push at each dose time.
//
// Add ?dryRun=1 to return what *would* be sent without sending or logging.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { doseLabel, type Substance } from '@/lib/substances';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const CONTACT = process.env.VAPID_CONTACT ?? 'mailto:hello@vials.me';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

const WINDOW_MIN = 5; // catch-up window so a delayed tick still fires (dedupe prevents repeats)

interface SubRow { id: string; user_id: string; name: string; route: string; days: string[] | null; time: string | null; unit: string; dose_mcg: number | string; caps_per_dose: number | string | null; }
interface PushRow { user_id: string; endpoint: string; p256dh: string; auth: string; tz: string; }

/** {weekday: Mon..Sun, date: YYYY-MM-DD, minutes: minute-of-day} for `now` in `tz`. */
function localParts(now: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
  const wd = p.weekday; // "Mon"
  let hour = parseInt(p.hour, 10);
  if (hour === 24) hour = 0; // some envs emit 24 for midnight
  const minutes = hour * 60 + parseInt(p.minute, 10);
  return { weekday: wd, date: `${p.year}-${p.month}-${p.day}`, minutes };
}

function doseMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });

  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
  if (!dryRun && (!VAPID_PUBLIC || !VAPID_PRIVATE)) {
    return NextResponse.json({ error: 'vapid not configured' }, { status: 500 });
  }
  if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const now = new Date();

  // Subscriptions grouped by user (+ each user's tz; take the first sub's tz for scheduling).
  const { data: subsData } = await db.from('push_subscriptions').select('user_id,endpoint,p256dh,auth,tz');
  const pushes = (subsData as PushRow[] | null) ?? [];
  if (!pushes.length) return NextResponse.json({ ok: true, due: 0, sent: 0, note: 'no subscriptions' });

  const byUser = new Map<string, { tz: string; devices: PushRow[] }>();
  for (const p of pushes) {
    const e = byUser.get(p.user_id) ?? { tz: p.tz || 'UTC', devices: [] };
    e.devices.push(p);
    byUser.set(p.user_id, e);
  }

  const userIds = [...byUser.keys()];
  const { data: subsAll } = await db
    .from('substances')
    .select('id,user_id,name,route,days,time,unit,dose_mcg,caps_per_dose')
    .in('user_id', userIds);
  const substances = (subsAll as SubRow[] | null) ?? [];

  type Due = { user_id: string; sub: SubRow; date: string };
  const due: Due[] = [];
  for (const s of substances) {
    const u = byUser.get(s.user_id);
    if (!u) continue;
    const dm = doseMinutes(s.time);
    if (dm === null) continue;
    const days = s.days ?? [];
    const t = localParts(now, u.tz);
    if (days.includes(t.weekday) && t.minutes >= dm && t.minutes <= dm + WINDOW_MIN) {
      due.push({ user_id: s.user_id, sub: s, date: t.date }); // at/just-after dose time today
    } else if (t.minutes <= WINDOW_MIN) {
      // Just after local midnight: catch a late dose carried over from yesterday.
      const y = localParts(new Date(now.getTime() - 86_400_000), u.tz);
      if (days.includes(y.weekday) && t.minutes + 1440 >= dm && t.minutes + 1440 <= dm + WINDOW_MIN) {
        due.push({ user_id: s.user_id, sub: s, date: y.date });
      }
    }
  }
  if (!due.length) return NextResponse.json({ ok: true, due: 0, sent: 0 });

  // Skip doses already taken/skipped today, or already reminded.
  const dates = [...new Set(due.map((d) => d.date))];
  const subIds = due.map((d) => d.sub.id);
  const [{ data: logs }, { data: reminded }] = await Promise.all([
    db.from('dose_logs').select('substance_id,scheduled_date').in('substance_id', subIds).in('scheduled_date', dates),
    db.from('reminder_log').select('substance_id,scheduled_date').in('substance_id', subIds).in('scheduled_date', dates),
  ]);
  const logged = new Set((logs ?? []).map((l) => `${l.substance_id}|${l.scheduled_date}`));
  const already = new Set((reminded ?? []).map((l) => `${l.substance_id}|${l.scheduled_date}`));
  const toSend = due.filter((d) => !logged.has(`${d.sub.id}|${d.date}`) && !already.has(`${d.sub.id}|${d.date}`));

  if (dryRun) {
    return NextResponse.json({ ok: true, due: due.length, wouldSend: toSend.map((d) => ({ name: d.sub.name, date: d.date })) });
  }

  let sent = 0;
  for (const d of toSend) {
    // Claim the dedupe slot first; if it already exists, another tick handled it.
    const { error: claimErr } = await db.from('reminder_log').insert({ user_id: d.user_id, substance_id: d.sub.id, scheduled_date: d.date });
    if (claimErr) continue;

    const label = doseLabel({ route: d.sub.route, unit: d.sub.unit as Substance['unit'], doseMcg: Number(d.sub.dose_mcg) || 0, capsPerDose: Number(d.sub.caps_per_dose) || 0 } as Substance);
    const payload = JSON.stringify({ title: `Time for ${d.sub.name}`, body: `${label} · ${d.sub.route}`, url: '/', tag: `dose-${d.sub.id}-${d.date}` });
    const devices = byUser.get(d.user_id)?.devices ?? [];
    for (const dev of devices) {
      try {
        await webpush.sendNotification({ endpoint: dev.endpoint, keys: { p256dh: dev.p256dh, auth: dev.auth } }, payload);
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', dev.endpoint);
      }
    }
  }

  return NextResponse.json({ ok: true, due: due.length, reminders: toSend.length, sent });
}
