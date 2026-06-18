'use client';

import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { isoDate, ok } from '@/lib/substances';
import {
  weightSeries, weightSummary, fmtNum, getWeightUnit, setWeightUnit,
  type BodyMetric, type WeightUnit,
} from '@/lib/metrics';
import { Label, Icon } from './ui';
import { Sheet } from './ui';
import { AdherencePanel } from './Stats';
import { Reminders } from './Reminders';
import type { AppApi } from './types';

const HUE = 200; // calm teal for the weight line — distinct from amber (actions) + green (adherence)
const LINE = ok(0.74, 0.12, HUE);
const FILL_TOP = ok(0.74, 0.12, HUE);

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Weight trend chart (inline SVG, no chart lib — matches the app's ethos) ── */
function WeightChart({ series, unit }: { series: { date: string; value: number }[]; unit: WeightUnit }) {
  // Nominal coordinate space; scales uniformly to the container width.
  const VBW = 320, VBH = 150;
  const PAD = { l: 34, r: 10, t: 14, b: 22 };
  const x0 = PAD.l, x1 = VBW - PAD.r, y0 = PAD.t, y1 = VBH - PAD.b;

  if (series.length < 2) return null;

  const values = series.map((p) => p.value);
  let lo = Math.min(...values), hi = Math.max(...values);
  if (lo === hi) { lo -= 1; hi += 1; }
  const range = hi - lo;
  lo -= range * 0.12; hi += range * 0.12; // headroom

  const xAt = (i: number) => x0 + (series.length === 1 ? (x1 - x0) / 2 : (i / (series.length - 1)) * (x1 - x0));
  const yAt = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);

  const pts = series.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`);
  const linePath = `M ${pts.join(' L ')}`;
  const areaPath = `M ${xAt(0).toFixed(1)},${y1} L ${pts.join(' L ')} L ${xAt(series.length - 1).toFixed(1)},${y1} Z`;

  const last = series[series.length - 1];
  const gridVals = [hi - range * 0.12, lo + range * 0.12]; // approx max/min of real data

  return (
    <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={FILL_TOP} stopOpacity="0.22" />
          <stop offset="100%" stopColor={FILL_TOP} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal gridlines + y labels at real min/max */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={x0} y1={yAt(v)} x2={x1} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 3" />
          <text x={x0 - 6} y={yAt(v) + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--text-faint)">{fmtNum(v)}</text>
        </g>
      ))}

      <path d={areaPath} fill="url(#wfill)" />
      <path d={linePath} fill="none" stroke={LINE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* data dots */}
      {series.map((p, i) => (
        <circle key={p.date} cx={xAt(i)} cy={yAt(p.value)} r={i === series.length - 1 ? 3.4 : 2} fill={i === series.length - 1 ? LINE : 'var(--bg)'} stroke={LINE} strokeWidth="1.4" />
      ))}

      {/* latest value bubble */}
      <text x={xAt(series.length - 1)} y={yAt(last.value) - 8} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill={LINE}>{fmtNum(last.value)} {unit}</text>

      {/* x range labels */}
      <text x={x0} y={VBH - 6} textAnchor="start" fontFamily="var(--mono)" fontSize="9" fill="var(--text-faint)">{shortDate(series[0].date)}</text>
      <text x={x1} y={VBH - 6} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--text-faint)">{shortDate(last.date)}</text>
    </svg>
  );
}

/* ── Inputs ──────────────────────────────────────────────────── */
const field: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 13,
  border: '1px solid var(--line-strong)', background: 'var(--surface-2)', color: 'var(--text)',
  fontFamily: 'var(--mono)', fontSize: 15, outline: 'none',
};

function NumField({ label, value, onChange, suffix, placeholder }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <Label style={{ marginBottom: 7 }}>{label}</Label>
      <div style={{ position: 'relative' }}>
        <input
          className="vlf"
          type="number" inputMode="decimal" value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...field, paddingRight: suffix ? 42 : 14 }}
        />
        {suffix && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)' }}>{suffix}</span>}
      </div>
    </div>
  );
}

/* ── Log / edit a day's metrics ──────────────────────────────── */
function MetricSheet({
  open, onClose, app, unit, editing,
}: { open: boolean; onClose: () => void; app: AppApi; unit: WeightUnit; editing: BodyMetric | null }) {
  const [date, setDate] = useState(isoDate(new Date()));
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [note, setNote] = useState('');

  // Reset the form whenever the sheet opens (fresh entry, or prefilled for an edit).
  useEffect(() => {
    if (!open) return;
    setDate(editing?.date ?? isoDate(new Date()));
    setWeight(editing?.weight != null ? String(editing.weight) : '');
    setWaist(editing?.waist != null ? String(editing.waist) : '');
    setBodyFat(editing?.bodyFat != null ? String(editing.bodyFat) : '');
    setNote(editing?.note ?? '');
  }, [open, editing]);

  const parse = (v: string): number | null => {
    const n = parseFloat(v);
    return v.trim() === '' || Number.isNaN(n) ? null : n;
  };
  const canSave = weight.trim() !== '' || waist.trim() !== '' || bodyFat.trim() !== '';

  function save() {
    if (!canSave) return;
    app.saveMetric(date, { weight: parse(weight), waist: parse(waist), bodyFat: parse(bodyFat), note: note.trim() });
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit entry' : 'Log measurement'}>
      <div style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Label style={{ marginBottom: 7 }}>Date</Label>
          <input className="vlf" type="date" value={date} max={isoDate(new Date())} onChange={(e) => setDate(e.target.value)} style={field} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <NumField label="Weight" value={weight} onChange={setWeight} suffix={unit} placeholder="—" />
          <NumField label="Waist" value={waist} onChange={setWaist} suffix="in" placeholder="—" />
        </div>
        <NumField label="Body fat" value={bodyFat} onChange={setBodyFat} suffix="%" placeholder="—" />
        <div>
          <Label style={{ marginBottom: 7 }}>Note</Label>
          <textarea className="vlf" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="How you feel, side effects…" style={{ ...field, resize: 'none', fontFamily: 'var(--sans)', fontSize: 14 }} />
        </div>
        {/* Sticky so it stays visible above the keyboard even if the fields scroll. */}
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--surface)', paddingTop: 10, paddingBottom: 4 }}>
          <button
            onClick={save}
            disabled={!canSave}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: canSave ? 'var(--amber)' : 'var(--surface-2)', color: canSave ? 'var(--bg)' : 'var(--text-faint)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: canSave ? 'pointer' : 'default' }}
          >
            {editing ? 'Save changes' : 'Save entry'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function StatCell({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 26, color: tone || 'var(--text)', lineHeight: 1 }}>{value}</div>
      <Label style={{ fontSize: 9, marginTop: 6 }}>{label}</Label>
    </div>
  );
}

export const ProgressScreen = memo(function ProgressScreen({ app }: { app: AppApi }) {
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<BodyMetric | null>(null);
  const [unit, setUnit] = useState<WeightUnit>('lb');
  useEffect(() => setUnit(getWeightUnit()), []);

  const metrics = app.metrics;
  const series = useMemo(() => weightSeries(metrics), [metrics]);
  const summary = useMemo(() => weightSummary(metrics), [metrics]);
  const recent = useMemo(() => [...metrics].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), [metrics]);
  const latestWaist = useMemo(() => [...metrics].reverse().find((m) => m.waist != null)?.waist, [metrics]);
  const latestFat = useMemo(() => [...metrics].reverse().find((m) => m.bodyFat != null)?.bodyFat, [metrics]);

  function openNew() { setEditing(null); setSheet(true); }
  function openEdit(m: BodyMetric) { setEditing(m); setSheet(true); }
  function toggleUnit() { const u = unit === 'lb' ? 'kg' : 'lb'; setUnit(u); setWeightUnit(u); }

  const changeTone = summary.change == null ? 'var(--text)' : summary.change < 0 ? 'var(--green)' : summary.change > 0 ? 'var(--amber)' : 'var(--text)';
  const changeStr = summary.change == null ? '—' : `${summary.change > 0 ? '+' : ''}${fmtNum(summary.change)}`;

  return (
    <div style={{ padding: '56px 20px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 32, lineHeight: 1, color: 'var(--text)', margin: 0 }}>Progress</h1>
        <button onClick={toggleUnit} aria-label="Toggle weight unit" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>
          {unit.toUpperCase()}
        </button>
      </div>

      {/* Weight card */}
      <div style={{ marginTop: 20, padding: '18px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20 }}>
        {summary.count > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <StatCell value={summary.latest != null ? fmtNum(summary.latest) : '—'} label={`weight · ${unit}`} />
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
              <StatCell value={changeStr} label="change" tone={changeTone} />
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
              <StatCell value={summary.min != null && summary.max != null ? `${fmtNum(summary.min)}–${fmtNum(summary.max)}` : '—'} label="range" />
            </div>
            {series.length >= 2 ? (
              <div style={{ marginTop: 18 }}><WeightChart series={series} unit={unit} /></div>
            ) : (
              <div style={{ marginTop: 16, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-faint)' }}>Log one more day to see your trend.</div>
            )}
            {(latestWaist != null || latestFat != null) && (
              <div style={{ display: 'flex', gap: 18, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                {latestWaist != null && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)' }}>Waist {fmtNum(latestWaist)} in</span>}
                {latestFat != null && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)' }}>Body fat {fmtNum(latestFat)}%</span>}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 6px' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--text)' }}>Track your results</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.5 }}>Log your weight to see it trend against your protocol over time.</div>
          </div>
        )}
        <button onClick={openNew} style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 13, border: '1px solid var(--line-strong)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Icon.plus /> Log measurement
        </button>
      </div>

      {/* Recent entries */}
      {recent.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <Label>Recent entries</Label>
          <div style={{ marginTop: 10 }}>
            {recent.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                <button onClick={() => openEdit(m)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                  <div style={{ width: 58, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>{shortDate(m.date)}</div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {m.weight != null && <span style={{ fontFamily: 'var(--mono)', fontSize: 13.5, color: 'var(--text)' }}>{fmtNum(m.weight)} {unit}</span>}
                    {m.waist != null && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)' }}>· {fmtNum(m.waist)}in</span>}
                    {m.bodyFat != null && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)' }}>· {fmtNum(m.bodyFat)}%</span>}
                    {m.note && <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.note}</span>}
                  </div>
                </button>
                <button onClick={() => app.removeMetric(m.date)} aria-label="Delete entry" style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon.trash />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adherence + reminders (moved here from Today to make Progress the insights hub) */}
      <AdherencePanel app={app} />
      <Reminders />

      {/* Portal to the app shell so the sheet escapes the scrolling content area's
          iOS stacking context (-webkit-overflow-scrolling) — otherwise its z-index
          can't rise above the fixed bottom nav and the Save button gets clipped. */}
      {createPortal(
        <MetricSheet open={sheet} onClose={() => setSheet(false)} app={app} unit={unit} editing={editing} />,
        document.getElementById('vial-shell') ?? document.body,
      )}
    </div>
  );
});
