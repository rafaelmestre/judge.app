-- ═══════════════════════════════════════════════════
-- JUDGE APP — schema do banco (Supabase / PostgreSQL)
-- Rode no Supabase: SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════

-- SESSÕES: cada dia de jogo
create table if not exists public.sessions (
  id           uuid primary key,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at   timestamptz not null,
  ended_at     timestamptz,
  rule_minutes smallint not null check (rule_minutes between 1 and 30),
  rule_goals   smallint not null check (rule_goals between 1 and 10),
  teams        text[] not null default '{}',
  name         text check (char_length(name) <= 60),
  created_at   timestamptz not null default now()
);

-- RODADAS: cada partida dentro de uma sessão
create table if not exists public.rounds (
  id           uuid primary key,
  session_id   uuid not null references public.sessions(id) on delete cascade,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  round_number smallint not null,
  team_a       text not null,
  team_b       text not null,
  score_a      smallint not null default 0,
  score_b      smallint not null default 0,
  winner       text,
  reason       text not null check (reason in ('time', 'goals', 'exit', 'manual')),
  duration_sec integer not null default 0,
  ended_at     timestamptz not null,
  created_at   timestamptz not null default now()
);

create index if not exists rounds_session_idx on public.rounds (session_id);
create index if not exists sessions_owner_started_idx on public.sessions (owner, started_at desc);

-- SEGURANÇA: cada usuário só vê e altera os próprios dados
alter table public.sessions enable row level security;
alter table public.rounds   enable row level security;

drop policy if exists "sessions: dono" on public.sessions;
create policy "sessions: dono" on public.sessions
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists "rounds: dono" on public.rounds;
create policy "rounds: dono" on public.rounds
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- (migração 05/11/2026) para bancos criados antes da coluna name:
alter table public.sessions add column if not exists name text check (char_length(name) <= 60);