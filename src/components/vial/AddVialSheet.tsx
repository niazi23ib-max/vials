'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  recon, suggestReconOptions, pickHue, newId, defaultExpiryISO, DAY_ORDER, CATEGORIES, routesFor, formOf, isoDate, categoryHasStrength,
  addDaysISO, daysUntil, RECON_DEFAULT_BUD,
  type Substance, type ScheduleKind, type BlendComponent,
} from '@/lib/substances';
import { Sheet, Label, Icon } from './ui';
import type { AppApi } from './types';
import { LIBRARY, LIBRARY_KINDS, type LibraryItem, type LibraryKind } from '@/lib/library';

type DoseUnit = 'mcg' | 'mg' | 'IU';

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0, // let native date/time inputs shrink to the container instead of overflowing
  maxWidth: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--line-strong)',
  borderRadius: 12,
  padding: '11px 13px',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: 15,
  outline: 'none',
};

const adorn: CSSProperties = {
  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
  fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)', pointerEvents: 'none',
};

// Inputs with a right-side unit suffix need reserved padding so long values
// don't slide under the suffix glyph (mg / mL / caps).
const inputSuffixed: CSSProperties = { ...inputStyle, paddingRight: 44 };

function Fld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', minWidth: 0, maxWidth: '100%' }}>
      <div style={{ marginBottom: 7 }}><Label>{label}</Label></div>
      {children}
    </label>
  );
}

/** Short frequency label for a preset's suggested schedule. */
function presetFreqLabel(p: LibraryItem): string {
  const s = p.schedule;
  if (s.kind === 'interval') {
    const n = s.intervalDays ?? 1;
    return n === 1 ? 'Daily' : n === 2 ? 'Every other day' : `Every ${n}d`;
  }
  if (s.kind === 'cycle') return `${s.cycleOn ?? 0} on / ${s.cycleOff ?? 0} off`;
  const d = s.days ?? [];
  if (d.length >= 7) return 'Daily';
  if (d.length === 1) return 'Weekly';
  return `${d.length}×/wk`;
}

