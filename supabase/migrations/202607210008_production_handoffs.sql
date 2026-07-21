-- Production handoffs: patterns, design files, specifications and tech sheets.
-- Run after migrations 001-007.

insert into storage.buckets (id, name, public, file_size_limit)
values ('production-files', 'production-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

create table if not exists public.production_files (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id bigint references public.crm_orders(id) on delete set null,
  category text not null default 'other' check (category in ('pattern','design','design_spec','tech_sheet','measurement','other')),
  name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  source_folder text not null default '',
  notes text not null default '',
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.production_pack_shares (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id bigint references public.crm_orders(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null default '',
  file_ids uuid[] not null default '{}',
  message text not null default '',
  expires_at timestamptz not null,
  shared_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists production_files_business_order_idx on public.production_files (business_id, order_id, created_at desc);
create index if not exists production_pack_shares_business_idx on public.production_pack_shares (business_id, created_at desc);

alter table public.production_files enable row level security;
alter table public.production_pack_shares enable row level security;

drop policy if exists "production_files_member_all" on public.production_files;
create policy "production_files_member_all" on public.production_files
for all using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists "production_pack_shares_member_all" on public.production_pack_shares;
create policy "production_pack_shares_member_all" on public.production_pack_shares
for all using (public.is_business_member(business_id))
with check (
  public.is_business_member(business_id)
  and (recipient_user_id is null or exists (
    select 1 from public.business_members
    where business_members.business_id = production_pack_shares.business_id
      and business_members.user_id = production_pack_shares.recipient_user_id
  ))
);

drop policy if exists "production_storage_member_select" on storage.objects;
create policy "production_storage_member_select" on storage.objects
for select to authenticated using (
  bucket_id = 'production-files'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "production_storage_member_insert" on storage.objects;
create policy "production_storage_member_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'production-files'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "production_storage_member_update" on storage.objects;
create policy "production_storage_member_update" on storage.objects
for update to authenticated using (
  bucket_id = 'production-files'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'production-files'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "production_storage_member_delete" on storage.objects;
create policy "production_storage_member_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'production-files'
  and public.is_business_member(((storage.foldername(name))[1])::uuid)
);

grant select, insert, update, delete on public.production_files to authenticated;
grant select, insert, update, delete on public.production_pack_shares to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.production_files;
exception when duplicate_object then null;
end $$;
