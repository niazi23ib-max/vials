'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { daySlots, doseDecrementOn, fullAmount, isDueOn, isoDate, logKey, type Substance, type LogMap, type DoseStatus } from '@/lib/substances';
import type { BodyMetric } from '@/lib/metrics';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/useSession';
import * as db from '@/lib/db';
import { Icon } from './ui';
import type { AppApi } from './types';
import { TodayScreen } from './Today';
import { ScheduleScreen } from './Schedule';
import { InventoryScreen } from './Inventory';
import { DetailScreen } from './Detail';
import { LogSheet } from './LogSheet';
import { AddVialSheet } from './AddVialSheet';
import { Login } from './Login';
import { SetPassword } from './SetPassword';

// Code-split the two least-frequently-opened tabs (Progress, Calc) out of the
// initial bundle — their chunks load on first visit, then stay cached. The hot
// tabs (Today/Schedule/Vials) + Detail stay eager for instant switching.
const ScreenFallback = () => <div style={{ minHeight: 240 }} aria-hidden />;
const ProgressScreen = dynamic(() => import('./Progress').then((m) => m.ProgressScreen), { ssr: false, loading: ScreenFallback });
const CalculatorScreen = dynamic(() => import('./Calculator').then((m) => m.CalculatorScreen), { ssr: false, loading: ScreenFallback });

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TABS = [
  { k: 'today', label: 'Today', icon: Icon.today },
  { k: 'schedule', label: 'Schedule', icon: Icon.schedule },
  { k: 'progress', label: 'Progress', icon: Icon.progress },
  { k: 'vials', label: 'Vials', icon: Icon.vials },
  { k: 'calc', label: 'Calc', icon: Icon.calc },
] as const;

type TabKey = (typeof TABS)[number]['k'];

function NavBtn({ tab, active, onClick }: { tab: (typeof TABS)[number]; active: boolean; onClick: () => void }) {
  const Ico = tab.icon;
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', color: active ? 'var(--amber)' : 'var(--text-faint)', transition: 'color .15s' }}
    >
      <Ico />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.06em' }}>{tab.label}</span>
    </button>
  );
}

const shell: React.CSSProperties = {
  // iOS standalone PWA viewport — CONFIRMED on-device (b25 magenta-strip test): the
  // svh→lvh region (894→956) is NOT visible. The usable viewport is innerHeight ==
  // 100svh == 100dvh == 894; lvh/screen (956) is the physical panel but its bottom
  // 62px is off-screen in the installed app. So size the shell to the VISIBLE viewport
  // with position:fixed + inset:0 (resolves to 894 here) and dock the nav at that real
  // bottom. Center via margin:auto (not transform) so fixed children/overlays anchor here.
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  margin: '0 auto',
  width: '100%',
  maxWidth: 440,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  overscrollBehavior: 'none',
  background: 'var(--bg)',
  boxShadow: '0 0 80px rgba(0,0,0,0.35)',
};

