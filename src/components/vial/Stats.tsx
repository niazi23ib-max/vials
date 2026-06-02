'use client';

import { adherence, streak, dayStatus, isoDate } from '@/lib/substances';
import { Label } from './ui';
import type { AppApi } from './types';

const WEEKS = 10;

const CELL: Record<string, string> = {
  done: 'var(--green)',
  partial: 'var(--amber)',
  missed: 'rgba(215,122,107,0.55)',
  pending: 'transparent',
  none: 'rgba(255,255,255,0.035)',
  future: 'rgba(255,255,255,0.015)',
};

function Metric({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 30, color: tone || 'var(--text)', lineHeight: 1 }}>{value}</div>
      <Label style={{ fontSize: 9, marginTop: 6 }}>{label}</Label>
    </div>
  );
}

export function AdherencePanel({ app }: { app: AppApi }) {
  const subs = app.substances;
  if (!subs.length) return null;

  const now = new Date();
  const a7 = adherence(subs, app.logs, 7, now);
  const a30 = adherence(subs, app.logs, 30, now);
  const st = streak(subs, app.logs, now);

  // Heatmap: WEEKS columns (oldest → newest), Mon–Sun down each column.
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - mondayOffset - (WEEKS - 1) * 7);
  const cells: string[] = [];
  const d = new Date(start);
  for (let i = 0; i < WEEKS * 7; i++) {
    cells.push(isoDate(d));
    d.setDate(d.getDate() + 1);
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const pctTone = (n: number) => (n >= 0.85 ? 'var(--green)' : n >= 0.6 ? 'var(--amber)' : 'var(--red)');

  return (
    <div style={{ marginTop: 30 }}>
      <Label>Adherence</Label>
      <div style={{ marginTop: 12, padding: '18px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <Metric value={String(st)} label={st === 1 ? 'day streak' : 'day streak'} tone={st > 0 ? 'var(--amber)' : 'var(--text)'} />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
          <Metric value={pct(a7.pct)} label="7-day" tone={pctTone(a7.pct)} />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
          <Metric value={pct(a30.pct)} label="30-day" tone={pctTone(a30.pct)} />
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gridAutoColumns: '1fr', gap: 4 }}>
          {cells.map((iso) => (
            <div
              key={iso}
              title={iso}
              style={{ aspectRatio: '1', borderRadius: 3, background: CELL[dayStatus(subs, app.logs, iso, now)], border: dayStatus(subs, app.logs, iso, now) === 'pending' ? '1px solid var(--line-strong)' : 'none' }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {([['Taken', 'var(--green)'], ['Partial', 'var(--amber)'], ['Missed', 'rgba(215,122,107,0.55)']] as const).map(([l, c]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: c }} /> {l}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)' }}>{a30.taken} taken · {a30.missed} missed · 30d</span>
        </div>
      </div>
    </div>
  );
}
