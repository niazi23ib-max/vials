'use client';

import { useEffect, useState } from 'react';
import { savePushSubscription, removePushSubscription, sendTestPush } from '@/app/actions/push';
import { Label, Icon } from './ui';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = 'loading' | 'unsupported' | 'idle' | 'on' | 'working';

export function Reminders() {
  const [state, setState] = useState<State>('loading');
  const [msg, setMsg] = useState<string | null>(null);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported || !VAPID_PUBLIC) {
      // On iOS, push only exists once installed to the home screen.
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
      if (isIOS && !standalone) { setIosNeedsInstall(true); setState('unsupported'); return; }
      setState('unsupported');
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'on' : 'idle'))
      .catch(() => setState('idle'));
  }, []);

  async function enable() {
    setMsg(null);
    setState('working');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMsg('Notifications are blocked. Enable them in your browser settings.');
        setState('idle');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await savePushSubscription(JSON.parse(JSON.stringify(sub)), tz);
      if (!res.ok) {
        setMsg(res.error || 'Could not save subscription.');
        setState('idle');
        return;
      }
      setState('on');
      setMsg('Reminders on. You’ll get a nudge at each dose time.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not enable reminders.');
      setState('idle');
    }
  }

  async function disable() {
    setMsg(null);
    setState('working');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('idle');
      setMsg(null);
    } catch {
      setState('on');
    }
  }

  async function test() {
    setMsg('Sending…');
    const res = await sendTestPush();
    setMsg(res.ok ? 'Sent — check your notifications.' : res.error || 'Could not send.');
  }

  if (state === 'loading') return null;

  return (
    <div style={{ marginTop: 30 }}>
      <Label>Reminders</Label>
      <div style={{ marginTop: 12, padding: '15px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18 }}>
        {state === 'unsupported' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--amber-soft)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon.bell /></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              {iosNeedsInstall
                ? 'Add Vial to your Home Screen (Share → Add to Home Screen), then open it from there to turn on dose reminders.'
                : 'Push notifications aren’t supported in this browser.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: state === 'on' ? 'rgba(127,174,122,0.15)' : 'var(--amber-soft)', color: state === 'on' ? 'var(--green)' : 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon.bell /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Dose reminders</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{state === 'on' ? 'On for this device' : 'Get a nudge at each dose time'}</div>
              </div>
              <button
                onClick={state === 'on' ? disable : enable}
                disabled={state === 'working'}
                style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, border: state === 'on' ? '1px solid var(--line-strong)' : 'none', background: state === 'on' ? 'transparent' : 'var(--amber)', color: state === 'on' ? 'var(--text-dim)' : 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, cursor: state === 'working' ? 'default' : 'pointer', opacity: state === 'working' ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                {state === 'working' ? '…' : state === 'on' ? 'Turn off' : 'Turn on'}
              </button>
            </div>
            {state === 'on' && (
              <button
                onClick={test}
                style={{ marginTop: 12, width: '100%', padding: '9px 0', borderRadius: 12, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 11.5, cursor: 'pointer' }}
              >
                Send a test notification
              </button>
            )}
          </>
        )}
        {msg && <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>{msg}</div>}
      </div>
    </div>
  );
}
