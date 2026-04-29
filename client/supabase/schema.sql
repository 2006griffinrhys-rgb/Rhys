-- Tandem Supabase schema + RLS
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  bio text not null default '',
  city text not null default '',
  avatar_url text,
  category text not null check (category in ('A', 'B')),
  mbti_type text,
  mbti_ei integer check (mbti_ei between 0 and 100),
  mbti_sn integer check (mbti_sn between 0 and 100),
  mbti_tf integer check (mbti_tf between 0 and 100),
  mbti_jp integer check (mbti_jp between 0 and 100),
  quiz_completed boolean not null default false,
  has_paid_current_cycle boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  compatibility_score integer not null check (compatibility_score between 0 and 100),
  cycle_year integer not null,
  cycle_month integer not null check (cycle_month between 1 and 12),
  created_at timestamptz not null default now(),
  unique (user_a, user_b, cycle_year, cycle_month)
);

create table if not exists public.friendship_requests (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  cycle_year integer not null,
  cycle_month integer not null check (cycle_month between 1 and 12),
  created_at timestamptz not null default now()
);

create table if not exists public.profile_reveals (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  cycle_year integer not null,
  cycle_month integer not null check (cycle_month between 1 and 12),
  created_at timestamptz not null default now(),
  unique (sender_id, recipient_id, cycle_year, cycle_month)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_count integer;
  assigned_category text;
begin
  select count(*) into profile_count from public.profiles;
  assigned_category := case when mod(profile_count, 2) = 0 then 'A' else 'B' end;

  insert into public.profiles (id, display_name, category)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), assigned_category)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.friendship_requests enable row level security;
alter table public.profile_reveals enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "matches_select_participant" on public.matches;
create policy "matches_select_participant"
on public.matches
for select
to authenticated
using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "matches_insert_participant" on public.matches;
create policy "matches_insert_participant"
on public.matches
for insert
to authenticated
with check (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "friendship_requests_select_participant" on public.friendship_requests;
create policy "friendship_requests_select_participant"
on public.friendship_requests
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "friendship_requests_insert_sender" on public.friendship_requests;
create policy "friendship_requests_insert_sender"
on public.friendship_requests
for insert
to authenticated
with check (auth.uid() = sender_id);

drop policy if exists "friendship_requests_update_participant" on public.friendship_requests;
create policy "friendship_requests_update_participant"
on public.friendship_requests
for update
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id)
with check (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "profile_reveals_select_participant" on public.profile_reveals;
create policy "profile_reveals_select_participant"
on public.profile_reveals
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "profile_reveals_insert_sender" on public.profile_reveals;
create policy "profile_reveals_insert_sender"
on public.profile_reveals
for insert
to authenticated
with check (auth.uid() = sender_id);
