'use client';

import { useState, type CSSProperties } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VialFill, Label } from './ui';

const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--line-strong)',
  borderRadius: 12,
  padding: '12px 14px',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: 16,
  outline: 'none',
};

/** Shown when a user arrives via an invite / password-reset link. */
export function SetPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return setError('Password must be at least 6 characters.');
    if (pw !== pw2) return setError('Those passwords don’t match.');
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    onDone();
  }

  return (
    <div
      style={{
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ margin: 'auto', width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
          <VialFill pct={0.66} hue={62} w={30} h={72} />
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--text)', margin: '16px 0 0', lineHeight: 1.05, textAlign: 'center' }}>Set your password</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
            Choose a password to finish setting up your account.
          </p>
        </div>

        <form onSubmit={submit} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block' }}>
            <div style={{ marginBottom: 7 }}><Label>New password</Label></div>
            <input className="vlf" style={inputStyle} type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
          </label>
          <label style={{ display: 'block' }}>
            <div style={{ marginBottom: 7 }}><Label>Confirm password</Label></div>
            <input className="vlf" style={inputStyle} type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
          </label>

          {error && (
            <div style={{ padding: '10px 13px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13.5 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Saving…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
