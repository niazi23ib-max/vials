'use client';

import { useEffect, type CSSProperties, type ReactNode, type SVGProps } from 'react';
import { ok } from '@/lib/substances';

/* ── Vial fill indicator (the brand motif) ───────────────────── */
export function VialFill({
  pct,
  hue,
  w = 26,
  h = 60,
  dim = false,
}: {
  pct: number;
  hue: number;
  w?: number;
  h?: number;
  dim?: boolean;
}) {
  const r = Math.round(w * 0.4);
  const capW = Math.round(w * 0.54);
  const fillTop = ok(0.74, 0.13, hue);
  const fillBot = ok(0.58, 0.12, hue);
  const surface = ok(0.82, 0.13, hue);
  const pctH = Math.max(pct > 0 ? 6 : 0, Math.round(pct * (h - 4)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: dim ? 0.5 : 1 }}>
      <div style={{ width: capW, height: 4, borderRadius: '2px 2px 0 0', background: 'var(--line-strong)' }} />
      <div style={{ width: Math.round(w * 0.36), height: 3, background: 'var(--line-strong)', opacity: 0.7 }} />
      <div
        style={{
          position: 'relative', width: w, height: h, boxSizing: 'border-box',
          border: '1.5px solid var(--line-strong)',
          borderRadius: `3px 3px ${r}px ${r}px`, overflow: 'hidden',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        {[0.25, 0.5, 0.75].map((t) => (
          <div key={t} style={{ position: 'absolute', right: 0, bottom: `${t * 100}%`, width: 3, height: 1, background: 'var(--line)' }} />
        ))}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: pctH,
            background: `linear-gradient(180deg, ${fillTop}, ${fillBot})`,
            transition: 'height .6s cubic-bezier(.4,0,.2,1)',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: surface, opacity: 0.9 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Monogram chip ───────────────────────────────────────────── */
export function Monogram({ name, hue, size = 38 }: { name: string; hue: number; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: ok(0.28, 0.05, hue), border: `1px solid ${ok(0.4, 0.07, hue)}`,
        color: ok(0.82, 0.11, hue), fontFamily: 'var(--mono)', fontWeight: 600,
        fontSize: size * 0.42, letterSpacing: '-0.02em',
      }}
    >
      {name[0]}
    </div>
  );
}

/* ── Micro label (mono, tracked, uppercase) ──────────────────── */
export function Label({
  children,
  color = 'var(--text-faint)',
  style = {},
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color, ...style }}>
      {children}
    </div>
  );
}

/* ── Status dot + chip ───────────────────────────────────────── */
export const STATUS_COLOR: Record<string, string> = {
  critical: 'var(--red)', low: 'var(--amber)', soon: 'var(--amber)', ok: 'var(--green)',
};
export function Dot({ status, size = 7 }: { status: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: STATUS_COLOR[status] || 'var(--text-faint)', display: 'inline-block', flexShrink: 0 }} />
  );
}

type ChipTone = 'neutral' | 'amber' | 'red' | 'green';
export function Chip({
  children,
  tone = 'neutral',
  active = false,
  onClick,
}: {
  children: ReactNode;
  tone?: ChipTone;
  active?: boolean;
  onClick?: () => void;
}) {
  const tones: Record<ChipTone, { bg: string; fg: string; bd: string }> = {
    neutral: { bg: active ? 'var(--text)' : 'rgba(255,255,255,0.04)', fg: active ? 'var(--bg)' : 'var(--text-dim)', bd: active ? 'var(--text)' : 'var(--line)' },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)', bd: 'transparent' },
    red: { bg: 'rgba(215,122,107,0.13)', fg: 'var(--red)', bd: 'transparent' },
    green: { bg: 'rgba(127,174,122,0.13)', fg: 'var(--green)', bd: 'transparent' },
  };
  const t = tones[tone] || tones.neutral;
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px',
    borderRadius: 999, border: `1px solid ${t.bd}`, background: t.bg, color: t.fg,
    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.04em',
    whiteSpace: 'nowrap', transition: 'all .15s',
  };
  // Decorative chips render as a span so they can live inside clickable cards
  // (a <button> inside a <button> is invalid HTML).
  if (!onClick) return <span style={style}>{children}</span>;
  return (
    <button onClick={onClick} style={{ ...style, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

/* ── Icons (simple geometric) ────────────────────────────────── */
type IconProps = SVGProps<SVGSVGElement>;
export const Icon = {
  today: (p: IconProps) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" {...p}><circle cx="11" cy="11" r="8.2" stroke="currentColor" strokeWidth="1.6" /><circle cx="11" cy="11" r="2.4" fill="currentColor" /></svg>
  ),
  schedule: (p: IconProps) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" {...p}><line x1="4" y1="6.5" x2="18" y2="6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><line x1="4" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><line x1="4" y1="15.5" x2="13" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
  ),
  vials: (p: IconProps) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" {...p}><rect x="7.5" y="3" width="7" height="16" rx="3.2" stroke="currentColor" strokeWidth="1.6" /><line x1="7.5" y1="12" x2="14.5" y2="12" stroke="currentColor" strokeWidth="1.6" /><path d="M9 12v5.2a2 2 0 002 2 2 2 0 002-2V12" fill="currentColor" opacity="0.9" /></svg>
  ),
  calc: (p: IconProps) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" {...p}><rect x="4.5" y="3" width="13" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" /><line x1="4.5" y1="8" x2="17.5" y2="8" stroke="currentColor" strokeWidth="1.4" /><circle cx="8.3" cy="12" r="1" fill="currentColor" /><circle cx="13.7" cy="12" r="1" fill="currentColor" /><circle cx="8.3" cy="15.5" r="1" fill="currentColor" /><circle cx="13.7" cy="15.5" r="1" fill="currentColor" /></svg>
  ),
  progress: (p: IconProps) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" {...p}><path d="M4 14.5l4.5-4.5 3 3L18 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 6.5h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  trash: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}><path d="M3 4.5h10M6.5 4.5V3.2A1 1 0 017.5 2.2h1a1 1 0 011 1v1.3M4 4.5l.6 8a1 1 0 001 .9h4.8a1 1 0 001-.9l.6-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  plus: (p: IconProps) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}><line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
  ),
  check: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  back: (p: IconProps) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" {...p}><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  bell: (p: IconProps) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}><path d="M5 7.5a4 4 0 018 0c0 4 1.5 5 1.5 5h-11S5 11.5 5 7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M7.5 15a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
  ),
  clock: (p: IconProps) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}><circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4.2V7l2 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  arrow: (p: IconProps) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}><path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
};

/* ── Bottom sheet ────────────────────────────────────────────── */
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: open ? 'auto' : 'none' }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0, transition: 'opacity .28s', backdropFilter: open ? 'blur(2px)' : 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: 'var(--surface)', borderRadius: '28px 28px 0 0',
          borderTop: '1px solid var(--line-strong)',
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform .34s cubic-bezier(.32,.72,0,1)',
          paddingBottom: 'calc(38px + env(safe-area-inset-bottom, 0px))', maxHeight: '92dvh', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain',
          boxShadow: '0 -20px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 3, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 }}>
          <div style={{ width: 38, height: 4, borderRadius: 99, background: 'var(--line-strong)' }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', right: 14, top: 8, width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--line-strong)', background: 'var(--surface-2)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        {title && <div style={{ padding: '6px 22px 0', fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--text)' }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}
