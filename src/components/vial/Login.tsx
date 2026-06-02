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

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // On success, the session listener in <VialApp> swaps to the app.
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
        boxSizing: 'border-box',
      }}
    >
      {/* margin:auto centers when there's room, and collapses to top-aligned
          (scrollable) when the keyboard shrinks the viewport — never traps content. */}
      <div style={{ margin: 'auto', width: '100%', maxWidth: 340 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
          <VialFill pct={0.66} hue={62} w={30} h={72} />
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 40, color: 'var(--text)', margin: '16px 0 0', lineHeight: 1 }}>Vial</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, letterSpacing: '0.08em', color: 'var(--text-dim)', marginTop: 8 }}>
            Private peptide tracker
          </p>
        </div>

        <form
          onSubmit={submit}
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <label style={{ display: 'block' }}>
            <div style={{ marginBottom: 7 }}><Label>Email</Label></div>
            <input
              className="vlf"
              style={inputStyle}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label style={{ display: 'block' }}>
            <div style={{ marginBottom: 7 }}><Label>Password</Label></div>
            <input
              className="vlf"
              style={inputStyle}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div style={{ padding: '10px 13px', background: 'rgba(215,128,110,0.12)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13.5 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
          Invite only · ask the owner for an account.
          <br />
          Forgot your password? The owner can reset it.
        </p>
      </div>
    </div>
  );
}
