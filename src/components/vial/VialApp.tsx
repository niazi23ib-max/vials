'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { SEED_SUBSTANCES, type Substance } from '@/lib/substances';
import { Icon } from './ui';
import type { AppApi } from './types';
import { TodayScreen } from './Today';
import { ScheduleScreen } from './Schedule';
import { InventoryScreen } from './Inventory';
import { CalculatorScreen } from './Calculator';
import { DetailScreen } from './Detail';
import { LogSheet } from './LogSheet';

const STORAGE_KEY = 'vial.taken';

function applyDelta(subs: Substance[], eid: string, on: boolean): Substance[] {
  const subId = eid.replace('-today', '');
  return subs.map((s) => {
    if (s.id !== subId) return s;
    const total = s.vialMg * 1000;
    const remaining = on
      ? Math.max(0, s.remaining - s.doseMcg)
      : Math.min(total, s.remaining + s.doseMcg);
    return { ...s, remaining };
  });
}

interface State {
  subs: Substance[];
  taken: Set<string>;
}
type Action =
  | { type: 'restore'; set: Set<string> }
  | { type: 'add'; eid: string }
  | { type: 'toggle'; eid: string };

function freshSubs(): Substance[] {
  return SEED_SUBSTANCES.map((s) => ({ ...s }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'restore': {
      let subs = freshSubs();
      action.set.forEach((eid) => {
        subs = applyDelta(subs, eid, true);
      });
      return { subs, taken: action.set };
    }
    case 'add': {
      if (state.taken.has(action.eid)) return state;
      const taken = new Set(state.taken);
      taken.add(action.eid);
      return { subs: applyDelta(state.subs, action.eid, true), taken };
    }
    case 'toggle': {
      const taken = new Set(state.taken);
      let subs: Substance[];
      if (taken.has(action.eid)) {
        taken.delete(action.eid);
        subs = applyDelta(state.subs, action.eid, false);
      } else {
        taken.add(action.eid);
        subs = applyDelta(state.subs, action.eid, true);
      }
      return { subs, taken };
    }
    default:
      return state;
  }
}

const TABS = [
  { k: 'today', label: 'Today', icon: Icon.today },
  { k: 'schedule', label: 'Schedule', icon: Icon.schedule },
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

export function VialApp() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ subs: freshSubs(), taken: new Set<string>() }));
  const [ready, setReady] = useState(false);
  const restored = useRef(false);

  const [tab, setTab] = useState<TabKey>('today');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; subId: string | null }>({ open: false, subId: null });

  // Restore persisted doses on mount (also gates first paint to avoid
  // hydration mismatches from localStorage + current-date rendering).
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      dispatch({ type: 'restore', set: new Set<string>(raw) });
    } catch {
      /* ignore */
    }
    restored.current = true;
    setReady(true);
  }, []);

  // Persist whenever logged doses change (after the initial restore).
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.taken]));
    } catch {
      /* ignore */
    }
  }, [state.taken]);

  const back = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setDetailId(null);
      setClosing(false);
    }, 300);
  }, []);

  const app: AppApi = {
    substances: state.subs,
    taken: state.taken,
    toggle: (eid) => dispatch({ type: 'toggle', eid }),
    open: (subId) => setDetailId(subId),
    log: (subId) => setSheet({ open: true, subId: subId ?? null }),
    openLog: () => setSheet({ open: true, subId: null }),
    confirmLog: (subId) => dispatch({ type: 'add', eid: subId + '-today' }),
    skipLog: () => {},
  };

  const sub = state.subs.find((s) => s.id === detailId);

  const shell: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    height: '100dvh',
    margin: '0 auto',
    overflow: 'hidden',
    background: 'var(--bg)',
    boxShadow: '0 0 80px rgba(0,0,0,0.35)',
  };

  if (!ready) {
    return <div style={shell} aria-hidden />;
  }

  return (
    <div style={shell}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {tab === 'today' && <TodayScreen app={app} />}
        {tab === 'schedule' && <ScheduleScreen app={app} />}
        {tab === 'vials' && <InventoryScreen app={app} />}
        {tab === 'calc' && <CalculatorScreen app={app} />}
      </div>

      {sub && (
        <div
          style={{
            position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--bg)', zIndex: 40,
            transform: closing ? 'translateX(100%)' : 'translateX(0)',
            animation: closing ? 'none' : 'slideIn .32s cubic-bezier(.32,.72,0,1)',
            transition: closing ? 'transform .3s cubic-bezier(.32,.72,0,1)' : 'none',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          }}
        >
          <DetailScreen sub={sub} app={app} onBack={back} />
        </div>
      )}

      {/* bottom nav */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50, paddingBottom: 26, paddingTop: 8, background: 'linear-gradient(rgba(16,13,10,0), var(--bg) 55%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', margin: '0 14px', padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
          <NavBtn tab={TABS[0]} active={tab === 'today'} onClick={() => setTab('today')} />
          <NavBtn tab={TABS[1]} active={tab === 'schedule'} onClick={() => setTab('schedule')} />
          <button
            onClick={app.openLog}
            aria-label="Log a dose"
            style={{ width: 50, height: 50, margin: '0 4px', borderRadius: '50%', border: 'none', background: 'var(--amber)', color: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 18px rgba(215,147,86,0.4)', marginTop: -18 }}
          >
            <Icon.plus />
          </button>
          <NavBtn tab={TABS[2]} active={tab === 'vials'} onClick={() => setTab('vials')} />
          <NavBtn tab={TABS[3]} active={tab === 'calc'} onClick={() => setTab('calc')} />
        </div>
      </div>

      <LogSheet open={sheet.open} subId={sheet.subId} app={app} onClose={() => setSheet({ open: false, subId: null })} />
    </div>
  );
}
