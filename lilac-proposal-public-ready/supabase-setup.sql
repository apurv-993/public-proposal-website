-- Lilac Proposal public-host setup (Supabase)
-- Run this entire file in Supabase Dashboard -> SQL Editor -> New query.
-- Public links are bearer links: anyone who has a UUID link can view that proposal.
-- Direct table SELECT is intentionally disabled; a SECURITY DEFINER RPC returns only the requested row.

create extension if not exists pgcrypto;

create table if not exists public.proposals (
  id uuid primary key,
  sender text not null check (char_length(sender) between 1 and 50),
  recipient text not null check (char_length(recipient) between 1 and 50),
  gender text not null check (gender in ('her','him','them')),
  description text not null check (char_length(description) between 1 and 700),
  message text not null check (char_length(message) between 1 and 700),
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 6),
  music_url text,
  music_name text,
  created_at timestamptz not null default now()
);

alter table public.proposals enable row level security;

-- Remove the broad read policy from the earlier demo if it exists.
drop policy if exists "Anyone can read proposals by link" on public.proposals;
drop policy if exists "Public can read proposals by link" on public.proposals;
drop policy if exists "Anyone can create proposals" on public.proposals;
drop policy if exists "Public can create proposals" on public.proposals;
drop policy if exists "Public can create valid proposals" on public.proposals;

revoke all on table public.proposals from anon, authenticated;
grant insert on table public.proposals to anon, authenticated;

create policy "Public can create valid proposals"
on public.proposals for insert to anon, authenticated
with check (
  id is not null
  and char_length(sender) between 1 and 50
  and char_length(recipient) between 1 and 50
  and gender in ('her','him','them')
  and char_length(description) between 1 and 700
  and char_length(message) between 1 and 700
  and jsonb_typeof(photos) = 'array'
  and jsonb_array_length(photos) <= 6
);

create or replace function public.get_proposal_by_id(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.to_jsonb(p)
  from public.proposals as p
  where p.id = p_id
  limit 1;
$$;

revoke all on function public.get_proposal_by_id(uuid) from public;
grant execute on function public.get_proposal_by_id(uuid) to anon, authenticated;

-- Public media URLs are necessary for recipients to load photos/audio without accounts.
-- Storage restricts file types, individual file size, and the accepted path pattern.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proposal-media',
  'proposal-media',
  true,
  20971520,
  array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/ogg','audio/webm','audio/aac']
)
on conflict (id) do update
set public = true,
    file_size_limit = 20971520,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view proposal media" on storage.objects;
drop policy if exists "Public can upload proposal media" on storage.objects;
drop policy if exists "Lilac public proposal uploads" on storage.objects;

create policy "Lilac public proposal uploads"
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'proposal-media'
  and name ~* '^[0-9a-f-]{36}/(photo-[1-6]\.jpg|music\.[a-z0-9]{1,8})$'
);

-- NOTE: the bucket is public so known media URLs can be read without a SELECT policy.
-- Anonymous uploads still need rate limiting / CAPTCHA / quotas for a large public launch.
