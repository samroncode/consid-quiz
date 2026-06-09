-- ============================================================
-- Consid Quiz — initial schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- quizzes
-- ----------------------------------------------------------------
create table quizzes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  topic        text,
  difficulty   text check (difficulty in ('easy', 'medium', 'hard')),
  created_at   timestamptz not null default now(),
  edit_code    text not null default substring(md5(random()::text), 1, 8)
);

-- ----------------------------------------------------------------
-- questions
-- ----------------------------------------------------------------
create table questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references quizzes(id) on delete cascade,
  position      int  not null,
  text          text not null,
  options       jsonb not null,   -- ["A","B","C","D"]
  correct_index int  not null,    -- 0..3
  time_limit    int  not null default 20,
  unique(quiz_id, position)
);

-- ----------------------------------------------------------------
-- sessions
-- ----------------------------------------------------------------
create table sessions (
  id                   uuid primary key default gen_random_uuid(),
  quiz_id              uuid not null references quizzes(id),
  pin                  text not null unique,
  host_token           text not null,
  state                text not null default 'lobby'
                         check (state in ('lobby','question','reveal','leaderboard','ended')),
  current_q            int  not null default -1,
  question_started_at  timestamptz,
  created_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- players
-- ----------------------------------------------------------------
create table players (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  nickname    text not null,
  score       int  not null default 0,
  joined_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- answers
-- ----------------------------------------------------------------
create table answers (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references sessions(id),
  player_id       uuid not null references players(id),
  question_index  int  not null,
  choice          int  not null,
  answered_at     timestamptz not null default now(),
  is_correct      boolean,
  awarded         int not null default 0,
  unique(session_id, player_id, question_index)
);

-- ================================================================
-- Row-level security
-- ================================================================

alter table quizzes   enable row level security;
alter table questions enable row level security;
alter table sessions  enable row level security;
alter table players   enable row level security;
alter table answers   enable row level security;

-- quizzes — public read; anyone can create; edit guarded by edit_code (enforced in app layer)
create policy "quizzes: public read"   on quizzes for select using (true);
create policy "quizzes: public insert" on quizzes for insert with check (true);
create policy "quizzes: public update" on quizzes for update using (true);

-- questions — follow quiz access
create policy "questions: public read"   on questions for select using (true);
create policy "questions: public insert" on questions for insert with check (true);
create policy "questions: public update" on questions for update using (true);
create policy "questions: public delete" on questions for delete using (true);

-- sessions — public read; mutations go through server routes with service role key
create policy "sessions: public read"   on sessions for select using (true);
-- Inserts/updates to sessions are done via service role key in route handlers (no anon policy)

-- players — public read; anyone can join (insert); score updates via service role
create policy "players: public read"   on players for select using (true);
create policy "players: public insert" on players for insert with check (true);

-- answers — public read; anyone can submit once (unique constraint prevents duplicates)
create policy "answers: public read"   on answers for select using (true);
create policy "answers: public insert" on answers for insert with check (true);

-- ================================================================
-- Realtime
-- ================================================================

-- Enable realtime for the tables clients subscribe to
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table answers;
