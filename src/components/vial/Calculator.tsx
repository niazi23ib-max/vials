'use client';

import { useState, type CSSProperties } from 'react';
import { recon, substanceForm, isoDate, type Substance } from '@/lib/substances';
import { Label, Chip } from './ui';
import type { AppApi } from './types';

function Syringe({ units }: { units: number }) {
  const capped = Math.min(units, 100);
  const pct = (capped / 100) * 100;
  const over = units > 100;
  return (
    <div style={{ padding: '4px 2px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 16, height: 12, background: 'var(--line-strong)', borderRadius: '3px 0 0 3px' }} />
        <div style={{ width: 4, height: 22, background: 'var(--line-strong)' }} />
        <div style={{ position: 'relative', flex: 1, height: 34, background: 'rgba(255,255,255,0.025)', border: '1.5px solid var(--line-strong)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', background: 'linear-gradient(180deg, var(--amber), oklch(0.6 0.12 55))', transition: 'width .4s cubic-bezier(.4,0,.2,1)' }} />
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((t) => (
            <div key={t} style={{ position: 'absolute', left: t + '%', top: t % 50 === 0 ? 0 : 6, bottom: 0, width: 1, background: 'var(--line)' }} />
          ))}
          <div style={{ position: 'absolute', left: `calc(${pct}% - 1px)`, top: -2, bottom: -2, width: 2, background: 'var(--text)' }} />
        </div>
        <div style={{ width: 5, height: 8, background: 'var(--line-strong)' }} />
        <div style={{ width: 22, height: 1.5, background: 'var(--line-strong)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, padding: '0 28px 0 22px' }}>
        {[0, 25, 50, 75, 100].map((t) => <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)' }}>{t}</span>)}
      </div>
      {over && <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--amber)', marginTop: 6 }}>Exceeds 1 mL — split across two draws or add more BAC water.</div>}
    </div>
  );
}

function Stepper({ label, value, unit, step, min, max, fmt, onChange }: { label: string; value: number; unit: string; step: number; min: number; max: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  const btn = (txt: string, fn: () => void) => (
    <button onClick={fn} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--line-strong)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{txt}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
      <Label color="var(--text-dim)">{label}</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {btn('−', () => onChange(Math.max(min, +(value - step).toFixed(2))))}
        <div style={{ minWidth: 76, textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 19, color: 'var(--text)' }}>{fmt ? fmt(value) : value}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>{unit}</span>
        </div>
        {btn('+', () => onChange(Math.min(max, +(value + step).toFixed(2))))}
      </div>
    </div>
  );
}

function OutRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: big ? '0' : '8px 0', borderBottom: big ? 'none' : '1px solid var(--line)' }}>
      <Label color="var(--text-dim)" style={{ whiteSpace: 'nowrap' }}>{label}</Label>
      <span style={{ fontFamily: 'var(--mono)', fontSize: big ? 15 : 13, color: 'var(--text)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function ReconTab({ substances }: { substances: Substance[] }) {
  const [mg, setMg] = useState(10);
  const [bac, setBac] = useState(2);
  const [dose, setDose] = useState(4000);
  const r = recon(mg, bac, dose);
  const doseFmt = dose >= 1000 ? dose / 1000 + ' mg' : dose + ' mcg';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '4px 20px 0', overflowX: 'auto' }}>
        <Label style={{ alignSelf: 'center', flexShrink: 0 }}>Load</Label>
        {substances.filter((s) => substanceForm(s) === 'inject').map((s) => (
          <Chip key={s.id} onClick={() => { setMg(s.vialMg); setBac(s.bacMl); setDose(s.doseMcg); }}>{s.name}</Chip>
        ))}
      </div>

      <div style={{ margin: '18px 20px 0', padding: 20, background: 'linear-gradient(135deg, var(--surface-2), var(--surface))', border: '1px solid var(--line-strong)', borderRadius: 22 }}>
        <Label color="var(--amber)">Draw to</Label>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 52, color: 'var(--text)', lineHeight: 1 }}>{r.units.toFixed(1)}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-dim)' }}>units · {r.mlDraw.toFixed(2)} mL</span>
        </div>
        <div style={{ marginTop: 14 }}><Syringe units={r.units} /></div>
      </div>

      <div style={{ padding: '22px 20px 0' }}>
        <Label>Vial setup</Label>
        <div style={{ marginTop: 6 }}>
          <Stepper label="Peptide in vial" value={mg} unit="mg" step={1} min={1} max={50} onChange={setMg} />
          <Stepper label="BAC water added" value={bac} unit="mL" step={0.5} min={0.5} max={5} fmt={(v) => v.toFixed(1)} onChange={setBac} />
        </div>
        <div style={{ marginTop: 18 }}>
          <Label>Target dose</Label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--text)' }}>{doseFmt}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-faint)' }}>{r.dosesPerVial.toFixed(1)} doses / vial</span>
          </div>
          <input type="range" min={50} max={8000} step={50} value={dose} onChange={(e) => setDose(+e.target.value)} style={{ width: '100%', marginTop: 12, accentColor: 'var(--amber)' }} />
        </div>
      </div>

      <div style={{ margin: '22px 20px 0', padding: '6px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18 }}>
        <OutRow label="Concentration" value={`${(r.concMcgPerMl / 1000).toFixed(2)} mg/mL`} />
        <OutRow label="Per unit" value={`${r.mcgPerUnit.toFixed(1)} mcg`} />
        <OutRow label="Volume / dose" value={`${r.mlDraw.toFixed(3)} mL`} />
        <div style={{ padding: '8px 0' }}><OutRow label="Doses per vial" value={r.dosesPerVial.toFixed(1)} big /></div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', padding: '14px 20px 0', lineHeight: 1.5 }}>
        U-100 syringe assumed (100 units = 1 mL). Figures are illustrative — verify against your protocol.
      </div>
    </div>
  );
}

