'use client';

import { useCallback, useEffect, useState } from 'react';
import { doseDecrementOn, fullAmount, isoDate, logKey, type Substance, type LogMap, type DoseStatus } from '@/lib/substances';
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
import { CalculatorScreen } from './Calculator';
import { ProgressScreen } from './Progress';
import { DetailScreen } from './Detail';
import { LogSheet } from './LogSheet';
import { AddVialSheet } from './AddVialSheet';
import { Login } from './Login';
import { SetPassword } from './SetPassword';

// Bump on each deploy — shown top-left so we can confirm the installed PWA is
// actually running the latest build (vs. a stale cached snapshot).
const BUILD = 'b18';

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
  // CONFIRMED on the test device (b17 readout): a position:fixed + inset:0 shell
  // rendered 0–894 — iOS anchors the fixed containing block to the SMALL viewport
  // (894), NOT the full screen. But the physical screen is 956 (scr956 === lvh956),
  // so inset:0 left a 62px gap at the BOTTOM (894→956) — the black strip under the
  // nav. Fix: pin top:0 and set an explicit height of 100lvh (the LARGE viewport ==
  // the true 956px screen). The fixed box then spans 0–956, overflowing the short
  // containing block downward into the home-indicator strip (cover mode draws there),
  // so the nav reaches the physical bottom edge. It isn't clipped by body
  // overflow:hidden (ancestor overflow never clips fixed boxes). Center via
  // margin:auto (no transform) so absolute children + sheet overlays still anchor
  // to the shell; overflow:hidden + the scroll area's overflowX:hidden kill drift.
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '100lvh',
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
  const [diag, setDiag] = useState('');

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
      const k = logKey(l.substance_id, l.scheduled_date);
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

  // TEMP diagnostic: report this device's real viewport numbers so we can see
  // which height value is wrong (why the UI overflows the screen).
  useEffect(() => {
    const px = (id: string) => {
      const el = document.getElementById(id);
      return el ? Math.round(el.getBoundingClientRect().height) : -1;
    };
    const rect = (id: string) => {
      const el = document.getElementById(id);
      if (!el) return 'na';
      const r = el.getBoundingClientRect();
      return `${Math.round(r.top)}-${Math.round(r.bottom)}`;
    };
    const read = () => {
      const ih = Math.round(window.innerHeight);
      const scr = typeof window.screen !== 'undefined' ? window.screen.height : -1;
      // sh/nv = rendered top-bottom of the shell + nav. If nv's bottom == scr, the bar
      // reaches the physical screen edge (the real fix-confirmation signal).
      setDiag(`ih${ih} lvh${px('p-lvh')} svh${px('p-svh')} sat${px('p-sat')} sab${px('p-sab')} scr${scr} sh${rect('vial-shell')} nv${rect('vial-nav')}`);
    };
    read();
    const t = setTimeout(read, 600);
    window.addEventListener('resize', read);
    window.visualViewport?.addEventListener('resize', read);
    return () => { clearTimeout(t); window.removeEventListener('resize', read); window.visualViewport?.removeEventListener('resize', read); };
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
  async function setStatus(subId: string, iso: string, status: DoseStatus | null, site?: string | null, affectInventory = true) {
    const sub = subs.find((s) => s.id === subId);
    if (!sub) return;
    const key = logKey(subId, iso);
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
      if (status === null) await db.deleteLog(subId, iso);
      else await db.setLog(subId, iso, status, site, willConsume);
      if (remainingChanged) await db.updateRemaining(subId, newRemaining);
    } catch {
      loadData(); // revert to server truth on failure
    }
  }

  function back() {
    setClosing(true);
    setTimeout(() => {
      setDetailId(null);
      setClosing(false);
    }, 300);
  }

  async function signOut() {
    await createClient().auth.signOut();
  }

  const statusOf = (subId: string, iso: string) => logs[logKey(subId, iso)];
  const takenToday = new Set<string>();
  for (const sub of subs) {
    if (statusOf(sub.id, todayISO) === 'taken') takenToday.add(sub.id + '-today');
  }
  const lastSiteFor = (subId: string): string | undefined => {
    let bestIso = '';
    let best: string | undefined;
    for (const [k, v] of Object.entries(sites)) {
      const bar = k.indexOf('|');
      if (k.slice(0, bar) === subId && k.slice(bar + 1) > bestIso) { bestIso = k.slice(bar + 1); best = v; }
    }
    return best;
  };

  const app: AppApi = {
    substances: subs,
    taken: takenToday,
    logs,
    sites,
    statusOf,
    setStatus,
    lastSiteFor,
    toggle: (eid) => {
      const subId = eid.replace('-today', '');
      setStatus(subId, todayISO, statusOf(subId, todayISO) === 'taken' ? null : 'taken');
    },
    open: (subId) => setDetailId(subId),
    log: (subId) => setSheet({ open: true, subId: subId ?? null }),
    openLog: () => setSheet({ open: true, subId: null }),
    confirmLog: (subId, site) => setStatus(subId, todayISO, 'taken', site),
    skipLog: (subId) => { if (subId) setStatus(subId, todayISO, 'skipped'); },
    addSubstance: async (sub) => {
      const created = await db.createSubstance(sub);
      setSubs((prev) => [...prev, created]);
    },
    openAddVial: () => setVialSheet('new'),
    editVial: (sub) => setVialSheet(sub),
    updateSubstance: async (id, s) => {
      const updated = await db.updateSubstance(id, s);
      setSubs((prev) => prev.map((x) => (x.id === id ? updated : x)));
    },
    deleteSubstance: async (id) => {
      await db.deleteSubstance(id);
      setSubs((prev) => prev.filter((x) => x.id !== id));
      if (detailId === id) {
        setDetailId(null);
        setClosing(false);
      }
    },
    metrics,
    saveMetric: async (date, fields) => {
      const saved = await db.upsertMetric(date, fields);
      setMetrics((prev) => [...prev.filter((m) => m.date !== date), saved].sort((a, b) => a.date.localeCompare(b.date)));
    },
    removeMetric: async (date) => {
      await db.deleteMetric(date);
      setMetrics((prev) => prev.filter((m) => m.date !== date));
    },
  };

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
      {/* Hidden probes to measure how this device resolves viewport units + safe areas. */}
      <div id="p-svh" style={{ position: 'fixed', top: 0, left: 0, width: 1, height: '100svh', opacity: 0, pointerEvents: 'none' }} />
      <div id="p-dvh" style={{ position: 'fixed', top: 0, left: 0, width: 1, height: '100dvh', opacity: 0, pointerEvents: 'none' }} />
      <div id="p-lvh" style={{ position: 'fixed', top: 0, left: 0, width: 1, height: '100lvh', opacity: 0, pointerEvents: 'none' }} />
      <div id="p-sab" style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 'env(safe-area-inset-bottom, 0px)', opacity: 0, pointerEvents: 'none' }} />
      <div id="p-sat" style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 'env(safe-area-inset-top, 0px)', opacity: 0, pointerEvents: 'none' }} />
      {/* TEMP build + viewport diagnostic readout (top-left). */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 4px)', left: 'calc(env(safe-area-inset-left, 0px) + 8px)', right: 'calc(env(safe-area-inset-right, 0px) + 48px)', zIndex: 35, fontFamily: 'var(--mono)', fontSize: 9, lineHeight: 1.3, color: 'var(--amber)', pointerEvents: 'none' }}>
        {BUILD} · {diag}
      </div>
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

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch', paddingTop: 'env(safe-area-inset-top)' }}>
        {loadError && (
          <div style={{ margin: '56px 20px 0', padding: '12px 14px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 14, color: 'var(--red)', fontSize: 13 }}>
            {loadError}
          </div>
        )}
        {tab === 'today' && <TodayScreen app={app} />}
        {tab === 'schedule' && <ScheduleScreen app={app} />}
        {tab === 'progress' && <ProgressScreen app={app} />}
        {tab === 'vials' && <InventoryScreen app={app} />}
        {tab === 'calc' && <CalculatorScreen app={app} />}
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

      {/* bottom nav — an in-flow flex row (flexShrink:0) pinned at the bottom of the
          flex-column shell. Its background fills the home-indicator safe area via
          padding-bottom: env(safe-area-inset-bottom). */}
      <div id="vial-nav" style={{ flexShrink: 0, zIndex: 50, background: 'var(--surface-2)', borderTop: '1px solid var(--line-strong)', paddingTop: 8, paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 10px))', boxShadow: '0 -10px 30px rgba(0,0,0,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <NavBtn tab={TABS[0]} active={tab === 'today'} onClick={() => setTab('today')} />
          <NavBtn tab={TABS[1]} active={tab === 'schedule'} onClick={() => setTab('schedule')} />
          <button
            onClick={app.openLog}
            aria-label="Log a dose"
            style={{ width: 50, height: 50, marginLeft: 4, marginRight: 4, marginTop: -22, borderRadius: '50%', border: '3px solid var(--surface-2)', background: 'var(--amber)', color: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 18px rgba(215,147,86,0.4)' }}
          >
            <Icon.plus />
          </button>
          <NavBtn tab={TABS[2]} active={tab === 'progress'} onClick={() => setTab('progress')} />
          <NavBtn tab={TABS[3]} active={tab === 'vials'} onClick={() => setTab('vials')} />
          <NavBtn tab={TABS[4]} active={tab === 'calc'} onClick={() => setTab('calc')} />
        </div>
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
