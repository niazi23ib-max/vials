'use client';

import { useEffect, useState } from 'react';
import {
  doseLabelOn, drawUnits, fillPct, substanceForm, isoDate,
  INJECTION_SITES, nextSite,
} from '@/lib/substances';
import { Sheet, Monogram, Label, Icon, VialFill, Syringe } from './ui';
import type { AppApi } from './types';

export function LogSheet({
  open,
  subId,
  app,
  onClose,
}: {
  open: boolean;
  subId: string | null;
  app: AppApi;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<string | null>(subId);
  const [site, setSite] = useState<string>('');
  const todayISO = isoDate(new Date());

  useEffect(() => {
    setChosen(subId);
  }, [subId, open]);

  const s = app.substances.find((x) => x.id === chosen);
  const isInject = s ? substanceForm(s) === 'inject' : false;
  const units = s ? drawUnits(s, todayISO) : 0;

  // Default the injection site to the next one in rotation.
  useEffect(() => {
    if (s && substanceForm(s) === 'inject') setSite(nextSite(app.lastSiteFor(s.id)));
    else setSite('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, open]);

  return (
    <Sheet open={open} onClose={onClose} title="Log a dose">
      <div style={{ padding: '16px 22px 0' }}>
        {!s ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {app.substances.map((x) => (
              <button
                key={x.id}
                onClick={() => setChosen(x.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
              >
                <Monogram name={x.name} hue={x.hue} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--text)' }}>{x.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{doseLabelOn(x, todayISO)} · {x.route}</div>
                </div>
                <Icon.arrow style={{ color: 'var(--text-faint)' }} />
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '4px 0 18px' }}>
              <VialFill pct={fillPct(s)} hue={s.hue} w={32} h={78} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--text)' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{doseLabelOn(s, todayISO)}{isInject && units > 0 ? ` · ${units.toFixed(1)} units` : ''}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>Today · {s.time} {s.period} · {s.route}</div>
              </div>
            </div>

            {isInject && units > 0 && (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Label color="var(--amber)">Draw to</Label>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--text)', lineHeight: 1 }}>{units.toFixed(1)}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>units</span>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}><Syringe units={units} /></div>
              </div>
            )}

            {isInject && (
              <div style={{ marginBottom: 16 }}>
                <Label>Injection site</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                  {INJECTION_SITES.map((st) => {
                    const on = site === st;
                    return (
                      <button key={st} type="button" onClick={() => setSite(st)}
                        style={{ padding: '8px 4px', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5, background: on ? 'var(--amber)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'var(--amber)' : 'var(--line)'}`, color: on ? 'var(--bg)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => { app.confirmLog(s.id, isInject ? site : undefined); onClose(); }}
              style={{ width: '100%', padding: '15px 0', borderRadius: 16, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}
            >
              <Icon.check /> Confirm dose
            </button>
            <button
              onClick={() => { app.skipLog(s.id); onClose(); }}
              style={{ width: '100%', padding: '13px 0', marginTop: 10, borderRadius: 16, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12.5, cursor: 'pointer' }}
            >
              Mark as skipped
            </button>
            {!subId && (
              <button
                onClick={() => setChosen(null)}
                style={{ width: '100%', padding: '10px 0', marginTop: 8, border: 'none', background: 'transparent', color: 'var(--text-faint)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}
              >
                ← Choose another
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
