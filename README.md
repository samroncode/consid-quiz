# Consid Quiz

A real-time, Kahoot-style multiplayer quiz app built for internal use at Consid.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind v4** + shadcn/ui with Consid brand design tokens
- **Supabase** — Postgres + Realtime (game state sync) + Presence (player list)
- **Anthropic API** — AI quiz generation from a topic prompt (server-side only)
- **Vercel** — hosting

## Features

- Generate a quiz with AI (topic + difficulty) or build one manually
- Host a live session — players join via 6-digit PIN
- Speed-scored answers (faster = more points, Kahoot-style)
- Real-time leaderboard and answer distribution on reveal
- No accounts required — fully anonymous

## Getting started

1. Copy `.env.example` → `.env.local` and fill in your credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   ```

2. Run the Supabase migration:

   ```bash
   supabase db push  # or paste supabase/migrations/0001_init.sql in the SQL editor
   ```

3. Install dependencies and start:

   ```bash
   npm install
   npm run dev
   ```

## Deployment (Vercel)

1. Push to GitHub and import the repo in [vercel.com/new](https://vercel.com/new).
2. Add the four environment variables from `.env.example` in the Vercel dashboard.
3. Deploy — Vercel picks up `next.config.ts` automatically.

Enable Supabase Realtime on the `sessions` and `players` tables (already included in the migration).

## Commercial use notice

> **This project is hosted on Vercel's Hobby (free) tier.**
> Vercel's Hobby plan **prohibits commercial use**. If this app is used in a commercial context — for clients, paid events, or as part of a billable service — you must upgrade to Vercel Pro before deploying. See [vercel.com/pricing](https://vercel.com/pricing).

## Security notes

- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are **never** exposed to the client.
- All session-state mutations and answer scoring happen in Next.js Route Handlers using the service role key.
- Clients cannot directly write `sessions.state` — all state transitions are server-guarded.

## Scoring formula

`awarded = isCorrect ? round(1000 × (1 − elapsed / timeLimit / 2)) : 0`

Answering instantly ≈ 1000 pts · answering at the buzzer ≈ 500 pts · wrong = 0.
