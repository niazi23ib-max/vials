'use server';

import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const CONTACT = process.env.VAPID_CONTACT ?? 'mailto:hello@vials.me';

let configured = false;
function ensureVapid(): boolean {
  if (!PUBLIC || !PRIVATE) return false;
  if (!configured) {
    webpush.setVapidDetails(CONTACT, PUBLIC, PRIVATE);
    configured = true;
  }
  return true;
}

export interface SerializedSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(
  sub: SerializedSubscription,
  tz: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      tz: tz || 'UTC',
    },
    { onConflict: 'endpoint' },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return { ok: true };
}

/** Send an immediate test notification to all of the signed-in user's devices. */
export async function sendTestPush(): Promise<{ ok: boolean; sent: number; error?: string }> {
  if (!ensureVapid()) return { ok: false, sent: 0, error: 'Push not configured on the server.' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, sent: 0, error: 'Not signed in' };

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', user.id);
  if (!subs || !subs.length) return { ok: false, sent: 0, error: 'No device subscribed yet.' };

  const payload = JSON.stringify({
    title: 'Vial',
    body: 'Reminders are on — this is a test notification.',
    url: '/',
    tag: 'vial-test',
  });

  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e: unknown) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      }
    }
  }
  return { ok: sent > 0, sent };
}
