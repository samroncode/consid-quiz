# CLAUDE.md — QuizLive (Kahoot-style real-time quiz app)

This is the authoritative brief for building this project. Read it fully before writing code. Work in sequenced phases (see **Build Order**). After each phase, stop and verify the app runs before continuing.

---

## 1. What we're building

A real-time, multiplayer quiz app in the style of **kahoot.it**.

- **Start screen** with two actions: **Start Quiz** (host an existing quiz, including a flow to generate one) and **Create Quiz** (build a quiz manually).
- **AI quiz generation** from a **topic prompt + difficulty level**.
- **Live gameplay**: a host drives the session; up to **~20 players** join via a code and answer the same question simultaneously. Speed-based scoring and a live leaderboard, Kahoot-style.
- **No accounts** — open/anonymous. Anyone can create, host, or join. Hosts get a session/edit code; players join with a game PIN.
- Hosted on **Vercel (free / Hobby tier)**.

> ⚠️ Vercel Hobby prohibits commercial use. This is acceptable only for internal/non-commercial use. If it becomes business-facing, upgrade to Pro. Note this in the README.

---

## 2. Why this architecture (read this — it drives everything)

Vercel serverless functions are **stateless and short-lived** and **cannot hold WebSocket connections**. A Kahoot-style game needs persistent real-time sync (everyone sees the same question at the same instant, live leaderboard). Therefore real-time is handled by an **external service: Supabase**.

**Supabase free tier** comfortably covers 20 concurrent users (200 concurrent realtime connections, 2M messages/month) and gives us Postgres + Realtime + Presence in one place. No auth needed (anonymous).

The whole game stays in sync by driving every client off **one `sessions` row's state column**. The host mutates that row; all clients subscribe and re-render. This avoids race conditions and keeps the model simple.

---

## 3. Tech stack (do not substitute without asking)

- **Next.js 15 (App Router) + TypeScript**
- **Tailwind v4** + **shadcn/ui**
- **Supabase** — Postgres + Realtime + Presence (`@supabase/supabase-js`)
- **Anthropic API** for quiz generation, called **only** from a Next.js Route Handler (server-side; the API key must never reach the client)
- **TanStack Query** for client data fetching/caching of CRUD endpoints
- **Zod** for validating AI output and form input
- Deploy: **Vercel**

---

## 4. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, for privileged writes if needed
ANTHROPIC_API_KEY=                # server-only
```

Document these in `.env.example`. Never reference `ANTHROPIC_API_KEY` or the service role key in any client component or `NEXT_PUBLIC_*` var.

---

## 5. Data model (Supabase / Postgres)

```
quizzes
  id            uuid pk default gen_random_uuid()
  title         text not null
  topic         text
  difficulty    text   -- 'easy' | 'medium' | 'hard'
  created_at    timestamptz default now()
  edit_code     text   -- random short code so an anon creator can re-edit

questions
  id            uuid pk
  quiz_id       uuid fk -> quizzes(id) on delete cascade
  position      int not null           -- order within quiz
  text          text not null
  options       jsonb not null         -- ["A","B","C","D"]
  correct_index int not null           -- 0..3
  time_limit    int default 20         -- seconds

sessions                              -- one live game instance
  id            uuid pk
  quiz_id       uuid fk -> quizzes(id)
  pin           text unique not null   -- 6-digit join code
  host_token    text not null          -- secret; only the host knows it
  state         text not null          -- 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended'
  current_q     int default -1         -- index into questions, -1 in lobby
  question_started_at timestamptz      -- for speed scoring
  created_at    timestamptz default now()

players
  id            uuid pk
  session_id    uuid fk -> sessions(id) on delete cascade
  nickname      text not null
  score         int default 0
  joined_at     timestamptz default now()

answers
  id            uuid pk
  session_id    uuid fk -> sessions(id)
  player_id     uuid fk -> players(id)
  question_index int not null
  choice        int not null
  answered_at   timestamptz default now()
  is_correct    boolean
  awarded       int default 0
  unique(session_id, player_id, question_index)   -- one answer per question
