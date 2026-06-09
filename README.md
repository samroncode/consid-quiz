# Consid Quiz

A real-time, Kahoot-style multiplayer quiz app built for internal use at Consid.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind v4** + shadcn/ui with Consid brand design tokens
- **Local JSON file storage** — no database required; all data lives in `data/*.json`
- **Groq API** — AI quiz generation from a topic prompt (server-side only, `llama-3.3-70b-versatile`)
- **1-second HTTP polling** — all clients poll `/api/sessions/[id]/state` and `/api/sessions/[id]/players` for real-time game state sync

## Features

- Generate a quiz with AI (topic + difficulty) or build one manually
- Host a live session — players join via 6-digit PIN
- Speed-scored answers (faster = more points, Kahoot-style)
- Real-time leaderboard and answer distribution on reveal
- No accounts required — fully anonymous

## Getting started

1. Copy `.env.example` → `.env.local` and add your Groq API key:

   ```
   GROQ_API_KEY=your_key_here
   ```

   Get a free key at [console.groq.com](https://console.groq.com).

2. Install dependencies and start:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The `data/` folder is created automatically on first run — no database setup required.

## Data storage

All game data is stored as JSON files in `data/` at the project root:

| File | Contents |
|------|----------|
| `data/quizzes.json` | Quiz metadata (title, topic, difficulty, edit code) |
| `data/questions.json` | Questions with answer options and correct index |
| `data/sessions.json` | Live game sessions and state machine |
| `data/players.json` | Players with nicknames and scores |
| `data/answers.json` | Per-player answers with scoring |

These files are local-only and gitignored. They persist across dev server restarts.

## Running tests

```bash
npm test
```

Tests use Vitest and write to a temporary directory — they never touch `data/`. The test suite covers the full game flow: create quiz → host session → player joins → start → answer → advance states → final results.

## Deployment (Vercel)

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add `GROQ_API_KEY` in the Vercel dashboard under Environment Variables.
3. Deploy.

> **Note on persistence:** Vercel serverless functions run on an ephemeral filesystem. Data written to `data/` will be lost on each cold start or new deployment. This is fine for demos and internal presentations. For persistent production use, replace `src/lib/storage.ts` with a database-backed implementation.
>
> **Future improvement — persistent storage:** If this is used regularly (e.g. weekly sessions), quizzes and history will be lost between cold starts. The fix is to swap `src/lib/storage.ts` for a database backend — Vercel Postgres, Turso, or PlanetScale all have free tiers and the storage interface is already isolated in one file. Estimated effort: half a day.

## Commercial use notice

> **This project is hosted on Vercel's Hobby (free) tier.**  
> Vercel's Hobby plan **prohibits commercial use**. If used in a commercial context — client work, paid events, or billable services — upgrade to Vercel Pro before deploying. See [vercel.com/pricing](https://vercel.com/pricing).

## Security notes

- `GROQ_API_KEY` is server-only — never referenced in client components or `NEXT_PUBLIC_*` variables.
- All session-state mutations and answer scoring happen in Next.js Route Handlers, never via direct client writes.
- `correct_index` is never sent to player clients — only returned from the question endpoint when a valid `host_token` is provided.

## Scoring formula

`awarded = isCorrect ? round(1000 × (1 − elapsed / timeLimit / 2)) : 0`

Answering instantly ≈ 1000 pts · answering at the buzzer ≈ 500 pts · wrong = 0.
