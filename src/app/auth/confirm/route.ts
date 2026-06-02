import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles every email-link auth flow: invite, password recovery, magic link,
// and signup confirmation. Supabase's email templates point here with a
// `token_hash` + `type`; we verify it server-side (verifyOtp) to establish the
// session cookie, then send the user into the app.
//
// Why this is needed: the browser client uses the PKCE flow, which has no
// code verifier for server-initiated links like invites — so the old hash-token
// approach left the user with no session and updateUser() threw "Auth session
// missing!". verifyOtp(token_hash) needs no verifier and works for all of these.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') || '/';

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = ''; // strip token_hash/type/next from the visible URL

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Invite & recovery still need the user to choose a password — land them
      // on the app with the flag <VialApp> reads to show the set-password screen
      // (now backed by a real session).
      if (type === 'invite' || type === 'recovery') {
        redirectTo.pathname = '/';
        redirectTo.searchParams.set('type', type);
      } else {
        redirectTo.pathname = next;
      }
      return NextResponse.redirect(redirectTo);
    }
  }

  // Missing / invalid / expired link → back to sign-in with a notice.
  redirectTo.pathname = '/';
  redirectTo.searchParams.set('auth', 'expired');
  return NextResponse.redirect(redirectTo);
}
