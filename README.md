# Vial — Peptide Tracker

A minimalist, mobile-first tracker for peptides, supplements, and medications —
a dosing **calendar**, vial **inventory**, and reconstitution **calculator**, in a
warm-dark editorial aesthetic.

Implemented from a [Claude Design](https://claude.ai/design) handoff (`Vial`),
recreated faithfully in **Next.js 16 + React 19 + TypeScript** (the prototype's
React-with-inline-styles ported to typed components; exact tokens, fonts, and
layouts preserved).

> ⚠️ **Not medical advice.** Seed values are illustrative. Always double-check
> every calculation and follow guidance from a qualified professional.

## Screens

- **Today** — greeting, adherence ring, an "up next" card, today's protocol with
  one-tap logging, and low-stock / expiry alerts.
- **Schedule** — a weekly timeline (real current week) with per-day dose dots.
- **Vials** — inventory cards with the signature vial-fill gauge, runway (days
  left), doses remaining, remaining value, and low-stock / expiring filters.
- **Calculator** — reconstitution math (with a U-100 syringe visual) + titration
  ramp charts.
- **Detail** — per-substance deep dive: runway bar, draw/concentration/cost-per-dose,
  schedule, and recent history.
- A center **"+"** logs a dose from anywhere.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

The app runs entirely client-side: it ships with seed substances (Retatrutide,
MOTS-c, Semax, Selank) and persists your logged doses to `localStorage`
(`vial.taken`). No backend required to explore it.

## Design fidelity notes

A few intentional adaptations from the static prototype:

- **Decorative status chips** render as `<span>` (the prototype used `<button>`,
  which is invalid nested inside the clickable vial cards).
- **Dates are live** — the Today greeting and the Schedule week are derived from
  the real current date rather than the prototype's hardcoded Wednesday.
- The design-tool "tweaks panel" (accent/typography switcher) is omitted; its
  chosen defaults (amber accent, Newsreader headings, warm surface) are baked in.

## Tech & structure

- **Next.js 16** App Router, **Tailwind v4** (tokens live in `globals.css`),
  fonts via `next/font` (Newsreader · Hanken Grotesk · IBM Plex Mono).

```
src/
  app/                 layout (fonts) · page (renders <VialApp/>) · globals.css
  components/vial/
    VialApp.tsx        shell: tabs, FAB, detail overlay, state + persistence
    ui.tsx             VialFill, Monogram, Label, Chip, Dot, Icon, Sheet
    Today / Schedule / Inventory / Calculator / Detail / LogSheet
    types.ts           the shared `AppApi` controller type
  lib/substances.ts    domain model, seed data, runway/recon helpers
  lib/supabase/        cloud-sync clients (dormant — see below)
  proxy.ts             Supabase session refresh (no-op until configured)
supabase/migrations/   SQL schema + RLS, ready for cloud sync
```

## Optional: cloud sync (dormant)

An earlier iteration wired Supabase (accounts + Postgres + row-level security).
Those pieces are kept but inactive: the SQL schema in
`supabase/migrations/0001_init.sql`, the clients in `src/lib/supabase/`, and
`.env.local.example`. To migrate persistence from `localStorage` to synced
accounts, point `lib/substances` state at Supabase and add the
`NEXT_PUBLIC_SUPABASE_*` env vars.

## Build

```bash
npm run build
```