```

**RLS:** Since this is anonymous, enable RLS but write permissive policies appropriate to a public game (anyone can read sessions/players, inserts allowed for players/answers; host-only mutations to `sessions` guarded by matching `host_token` passed through a server route rather than direct client writes). Keep privileged session-state mutations behind Next.js Route Handlers using the service role key — do NOT let clients write `sessions.state` directly.

Provide all of this as a single SQL migration file (`supabase/migrations/0001_init.sql`).

---

## 6. Scoring (Kahoot-style)

- Correct answer base points: **1000**.
- Speed bonus: faster answers score more. Use:
  `awarded = isCorrect ? round(1000 * (1 - (elapsed / timeLimit) / 2)) : 0`
  (i.e. answering instantly ≈ 1000, answering at the buzzer ≈ 500, wrong = 0). Clamp ≥ 0.
- `elapsed` = `answered_at - question_started_at` in seconds.
- Compute scoring **server-side** in the route handler that records the answer, so clients can't cheat the timing.

---

## 7. Game flow & real-time sync

1. **Host** picks/generates a quiz → POST creates a `sessions` row (`state='lobby'`), returns `pin` + `host_token`.
2. **Players** open join page, enter `pin` + nickname → POST creates a `players` row. They subscribe to the session channel.
3. Players are shown in the lobby via **Supabase Presence** + the `players` table.
4. **Host** clicks Start → server route sets `state='question'`, `current_q=0`, `question_started_at=now()`. All clients receive the change via Realtime subscription on the `sessions` row and render question 0. A countdown runs off `time_limit`.
5. Players submit a choice → server route validates (one per question), scores it, updates `players.score`.
6. Host clicks Reveal → `state='reveal'` (show correct answer + answer distribution), then Leaderboard → `state='leaderboard'`.
7. Repeat for each question; after the last, `state='ended'` with final podium.

All clients subscribe to: the `sessions` row (drives the screen), and the `players` table filtered by session (drives the leaderboard). Keep the state machine in `lib/gameState.ts`.

---

## 8. AI quiz generation

- Route handler: `POST /api/generate-quiz` with `{ topic, difficulty, numQuestions }`.
- Server-side Anthropic call. **System prompt must demand JSON only** — no prose, no markdown fences.
- Validate the response with a **Zod schema** before inserting. If parsing fails, retry once, then return a clean error.
- Expected shape:
  ```json
  {
    "title": "string",
    "questions": [
      { "text": "string", "options": ["a","b","c","d"], "correct_index": 0, "time_limit": 20 }
    ]
  }
  ```
- Difficulty levels: `easy | medium | hard` — pass through to the prompt to steer question complexity.
- Insert the validated quiz + questions into Supabase, return the `quiz_id`.
- After generation, drop the user into the **edit/preview** screen so they can tweak before hosting.

---

## 9. Screens / routes

- `/` — **Start screen**. Two big primary actions: **Start Quiz** and **Create Quiz**. "Start Quiz" leads to a chooser: pick an existing quiz OR **Generate with AI** (topic + difficulty form). Kahoot-energy hero design.
- `/create` — manual quiz builder (add/edit/reorder questions, set options + correct answer + timer).
- `/quiz/[id]/edit` — preview/edit a quiz (used after AI generation too); guarded by `edit_code`.
- `/host/[sessionId]` — host control screen: lobby with join PIN + player list, Start/Next/Reveal/Leaderboard controls, live answer distribution.
- `/join` — player entry: PIN + nickname.
- `/play/[sessionId]` — player gameplay screen: big colored answer buttons (Kahoot's red/blue/yellow/green shape+color pattern), countdown, score feedback.
- `/play/[sessionId]/results` — final podium.

---

## 10. Design / look & feel

**The visual design must match the Claude Design inspiration folder the user will provide.** When that folder is available:
- Extract its color tokens, typography, spacing, and component styles into `app/globals.css` (Tailwind v4 `@theme`) and reuse them everywhere. Treat them as a **locked design system** — do not invent off-palette colors.
- Mirror its component patterns in the shadcn/ui components.

Until the folder is provided, build with a **Kahoot-inspired placeholder theme**: bold, high-contrast, large rounded answer tiles in the four classic colors (red/triangle, blue/diamond, yellow/circle, green/square), big timer, playful but clean. Keep all colors as CSS variables so swapping in the real design system is a token change, not a refactor.

Mobile-first for the **player** screens (players are on phones); the **host** screen is desktop/projector-oriented (large, readable from across a room — kiosk-friendly).

---

## 11. Build order (work in these phases, verify between each)

1. **Scaffold**: Next.js + TS + Tailwind v4 + shadcn/ui. Start screen with the two actions (static). Verify it runs.
2. **Supabase**: client setup, SQL migration, types. `.env.example`.
3. **Quiz CRUD**: manual create (`/create`) + edit/preview screens, persisting to Supabase.
4. **AI generation**: `/api/generate-quiz` route + Zod validation + the topic/difficulty form, feeding into the edit screen.
5. **Sessions & lobby**: create session, join flow, Presence-backed player list. No gameplay yet.
6. **Real-time gameplay**: the `sessions` state machine, question display, answer submission, server-side scoring.
7. **Reveal + leaderboard + podium**, answer distribution.
8. **Design pass**: apply the Claude Design tokens, polish player vs host layouts.
9. **Deploy**: Vercel + Supabase env vars; README with the Hobby-tier commercial-use caveat.

---

## 12. Constraints & guardrails

- Target ~20 concurrent players per session; don't over-engineer beyond that, but don't do anything O(players²) on every realtime tick.
- **Never** expose `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` client-side.
- All session-state mutations and answer scoring happen **server-side** (Route Handlers), never via direct client writes — this is both a correctness and an anti-cheat requirement.
- Debounce/guard against double-joins and double-answers (DB unique constraints already help).
- Keep the realtime subscription logic in one place (`lib/realtime.ts`) so it's testable.
- Ask before adding any dependency not listed in the stack.
