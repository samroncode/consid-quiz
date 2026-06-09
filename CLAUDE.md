# CLAUDE.md — QuizLive (Kahoot-style real-time quiz app)

This is the authoritative brief for this project. Read it fully before writing code.

---

## 1. What we're building

A real-time, multiplayer quiz app in the style of **kahoot.it**.

- **Start screen** with two actions: **Start Quiz** (host an existing quiz, including a flow to generate one) and **Create Quiz** (build a quiz manually).
- **AI quiz generation** from a **topic prompt + difficulty level**.
- **Live gameplay**: a host drives the session; up to **~20 players** join via a code and answer the same question simultaneously. Speed-based scoring and a live leaderboard, Kahoot-style.
- **No accounts** — open/anonymous. Anyone can create, host, or join. Hosts get a session/edit code; players join with a game PIN.
- Hosted on **Vercel (free / Hobby tier)**.

> ⚠️ Vercel Hobby prohibits commercial use. This is acceptable only for internal/non-commercial use. If it becomes business-facing, upgrade to Pro.

---

## 2. Architecture

Vercel serverless functions are **stateless and short-lived**. Real-time sync is achieved via **1-second HTTP polling** — all clients poll two endpoints:
- `GET /api/sessions/[id]/state` — drives screen transitions (lobby → question → reveal → leaderboard → ended)
- `GET /api/sessions/[id]/players` — drives the live player/score list

The host mutates session state via server Route Handlers; polling clients pick up changes within 1 second. This keeps the model simple and requires no persistent connection infrastructure.

Data is stored in **local JSON files** (`data/*.json`) managed by `src/lib/storage.ts` using synchronous `fs` operations. No external database or service required.

> **Vercel note:** The `data/` filesystem is ephemeral on Vercel (resets on cold starts/deploys). Suitable for demos. For persistent production use, swap `src/lib/storage.ts` for a database-backed implementation.

---

## 3. Tech stack

- **Next.js 15 (App Router) + TypeScript**
- **Tailwind v4** + **shadcn/ui**
- **Local JSON file storage** — `src/lib/storage.ts` reads/writes `data/*.json` via Node.js `fs`
- **Groq API** (`groq-sdk`) for quiz generation, called **only** from a Next.js Route Handler (server-side; the API key must never reach the client). Model: `llama-3.3-70b-versatile`.
- **TanStack Query** for client data fetching/caching of CRUD endpoints
- **Zod** for validating AI output and form input
- **Vitest** for tests (`src/__tests__/`)
- Deploy: **Vercel**

---

## 4. Environment variables

```
GROQ_API_KEY=   # server-only, never expose client-side
```

Document in `.env.example`. Never reference `GROQ_API_KEY` in any client component or `NEXT_PUBLIC_*` var.

---

## 5. Data model (local JSON)

Defined as TypeScript interfaces in `src/lib/database.types.ts`. Stored in `data/*.json`.

```ts
Quiz       { id, title, topic, difficulty, created_at, edit_code }
Question   { id, quiz_id, position, text, options: string[], correct_index, time_limit }
Session    { id, quiz_id, pin, host_token, state, current_q, question_started_at, created_at }
Player     { id, session_id, nickname, score, joined_at }
Answer     { id, session_id, player_id, question_index, choice, answered_at, is_correct, awarded }
```

`state` values: `'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended'`

Double-answer prevention is handled in `src/app/api/sessions/[id]/answer/route.ts` via `db.answers.exists()` check before insert.

---

## 6. Scoring (Kahoot-style)

- `awarded = isCorrect ? round(1000 * (1 - elapsed / timeLimit / 2)) : 0` — clamp ≥ 0
- `elapsed` = server-side `answered_at - question_started_at` in seconds
- Scored **server-side** in the answer route handler — clients can't cheat the timing

---

## 7. Game flow & real-time sync

1. **Host** picks/generates a quiz → `POST /api/sessions` creates a session (`state='lobby'`), returns `pin` + `host_token`.
2. **Players** open `/join`, enter `pin` + nickname → `POST /api/sessions/[id]/join` creates a `players` row.
3. All clients poll `GET /api/sessions/[id]/state` (1s interval) and `GET /api/sessions/[id]/players` (1s interval) to stay in sync.
4. **Host** clicks Start → `POST /api/sessions/[id]/start` sets `state='question'`, `current_q=0`, `question_started_at=now()`.
5. Players submit a choice → `POST /api/sessions/[id]/answer` validates, scores server-side, updates `players.score`.
6. Host advances: `POST /api/sessions/[id]/advance` walks `question → reveal → leaderboard → question(n+1) | ended`.
7. State machine lives in `src/lib/gameState.ts`; polling hooks in `src/lib/realtime.ts`.

---

## 8. AI quiz generation

- Route handler: `POST /api/generate-quiz` with `{ topic, difficulty, numQuestions }`
- Server-side Groq call (`llama-3.3-70b-versatile`). System prompt demands JSON only — no prose, no fences.
- Validate response with Zod (`AIQuizSchema` in `src/lib/quiz-schemas.ts`). If parsing fails, retry once, then return a clean error.
- Expected shape: `{ title, questions: [{ text, options: [a,b,c,d], correct_index, time_limit }] }`
- After generation, redirect to the edit/preview screen so the user can tweak before hosting.

---

## 9. Screens / routes

- `/` — Start screen: **Start Quiz** + **Create Quiz**
- `/create` — manual quiz builder
- `/quiz/[id]/edit` — preview/edit (guarded by `edit_code`)
- `/host/[sessionId]` — host control: lobby PIN + player list + game controls
- `/join` — player entry: PIN → nickname → lobby wait → auto-navigates to `/play` on game start
- `/play/[sessionId]?player=UUID` — player gameplay: answer tiles, countdown, score feedback, leaderboard, podium

---

## 10. Design / look & feel

Kahoot-inspired theme: bold, high-contrast, large rounded answer tiles in four classic colors (red/triangle, blue/diamond, yellow/circle, green/square). All colors as CSS variables for easy theming. Mobile-first for **player** screens; desktop/kiosk-oriented for **host** screen.

---

## 11. Constraints & guardrails

- Target ~20 concurrent players per session; don't over-engineer beyond that.
- **Never** expose `GROQ_API_KEY` client-side.
- All session-state mutations and answer scoring happen **server-side** (Route Handlers), never via direct client writes.
- Players who navigate to `/play/[sessionId]` without a `?player=UUID` param are redirected to `/join`.
- Keep polling hooks in `src/lib/realtime.ts`; keep the state machine in `src/lib/gameState.ts`.
- Ask before adding any dependency not already in `package.json`.
