'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  recon, pickHue, newId, defaultExpiryISO, DAY_ORDER, type Substance,
} from '@/lib/substances';
import { Sheet, Label, Icon } from './ui';
import type { AppApi } from './types';

const ROUTES = ['Subcutaneous', 'Intramuscular', 'Intranasal', 'Oral', 'Topical', 'Other'];
type DoseUnit = 'mcg' | 'mg';

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

function Fld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ marginBottom: 7 }}>
        <Label>{label}</Label>
      </div>
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
  // Latched so the title/fields don't flip to "add" mid-dismiss animation.
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const isEdit = mode === 'edit';
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Peptide');
  const [klass, setKlass] = useState('');
  const [route, setRoute] = useState('Subcutaneous');
  const [vialMg, setVialMg] = useState('');
  const [bacMl, setBacMl] = useState('');
  const [amountLeft, setAmountLeft] = useState(''); // mg remaining (edit only)
  const [doseValue, setDoseValue] = useState('');
  const [doseUnit, setDoseUnit] = useState<DoseUnit>('mcg');
  const [days, setDays] = useState<string[]>([...DAY_ORDER]);
  const [time, setTime] = useState('08:00');
  const [price, setPrice] = useState('');
  const [expiry, setExpiry] = useState('');
  const [lot, setLot] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset / pre-fill each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setMode(editing ? 'edit' : 'add');
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setKlass(editing.sub || '');
      setRoute(editing.route);
      setVialMg(String(editing.vialMg));
      setBacMl(String(editing.bacMl));
      setAmountLeft(String(+(editing.remaining / 1000).toFixed(4)));
      setDoseUnit(editing.unit);
      setDoseValue(String(editing.unit === 'mg' ? editing.doseMcg / 1000 : editing.doseMcg));
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
      setAmountLeft('');
      setDoseValue('');
      setDoseUnit('mcg');
      setDays([...DAY_ORDER]);
      setTime('08:00');
      setPrice('');
      setExpiry(defaultExpiryISO());
      setLot('');
    }
  }, [open, editing]);

  const mg = Number(vialMg);
  const bac = Number(bacMl);
  const doseMcg = doseValue === '' ? 0 : doseUnit === 'mg' ? Number(doseValue) * 1000 : Number(doseValue);
  const preview = mg > 0 && bac > 0 && doseMcg > 0 ? recon(mg, bac, doseMcg) : null;

  // Live readout for the "amount left" field (edit mode).
  const leftMcg = isEdit && mg > 0
    ? Math.min(Math.max((amountLeft === '' ? 0 : Number(amountLeft)) * 1000, 0), mg * 1000)
    : 0;
  const leftDoses = doseMcg > 0 ? Math.floor(leftMcg / doseMcg) : 0;
  const leftPct = mg > 0 ? Math.round((leftMcg / (mg * 1000)) * 100) : 0;

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Give the peptide a name.');
    if (!(mg > 0)) return setError('Enter the amount in the vial (mg).');
    if (!(bac > 0)) return setError('Enter the bacteriostatic water (mL).');
    if (!(doseMcg > 0)) return setError('Enter a dose greater than zero.');

    const hour = parseInt((time || '08:00').split(':')[0] || '8', 10);
    const remaining = editing
      ? leftMcg // clamped above
      : mg * 1000; // new vial starts full

    const base = {
      name: name.trim(),
      category: category.trim() || 'Peptide',
      sub: klass.trim() || category.trim() || 'Peptide',
      route,
      vialMg: mg,
      bacMl: bac,
      doseMcg,
      unit: doseUnit,
      every: (days.length >= 7 ? 'day' : days.length > 0 ? 'wk-days' : 'day') as Substance['every'],
      days: DAY_ORDER.filter((d) => days.includes(d)),
      time: time || '08:00',
      period: (hour < 12 ? 'AM' : 'PM') as 'AM' | 'PM',
      remaining,
      expiry: expiry || defaultExpiryISO(),
      pricePerVial: price === '' ? 0 : Math.max(0, Number(price)),
      lot: lot.trim(),
    };

    if (editing) {
      app.updateSubstance(editing.id, {
        ...base,
        id: editing.id,
        hue: editing.hue,
        titration: editing.titration,
      });
    } else {
      app.addSubstance({
        ...base,
        id: newId(),
        hue: pickHue(app.substances.length),
        titration: null,
      });
    }
    onClose();
  }

  function remove() {
    if (!editing) return;
    if (!confirm(`Delete ${editing.name}? This removes the vial and its dose history.`)) return;
    app.deleteSubstance(editing.id);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Edit vial' : 'Add a vial'}>
      <form onSubmit={submit} style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Fld label="Peptide name">
          <input className="vlf" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BPC-157" />
        </Fld>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Category">
              <input className="vlf" style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Peptide" />
            </Fld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Route">
              <select className="vlf" style={inputStyle} value={route} onChange={(e) => setRoute(e.target.value)}>
                {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Fld>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="Amount in vial">
              <div style={{ position: 'relative' }}>
                <input className="vlf" style={inputStyle} type="number" inputMode="decimal" step="any" min="0" value={vialMg} onChange={(e) => setVialMg(e.target.value)} placeholder="5" />
                <span style={unitAdornment}>mg</span>
              </div>
            </Fld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Fld label="BAC water">
              <div style={{ position: 'relative' }}>
                <input className="vlf" style={inputStyle} type="number" inputMode="decimal" step="any" min="0" value={bacMl} onChange={(e) => setBacMl(e.target.value)} placeholder="2" />
                <span style={unitAdornment}>mL</span>
              </div>
            </Fld>
          </div>
        </div>

        <Fld label="Dose per administration">
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="vlf" style={{ ...inputStyle, flex: 1 }} type="number" inputMode="decimal" step="any" min="0" value={doseValue} onChange={(e) => setDoseValue(e.target.value)} placeholder="250" />
            <select className="vlf" style={{ ...inputStyle, width: 92 }} value={doseUnit} onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}>
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
            </select>
          </div>
        </Fld>

        {isEdit && (
          <Fld label="Amount left in vial">
            <div style={{ position: 'relative' }}>
              <input className="vlf" style={inputStyle} type="number" inputMode="decimal" step="any" min="0" value={amountLeft} onChange={(e) => setAmountLeft(e.target.value)} placeholder="0" />
              <span style={unitAdornment}>mg</span>
            </div>
            <div style={{ marginTop: 7, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)' }}>
              {leftDoses} doses · {leftPct}% full{mg > 0 && leftMcg >= mg * 1000 ? ' (full)' : ''}
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
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12, background: on ? 'var(--amber)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'var(--amber)' : 'var(--line)'}`, color: on ? 'var(--bg)' : 'var(--text-faint)' }}
                >
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
            <Fld label="Cost / vial">
              <div style={{ position: 'relative' }}>
                <span style={{ ...unitAdornment, left: 13, right: 'auto' }}>$</span>
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

        <button
          type="submit"
          style={{ width: '100%', padding: '15px 0', borderRadius: 16, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
        >
          {isEdit ? <Icon.check width={18} height={18} /> : <Icon.plus width={18} height={18} />} {isEdit ? 'Save changes' : 'Add to inventory'}
        </button>

        {isEdit && (
          <button
            type="button"
            onClick={remove}
            style={{ width: '100%', padding: '11px 0', borderRadius: 14, border: '1px solid var(--line)', background: 'transparent', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 12.5, cursor: 'pointer', marginBottom: 4 }}
          >
            Delete vial
          </button>
        )}
      </form>
    </Sheet>
  );
}

const unitAdornment: CSSProperties = {
  position: 'absolute',
  right: 13,
  top: '50%',
  transform: 'translateY(-50%)',
  fontFamily: 'var(--mono)',
  fontSize: 12,
  color: 'var(--text-faint)',
  pointerEvents: 'none',
};