/** Collapsible "start from the library" picker — prefills the form. Add mode only. */
function LibraryPicker({ onPick }: { onPick: (p: LibraryItem) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'All' | LibraryKind>('All');
  const query = q.trim().toLowerCase();
  const matches = LIBRARY.filter((p) => {
    if (kind !== 'All' && p.kind !== kind) return false;
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      (p.aka ?? '').toLowerCase().includes(query) ||
      p.blurb.toLowerCase().includes(query) ||
      (p.group ?? '').toLowerCase().includes(query) ||
      p.kind.toLowerCase().includes(query)
    );
  });
  const chips: Array<'All' | LibraryKind> = ['All', ...LIBRARY_KINDS];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderRadius: 14, border: '1px dashed var(--line-strong)', background: 'var(--amber-soft)', color: 'var(--text)', cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: 'var(--amber)', flexShrink: 0 }}>
          <path d="M9 2l1.6 3.6L14.5 7l-3.9 1.4L9 12l-1.6-3.6L3.5 7l3.9-1.4L9 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        <span style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500 }}>Start from library</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {/* category filter chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', overscrollBehavior: 'contain', paddingBottom: 4, marginBottom: 8 }}>
            {chips.map((c) => {
              const active = kind === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setKind(c)}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: 11, border: `1px solid ${active ? 'var(--text)' : 'var(--line)'}`, background: active ? 'var(--text)' : 'transparent', color: active ? 'var(--bg)' : 'var(--text-dim)' }}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <input
            className="vlf" style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search the library…" autoFocus
          />
          <div style={{ maxHeight: 300, overflowY: 'auto', overscrollBehavior: 'contain', marginTop: 8 }}>
            {LIBRARY_KINDS.map((k) => {
              const items = matches.filter((m) => m.kind === k);
              if (!items.length) return null;
              return (
                <div key={k} style={{ marginTop: 6 }}>
                  <div style={{ padding: '6px 2px' }}><Label>{k}</Label></div>
                  {items.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => { onPick(p); setOpen(false); setQ(''); setKind('All'); }}
                      style={{ width: '100%', textAlign: 'left', display: 'block', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface-2)', cursor: 'pointer', marginBottom: 7 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--text)' }}>{p.name}</span>
                        {p.aka && <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-faint)' }}>{p.aka}</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.35 }}>{p.blurb}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-faint)', marginTop: 5 }}>
                        {p.dose > 0 ? `${p.dose} ${p.doseUnit} · ` : ''}{presetFreqLabel(p)}{p.halfLife ? ` · t½ ${p.halfLife}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
            {matches.length === 0 && (
              <div style={{ padding: '14px 4px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-faint)' }}>No matches{q ? ` for “${q}”` : ''}.</div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-faint)', marginTop: 4, lineHeight: 1.5 }}>
            Typical starting points — always adjust to your own protocol.
          </div>
        </div>
      )}
    </div>
  );
}

export function AddVialSheet({
  open,
  onClose,
  app,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  app: AppApi;
  editing?: Substance;
}) {
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const isEdit = mode === 'edit';

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Peptide');
  const [klass, setKlass] = useState('');
  const [route, setRoute] = useState('Subcutaneous');
  const [vialMg, setVialMg] = useState('');
  const [bacMl, setBacMl] = useState('');
  const [components, setComponents] = useState<{ name: string; mg: string }[]>([]); // blend actives (mg as text while editing)
  const [count, setCount] = useState(''); // capsules in container (oral)
  const [capsPerDose, setCapsPerDose] = useState('1'); // capsules per dose (oral)
  const [doseValue, setDoseValue] = useState('');
  const [doseUnit, setDoseUnit] = useState<DoseUnit>('mcg');
  const [amountLeft, setAmountLeft] = useState(''); // edit: mg (inject/dose) or capsules (oral)
  const [days, setDays] = useState<string[]>([...DAY_ORDER]);
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('weekly');
  const [intervalDays, setIntervalDays] = useState('2');
  const [cycleOn, setCycleOn] = useState('5');
  const [cycleOff, setCycleOff] = useState('2');
  const [startDate, setStartDate] = useState(''); // anchor + course start (interval/cycle)
  const [courseWeeks, setCourseWeeks] = useState(''); // optional course length
  const [time, setTime] = useState('08:00');
  const [extraTimes, setExtraTimes] = useState<string[]>([]); // additional doses/day beyond `time`
  const [price, setPrice] = useState('');
  const [expiry, setExpiry] = useState('');
  const [lot, setLot] = useState('');
  const [reconAt, setReconAt] = useState(''); // inject: date mixed
  const [budDaysStr, setBudDaysStr] = useState(''); // inject: shelf-life days
  const [remindersOn, setRemindersOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = formOf(route);
  const noStrength = form === 'oral' && !categoryHasStrength(category); // multivitamins: no single strength

  // Reset / pre-fill each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setMode(editing ? 'edit' : 'add');
    if (editing) {
      const f = formOf(editing.route);
      setName(editing.name);
      setCategory(CATEGORIES.includes(editing.category as (typeof CATEGORIES)[number]) ? editing.category : 'Other');
      setKlass(editing.sub || '');
      setRoute(editing.route);
      setVialMg(editing.vialMg ? String(editing.vialMg) : '');
      setBacMl(editing.bacMl ? String(editing.bacMl) : '');
      setComponents(editing.components?.length ? editing.components.map((c) => ({ name: c.name, mg: String(c.mg) })) : []);
      setCount(editing.count ? String(editing.count) : '');
      setCapsPerDose(String(editing.capsPerDose || 1));
      setDoseUnit(editing.unit);
      setDoseValue(
        f === 'oral'
          ? String(editing.doseMcg || '')
          : String(editing.unit === 'mg' ? editing.doseMcg / 1000 : editing.doseMcg),
      );
      setAmountLeft(String(f === 'oral' ? editing.remaining : +(editing.remaining / 1000).toFixed(4)));
      setDays(editing.days.length ? [...editing.days] : []);
      setScheduleKind(editing.scheduleKind || 'weekly');
      setIntervalDays(String(editing.intervalDays || 2));
      setCycleOn(String(editing.cycleOn || 5));
      setCycleOff(String(editing.cycleOff || 2));
      setStartDate(editing.anchor || editing.courseStart || editing.created || isoDate(new Date()));
      setCourseWeeks(editing.courseWeeks ? String(editing.courseWeeks) : '');
      {
        const ts0 = editing.times && editing.times.length ? [...editing.times].sort() : (editing.time ? [editing.time] : ['08:00']);
        setTime(ts0[0] || '08:00');
        setExtraTimes(ts0.slice(1));
      }
      setPrice(editing.pricePerVial ? String(editing.pricePerVial) : '');
      setExpiry(editing.expiry || defaultExpiryISO());
      setLot(editing.lot || '');
      setReconAt(editing.reconstitutedAt || '');
      setBudDaysStr(editing.budDays ? String(editing.budDays) : '');
      setRemindersOn(editing.remindersEnabled !== false);
    } else {
      setName('');
      setCategory('Peptide');
      setKlass('');
      setRoute('Subcutaneous');
      setVialMg('');
      setBacMl('');
      setComponents([]);
      setCount('');
      setCapsPerDose('1');
      setDoseValue('');
      setDoseUnit('mcg');
      setAmountLeft('');
      setDays([...DAY_ORDER]);
      setScheduleKind('weekly');
      setIntervalDays('2');
      setCycleOn('5');
      setCycleOff('2');
      setStartDate(isoDate(new Date()));
      setCourseWeeks('');
      setTime('08:00');
      setExtraTimes([]);
      setPrice('');
      setExpiry(defaultExpiryISO());
      setLot('');
      setReconAt('');
      setBudDaysStr('');
      setRemindersOn(true);
    }
  }, [open, editing]);

  // IU is oral-only; coerce when switching to an injectable/measured form.
  useEffect(() => {
    if (form !== 'oral' && doseUnit === 'IU') setDoseUnit('mcg');
  }, [form, doseUnit]);

  function pickCategory(cat: string) {
    setCategory(cat);
    setRoute(routesFor(cat)[0]);
  }
  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }
  // Blend component editor.
  const updateComp = (i: number, patch: Partial<{ name: string; mg: string }>) =>
    setComponents((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addComp = () => setComponents((prev) => [...prev, { name: '', mg: '' }]);
  const removeComp = (i: number) => setComponents((prev) => prev.filter((_, j) => j !== i));
  const makeBlend = () => setComponents([{ name: name.trim(), mg: vialMg || '5' }, { name: '', mg: '5' }]);

  // Prefill the whole form from a library preset (all values stay editable).
  function applyPreset(p: LibraryItem) {
    const f = formOf(p.route);
    setName(p.name);
    setCategory(p.category);
    setRoute(p.route);
    setKlass(p.aka || '');
    if (f === 'oral') {
      setCount(String(p.count ?? 30));
      setCapsPerDose('1');
      setVialMg('');
      setBacMl('');
      setComponents([]);
    } else {
      setVialMg(p.vialMg ? String(p.vialMg) : '');
      setBacMl(f === 'inject' ? String(p.bacMl ?? 2) : '');
      setCount('');
      setCapsPerDose('1'); // reset so it can't leak from a prior oral pick
      setComponents(p.components?.length ? p.components.map((c) => ({ name: c.name, mg: String(c.mg) })) : []);
    }
    setDoseValue(String(p.dose));
    setDoseUnit(p.doseUnit);
    setScheduleKind(p.schedule.kind);
    if (p.schedule.kind === 'weekly') setDays(p.schedule.days?.length ? [...p.schedule.days] : [...DAY_ORDER]);
    if (p.schedule.kind === 'interval') setIntervalDays(String(p.schedule.intervalDays ?? 2));
    if (p.schedule.kind === 'cycle') { setCycleOn(String(p.schedule.cycleOn ?? 5)); setCycleOff(String(p.schedule.cycleOff ?? 2)); }
    setTime(p.time ?? '08:00'); // reset so a timed pick (e.g. Melatonin 22:00) doesn't leave a stale time
    setExtraTimes([]);
    setCourseWeeks(p.courseWeeks ? String(p.courseWeeks) : '');
    setError(null);
  }

  const hasComp = components.length > 0;
  const compMg = components.reduce((a, c) => a + (Number(c.mg) || 0), 0);
  const mg = hasComp ? compMg : Number(vialMg); // a blend's vial mg is the sum of its components
  const bac = Number(bacMl);
  const cnt = Number(count);
  const perDose = Number(capsPerDose) || 1;
  const doseRaw = doseValue === '' ? 0 : Number(doseValue);
  const doseMcgInject = doseUnit === 'mg' ? doseRaw * 1000 : doseRaw; // mcg (inject/dose)
  const preview = form === 'inject' && mg > 0 && bac > 0 && doseMcgInject > 0 ? recon(mg, bac, doseMcgInject) : null;
  // Suggest the BAC volume that makes each dose land on a clean syringe mark.
  const bacSuggestion = form === 'inject' && mg > 0 && doseMcgInject > 0 ? (suggestReconOptions(mg, doseMcgInject)[0] ?? null) : null;

  // Reconstitution shelf-life preview (inject form).
  const budN = Number(budDaysStr) > 0 ? Math.floor(Number(budDaysStr)) : RECON_DEFAULT_BUD;
  const reconBudISO = form === 'inject' && reconAt ? addDaysISO(reconAt, budN) : '';
  const reconLeft = reconBudISO ? daysUntil(reconBudISO) : null;

  // Amount-left readout (edit mode).
  const leftRaw = amountLeft === '' ? 0 : Number(amountLeft);
  const leftRemaining = form === 'oral'
    ? Math.min(Math.max(leftRaw, 0), cnt || Infinity)
    : Math.min(Math.max(leftRaw * 1000, 0), mg > 0 ? mg * 1000 : Infinity);
  const leftDoses = form === 'oral'
    ? Math.floor(leftRemaining / perDose)
    : doseMcgInject > 0 ? Math.floor(leftRemaining / doseMcgInject) : 0;
  const leftPct = form === 'oral'
    ? (cnt > 0 ? Math.round((leftRemaining / cnt) * 100) : 0)
    : (mg > 0 ? Math.round((leftRemaining / (mg * 1000)) * 100) : 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Give it a name.');
    if (scheduleKind === 'weekly' && days.length === 0) return setError('Pick at least one dosing day.');
    if (scheduleKind === 'interval' && !(Number(intervalDays) >= 1)) return setError('Enter how many days between doses.');
    if (scheduleKind === 'cycle' && !(Number(cycleOn) >= 1)) return setError('Enter at least 1 day “on”.');
    if (form === 'oral') {
      if (!(cnt > 0)) return setError('Enter how many capsules/tablets are in the container.');
      if (!noStrength && !(doseRaw > 0)) return setError('Enter the strength per capsule.');
    } else {
      if (!(mg > 0)) return setError(form === 'inject' ? 'Enter the amount in the vial (mg).' : 'Enter the amount in the container (mg).');
      if (form === 'inject' && !(bac > 0)) return setError('Enter the bacteriostatic water (mL).');
      if (!(doseMcgInject > 0)) return setError('Enter a dose greater than zero.');
    }

    const hour = parseInt((time || '08:00').split(':')[0] || '8', 10);
    const ivl = Math.max(1, Math.floor(Number(intervalDays) || 1));
    const con = Math.max(1, Math.floor(Number(cycleOn) || 1));
    const coff = Math.max(0, Math.floor(Number(cycleOff) || 0));
    const cw = Math.max(0, Math.floor(Number(courseWeeks) || 0));
    const anchorISO = startDate || isoDate(new Date());
    const selDays = DAY_ORDER.filter((d) => days.includes(d));
    const common = {
      name: name.trim(),
      category,
      sub: klass.trim() || category,
      route,
      every: (selDays.length >= 7 ? 'day' : selDays.length > 0 ? 'wk-days' : 'day') as Substance['every'],
      scheduleKind,
      days: scheduleKind === 'weekly' ? selDays : [],
      intervalDays: scheduleKind === 'interval' ? ivl : 0,
      cycleOn: scheduleKind === 'cycle' ? con : 0,
      cycleOff: scheduleKind === 'cycle' ? coff : 0,
      anchor: scheduleKind === 'weekly' ? '' : anchorISO,
      courseStart: cw > 0 ? (scheduleKind === 'weekly' ? (editing?.courseStart || anchorISO) : anchorISO) : '',
      courseWeeks: cw,
      time: time || '08:00',
      period: (hour < 12 ? 'AM' : 'PM') as 'AM' | 'PM',
      times: [...new Set([time, ...extraTimes].map((t) => t.trim()).filter(Boolean))].sort(),
      expiry: expiry || defaultExpiryISO(),
      pricePerVial: price === '' ? 0 : Math.max(0, Number(price)),
      lot: lot.trim(),
      reconstitutedAt: form === 'inject' ? reconAt : '',
      budDays: form === 'inject' && Number(budDaysStr) > 0 ? Math.floor(Number(budDaysStr)) : 0,
      remindersEnabled: remindersOn,
      titration: editing ? editing.titration : null,
      hue: editing ? editing.hue : pickHue(app.substances.length),
      created: editing ? editing.created : '', // server stamps created_at; refreshed on reload
    };

    // A blend needs ≥2 actives with mg; otherwise it's just a single substance.
    const cleanComponents: BlendComponent[] = components
      .map((c) => ({ name: c.name.trim(), mg: Math.max(0, Number(c.mg) || 0) }))
      .filter((c) => c.mg > 0);
    const blendComponents = cleanComponents.length >= 2 ? cleanComponents : null;

    let fields: Omit<Substance, 'id'>;
    if (form === 'oral') {
      fields = {
        ...common,
        vialMg: 0, bacMl: 0,
        count: cnt,
        capsPerDose: perDose,
        doseMcg: noStrength ? 0 : doseRaw, // strength per cap, in `unit` (0 = no single strength)
        unit: doseUnit,
        remaining: editing ? leftRemaining : cnt,
        components: null,
      };
    } else {
      fields = {
        ...common,
        vialMg: mg,
        bacMl: form === 'inject' ? bac : 0,
        count: 0, capsPerDose: 0,
        doseMcg: doseMcgInject,
        unit: (doseUnit === 'IU' ? 'mcg' : doseUnit) as 'mcg' | 'mg',
        remaining: editing ? leftRemaining : mg * 1000,
        components: blendComponents,
      };
    }

    if (editing) app.updateSubstance(editing.id, { ...fields, id: editing.id });
    else app.addSubstance({ ...fields, id: newId() });
    onClose();
  }

  function remove() {
    if (!editing) return;
    if (!confirm(`Delete ${editing.name}? This removes it and its dose history.`)) return;
    app.deleteSubstance(editing.id);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Edit item' : 'Add an item'}>
      <form onSubmit={submit} style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!isEdit && <LibraryPicker onPick={applyPreset} />}
        <Fld label="Name">
          <input className="vlf" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BPC-157, Vitamin D3" />
        </Fld>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Category">
              <select className="vlf" style={inputStyle} value={category} onChange={(e) => pickCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Fld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Route">
              <select className="vlf" style={inputStyle} value={route} onChange={(e) => setRoute(e.target.value)}>
                {routesFor(category).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Fld>
          </div>
        </div>

        {/* Container / strength — varies by form */}
        {form === 'oral' ? (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Fld label="In container">
                  <div style={{ position: 'relative' }}>
                    <input className="vlf" style={inputSuffixed} type="number" inputMode="numeric" step="1" min="0" value={count} onChange={(e) => setCount(e.target.value)} placeholder="60" />
                    <span style={adorn}>caps</span>
                  </div>
                </Fld>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Fld label="Per dose">
                  <div style={{ position: 'relative' }}>
                    <input className="vlf" style={inputSuffixed} type="number" inputMode="numeric" step="1" min="1" value={capsPerDose} onChange={(e) => setCapsPerDose(e.target.value)} placeholder="1" />
                    <span style={adorn}>caps</span>
                  </div>
                </Fld>
              </div>
            </div>
            {noStrength ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5 }}>
                Multivitamins have many ingredients — no single strength needed.
              </div>
            ) : (
              <Fld label="Strength per capsule">
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="vlf" style={{ ...inputStyle, flex: 1, minWidth: 0 }} type="number" inputMode="decimal" step="any" min="0" value={doseValue} onChange={(e) => setDoseValue(e.target.value)} placeholder="500" />
                  <select className="vlf" style={{ ...inputStyle, width: 92 }} value={doseUnit} onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}>
                    <option value="mcg">mcg</option>
                    <option value="mg">mg</option>
                    <option value="IU">IU</option>
                  </select>
                </div>
              </Fld>
            )}
          </>
        ) : (
          <>
            {hasComp ? (
              <>
                <Fld label="Blend components">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {components.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input className="vlf" style={{ ...inputStyle, flex: 1, minWidth: 0 }} type="text" value={c.name} onChange={(e) => updateComp(i, { name: e.target.value })} placeholder={`Active ${i + 1}`} />
                        <div style={{ position: 'relative', width: 92, flexShrink: 0 }}>
                          <input className="vlf" style={inputSuffixed} type="number" inputMode="decimal" step="any" min="0" value={c.mg} onChange={(e) => updateComp(i, { mg: e.target.value })} placeholder="5" />
                          <span style={adorn}>mg</span>
                        </div>
                        <button type="button" onClick={() => removeComp(i)} aria-label="Remove component"
                          style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
                    <button type="button" onClick={addComp}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>＋ add active</button>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>Vial total {compMg || 0} mg</span>
                  </div>
                </Fld>
                {form === 'inject' && (
                  <Fld label="BAC water">
                    <div style={{ position: 'relative' }}>
                      <input className="vlf" style={inputSuffixed} type="number" inputMode="decimal" step="any" min="0" value={bacMl} onChange={(e) => setBacMl(e.target.value)} placeholder="2" />
                      <span style={adorn}>mL</span>
                    </div>
                    {bacSuggestion && String(bacSuggestion.bacMl) !== bacMl && (
                      <button type="button" onClick={() => setBacMl(String(bacSuggestion.bacMl))}
                        style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, border: '1px solid var(--amber)', background: 'var(--amber-soft)', color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        ✦ {bacSuggestion.bacMl} mL → {bacSuggestion.round ? bacSuggestion.units.toFixed(0) : bacSuggestion.units.toFixed(1)}u
                      </button>
                    )}
                  </Fld>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Fld label={form === 'inject' ? 'Amount in vial' : 'Amount in container'}>
                      <div style={{ position: 'relative' }}>
                        <input className="vlf" style={inputSuffixed} type="number" inputMode="decimal" step="any" min="0" value={vialMg} onChange={(e) => setVialMg(e.target.value)} placeholder="5" />
                        <span style={adorn}>mg</span>
                      </div>
                    </Fld>
                  </div>
                  {form === 'inject' && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Fld label="BAC water">
                        <div style={{ position: 'relative' }}>
                          <input className="vlf" style={inputSuffixed} type="number" inputMode="decimal" step="any" min="0" value={bacMl} onChange={(e) => setBacMl(e.target.value)} placeholder="2" />
                          <span style={adorn}>mL</span>
                        </div>
                        {bacSuggestion && String(bacSuggestion.bacMl) !== bacMl && (
                          <button type="button" onClick={() => setBacMl(String(bacSuggestion.bacMl))}
                            style={{ marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, border: '1px solid var(--amber)', background: 'var(--amber-soft)', color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            ✦ {bacSuggestion.bacMl} mL → {bacSuggestion.round ? bacSuggestion.units.toFixed(0) : bacSuggestion.units.toFixed(1)}u
                          </button>
                        )}
                      </Fld>
                    </div>
                  )}
                </div>
                <button type="button" onClick={makeBlend}
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>＋ Make this a blend</button>
              </>
            )}
            <Fld label="Dose per administration">
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="vlf" style={{ ...inputStyle, flex: 1, minWidth: 0 }} type="number" inputMode="decimal" step="any" min="0" value={doseValue} onChange={(e) => setDoseValue(e.target.value)} placeholder="250" />
                <select className="vlf" style={{ ...inputStyle, width: 92 }} value={doseUnit} onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}>
                  <option value="mcg">mcg</option>
                  <option value="mg">mg</option>
                </select>
              </div>
            </Fld>
          </>
        )}

        {isEdit && (
          <Fld label="Amount left">
            <div style={{ position: 'relative' }}>
              <input className="vlf" style={inputSuffixed} type="number" inputMode="decimal" step="any" min="0" value={amountLeft} onChange={(e) => setAmountLeft(e.target.value)} placeholder="0" />
              <span style={adorn}>{form === 'oral' ? 'caps' : 'mg'}</span>
            </div>
            <div style={{ marginTop: 7, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>
              {leftDoses} doses · {leftPct}% full
            </div>
          </Fld>
        )}

        {preview && (
          <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 14, fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Draw <span style={{ color: 'var(--amber)' }}>{preview.units.toFixed(1)} units</span>
            {'  ·  '}{preview.dosesPerVial.toFixed(1)} doses / vial
            {'  ·  '}{(preview.concMcgPerMl / 1000).toFixed(2)} mg/mL
          </div>
        )}

        <Fld label="Schedule">
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 12 }}>
            {([['weekly', 'Weekly'], ['interval', 'Interval'], ['cycle', 'Cycle']] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setScheduleKind(k)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer', border: 'none', background: scheduleKind === k ? 'var(--text)' : 'transparent', color: scheduleKind === k ? 'var(--bg)' : 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                {lbl}
              </button>
            ))}
          </div>

          {scheduleKind === 'weekly' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {DAY_ORDER.map((d) => {
                const on = days.includes(d);
                return (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, background: on ? 'var(--amber)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'var(--amber)' : 'var(--line)'}`, color: on ? 'var(--bg)' : 'var(--text-faint)' }}>
                    {d[0]}
                  </button>
                );
              })}
            </div>
          )}

          {scheduleKind === 'interval' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)' }}>Every</span>
              <input className="vlf" style={{ ...inputStyle, width: 76, textAlign: 'center' }} type="number" inputMode="numeric" step="1" min="1" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)' }}>days</span>
            </div>
          )}

          {scheduleKind === 'cycle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input className="vlf" style={{ ...inputStyle, width: 64, textAlign: 'center' }} type="number" inputMode="numeric" step="1" min="1" value={cycleOn} onChange={(e) => setCycleOn(e.target.value)} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-dim)' }}>on ·</span>
              <input className="vlf" style={{ ...inputStyle, width: 64, textAlign: 'center' }} type="number" inputMode="numeric" step="1" min="0" value={cycleOff} onChange={(e) => setCycleOff(e.target.value)} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--text-dim)' }}>off</span>
            </div>
          )}
        </Fld>

        {scheduleKind === 'weekly' ? (
          <Fld label="Course length (optional)">
            <div style={{ position: 'relative' }}>
              <input className="vlf" style={inputSuffixed} type="number" inputMode="numeric" step="1" min="0" value={courseWeeks} onChange={(e) => setCourseWeeks(e.target.value)} placeholder="Ongoing" />
              <span style={adorn}>wks</span>
            </div>
          </Fld>
        ) : (
          <>
            {/* Native date picker gets its own row — on iOS it renders wider than a half column and would overlap a neighbor. */}
            <Fld label="Start date">
              <input className="vlf" style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Fld>
            <Fld label="Course length (optional)">
              <div style={{ position: 'relative' }}>
                <input className="vlf" style={inputSuffixed} type="number" inputMode="numeric" step="1" min="0" value={courseWeeks} onChange={(e) => setCourseWeeks(e.target.value)} placeholder="Ongoing" />
                <span style={adorn}>wks</span>
              </div>
            </Fld>
          </>
        )}

        {/* Native time/date pickers each get a full-width row — on iOS they render
            wider than a half column and overlap the field beside them. */}
        <Fld label={extraTimes.length ? 'Times (one dose at each)' : 'Time'}>
          <input className="vlf" style={inputStyle} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          {extraTimes.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <input className="vlf" style={{ ...inputStyle, flex: 1, minWidth: 0 }} type="time" value={t}
                onChange={(e) => setExtraTimes((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))} />
              <button type="button" aria-label="Remove time" onClick={() => setExtraTimes((p) => p.filter((_, idx) => idx !== i))}
                style={{ flexShrink: 0, width: 38, height: 40, borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-faint)', fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => setExtraTimes((p) => [...p, '20:00'])}
            style={{ marginTop: 8, width: '100%', padding: '9px 0', borderRadius: 10, border: '1px dashed var(--line-strong)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer' }}>+ Add another dose time</button>
        </Fld>

        {form === 'inject' && (
          <>
            <Fld label="Reconstituted on (optional)">
              <input className="vlf" style={inputStyle} type="date" value={reconAt} onChange={(e) => setReconAt(e.target.value)} />
            </Fld>
            <Fld label="Use within">
              <div style={{ position: 'relative' }}>
                <input className="vlf" style={inputSuffixed} type="number" inputMode="numeric" step="1" min="1" value={budDaysStr} onChange={(e) => setBudDaysStr(e.target.value)} placeholder={String(RECON_DEFAULT_BUD)} />
                <span style={adorn}>days</span>
              </div>
              {reconBudISO && reconLeft !== null && (
                <div style={{ marginTop: 7, fontFamily: 'var(--mono)', fontSize: 11.5, color: reconLeft < 0 ? 'var(--red)' : reconLeft <= 7 ? 'var(--amber)' : 'var(--text-dim)' }}>
                  {reconLeft < 0 ? `Past use-by · ${-reconLeft}d ago` : `~${reconLeft} days of shelf life left`} · use by {new Date(reconBudISO + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </Fld>
          </>
        )}

        <Fld label="Expiry date">
          <input className="vlf" style={inputStyle} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </Fld>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Cost / container">
              <div style={{ position: 'relative' }}>
                <span style={{ ...adorn, left: 13, right: 'auto' }}>$</span>
                <input className="vlf" style={{ ...inputStyle, paddingLeft: 26 }} type="number" inputMode="decimal" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
              </div>
            </Fld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Lot (optional)">
              <input className="vlf" style={inputStyle} value={lot} onChange={(e) => setLot(e.target.value)} placeholder="—" />
            </Fld>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRemindersOn((v) => !v)}
          aria-pressed={remindersOn}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line-strong)', background: 'var(--surface-2)', cursor: 'pointer' }}
        >
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--text)' }}>Dose reminders</span>
            <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>Push a nudge at each dose time</span>
          </span>
          <span style={{ flexShrink: 0, width: 44, height: 26, borderRadius: 99, background: remindersOn ? 'var(--amber)' : 'var(--line-strong)', position: 'relative', transition: 'background .2s' }}>
            <span style={{ position: 'absolute', top: 3, left: remindersOn ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: 'var(--text)', transition: 'left .2s' }} />
          </span>
        </button>

        {error && (
          <div style={{ padding: '10px 13px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13.5 }}>
            {error}
          </div>
        )}

        <button type="submit" style={{ width: '100%', padding: '15px 0', borderRadius: 16, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
          {isEdit ? <Icon.check width={18} height={18} /> : <Icon.plus width={18} height={18} />} {isEdit ? 'Save changes' : 'Add to inventory'}
        </button>

        {isEdit && (
          <button type="button" onClick={remove} style={{ width: '100%', padding: '11px 0', borderRadius: 14, border: '1px solid var(--line)', background: 'transparent', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 12.5, cursor: 'pointer', marginBottom: 4 }}>
            Delete item
          </button>
        )}
      </form>
    </Sheet>
  );
}
