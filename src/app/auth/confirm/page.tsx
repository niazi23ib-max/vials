import { type EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Interstitial for email-link auth (invite / recovery / signup / magic link).
// We deliberately DO NOT verify the token on this GET: email-security scanners
// (Outlook Safe Links, Mimecast, antivirus, link previewers) pre-fetch every
// URL in an email, and verifyOtp is single-use — so verifying here would burn a
// brand-new link before the human clicks ("invalid or expired"). Instead the
// user taps Continue, which POSTs to /auth/confirm/verify and verifies once.
// Scanners load this page but don't submit the form, so the token survives.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const token_hash = sp.token_hash ?? '';
  const type = (sp.type ?? '') as EmailOtpType | '';
  const next = sp.next ?? '/';
  const ready = Boolean(token_hash && type);

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 340, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 28 }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 28, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>
          {ready ? 'Confirm your account' : 'Link problem'}
        </h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.6 }}>
          {ready
            ? 'Tap continue to finish setting up your account.'
            : 'This link is missing its token. Request a new email and try again.'}
        </p>
        {ready ? (
          <form method="POST" action="/auth/confirm/verify">
            <input type="hidden" name="token_hash" value={token_hash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              style={{ width: '100%', marginTop: 18, padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--amber)', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Continue
            </button>
          </form>
        ) : (
          <a href="/" style={{ display: 'inline-block', marginTop: 18, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--amber)' }}>
            Back to sign in
          </a>
        )}
      </div>
    </main>
  );
}
