// Dose-reminder sender. Triggered every minute by Supabase pg_cron (pg_net),
// authenticated with CRON_SECRET. Uses the service-role key to read all users'
// schedules + push subscriptions, then sends web-push notifications.
//
// What it sends each tick:
//   1. Primary reminders  — at each dose time (doses at the same time are grouped
//                           into one notification). Arms a 45-min follow-up.
//   2. Re-reminders       — one gentle follow-up if a dose is still unlogged, plus
//                           user-requested snoozes (both via reminder_log.next_at).
//   3. Supply/BUD alerts  — once a day (~9am local) when a vial is running low or
//                           a reconstituted vial is near/past its use-by date.
// Quiet hours (22:00–07:00 local) suppress the non-primary pings only; primary
// reminders fire at the times the user themselves chose.
//
// Add ?dryRun=1 to return what *would* be sent without sending or writing.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import {
  isDueOn, doseLabelOn, dayDoses, stockStatus, daysLeft, reconStatus, reconDaysLeft,
  dosesPerWeek, fullAmount, type Substance, type TitrationStep,
} from '@/lib/substances';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const CONTACT = process.env.VAPID_CONTACT ?? 'mailto:hello@vials.me';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

const WINDOW_MIN = 5; // catch-up window so a delayed tick still fires (dedupe prevents repeats)
const FOLLOWUP_MIN = 45; // send one nudge this long after the first reminder if still unlogged
const ALERT_MIN = 9 * 60; // supply/BUD alerts go out around 9am local
const QUIET_START = 22 * 60; // 22:00 — quiet hours start (non-primary pings only)
const QUIET_END = 7 * 60; // 07:00 — quiet hours end
const inQuiet = (min: number) => min >= QUIET_START || min < QUIET_END;

interface SubRow {
  id: string; user_id: string; name: string; route: string;
  unit: string; dose_mcg: number | string; caps_per_dose: number | string | null;
  schedule_kind: string | null; days: string[] | null;
  interval_days: number | string | null; cycle_on: number | string | null; cycle_off: number | string | null;
  anchor_date: string | null; course_start: string | null; course_weeks: number | string | null;
  created_at: string | null; time: string | null; times: string[] | null; titration: TitrationStep[] | null;
  reminders_enabled: boolean | null;
  vial_mg: number | string | null; bac_ml: number | string | null; count: number | string | null;
  remaining: number | string | null; reconstituted_at: string | null; bud_days: number | string | null;
}
interface PushRow { user_id: string; endpoint: string; p256dh: string; auth: string; tz: string; }
interface RemRow { user_id: string; substance_id: string; scheduled_date: string; slot: string; next_at: string; }

const SUB_COLS =
  'id,user_id,name,route,unit,dose_mcg,caps_per_dose,schedule_kind,days,interval_days,cycle_on,cycle_off,anchor_date,course_start,course_weeks,created_at,time,times,titration,reminders_enabled,vial_mg,bac_ml,count,remaining,reconstituted_at,bud_days';

/** Map a DB row to a Substance for the shared scheduling/dose/stock helpers. */
function toSub(r: SubRow): Substance {
  return {
    id: r.id, name: r.name, category: '', sub: '', route: r.route, hue: 0,
    vialMg: Number(r.vial_mg) || 0, bacMl: Number(r.bac_ml) || 0, count: Number(r.count) || 0,
    capsPerDose: Number(r.caps_per_dose) || 0,
    doseMcg: Number(r.dose_mcg) || 0, unit: (r.unit as Substance['unit']) || 'mcg',
    every: 'day', scheduleKind: (r.schedule_kind as Substance['scheduleKind']) || 'weekly',
    days: r.days ?? [], intervalDays: Number(r.interval_days) || 0,
    cycleOn: Number(r.cycle_on) || 0, cycleOff: Number(r.cycle_off) || 0,
    anchor: r.anchor_date ?? '', courseStart: r.course_start ?? '', courseWeeks: Number(r.course_weeks) || 0,
    time: r.time ?? '', period: 'AM', times: r.times ?? [], remaining: Number(r.remaining) || 0,
    expiry: '', pricePerVial: 0, lot: '',
    reconstitutedAt: r.reconstituted_at ?? '', budDays: Number(r.bud_days) || 0,
    remindersEnabled: r.reminders_enabled !== false,
    titration: r.titration ?? null, created: r.created_at ? r.created_at.slice(0, 10) : '',
  };
}

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

