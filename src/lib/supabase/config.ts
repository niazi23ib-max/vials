// Reads the public Supabase env vars and exposes whether the app is wired up.
// Lets the rest of the app degrade gracefully (the calculator works with no
// backend; inventory/calendar show a setup card until these are set).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
