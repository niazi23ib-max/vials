'use client';

import { memo, useMemo, useState, type CSSProperties } from 'react';
import {
  fillPct, daysLeft, dosesLeft, stockStatus, expiryStatus, daysUntil, fmtMoney, containerLabel, type Substance,
} from '@/lib/substances';
import { VialFill, Label, Chip, Icon } from './ui';
import type { AppApi } from './types';

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div>
      <Label style={{ fontSize: 9 }}>{label}</Label>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: tone || 'var(--text)', marginTop: 3 }}>{value}</div>
    </div>
  );
}

const VialCard = memo(function VialCard({ s, onOpen }: { s: Substance; onOpen: (id: string) => void }) {
  const stock = stockStatus(s);
  const exp = expiryStatus(s);
  const dl = daysLeft(s);
  const pct = fillPct(s);
  const remValue = Math.round(s.pricePerVial * pct);
  const runwayTone = stock === 'critical' ? 'var(--red)' : stock === 'low' ? 'var(--amber)' : 'var(--text)';

  return (
    <button
      onClick={() => onOpen(s.id)}
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, display: 'flex', gap: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <VialFill pct={pct} hue={s.hue} w={32} h={84} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: runwayTone }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--text)', lineHeight: 1.05 }}>{s.name}</div>
            <Label style={{ marginTop: 4, whiteSpace: 'nowrap' }}>{s.category} · {containerLabel(s)}</Label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {stock !== 'ok' && <Chip tone={stock === 'critical' ? 'red' : 'amber'}>{dl}d left</Chip>}
          {exp === 'soon' && <Chip tone="amber">Exp {daysUntil(s.expiry)}d</Chip>}
          {stock === 'ok' && exp === 'ok' && <Chip tone="green">In supply</Chip>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
          <Stat label="Runway" value={`${dl}d`} tone={runwayTone} />
          <Stat label="Doses" value={dosesLeft(s)} />
          <Stat label="Value" value={fmtMoney(remValue)} />
        </div>
      </div>
    </button>
  );
});

export const InventoryScreen = memo(function InventoryScreen({ app }: { app: AppApi }) {
  const [filter, setFilter] = useState<'All' | 'Low' | 'Expiring'>('All');

  const filtered = useMemo(() => app.substances.filter((s) => {
    if (filter === 'Low') return stockStatus(s) !== 'ok';
    if (filter === 'Expiring') return expiryStatus(s) === 'soon';
    return true;
  }), [app.substances, filter]);

  const { totalValue, lowCount, expCount } = useMemo(() => ({
    totalValue: app.substances.reduce((n, s) => n + Math.round(s.pricePerVial * fillPct(s)), 0),
    lowCount: app.substances.filter((s) => stockStatus(s) !== 'ok').length,
    expCount: app.substances.filter((s) => expiryStatus(s) === 'soon').length,
  }), [app.substances]);

  const summary: { l: string; v: string | number; tone: string }[] = [
    { l: 'On hand', v: fmtMoney(totalValue), tone: 'var(--text)' },
    { l: 'Running low', v: lowCount, tone: lowCount ? 'var(--amber)' : 'var(--text)' },
    { l: 'Expiring', v: expCount, tone: expCount ? 'var(--amber)' : 'var(--text)' },
  ];

  return (
    <div style={{ paddingTop: 56, paddingBottom: 28 }}>
      <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <Label>Inventory · {app.substances.length} vials</Label>
          <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 32, color: 'var(--text)', margin: '8px 0 0' }}>Vials</h1>
        </div>
        <button
          onClick={app.openAddVial}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--amber)', color: 'var(--bg)', border: 'none', borderRadius: 999, padding: '9px 14px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Icon.plus width={16} height={16} /> Add vial
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '18px 20px 0' }}>
        {summary.map((c) => (
          <div key={c.l} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '13px 12px' }}>
            <Label style={{ fontSize: 9 }}>{c.l}</Label>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 19, color: c.tone, marginTop: 6 } as CSSProperties}>{c.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '18px 20px 4px' }}>
        {(['All', 'Low', 'Expiring'] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 20px 0' }}>
        {filtered.map((s) => <VialCard key={s.id} s={s} onOpen={app.open} />)}
        {filtered.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: 30 }}>Nothing here.</div>}
      </div>
    </div>
  );
});
