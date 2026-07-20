-- Costudio shared Supabase schema.
-- Run this file in Supabase SQL Editor. Do not run costing/setup.sql there.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  currency_code text not null default 'USD',
  currency_symbol text not null default '$',
  measurement_unit text not null default 'm' check (measurement_unit in ('m', 'yd')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'designer', 'costing', 'measurements', 'member')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = target_business_id and user_id = auth.uid()
  );
$$;

create table if not exists public.design_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  entity_type text not null check (entity_type in ('designer', 'collection', 'palette', 'fabric', 'piece', 'note', 'prompt_set', 'moodboard')),
  client_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, entity_type, client_id)
);

create table if not exists public.costing_state (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  setup jsonb not null default '{}'::jsonb,
  computed jsonb not null default '{}'::jsonb,
  fabrics jsonb not null default '[]'::jsonb,
  trims jsonb not null default '[]'::jsonb,
  production_time jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  cogs numeric(14,4) not null default 0,
  pricing jsonb not null default '{}'::jsonb,
  fabrics jsonb not null default '[]'::jsonb,
  trims jsonb not null default '[]'::jsonb,
  production_time jsonb not null default '{}'::jsonb,
  hourly_rate numeric(14,4) not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  preferences jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.measurement_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null default 'custom',
  unit text not null default 'cm' check (unit in ('cm', 'in')),
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.measurement_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid references public.measurement_templates(id) on delete set null,
  unit text not null default 'cm' check (unit in ('cm', 'in')),
  values jsonb not null default '{}'::jsonb,
  notes text not null default '',
  measured_by uuid default auth.uid() references auth.users(id) on delete set null,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists businesses_touch_updated_at on public.businesses;
create trigger businesses_touch_updated_at before update on public.businesses
for each row execute function public.touch_updated_at();
drop trigger if exists design_records_touch_updated_at on public.design_records;
create trigger design_records_touch_updated_at before update on public.design_records
for each row execute function public.touch_updated_at();
drop trigger if exists costing_state_touch_updated_at on public.costing_state;
create trigger costing_state_touch_updated_at before update on public.costing_state
for each row execute function public.touch_updated_at();
drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_updated_at();
drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at before update on public.clients
for each row execute function public.touch_updated_at();
drop trigger if exists measurement_templates_touch_updated_at on public.measurement_templates;
create trigger measurement_templates_touch_updated_at before update on public.measurement_templates
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  business_name text;
begin
  business_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''), split_part(new.email, '@', 1));
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), business_name));
  insert into public.businesses (name, owner_id)
  values (business_name, new.id)
  returning id into new_business_id;
  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, new.id, 'owner');
  insert into public.costing_state (business_id) values (new_business_id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.design_records enable row level security;
alter table public.costing_state enable row level security;
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.measurement_templates enable row level security;
alter table public.measurement_records enable row level security;

drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "businesses_read_member" on public.businesses;
create policy "businesses_read_member" on public.businesses for select using (public.is_business_member(id));
drop policy if exists "businesses_update_owner" on public.businesses;
create policy "businesses_update_owner" on public.businesses for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "members_read_member" on public.business_members;
create policy "members_read_member" on public.business_members for select using (public.is_business_member(business_id));

drop policy if exists "design_records_member_all" on public.design_records;
create policy "design_records_member_all" on public.design_records for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists "costing_state_member_all" on public.costing_state;
create policy "costing_state_member_all" on public.costing_state for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists "products_member_all" on public.products;
create policy "products_member_all" on public.products for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists "clients_member_all" on public.clients;
create policy "clients_member_all" on public.clients for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists "measurement_templates_member_all" on public.measurement_templates;
create policy "measurement_templates_member_all" on public.measurement_templates for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists "measurement_records_member_all" on public.measurement_records;
create policy "measurement_records_member_all" on public.measurement_records for all using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.businesses to authenticated;
grant select on public.business_members to authenticated;
grant select, insert, update, delete on public.design_records to authenticated;
grant select, insert, update, delete on public.costing_state to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.measurement_templates to authenticated;
grant select, insert, update, delete on public.measurement_records to authenticated;
