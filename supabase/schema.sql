-- Pomodoro Inteligente — schema do banco de dados
-- Cole este arquivo inteiro no SQL Editor do seu projeto Supabase e rode.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  mode text not null check (mode in ('work', 'break')),
  seconds integer not null check (seconds > 0),
  completed_at timestamptz not null default now()
);

create index if not exists sessions_user_date_idx
  on public.sessions (user_id, date);

create table if not exists public.day_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.timer_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'idle',
  mode text not null default 'work',
  activity_name text not null default '',
  target_seconds integer not null default 1500,
  accumulated_seconds numeric not null default 0,
  run_start timestamptz,
  updated_at timestamptz not null default now()
);

-- Row Level Security: cada pessoa só enxerga e altera as próprias linhas.
alter table public.sessions enable row level security;
alter table public.day_notes enable row level security;
alter table public.timer_state enable row level security;

create policy "sessions_owner" on public.sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "day_notes_owner" on public.day_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "timer_state_owner" on public.timer_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
