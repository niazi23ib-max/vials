'use client';

import type { ReactNode } from 'react';
import {
  doseLabel, daysLeft, stockStatus, expiryStatus, daysUntil, fillPct, fmtExpiry,
  todayName, greeting, type Substance,
} from '@/lib/substances';
import { Monogram, Label, Icon, VialFill } from './ui';
import { AdherencePanel } from './Stats';
import { Reminders } from './Reminders';
import type { AppApi } from './types';

interface Ev {
  id: string; subId: string; name: string; hue: number;
  dose: string; time: string; period: string; route: string;
}

function DoseRow({ ev, taken, onToggle, onOpen }: { ev: Ev; taken: boolean; onToggle: (id: string) => void; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ width: 52, textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 15, color: taken ? 'var(--text-faint)' : 'var(--text)', letterSpacing: '-0.02em' }}>{ev.time}</div>
        <Label style={{ fontSize: 9, marginTop: 1 }}>{ev.period}</Label>
      </div>
      <div onClick={() => onOpen(ev.subId)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 0 }}>
        <Monogram name={ev.name} hue={ev.hue} size={36} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: taken ? 'var(--text-faint)' : 'var(--text)', lineHeight: 1.1, textDecoration: taken ? 'line-through' : 'none', textDecorationColor: 'var(--text-faint)' }}>{ev.name}</div>
          <div style={{ display: 'flex', gap: 7, marginTop: 3, whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>{ev.dose}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {ev.route}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onToggle(ev.id)}
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          border: taken ? 'none' : '1.5px solid var(--line-strong)',
          background: taken ? 'var(--green)' : 'transparent',
          color: taken ? 'var(--bg)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
        }}
      >
        <Icon.check />
      </button>
    </div>
  );
}

function AlertRow({ icon, tone, title, detail, onClick }: { icon: ReactNode; tone: 'red' | 'amber'; title: string; detail: string; onClick: () => void }) {
  const c = tone === 'red' ? 'var(--red)' : 'var(--amber)';
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, cursor: 'pointer', textAlign: 'left' }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tone === 'red' ? 'rgba(215,122,107,0.12)' : 'var(--amber-soft)', color: c, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{title}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{detail}</div>
      </div>
      <Icon.arrow style={{ color: 'var(--text-faint)' }} />
    </button>
  );
}

export function TodayScreen({ app }: { app: AppApi }) {
  const TODAY_NAME = todayName();
  const now = new Date();
  const dateLabel = `${now.toLocaleDateString('en-US', { weekday: 'short' })} · ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const events: Ev[] = app.substances
    .filter((s) => s.days.includes(TODAY_NAME))
    .map((s) => ({ id: s.id + '-today', subId: s.id, name: s.name, hue: s.hue, dose: doseLabel(s), time: s.time, period: s.period, route: s.route }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const total = events.length;
  const done = events.filter((e) => app.taken.has(e.id)).length;
  const next = events.find((e) => !app.taken.has(e.id));
  const nextSub = next ? app.substances.find((s) => s.id === next.subId) : undefined;

  const lowStock = app.substances.filter((s) => stockStatus(s) !== 'ok');
  const expiring = app.substances.filter((s) => expiryStatus(s) === 'soon');

  return (
    <div style={{ padding: '56px 20px 96px' }}>
      <Label>{dateLabel}</Label>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 34, lineHeight: 1.02, color: 'var(--text)', margin: 0, whiteSpace: 'pre-line' }}>{greeting(now)}</h1>
        <div style={{ position: 'relative', width: 64, height: 64 }}>
          <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r="27" fill="none" stroke="var(--line)" strokeWidth="4" />
            <circle cx="32" cy="32" r="27" fill="none" stroke="var(--green)" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 27} strokeDashoffset={2 * Math.PI * 27 * (1 - (total ? done / total : 0))} style={{ transition: 'stroke-dashoffset .6s' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--text)' }}>{done}/{total}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--text-faint)' }}>DOSES</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        {next && nextSub ? (
          <button
            onClick={() => app.log(next.subId)}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'linear-gradient(135deg, var(--surface-2), var(--surface))', border: '1px solid var(--line-strong)', borderRadius: 22, padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <div style={{ flex: 1 }}>
              <Label color="var(--amber)">Up next · {next.time} {next.period}</Label>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 27, color: 'var(--text)', marginTop: 8, lineHeight: 1 }}>{next.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>{next.dose} · {next.route}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 14, padding: '8px 14px', background: 'var(--amber)', color: 'var(--bg)', borderRadius: 999, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <Icon.check /> Log this dose
              </div>
            </div>
            <VialFill pct={fillPct(nextSub)} hue={next.hue} w={34} h={86} />
          </button>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: '26px 18px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(127,174,122,0.15)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Icon.check /></div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 21, color: 'var(--text)' }}>{total ? 'All caught up' : 'Rest day'}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{total ? "Today's protocol is complete" : 'No doses scheduled today'}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Label>Today&apos;s protocol</Label>
        <Label>{done} of {total} logged</Label>
      </div>
      <div style={{ marginTop: 4 }}>
        {events.map((ev) => (
          <DoseRow key={ev.id} ev={ev} taken={app.taken.has(ev.id)} onToggle={app.toggle} onOpen={app.open} />
        ))}
      </div>

      <AdherencePanel app={app} />

      <Reminders />

      {(lowStock.length > 0 || expiring.length > 0) && (
        <div style={{ marginTop: 30 }}>
          <Label>Needs attention</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
            {lowStock.map((s: Substance) => (
              <AlertRow key={s.id} tone={daysLeft(s) <= 7 ? 'red' : 'amber'} icon={<Icon.bell />} title={`${s.name} running low`} detail={`${daysLeft(s)} days of supply left`} onClick={() => app.open(s.id)} />
            ))}
            {expiring.map((s: Substance) => (
              <AlertRow key={s.id} tone="amber" icon={<Icon.clock />} title={`${s.name} expires soon`} detail={`In ${daysUntil(s.expiry)} days · ${fmtExpiry(s.expiry)}`} onClick={() => app.open(s.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
