-- Match Centre · accounts, clubs and roles
-- لوحة مركز المباريات · الحسابات والأندية والأدوار
-- Run once in Supabase: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again: it only creates what is missing and replaces the functions and policies.

-- 1. the six club roles, as in the clubs deck
do $$ begin
  create type public.club_role as enum ('club_admin','football_manager','coaching','operations','media','board');
exception when duplicate_object then null; end $$;

-- 2. tables
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade
);

create table if not exists public.memberships (
  user_id    uuid primary key references auth.users on delete cascade,  -- one club per account
  email      text not null,
  league     text not null check (league in ('fdl','spl')),
  club       text not null,                                              -- Arabic club name as in data.js / data-spl.js
  role       public.club_role not null,
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  code       text primary key default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  email      text not null,
  league     text not null check (league in ('fdl','spl')),
  club       text not null,
  role       public.club_role not null,
  invited_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists invites_club on public.invites (league, club);
create index if not exists memberships_club on public.memberships (league, club);

-- 3. helpers (security definer so policies can ask them without recursion)
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.is_club_admin(p_league text, p_club text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships
                 where user_id = auth.uid() and league = p_league and club = p_club and role = 'club_admin');
$$;

-- an invited person claims their place with the code the club admin gave them;
-- the code only works for the email it was made for
create or replace function public.claim_invite(p_code text) returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare inv public.invites; me text := lower(coalesce(auth.jwt() ->> 'email', '')); m public.memberships;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from public.invites where code = upper(trim(p_code));
  if inv.code is null then raise exception 'invite code not found'; end if;
  if lower(inv.email) <> me then raise exception 'this code was made for another email'; end if;
  insert into public.memberships (user_id, email, league, club, role)
    values (auth.uid(), me, inv.league, inv.club, inv.role)
    on conflict (user_id) do update set email = excluded.email, league = excluded.league, club = excluded.club, role = excluded.role
    returning * into m;
  delete from public.invites where code = inv.code;
  return m;
end $$;

-- 4. row level security: nobody reads or changes anything unless a policy below allows it
alter table public.platform_admins enable row level security;
alter table public.memberships     enable row level security;
alter table public.invites         enable row level security;

drop policy if exists "admins see themselves" on public.platform_admins;
create policy "admins see themselves" on public.platform_admins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "see own, own club as club admin, all as platform admin" on public.memberships;
create policy "see own, own club as club admin, all as platform admin" on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_club_admin(league, club) or public.is_platform_admin());

drop policy if exists "club admin changes roles in own club" on public.memberships;
create policy "club admin changes roles in own club" on public.memberships for update to authenticated
  using ((public.is_club_admin(league, club) and user_id <> auth.uid()) or public.is_platform_admin())
  with check (public.is_club_admin(league, club) or public.is_platform_admin());

drop policy if exists "club admin removes people from own club" on public.memberships;
create policy "club admin removes people from own club" on public.memberships for delete to authenticated
  using ((public.is_club_admin(league, club) and user_id <> auth.uid()) or public.is_platform_admin());

drop policy if exists "club admin sees own club invites" on public.invites;
create policy "club admin sees own club invites" on public.invites for select to authenticated
  using (public.is_club_admin(league, club) or public.is_platform_admin());

drop policy if exists "club admin invites to own club" on public.invites;
create policy "club admin invites to own club" on public.invites for insert to authenticated
  with check (public.is_club_admin(league, club) or public.is_platform_admin());

drop policy if exists "club admin cancels own club invites" on public.invites;
create policy "club admin cancels own club invites" on public.invites for delete to authenticated
  using (public.is_club_admin(league, club) or public.is_platform_admin());

-- 5. who may call what: signed-in users only, never the anonymous key
revoke all on public.platform_admins, public.memberships, public.invites from anon;
grant select on public.platform_admins to authenticated;
grant select, update, delete on public.memberships to authenticated;
grant select, insert, delete on public.invites to authenticated;
revoke all on function public.claim_invite(text) from public, anon;
grant execute on function public.claim_invite(text), public.is_platform_admin(), public.is_club_admin(text, text) to authenticated;

-- 6. AFTER you create your own account on account.html, make yourself the platform admin
--    (replace the email with yours, then run just this line):
-- insert into public.platform_admins (user_id) select id from auth.users where email = 'you@example.com' on conflict do nothing;
