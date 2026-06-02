'use client';

import {
  fillPct, daysLeft, dosesLeft, stockStatus, expiryStatus, fmtExpiry, fmtMoney, doseLabel, recon, ok, DAY_ORDER,
  substanceForm, dosesPerContainer, containerLabel, fullAmount, doseHistory, type Substance,
} from '@/lib/substances';
import { VialFill, Label, Chip, Icon } from './ui';
import type { AppApi } from './types';

function KV({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
      <Label style={{ fontSize: 9 }}>{label}</Label>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 15, color: tone || 'var(--text)', marginTop: 5 }}>{value}</div>
    </div>
  );
}

export function DetailScreen({ sub, app, onBack }: { sub: Substance; app: AppApi; onBack: () => void }) {
  const s = sub;
  const form = substanceForm(s);
  const history = doseHistory(s, app.logs, 6);
  const r = form === 'inject' ? recon(s.vialMg, s.bacMl, s.doseMcg) : null;
  const stock = stockStatus(s);
  const runwayTone = stock === 'critical' ? 'var(--red)' : stock === 'low' ? 'var(--amber)' : 'var(--text)';
  const dpc = dosesPerContainer(s);
  const costPerDose = dpc > 0 ? s.pricePerVial / dpc : 0;

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'linear-gradient(var(--bg), rgba(16,13,10,0.85))', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 16px 10px' }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon.back /></button>
        <Label>{s.category}</Label>
        <button
          onClick={() => app.editVial(s)}
          aria-label="Edit vial"
          style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.5 2.5l2 2L6 12l-2.6.6.6-2.6 7.5-7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '8px 20px 120px', flex: 1 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 36, color: 'var(--text)', margin: 0, lineHeight: 1 }}>{s.name}</h1>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>{s.sub}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              <Chip>{s.route}</Chip>
              {stock !== 'ok' && <Chip tone={stock === 'critical' ? 'red' : 'amber'}>{daysLeft(s)}d left</Chip>}
              {expiryStatus(s) === 'soon' && <Chip tone="amber">Exp soon</Chip>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <VialFill pct={fillPct(s)} hue={s.hue} w={40} h={104} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: runwayTone }}>{Math.round(fillPct(s) * 100)}%</span>
          </div>
        </div>

        <div style={{ marginTop: 22, padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Label>Runway</Label>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: runwayTone, whiteSpace: 'nowrap' }}>{daysLeft(s)} days · {dosesLeft(s)} {dosesLeft(s) === 1 ? 'dose' : 'doses'}</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.05)', marginTop: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fillPct(s) * 100}%`, borderRadius: 99, background: `linear-gradient(90deg, ${ok(0.6, 0.12, s.hue)}, ${ok(0.74, 0.13, s.hue)})` }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <KV label="Dose" value={doseLabel(s)} />
          <KV label="Frequency" value={s.days.length === 7 ? 'Daily' : `${s.days.length}× / week`} />
          {r ? (
            <>
              <KV label="Draw (U-100)" value={`${r.units.toFixed(1)} units`} />
              <KV label="Concentration" value={`${(r.concMcgPerMl / 1000).toFixed(2)} mg/mL`} />
            </>
          ) : form === 'oral' ? (
            <>
              <KV label="In container" value={containerLabel(s)} />
              <KV label="Strength" value={`${s.doseMcg} ${s.unit}`} />
            </>
          ) : (
            <>
              <KV label="In container" value={containerLabel(s)} />
              <KV label="Route" value={s.route} />
            </>
          )}
          <KV label="Expires" value={fmtExpiry(s.expiry)} tone={expiryStatus(s) === 'soon' ? 'var(--amber)' : 'var(--text)'} />
          <KV label="Cost / dose" value={`$${costPerDose.toFixed(2)}`} />
        </div>

        <div style={{ marginTop: 26 }}>
          <Label>Schedule</Label>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {DAY_ORDER.map((d) => {
              const on = s.days.includes(d);
              return (
                <div key={d} style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 11, background: on ? ok(0.28, 0.05, s.hue) : 'rgba(255,255,255,0.02)', border: `1px solid ${on ? ok(0.4, 0.07, s.hue) : 'var(--line)'}`, color: on ? ok(0.82, 0.11, s.hue) : 'var(--text-faint)' }}>{d[0]}</div>
              );
            })}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>{s.time} {s.period} · {s.route}</div>
        </div>

        <div style={{ marginTop: 26 }}>
          <Label>Recent doses</Label>
          <div style={{ marginTop: 8 }}>
            {history.length === 0 ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-faint)', padding: '10px 0' }}>No scheduled doses yet.</div>
            ) : history.map((h) => {
              const color = h.status === 'taken' ? 'var(--green)' : h.status === 'skipped' ? 'var(--amber)' : h.status === 'pending' ? 'var(--text-faint)' : 'var(--red)';
              const right = h.status === 'taken' ? doseLabel(s) : h.status === 'skipped' ? 'Skipped' : h.status === 'pending' ? 'Due today' : 'Missed';
              return (
                <div key={h.iso} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, opacity: h.status === 'taken' ? 1 : 0.7 }} />
                  <span style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text)' }}>{h.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: h.status === 'taken' ? 'var(--text-dim)' : color, whiteSpace: 'nowrap' }}>{right}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-faint)', marginTop: 20, lineHeight: 1.5 }}>
          Lot {s.lot || '—'} · {form === 'inject' ? `${s.vialMg} mg in ${s.bacMl} mL BAC` : containerLabel(s)} · {fmtMoney(s.pricePerVial)} / {form === 'inject' ? 'vial' : 'container'}
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: 0, padding: '12px 20px 28px', background: 'linear-gradient(rgba(16,13,10,0), var(--bg) 40%)', display: 'flex', gap: 10 }}>
        <button onClick={() => app.log(s.id)} style={{ flex: 1, padding: '15px 0', borderRadius: 16, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon.check /> Log dose</button>
        <button
          onClick={() => { if (confirm(`Refill ${s.name} back to full (${containerLabel(s)})?`)) app.updateSubstance(s.id, { ...s, remaining: fullAmount(s) }); }}
          style={{ width: 56, borderRadius: 16, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}
        >
          Refill
        </button>
      </div>
    </div>
  );
}
