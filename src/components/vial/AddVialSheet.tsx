'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  recon, pickHue, newId, defaultExpiryISO, DAY_ORDER, CATEGORIES, routesFor, formOf,
  type Substance,
} from '@/lib/substances';
import { Sheet, Label, Icon } from './ui';
import type { AppApi } from './types';

type DoseUnit = 'mcg' | 'mg' | 'IU';

const inputStyle: CSSProperties = {
  width: '100%',
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

function Fld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ marginBottom: 7 }}><Label>{label}</Label></div>
      {children}
    </label>
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
  const [count, setCount] = useState(''); // capsules in container (oral)
  const [capsPerDose, setCapsPerDose] = useState('1'); // capsules per dose (oral)
  const [doseValue, setDoseValue] = useState('');
  const [doseUnit, setDoseUnit] = useState<DoseUnit>('mcg');
  const [amountLeft, setAmountLeft] = useState(''); // edit: mg (inject/dose) or capsules (oral)
  const [days, setDays] = useState<string[]>([...DAY_ORDER]);
  const [time, setTime] = useState('08:00');
  const [price, setPrice] = useState('');
  const [expiry, setExpiry] = useState('');
  const [lot, setLot] = useState('');
  const [error, setError] = useState<string | null>(null);

  const form = formOf(route);

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
      setTime(editing.time || '08:00');
      setPrice(editing.pricePerVial ? String(editing.pricePerVial) : '');
      setExpiry(editing.expiry || defaultExpiryISO());
      setLot(editing.lot || '');
    } else {
      setName('');
      setCategory('Peptide');
      setKlass('');
      setRoute('Subcutaneous');
      setVialMg('');
      setBacMl('');
      setCount('');
      setCapsPerDose('1');
      setDoseValue('');
      setDoseUnit('mcg');
      setAmountLeft('');
      setDays([...DAY_ORDER]);
      setTime('08:00');
      setPrice('');
      setExpiry(defaultExpiryISO());
      setLot('');
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

  const mg = Number(vialMg);
  const bac = Number(bacMl);
  const cnt = Number(count);
  const perDose = Number(capsPerDose) || 1;
  const doseRaw = doseValue === '' ? 0 : Number(doseValue);
  const doseMcgInject = doseUnit === 'mg' ? doseRaw * 1000 : doseRaw; // mcg (inject/dose)
  const preview = form === 'inject' && mg > 0 && bac > 0 && doseMcgInject > 0 ? recon(mg, bac, doseMcgInject) : null;

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
    if (form === 'oral') {
      if (!(cnt > 0)) return setError('Enter how many capsules/tablets are in the container.');
      if (!(doseRaw > 0)) return setError('Enter the strength per capsule.');
    } else {
      if (!(mg > 0)) return setError(form === 'inject' ? 'Enter the amount in the vial (mg).' : 'Enter the amount in the container (mg).');
      if (form === 'inject' && !(bac > 0)) return setError('Enter the bacteriostatic water (mL).');
      if (!(doseMcgInject > 0)) return setError('Enter a dose greater than zero.');
    }

    const hour = parseInt((time || '08:00').split(':')[0] || '8', 10);
    const common = {
      name: name.trim(),
      category,
      sub: klass.trim() || category,
      route,
      every: (days.length >= 7 ? 'day' : days.length > 0 ? 'wk-days' : 'day') as Substance['every'],
      days: DAY_ORDER.filter((d) => days.includes(d)),
      time: time || '08:00',
      period: (hour < 12 ? 'AM' : 'PM') as 'AM' | 'PM',
      expiry: expiry || defaultExpiryISO(),
      pricePerVial: price === '' ? 0 : Math.max(0, Number(price)),
      lot: lot.trim(),
      titration: editing ? editing.titration : null,
      hue: editing ? editing.hue : pickHue(app.substances.length),
      created: editing ? editing.created : '', // server stamps created_at; refreshed on reload
    };

    let fields: Omit<Substance, 'id'>;
    if (form === 'oral') {
      fields = {
        ...common,
        vialMg: 0, bacMl: 0,
        count: cnt,
        capsPerDose: perDose,
        doseMcg: doseRaw, // strength per cap, in `unit`
        unit: doseUnit,
        remaining: editing ? leftRemaining : cnt,
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
                    <input className="vlf" style={inputStyle} type="number" inputMode="numeric" step="1" min="0" value={count} onChange={(e) => setCount(e.target.value)} placeholder="60" />
                    <span style={adorn}>caps</span>
                  </div>
                </Fld>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Fld label="Per dose">
                  <div style={{ position: 'relative' }}>
                    <input className="vlf" style={inputStyle} type="number" inputMode="numeric" step="1" min="1" value={capsPerDose} onChange={(e) => setCapsPerDose(e.target.value)} placeholder="1" />
                    <span style={adorn}>caps</span>
                  </div>
                </Fld>
              </div>
            </div>
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
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Fld label={form === 'inject' ? 'Amount in vial' : 'Amount in container'}>
                  <div style={{ position: 'relative' }}>
                    <input className="vlf" style={inputStyle} type="number" inputMode="decimal" step="any" min="0" value={vialMg} onChange={(e) => setVialMg(e.target.value)} placeholder="5" />
                    <span style={adorn}>mg</span>
                  </div>
                </Fld>
              </div>
              {form === 'inject' && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Fld label="BAC water">
                    <div style={{ position: 'relative' }}>
                      <input className="vlf" style={inputStyle} type="number" inputMode="decimal" step="any" min="0" value={bacMl} onChange={(e) => setBacMl(e.target.value)} placeholder="2" />
                      <span style={adorn}>mL</span>
                    </div>
                  </Fld>
                </div>
              )}
            </div>
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
              <input className="vlf" style={inputStyle} type="number" inputMode="decimal" step="any" min="0" value={amountLeft} onChange={(e) => setAmountLeft(e.target.value)} placeholder="0" />
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

        <Fld label="Dosing days">
          <div style={{ display: 'flex', gap: 6 }}>
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
        </Fld>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Time">
              <input className="vlf" style={inputStyle} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Fld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Cost / container">
              <div style={{ position: 'relative' }}>
                <span style={{ ...adorn, left: 13, right: 'auto' }}>$</span>
                <input className="vlf" style={{ ...inputStyle, paddingLeft: 26 }} type="number" inputMode="decimal" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
              </div>
            </Fld>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Expires / BUD">
              <input className="vlf" style={inputStyle} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </Fld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Lot (optional)">
              <input className="vlf" style={inputStyle} value={lot} onChange={(e) => setLot(e.target.value)} placeholder="—" />
            </Fld>
          </div>
        </div>

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