export function VialApp() {
  const { user, loading, configured } = useSession();
  const todayISO = todayLocalISO();

  // True when the user arrives via a Supabase invite / password-reset link.
  const [mustSetPw, setMustSetPw] = useState(() => {
    if (typeof window === 'undefined') return false;
    return /type=(recovery|invite)/.test(window.location.href);
  });

  const [subs, setSubs] = useState<Substance[]>([]);
  const [logs, setLogs] = useState<LogMap>({});
  const [sites, setSites] = useState<Record<string, string>>({});
  const [consumedMap, setConsumedMap] = useState<Record<string, boolean>>({});
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>('today');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; subId: string | null }>({ open: false, subId: null });
  const [vialSheet, setVialSheet] = useState<'new' | Substance | null>(null);

  const loadData = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - 120);
    const [s, rows, mets] = await Promise.all([db.listSubstances(), db.listLogs(isoDate(since)), db.listMetrics()]);
    setSubs(s);
    setMetrics(mets);
    const map: LogMap = {};
    const siteMap: Record<string, string> = {};
    const consMap: Record<string, boolean> = {};
    rows.forEach((l) => {
      const k = logKey(l.substance_id, l.scheduled_date, l.slot);
      map[k] = l.status;
      if (l.site) siteMap[k] = l.site;
      if (l.status === 'taken') consMap[k] = l.consumed !== false; // default true (legacy)
    });
    setLogs(map);
    setSites(siteMap);
    setConsumedMap(consMap);
  }, []);

  useEffect(() => {
    if (!user) {
      setSubs([]);
      setLogs({});
      setSites({});
      setConsumedMap({});
      setMetrics([]);
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    setLoadError(null);
    loadData()
      .then(() => {
        if (cancelled) return;
        // Deep link from a push-notification tap: /?dose=<subId>|<date>|<slot>.
        // Open the log sheet for that substance, then strip the param.
        const sp = new URLSearchParams(window.location.search);
        const dose = sp.get('dose');
        if (!dose) return;
        const subId = dose.split('|')[0];
        if (subId) setSheet({ open: true, subId });
        sp.delete('dose');
        const qs = sp.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load your data.');
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loadData]);

  // Register the service worker (enables install + push notifications) and
  // auto-reload once when a new version takes control, so an installed PWA
  // never stays stuck on a cached older build after a deploy.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    const onControllerChange = () => {
      if (!reloaded && hadController) { reloaded = true; window.location.reload(); }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch(() => {});
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);


  // Supabase fires PASSWORD_RECOVERY when a recovery/invite link is opened.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: sub } = createClient().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMustSetPw(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Set/clear a dose's status on any date. Only "taken" consumes from the vial,
  // so flipping taken⇄(skipped|cleared) restores or re-deducts one dose.
  // `affectInventory` controls whether a "taken" dose pulls from the current vial.
  // Today's doses default to true; backfilled past doses can opt out. We remember
  // per-log whether it consumed, so clearing it only restores when it actually did.
  const setStatus = useCallback(async (subId: string, iso: string, slot: string, status: DoseStatus | null, site?: string | null, affectInventory = true) => {
    const sub = subs.find((s) => s.id === subId);
    if (!sub) return;
    const key = logKey(subId, iso, slot);
    const prev = logs[key];
    const siteChanged = status === 'taken' && site != null && sites[key] !== site;
    if (prev === (status ?? undefined) && !siteChanged) return;

    const dec = doseDecrementOn(sub, iso);
    const wasTaken = prev === 'taken';
    const wasConsumed = wasTaken && consumedMap[key] !== false;
    const willTake = status === 'taken';
    const willConsume = willTake && affectInventory;
    let newRemaining = sub.remaining;
    if (wasConsumed && !willConsume) newRemaining = Math.min(fullAmount(sub), sub.remaining + dec);
    else if (!wasConsumed && willConsume) newRemaining = Math.max(0, sub.remaining - dec);
    const remainingChanged = newRemaining !== sub.remaining;

    // optimistic
    setLogs((prevMap) => {
      const n = { ...prevMap };
      if (status === null) delete n[key];
      else n[key] = status;
      return n;
    });
    setSites((prevMap) => {
      const n = { ...prevMap };
      if (status === 'taken' && site) n[key] = site;
      else delete n[key];
      return n;
    });
    setConsumedMap((prevMap) => {
      const n = { ...prevMap };
      if (willTake) n[key] = willConsume;
      else delete n[key];
      return n;
    });
    if (remainingChanged) setSubs((prev) => prev.map((s) => (s.id === subId ? { ...s, remaining: newRemaining } : s)));

    try {
      if (status === null) await db.deleteLog(subId, iso, slot);
      else await db.setLog(subId, iso, status, site, willConsume, slot);
      if (remainingChanged) await db.updateRemaining(subId, newRemaining);
    } catch {
      loadData(); // revert to server truth on failure
    }
  }, [subs, logs, sites, consumedMap, loadData]);

  const back = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setDetailId(null);
      setClosing(false);
    }, 300);
  }, []);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
  }, []);

  const statusOf = useCallback((subId: string, iso: string, slot = '') => logs[logKey(subId, iso, slot)], [logs]);

  const takenToday = useMemo(() => {
    const set = new Set<string>();
    for (const sub of subs) {
      if (!isDueOn(sub, todayISO)) continue;
      for (const slot of daySlots(sub)) {
        const k = logKey(sub.id, todayISO, slot);
        if (logs[k] === 'taken') set.add(k);
      }
    }
    return set;
  }, [subs, logs, todayISO]);

  const lastSiteFor = useCallback((subId: string): string | undefined => {
    let bestIso = '';
    let best: string | undefined;
    for (const [k, v] of Object.entries(sites)) {
      const bar = k.indexOf('|');
      if (k.slice(0, bar) === subId && k.slice(bar + 1) > bestIso) { bestIso = k.slice(bar + 1); best = v; }
    }
    return best;
  }, [sites]);

  const toggle = useCallback((eid: string) => {
    // eid is the dose's logKey: `${subId}|${iso}` or `${subId}|${iso}|${slot}`.
    const [subId, iso, slot = ''] = eid.split('|');
    setStatus(subId, iso, slot, statusOf(subId, iso, slot) === 'taken' ? null : 'taken');
  }, [setStatus, statusOf]);
  const open = useCallback((subId: string) => setDetailId(subId), []);
  const log = useCallback((subId?: string) => setSheet({ open: true, subId: subId ?? null }), []);
  const openLog = useCallback(() => setSheet({ open: true, subId: null }), []);
  // After logging, also pop the Detail screen (if open) so you land back on the
  // list and can see the dose registered. No-op when logging from Today/the list.
  const confirmLog = useCallback((subId: string, slot = '', site?: string | null) => {
    setStatus(subId, todayISO, slot, 'taken', site);
    setDetailId(null);
  }, [setStatus, todayISO]);
  const skipLog = useCallback((subId?: string, slot = '') => {
    if (subId) setStatus(subId, todayISO, slot, 'skipped');
    setDetailId(null);
  }, [setStatus, todayISO]);
  const addSubstance = useCallback(async (sub: Substance) => {
    const created = await db.createSubstance(sub);
    setSubs((prev) => [...prev, created]);
  }, []);
  const openAddVial = useCallback(() => setVialSheet('new'), []);
  const editVial = useCallback((sub: Substance) => setVialSheet(sub), []);
  const updateSubstance = useCallback(async (id: string, s: Substance) => {
    const updated = await db.updateSubstance(id, s);
    setSubs((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }, []);
  const deleteSubstance = useCallback(async (id: string) => {
    await db.deleteSubstance(id);
    setSubs((prev) => prev.filter((x) => x.id !== id));
    // If the deleted vial's detail is open, close it (functional update keeps this
    // callback stable — no detailId dependency).
    setDetailId((cur) => (cur === id ? null : cur));
    setClosing(false);
  }, []);
  const saveMetric = useCallback(async (date: string, fields: { weight: number | null; waist: number | null; bodyFat: number | null; note: string }) => {
    const saved = await db.upsertMetric(date, fields);
    setMetrics((prev) => [...prev.filter((m) => m.date !== date), saved].sort((a, b) => a.date.localeCompare(b.date)));
  }, []);
  const removeMetric = useCallback(async (date: string) => {
    await db.deleteMetric(date);
    setMetrics((prev) => prev.filter((m) => m.date !== date));
  }, []);

  // Memoize the shared controller so it only changes identity when the underlying
  // DATA changes (subs/logs/sites/metrics), not on UI-only state (tab, open sheet,
  // detail). All callbacks are stable via useCallback, so screens wrapped in
  // React.memo skip re-rendering on unrelated interactions.
  const app: AppApi = useMemo(() => ({
    substances: subs,
    taken: takenToday,
    logs,
    sites,
    statusOf,
    setStatus,
    lastSiteFor,
    toggle,
    open,
    log,
    openLog,
    confirmLog,
    skipLog,
    addSubstance,
    openAddVial,
    editVial,
    updateSubstance,
    deleteSubstance,
    metrics,
    saveMetric,
    removeMetric,
  }), [subs, takenToday, logs, sites, metrics, statusOf, setStatus, lastSiteFor, toggle, open, log, openLog, confirmLog, skipLog, addSubstance, openAddVial, editVial, updateSubstance, deleteSubstance, saveMetric, removeMetric]);

  // ---- Gating ----
  if (!configured) {
    return (
      <div style={shell}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Supabase isn&apos;t configured. Add NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY to enable accounts.
          </p>
        </div>
      </div>
    );
  }

  if (mustSetPw) return <SetPassword onDone={() => setMustSetPw(false)} />;
  if (loading) return <div style={shell} aria-hidden />;
  if (!user) return <Login />;
  if (dataLoading) return <div style={shell} aria-hidden />;

  const sub = subs.find((s) => s.id === detailId);

  return (
    <div id="vial-shell" style={shell}>
      {/* sign out */}
      <button
        onClick={signOut}
        aria-label="Sign out"
        style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 'calc(env(safe-area-inset-right, 0px) + 14px)', zIndex: 35, width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M10.5 11l3-3-3-3M13 8H6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(92px + env(safe-area-inset-bottom))' }}>
        {loadError && (
          <div style={{ margin: '56px 20px 0', padding: '12px 14px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 14, color: 'var(--red)', fontSize: 13 }}>
            {loadError}
          </div>
        )}
        <div key={tab} style={{ animation: 'fadeIn .18s ease' }}>
          {tab === 'today' && <TodayScreen app={app} />}
          {tab === 'schedule' && <ScheduleScreen app={app} />}
          {tab === 'progress' && <ProgressScreen app={app} />}
          {tab === 'vials' && <InventoryScreen app={app} />}
          {tab === 'calc' && <CalculatorScreen app={app} />}
        </div>
      </div>

      {sub && (
        <div
          style={{
            position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', background: 'var(--bg)', zIndex: 60,
            transform: closing ? 'translateX(100%)' : 'translateX(0)',
            animation: closing ? 'none' : 'slideIn .32s cubic-bezier(.32,.72,0,1)',
            transition: closing ? 'transform .3s cubic-bezier(.32,.72,0,1)' : 'none',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          }}
        >
          <DetailScreen sub={sub} app={app} onBack={back} />
        </div>
      )}

      {/* bottom nav — UpKeep-style FLOATING pill: position:fixed, offset from the bottom
          by env(safe-area-inset-bottom) so it sits just above the home indicator with
          content scrolling behind it. This is the exact technique the maintenance-tracker
          app uses (it renders correctly on this device). z below the overlays/sheets. */}
      <div id="vial-nav" style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom))', maxWidth: 416, margin: '0 auto', zIndex: 40, background: 'var(--surface-2)', border: '1px solid var(--line-strong)', borderRadius: 22, boxShadow: '0 12px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', padding: '4px 2px' }}>
        <NavBtn tab={TABS[0]} active={tab === 'today'} onClick={() => setTab('today')} />
        <NavBtn tab={TABS[1]} active={tab === 'schedule'} onClick={() => setTab('schedule')} />
        <NavBtn tab={TABS[2]} active={tab === 'progress'} onClick={() => setTab('progress')} />
        <NavBtn tab={TABS[3]} active={tab === 'vials'} onClick={() => setTab('vials')} />
        <NavBtn tab={TABS[4]} active={tab === 'calc'} onClick={() => setTab('calc')} />
      </div>

      <LogSheet open={sheet.open} subId={sheet.subId} app={app} onClose={() => setSheet({ open: false, subId: null })} />
      <AddVialSheet
        open={vialSheet !== null}
        editing={vialSheet && vialSheet !== 'new' ? vialSheet : undefined}
        onClose={() => setVialSheet(null)}
        app={app}
      />
    </div>
  );
}