const deepLink = (subId: string, date: string, slot: string) => `/?dose=${subId}|${date}|${slot}`;

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
  const nowISO = now.toISOString();

  // Subscriptions grouped by user (+ each user's tz; take the first sub's tz).
  const { data: subsData } = await db.from('push_subscriptions').select('user_id,endpoint,p256dh,auth,tz');
  const pushes = (subsData as PushRow[] | null) ?? [];
  if (!pushes.length) return NextResponse.json({ ok: true, sent: 0, note: 'no subscriptions' });

  const byUser = new Map<string, { tz: string; devices: PushRow[] }>();
  for (const p of pushes) {
    const e = byUser.get(p.user_id) ?? { tz: p.tz || 'UTC', devices: [] };
    e.devices.push(p);
    byUser.set(p.user_id, e);
  }
  const userLocal = new Map<string, { today: ReturnType<typeof localParts>; yest: ReturnType<typeof localParts> }>();
  for (const [uid, u] of byUser) {
    userLocal.set(uid, {
      today: localParts(now, u.tz),
      yest: localParts(new Date(now.getTime() - 86_400_000), u.tz),
    });
  }

  const userIds = [...byUser.keys()];
  const { data: subsAll } = await db.from('substances').select(SUB_COLS).in('user_id', userIds);
  const substances = ((subsAll as SubRow[] | null) ?? []).map((r) => ({ user_id: r.user_id, sub: toSub(r) }));
  const subById = new Map(substances.map((x) => [x.sub.id, x] as const));

  // Reusable push sender (handles dead-subscription cleanup).
  async function pushToUser(user_id: string, payload: string): Promise<number> {
    const devices = byUser.get(user_id)?.devices ?? [];
    let n = 0;
    for (const dev of devices) {
      try {
        await webpush.sendNotification({ endpoint: dev.endpoint, keys: { p256dh: dev.p256dh, auth: dev.auth } }, payload);
        n++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('endpoint', dev.endpoint);
      }
    }
    return n;
  }

  // ── 1. Primary reminders due now ──
  type Due = { user_id: string; sub: Substance; date: string; slot: string; time: string };
  const due: Due[] = [];
  for (const { user_id, sub } of substances) {
    if (!sub.remindersEnabled) continue;
    const loc = userLocal.get(user_id);
    if (!loc) continue;
    const { today: t, yest: y } = loc;
    for (const d of dayDoses(sub)) {
      const dm = doseMinutes(d.time);
      if (dm === null) continue;
      if (isDueOn(sub, t.date) && t.minutes >= dm && t.minutes <= dm + WINDOW_MIN) {
        due.push({ user_id, sub, date: t.date, slot: d.slot, time: d.time });
      } else if (t.minutes <= WINDOW_MIN && isDueOn(sub, y.date) && t.minutes + 1440 >= dm && t.minutes + 1440 <= dm + WINDOW_MIN) {
        due.push({ user_id, sub, date: y.date, slot: d.slot, time: d.time });
      }
    }
  }

  // ── 2. Re-reminders: follow-ups + user snoozes whose next_at has elapsed ──
  const { data: dueAgainRows } = await db
    .from('reminder_log')
    .select('user_id,substance_id,scheduled_date,slot,next_at')
    .lte('next_at', nowISO);
  const dueAgain = (dueAgainRows as RemRow[] | null) ?? [];

  // Logged status + existing reminder rows for everything we might act on.
  const actSubIds = new Set<string>([...due.map((d) => d.sub.id), ...dueAgain.map((r) => r.substance_id)]);
  const actDates = new Set<string>([...due.map((d) => d.date), ...dueAgain.map((r) => r.scheduled_date)]);
  let logged = new Set<string>();
  let reminded = new Set<string>();
  if (actSubIds.size) {
    const ids = [...actSubIds];
    const dates = [...actDates];
    const [{ data: logs }, { data: rem }] = await Promise.all([
      db.from('dose_logs').select('substance_id,scheduled_date,slot,status').in('substance_id', ids).in('scheduled_date', dates),
      db.from('reminder_log').select('substance_id,scheduled_date,slot').in('substance_id', ids).in('scheduled_date', dates),
    ]);
    logged = new Set((logs ?? []).map((l) => `${l.substance_id}|${l.scheduled_date}|${l.slot ?? ''}`));
    reminded = new Set((rem ?? []).map((l) => `${l.substance_id}|${l.scheduled_date}|${l.slot ?? ''}`));
  }

  const primaryToSend = due.filter((d) => {
    const k = `${d.sub.id}|${d.date}|${d.slot}`;
    return !logged.has(k) && !reminded.has(k);
  });

  // Classify re-reminders: send (unlogged + outside quiet hours), or just clear
  // (logged / orphaned). Quiet-hour rows are left alone to fire after 07:00.
  const reReminders: { r: RemRow; sub: Substance }[] = [];
  const toClear: RemRow[] = [];
  for (const r of dueAgain) {
    const key = `${r.substance_id}|${r.scheduled_date}|${r.slot ?? ''}`;
    const entry = subById.get(r.substance_id);
    if (!entry) { toClear.push(r); continue; }
    if (logged.has(key)) { toClear.push(r); continue; }
    const loc = userLocal.get(r.user_id);
    if (loc && inQuiet(loc.today.minutes)) continue; // defer past quiet hours
    reReminders.push({ r, sub: entry.sub });
  }

  // ── 3. Supply + reconstitution (BUD) alerts, once a day around 9am local ──
  type Alert = { user_id: string; sub: Substance; kind: 'low' | 'bud'; date: string; title: string; body: string };
  const alertCandidates: Alert[] = [];
  for (const { user_id, sub } of substances) {
    if (!sub.remindersEnabled) continue;
    const loc = userLocal.get(user_id);
    if (!loc) continue;
    const t = loc.today;
    if (!(t.minutes >= ALERT_MIN && t.minutes <= ALERT_MIN + WINDOW_MIN)) continue;
    if (fullAmount(sub) > 0 && dosesPerWeek(sub) > 0 && stockStatus(sub) === 'critical') {
      const d = daysLeft(sub);
      alertCandidates.push({
        user_id, sub, kind: 'low', date: t.date, title: 'Running low',
        body: d <= 0 ? `${sub.name} is out of stock` : `${sub.name}: ~${d} day${d === 1 ? '' : 's'} of supply left — reorder soon`,
      });
    }
    const rs = reconStatus(sub, now);
    if (rs === 'soon' || rs === 'expired') {
      const dl = reconDaysLeft(sub, now);
      alertCandidates.push({
        user_id, sub, kind: 'bud', date: t.date, title: 'Vial expiring',
        body: rs === 'expired'
          ? `${sub.name}: mixed vial has passed its use-by date`
          : `${sub.name}: mixed vial expires in ${dl} day${dl === 1 ? '' : 's'}`,
      });
    }
  }
  let alertsToSend: Alert[] = [];
  if (alertCandidates.length) {
    const ids = [...new Set(alertCandidates.map((a) => a.sub.id))];
    const dates = [...new Set(alertCandidates.map((a) => a.date))];
    const { data: ac } = await db
      .from('reminder_log').select('substance_id,scheduled_date,slot')
      .in('substance_id', ids).in('scheduled_date', dates).in('slot', ['__low__', '__bud__']);
    const claimed = new Set((ac ?? []).map((a) => `${a.substance_id}|${a.scheduled_date}|${a.slot}`));
    alertsToSend = alertCandidates.filter((a) => !claimed.has(`${a.sub.id}|${a.date}|__${a.kind}__`));
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      primary: primaryToSend.map((d) => ({ name: d.sub.name, date: d.date, time: d.time, slot: d.slot })),
      reReminders: reReminders.map((x) => ({ name: x.sub.name, date: x.r.scheduled_date, slot: x.r.slot })),
      cleared: toClear.length,
      alerts: alertsToSend.map((a) => ({ name: a.sub.name, kind: a.kind, body: a.body })),
    });
  }

  let sent = 0;

  // 1. Primary — claim each slot (arming a follow-up), then group same-time doses.
  const followupAt = new Date(now.getTime() + FOLLOWUP_MIN * 60_000).toISOString();
  const claimedPrimary: Due[] = [];
  for (const d of primaryToSend) {
    const { error } = await db.from('reminder_log').insert({
      user_id: d.user_id, substance_id: d.sub.id, scheduled_date: d.date, slot: d.slot, next_at: followupAt,
    });
    if (!error) claimedPrimary.push(d); // insert fails if another tick already claimed it
  }
  const groups = new Map<string, Due[]>();
  for (const d of claimedPrimary) {
    const key = `${d.user_id}|${d.date}|${d.time}`;
    const arr = groups.get(key);
    if (arr) arr.push(d); else groups.set(key, [d]);
  }
  for (const [, items] of groups) {
    const u = items[0].user_id;
    if (items.length === 1) {
      const d = items[0];
      const label = doseLabelOn(d.sub, d.date);
      sent += await pushToUser(u, JSON.stringify({
        title: `Time for ${d.sub.name}`, body: `${label} · ${d.sub.route}`,
        url: deepLink(d.sub.id, d.date, d.slot), tag: `dose-${d.sub.id}-${d.date}-${d.slot}`,
        kind: 'dose', sub: d.sub.id, date: d.date, slot: d.slot,
      }));
    } else {
      const names = items.map((i) => i.sub.name).join(', ');
      sent += await pushToUser(u, JSON.stringify({
        title: `${items.length} doses due`, body: names, url: '/',
        tag: `group-${u}-${items[0].date}-${items[0].time}`, kind: 'group',
      }));
    }
  }

  // 2. Re-reminders — send, then disarm (next_at → null). Clear the rest.
  for (const { r, sub } of reReminders) {
    const label = doseLabelOn(sub, r.scheduled_date);
    sent += await pushToUser(r.user_id, JSON.stringify({
      title: `Reminder: ${sub.name}`, body: `Still need this? · ${label}`,
      url: deepLink(sub.id, r.scheduled_date, r.slot), tag: `dose-${sub.id}-${r.scheduled_date}-${r.slot}`,
      kind: 'dose', sub: sub.id, date: r.scheduled_date, slot: r.slot,
    }));
    await db.from('reminder_log').update({ next_at: null })
      .eq('substance_id', r.substance_id).eq('scheduled_date', r.scheduled_date).eq('slot', r.slot);
  }
  for (const r of toClear) {
    await db.from('reminder_log').update({ next_at: null })
      .eq('substance_id', r.substance_id).eq('scheduled_date', r.scheduled_date).eq('slot', r.slot);
  }

  // 3. Supply/BUD alerts — claim once per day per kind, then send.
  for (const a of alertsToSend) {
    const { error } = await db.from('reminder_log').insert({
      user_id: a.user_id, substance_id: a.sub.id, scheduled_date: a.date, slot: `__${a.kind}__`,
    });
    if (error) continue;
    sent += await pushToUser(a.user_id, JSON.stringify({
      title: a.title, body: a.body, url: '/', tag: `alert-${a.sub.id}-${a.date}-${a.kind}`, kind: 'alert',
    }));
  }

  return NextResponse.json({
    ok: true, primary: claimedPrimary.length, reReminders: reReminders.length, alerts: alertsToSend.length, sent,
  });
}