const titInput: CSSProperties = {
  background: 'var(--surface-2)', border: '1px solid var(--line-strong)', borderRadius: 10,
  padding: '9px 11px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 14, outline: 'none', width: '100%',
};

interface StepDraft {
  label: string;
  mg: string;
  current: boolean;
  start: string; // ISO date this step begins (optional)
}

function TitrationTab({ app }: { app: AppApi }) {
  const subs = app.substances;
  const [selId, setSelId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [steps, setSteps] = useState<StepDraft[]>([]);

  const sel = subs.find((x) => x.id === selId) ?? subs.find((x) => x.titration) ?? subs[0];

  if (!subs.length) {
    return (
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '40px 20px' }}>
        Add a vial first — then build its titration schedule here.
      </div>
    );
  }
  const s = sel!;

  function startEdit() {
    setSteps(
      s.titration && s.titration.length
        ? s.titration.map((t) => ({ label: t.label, mg: String(t.mcg / 1000), current: !!t.current, start: t.start || '' }))
        : [{ label: 'Wk 1–4', mg: '', current: true, start: '' }],
    );
    setEditing(true);
  }

  function save() {
    const cleaned = steps
      .filter((st) => st.label.trim() && Number(st.mg) > 0)
      .map((st) => ({ label: st.label.trim(), mcg: Number(st.mg) * 1000, current: st.current, ...(st.start ? { start: st.start } : {}) }));
    if (cleaned.length && !cleaned.some((c) => c.current)) cleaned[0].current = true;
    app.updateSubstance(s.id, { ...s, titration: cleaned.length ? cleaned : null });
    setEditing(false);
  }

  return (
    <div style={{ padding: '4px 20px 0' }}>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {subs.map((x) => (
          <Chip key={x.id} active={s.id === x.id} onClick={() => { setSelId(x.id); setEditing(false); }}>{x.name}</Chip>
        ))}
      </div>

      {editing ? (
        <div style={{ marginTop: 18 }}>
          <Label>Titration · {s.name}</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {steps.map((st, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, border: '1px solid var(--line)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="vlf" style={{ ...titInput, flex: 1, minWidth: 0 }} placeholder="Label (e.g. Wk 1–4)" value={st.label}
                    onChange={(e) => setSteps((p) => p.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} />
                  <div style={{ position: 'relative', width: 86, flexShrink: 0 }}>
                    <input className="vlf" style={{ ...titInput, paddingRight: 28 }} type="number" inputMode="decimal" step="any" min="0" placeholder="0" value={st.mg}
                      onChange={(e) => setSteps((p) => p.map((x, idx) => (idx === i ? { ...x, mg: e.target.value } : x)))} />
                    <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', pointerEvents: 'none' }}>mg</span>
                  </div>
                  <button type="button" aria-label="Remove step" onClick={() => setSteps((p) => p.filter((_, idx) => idx !== i))}
                    style={{ flexShrink: 0, width: 32, height: 38, borderRadius: 9, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-faint)', fontSize: 16, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="vlf" style={{ ...titInput, flex: 1, minWidth: 0, color: st.start ? 'var(--text)' : 'var(--text-faint)' }} type="date" value={st.start}
                    onChange={(e) => setSteps((p) => p.map((x, idx) => (idx === i ? { ...x, start: e.target.value } : x)))} />
                  <button type="button" aria-label="Set as current step" onClick={() => setSteps((p) => p.map((x, idx) => ({ ...x, current: idx === i })))}
                    style={{ flexShrink: 0, padding: '0 12px', height: 38, borderRadius: 9, border: `1px solid ${st.current ? 'var(--amber)' : 'var(--line)'}`, background: st.current ? 'var(--amber)' : 'transparent', color: st.current ? 'var(--bg)' : 'var(--text-faint)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>NOW</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSteps((p) => [...p, { label: '', mg: '', current: false, start: '' }])}
            style={{ marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 10, border: '1px dashed var(--line-strong)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer' }}>+ Add step</button>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" onClick={() => setEditing(false)} style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button type="button" onClick={save} style={{ flex: 2, padding: '13px 0', borderRadius: 14, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save schedule</button>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', padding: '12px 0 0', lineHeight: 1.5 }}>
            Add a start date to a step and the dose advances automatically on that date — otherwise tap “NOW” to set the current step. Doses are in mg. Empty + save clears the schedule.
          </div>
        </div>
      ) : s.titration && s.titration.length ? (
        (() => {
          const titration = s.titration!;
          const max = Math.max(...titration.map((t) => t.mcg));
          const todayISO = isoDate(new Date());
          const dated = titration.some((t) => t.start);
          const currentIdx = dated
            ? titration.reduce((acc, t, i) => (t.start && t.start <= todayISO ? i : acc), -1)
            : titration.findIndex((t) => t.current);
          const current = titration[currentIdx];
          const nextStep = titration[currentIdx + 1];
          return (
            <>
              <div style={{ marginTop: 20, padding: 18, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Label>Titration ramp · {s.name}</Label>
                  <button onClick={startEdit} style={{ background: 'none', border: 'none', color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, marginTop: 18 }}>
                  {titration.map((t, i) => {
                    const h = 30 + (t.mcg / max) * 110;
                    const isCur = i === currentIdx;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: isCur ? 'var(--amber)' : 'var(--text-dim)' }}>{t.mcg / 1000}<span style={{ fontSize: 9 }}>mg</span></span>
                        <div style={{ width: '100%', height: h, borderRadius: '8px 8px 0 0', background: isCur ? 'linear-gradient(180deg, var(--amber), oklch(0.6 0.12 55))' : 'rgba(255,255,255,0.06)', border: isCur ? 'none' : '1px solid var(--line)', borderBottom: 'none', position: 'relative' }}>
                          {isCur && <div style={{ position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--amber)', whiteSpace: 'nowrap' }}>NOW</div>}
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-faint)', textAlign: 'center' }}>{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Label color="var(--text-dim)">Current step</Label>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--amber)' }}>{current ? `${current.label} · ${current.mcg / 1000} mg` : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Label color="var(--text-dim)">Next step</Label>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text)' }}>{nextStep ? `${nextStep.label} · ${nextStep.mcg / 1000} mg` : 'Maintenance'}</span>
                </div>
              </div>
            </>
          );
        })()
      ) : (
        <div style={{ marginTop: 20, padding: '28px 18px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--text)' }}>No titration schedule</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>{s.name} has no ramp yet.</div>
          <button onClick={startEdit} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--amber)', color: 'var(--bg)', border: 'none', borderRadius: 999, padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add titration schedule</button>
        </div>
      )}
    </div>
  );
}

export function CalculatorScreen({ app }: { app: AppApi }) {
  const [tab, setTab] = useState<'recon' | 'titration'>('recon');
  return (
    <div style={{ paddingTop: 56, paddingBottom: 96 }}>
      <div style={{ padding: '0 20px' }}>
        <Label>Tools</Label>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 32, color: 'var(--text)', margin: '8px 0 0' }}>Calculator</h1>
      </div>
      <div style={{ display: 'flex', gap: 4, margin: '18px 20px 0', padding: 4, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
        {([['recon', 'Reconstitution'], ['titration', 'Titration']] as const).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', border: 'none', background: tab === k ? 'var(--text)' : 'transparent', color: tab === k ? 'var(--bg)' : 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.02em', transition: 'all .15s' }}
          >
            {lbl}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        {tab === 'recon' ? <ReconTab substances={app.substances} /> : <TitrationTab app={app} />}
      </div>
    </div>
  );
}
