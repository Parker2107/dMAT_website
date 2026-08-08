-- dMAT trainer schema.
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Exam sessions: one row per 20-question / 25-minute timed set.
-- ---------------------------------------------------------------------------
create table if not exists public.exam_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  task_type       text not null
                    check (task_type in ('figure_sequences','math_equations','latin_squares')),
  difficulty      text not null
                    check (difficulty in ('low','medium','high','mixed')),
  total_questions integer not null default 20,
  correct_count   integer,
  duration_ms     integer,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- Attempts: one row per answered question, in drill mode and exam mode alike.
-- The seed is stored instead of the question itself -- it regenerates the exact
-- same question on demand.
-- ---------------------------------------------------------------------------
create table if not exists public.attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  task_type   text not null
                check (task_type in ('figure_sequences','math_equations','latin_squares')),
  difficulty  text not null check (difficulty in ('low','medium','high')),
  seed        text not null,
  is_correct  boolean not null,
  duration_ms integer not null check (duration_ms >= 0),
  answer      jsonb,
  session_id  uuid references public.exam_sessions (id) on delete set null,
  -- Replays of a pasted seed still count as practice, but are excluded from
  -- "new questions practised" so the dashboard is not inflated by repeats.
  is_replay   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists attempts_user_created_idx
  on public.attempts (user_id, created_at desc);
create index if not exists attempts_user_type_idx
  on public.attempts (user_id, task_type, difficulty);
create index if not exists attempts_session_idx
  on public.attempts (session_id);
create index if not exists exam_sessions_user_idx
  on public.exam_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Row level security: a user can only ever see and write their own rows.
-- ---------------------------------------------------------------------------
alter table public.attempts       enable row level security;
alter table public.exam_sessions  enable row level security;

drop policy if exists "attempts are private" on public.attempts;
create policy "attempts are private"
  on public.attempts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "exam sessions are private" on public.exam_sessions;
create policy "exam sessions are private"
  on public.exam_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
