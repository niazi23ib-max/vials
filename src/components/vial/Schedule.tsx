'use client';

import { useState } from 'react';
import { currentWeek, doseLabel, ok, todayName, type Substance } from '@/lib/substances';
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
  const WEEK = currentWeek();
  const [sel, setSel] = useState(TODAY_NAME);
  const events = dayEvents(app.substances, sel);
  const selObj = WEEK.find((w) => w.name === sel)!;
  const weekTotal = WEEK.reduce((n, w) => n + dayEvents(app.substances, w.name).length, 0);

  return (
    <div style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div style={{ padding: '0 20px' }}>
        <Label>Schedule · {weekTotal} doses</Label>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 32, color: 'var(--text)', margin: '8px 0 0' }}>This week</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '20px 20px 6px', overflowX: 'auto' }}>
        {WEEK.map((w) => {
          const evs = dayEvents(app.substances, w.name);
          const isSel = w.name === sel;
          const isToday = w.isToday;
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
          {sel === TODAY_NAME ? 'Today' : sel}
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
            const taken = sel === TODAY_NAME && app.taken.has(ev.subId + '-today');
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                <div style={{ width: 50, paddingTop: 14, textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13.5, color: 'var(--text)' }}>{ev.time}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-faint)' }}>{ev.period}</div>
                </div>
                <div style={{ width: 26, position: 'relative', display: 'flex', justifyContent: 'center', marginLeft: 8 }}>
                  <div style={{ width: 1.5, background: 'var(--line)', position: 'absolute', top: i === 0 ? 20 : 0, bottom: i === events.length - 1 ? 'calc(100% - 28px)' : 0 }} />
                  <div style={{ width: 11, height: 11, borderRadius: '50%', marginTop: 16, zIndex: 1, flexShrink: 0, background: taken ? 'var(--green)' : ok(0.7, 0.12, ev.hue), boxShadow: '0 0 0 4px var(--bg)' }} />
                </div>
                <button
                  onClick={() => app.open(ev.subId)}
                  style={{ flex: 1, margin: '8px 0', marginLeft: 8, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <Monogram name={ev.name} hue={ev.hue} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: taken ? 'var(--text-faint)' : 'var(--text)', textDecoration: taken ? 'line-through' : 'none' }}>{ev.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{ev.dose} · {ev.route}</div>
                  </div>
                  {taken ? <span style={{ color: 'var(--green)' }}><Icon.check /></span> : <Icon.arrow style={{ color: 'var(--text-faint)' }} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
