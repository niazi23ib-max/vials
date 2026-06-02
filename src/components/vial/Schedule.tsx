'use client';

import { useState } from 'react';
import { currentWeek, doseLabel, ok, todayName, isoDate, type Substance } from '@/lib/substances';
import { Label, Monogram, Icon } from './ui';
import type { AppApi } from './types';

interface Ev { id: string; subId: string; name: string; hue: number; dose: string; time: string; period: string; route: string }

function dayEvents(substances: Substance[], dayName: string): Ev[] {
  return substances
    .filter((s) => s.days.includes(dayName))
    .map((s) => ({ id: s.id + '-' + dayName, subId: s.id, name: s.name, hue: s.hue, dose: doseLabel(s), time: s.time, period: s.period, route: s.route }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function ScheduleScreen({ app }: { app: AppApi }) {
  const TODAY_NAME = todayName();
  const TODAY_ISO = isoDate(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [sel, setSel] = useState(TODAY_NAME);
  const base = new Date();
  base.setDate(base.getDate() + weekOffset * 7);
  const WEEK = currentWeek(base);
  const selObj = WEEK.find((w) => w.name === sel)!;
  const events = dayEvents(app.substances, sel);
  const isFuture = selObj.iso > TODAY_ISO;
  const weekTotal = WEEK.reduce((n, w) => n + dayEvents(app.substances, w.name).length, 0);
  const weekTitle = weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : weekOffset === 1 ? 'Next week' : `${WEEK[0].mo} ${WEEK[0].d}–${WEEK[6].d}`;

  const navBtn = (txt: string, fn: () => void) => (
    <button onClick={fn} aria-label={txt} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, lineHeight: 1 }}>{txt}</button>
  );

  return (
    <div style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <Label>Schedule · {weekTotal} doses</Label>
          <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 32, color: 'var(--text)', margin: '8px 0 0', whiteSpace: 'nowrap' }}>{weekTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {navBtn('‹', () => setWeekOffset((o) => o - 1))}
          {weekOffset !== 0 && navBtn('•', () => setWeekOffset(0))}
          {navBtn('›', () => setWeekOffset((o) => o + 1))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '20px 20px 6px', overflowX: 'auto' }}>
        {WEEK.map((w) => {
          const evs = dayEvents(app.substances, w.name);
          const isSel = w.name === sel;
          const isToday = w.iso === TODAY_ISO;
          return (
            <button
              key={w.name}
              onClick={() => setSel(w.name)}
              style={{
                flex: '1 0 auto', minWidth: 42, padding: '10px 6px 9px', borderRadius: 16, cursor: 'pointer',
                background: isSel ? 'var(--text)' : 'var(--surface)',
                border: `1px solid ${isSel ? 'var(--text)' : isToday ? 'var(--line-strong)' : 'var(--line)'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s',
              }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em', color: isSel ? 'rgba(16,13,10,0.6)' : 'var(--text-faint)' }}>{w.name[0]}</span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 19, color: isSel ? 'var(--bg)' : 'var(--text)', lineHeight: 1 }}>{w.d}</span>
              <span style={{ display: 'flex', gap: 2.5, height: 5, alignItems: 'center' }}>
                {evs.slice(0, 4).map((e, i) => (
                  <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'var(--bg)' : ok(0.7, 0.12, e.hue) }} />
                ))}
                {evs.length === 0 && <span style={{ width: 4, height: 4 }} />}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ padding: '20px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--text)', whiteSpace: 'nowrap' }}>
          {selObj.iso === TODAY_ISO ? 'Today' : sel}
          <span style={{ color: 'var(--text-faint)', fontSize: 15 }}> · {selObj.mo} {selObj.d}</span>
        </div>
        <Label>{events.length} {events.length === 1 ? 'dose' : 'doses'}</Label>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        {events.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--text-dim)' }}>Rest day</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>No doses scheduled</div>
          </div>
        ) : (
          events.map((ev, i) => {
            const status = app.statusOf(ev.subId, selObj.iso);
            const isTaken = status === 'taken';
            const isSkipped = status === 'skipped';
            const isMissed = !status && selObj.iso < TODAY_ISO;
            const dot = isTaken ? 'var(--green)' : isSkipped ? 'var(--amber)' : isMissed ? 'var(--red)' : ok(0.7, 0.12, ev.hue);
            const struck = isTaken || isSkipped;
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                <div style={{ width: 44, paddingTop: 14, textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)' }}>{ev.time}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-faint)' }}>{ev.period}</div>
                </div>
                <div style={{ width: 22, position: 'relative', display: 'flex', justifyContent: 'center', marginLeft: 6 }}>
                  <div style={{ width: 1.5, background: 'var(--line)', position: 'absolute', top: i === 0 ? 20 : 0, bottom: i === events.length - 1 ? 'calc(100% - 28px)' : 0 }} />
                  <div style={{ width: 11, height: 11, borderRadius: '50%', marginTop: 16, zIndex: 1, flexShrink: 0, background: dot, opacity: isTaken || !struck && !isMissed ? 1 : 0.7, boxShadow: '0 0 0 4px var(--bg)' }} />
                </div>
                <button
                  onClick={() => app.open(ev.subId)}
                  style={{ flex: 1, margin: '8px 0', marginLeft: 6, padding: '11px 12px', textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
                >
                  <Monogram name={ev.name} hue={ev.hue} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: struck ? 'var(--text-faint)' : 'var(--text)', textDecoration: struck ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: isMissed ? 'var(--red)' : 'var(--text-dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isSkipped ? 'Skipped' : isMissed ? 'Missed' : `${ev.dose} · ${ev.route}`}</div>
                  </div>
                </button>
                {!isFuture && (
                  <button
                    onClick={() => app.setStatus(ev.subId, selObj.iso, isTaken ? null : 'taken')}
                    aria-label={isTaken ? 'Mark not taken' : 'Mark taken'}
                    style={{ alignSelf: 'center', marginLeft: 8, width: 30, height: 30, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: isTaken ? 'none' : '1.5px solid var(--line-strong)', background: isTaken ? 'var(--green)' : 'transparent', color: isTaken ? 'var(--bg)' : 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
                  >
                    <Icon.check />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
