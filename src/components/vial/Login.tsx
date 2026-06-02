'use client';

import { useState, useEffect, type CSSProperties } from 'react';
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

export function Login() {
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);

  // An expired / invalid email link bounces back here with ?auth=expired (set by /auth/confirm).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('auth') === 'expired') {
      setLinkExpired(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // On success, the session listener in <VialApp> swaps to the app.
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo('Check your email for a link to set your password.');
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
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, color: 'var(--text)', margin: '16px 0 0', lineHeight: 1 }}>Vial</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, letterSpacing: '0.08em', color: 'var(--text-dim)', marginTop: 8 }}>
            Private peptide tracker
          </p>
        </div>

        {linkExpired && (
          <div style={{ padding: '11px 13px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
            That link is invalid or has expired. Request a new one below.
          </div>
        )}

        {mode === 'signin' ? (
          <form onSubmit={signIn} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'block' }}>
              <div style={{ marginBottom: 7 }}><Label>Email</Label></div>
              <input className="vlf" style={inputStyle} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <label style={{ display: 'block' }}>
              <div style={{ marginBottom: 7 }}><Label>Password</Label></div>
              <input className="vlf" style={inputStyle} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </label>

            {error && (
              <div style={{ padding: '10px 13px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13.5 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>

            <button type="button" onClick={() => { setMode('reset'); setError(null); setInfo(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              Set or reset password
            </button>
          </form>
        ) : (
          <form onSubmit={sendReset} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
              Enter your email and we’ll send a link to set your password.
            </p>
            <label style={{ display: 'block' }}>
              <div style={{ marginBottom: 7 }}><Label>Email</Label></div>
              <input className="vlf" style={inputStyle} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>

            {error && (
              <div style={{ padding: '10px 13px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13.5 }}>
                {error}
              </div>
            )}
            {info && (
              <div style={{ padding: '10px 13px', background: 'var(--amber-soft)', border: '1px solid var(--amber)', borderRadius: 12, color: 'var(--amber)', fontSize: 13.5 }}>
                {info}
              </div>
            )}

            <button type="submit" disabled={busy} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Sending…' : 'Email me a link'}
            </button>

            <button type="button" onClick={() => { setMode('signin'); setError(null); setInfo(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              ← Back to sign in
            </button>
          </form>
        )}

        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
          Invite only · ask the owner for an account.
        </p>
      </div>
    </div>
  );
}
