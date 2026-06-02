import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Verifies an email-link token. Reached only via the Continue button on
// /auth/confirm (a POST) — never on the scanner's pre-fetch GET — so the
// single-use token isn't burned before the human acts. On success the session
// cookie is set; invite/recovery users land on the set-password screen.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token_hash = String(form.get('token_hash') || '');
  const type = String(form.get('type') || '') as EmailOtpType;
  const next = String(form.get('next') || '/');

  const url = request.nextUrl.clone();
  url.search = '';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (type === 'invite' || type === 'recovery') {
        url.pathname = '/';
        url.searchParams.set('type', type);
      } else {
        url.pathname = next || '/';
      }
      return NextResponse.redirect(url, 303); // 303 so the browser GETs the destination
    }
  }

  url.pathname = '/';
  url.searchParams.set('auth', 'expired');
  return NextResponse.redirect(url, 303);
}
